#!/usr/bin/env node
/**
 * check-access.js — deterministic access-check pass for Agent Yellow Pages.
 *
 * What it does (and only this): for each business, fetch robots.txt,
 * /.well-known/ucp, and /llms.txt from the business's own domain, parse
 * them with fixed rules, and emit signals plus a suggested status and
 * capability. It never edits data.js, never logs in, never checks out,
 * and never submits a form.
 *
 * What it does NOT do: web search, announcement verification, live-browser
 * checks, or checkout attempts. Every entry is flagged
 * `announcement_check_required` because announcements live outside these
 * three fetches. Ambiguous entries go to adjudicate.js.
 *
 * Requires Node 18+ (global fetch). Zero dependencies.
 *
 * Usage:
 *   node check-access.js [--input <json>] [--out <json>] [--limit N] [--delay ms]
 *
 *   --input   JSON array of {name, domain} or {name, url}. Default: the
 *             BUSINESSES array in ./data.js (name + url; domain derived
 *             from the url).
 *   --out     Report JSON path. Default: ./access-report.json in the
 *             working directory. Use "-" to print the JSON to stdout
 *             (the human summary then goes to stderr).
 *   --limit   Check only the first N entries.
 *   --delay   Milliseconds to wait between requests (default 250).
 *
 * Output: one JSON object per entry with per-source fetch results, parsed
 * rules, signals, suggested status/capability, flags, and evidence lines,
 * plus a short console summary.
 *
 * Rules encoded here (same as the data.js header):
 * - Only named-agent rules count as agent policy. The generic
 *   `User-agent: *` group is recorded separately and NEVER counted as
 *   agent policy; `generic_only` is flagged when no named rules exist.
 * - A 404 (or a 200 non-JSON body for UCP) is absence. A 403, 429, 5xx,
 *   timeout, or network error is a GAP, never absence: gaps never flip
 *   a signal to absence.
 * - A 2xx response whose body is HTML for a .txt or ucp path is an
 *   SPA fallback, recorded as "fallback, not a valid file": neither
 *   presence nor absence.
 * - B2B APIs (NDC and friends) are not detectable from these three
 *   fetches and are never inferred here; that distinction is the
 *   adjudicator's job.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const USER_AGENT =
  'AgentYellowPages-AccessChecker/1.0 (+https://dnellis74.github.io/ai-yellow-pages/)';

// Named AI agents recognized in robots.txt. Matching is case-insensitive.
// CCBot and Bytespider are bulk-scraper bots, not consumer AI agents: they
// are parsed and reported, but excluded from the blocked signal.
const NAMED_AGENTS = [
  'GPTBot', 'ChatGPT-User', 'OAI-SearchBot',
  'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'anthropic-ai',
  'PerplexityBot', 'Perplexity-User',
  'Google-Extended',
  'Applebot', 'Applebot-Extended',
  'Amazonbot',
  'Meta-ExternalAgent', 'Meta-ExternalFetcher',
  'DuckAssistBot',
  'CCBot', 'Bytespider',
  'cohere-ai', 'YouBot',
];
const NAMED_SET = new Set(NAMED_AGENTS.map((a) => a.toLowerCase()));
const NON_CONSUMER = new Set(['ccbot', 'bytespider']);

// Disallow patterns containing one of these mark a transaction path.
const TRANSACTION_HINTS = ['checkout', 'cart', 'booking'];

const FETCH_TIMEOUT_MS = 10000;
const MAX_RETRIES = 2;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseArgs(argv) {
  const args = { input: null, out: null, limit: null, delay: 250 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--input') args.input = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--limit') args.limit = parseInt(argv[++i], 10);
    else if (a === '--delay') args.delay = parseInt(argv[++i], 10);
    else if (a === '--help' || a === '-h') {
      console.log(
        'Usage: node check-access.js [--input <json>] [--out <json>] [--limit N] [--delay ms]\n' +
        '  --input  JSON array of {name, domain} or {name, url}. Default: ./data.js BUSINESSES.\n' +
        '  --out    Report JSON path (default ./access-report.json; "-" prints JSON to stdout).\n' +
        '  --limit  Check only the first N entries.\n' +
        '  --delay  Milliseconds between requests (default 250).'
      );
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${a}`);
      process.exit(2);
    }
  }
  if (args.limit !== null && (!Number.isFinite(args.limit) || args.limit < 0)) {
    console.error('--limit must be a non-negative integer');
    process.exit(2);
  }
  if (!Number.isFinite(args.delay) || args.delay < 0) {
    console.error('--delay must be a non-negative integer');
    process.exit(2);
  }
  return args;
}

// Load the BUSINESSES array from data.js without executing anything else:
// find the array literal with a string-aware bracket scan, then evaluate
// that literal alone. data.js is this project's own file.
function loadBusinessesFromDataJs(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const keyIdx = src.indexOf('BUSINESSES');
  if (keyIdx === -1) throw new Error(`BUSINESSES not found in ${filePath}`);
  const start = src.indexOf('[', keyIdx);
  if (start === -1) throw new Error(`BUSINESSES array not found in ${filePath}`);
  let depth = 0;
  let inStr = null;
  let escaped = false;
  for (let i = start; i < src.length; i++) {
    const ch = src[i];
    if (inStr) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
    if (ch === '[') depth += 1;
    else if (ch === ']') {
      depth -= 1;
      if (depth === 0) {
        // eslint-disable-next-line no-eval
        const arr = eval(src.slice(start, i + 1));
        if (!Array.isArray(arr)) throw new Error('BUSINESSES is not an array');
        return arr;
      }
    }
  }
  throw new Error(`Unterminated BUSINESSES array in ${filePath}`);
}

function loadEntries(inputPath) {
  let raw;
  let source;
  if (inputPath) {
    raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    source = `json:${inputPath}`;
  } else {
    const dataJs = path.join(__dirname, 'data.js');
    raw = loadBusinessesFromDataJs(dataJs);
    source = 'data.js';
  }
  if (!Array.isArray(raw)) throw new Error('Input must be a JSON array');
  const entries = raw.map((e, i) => {
    if (!e || typeof e.name !== 'string' || !e.name.trim()) {
      throw new Error(`Entry ${i} has no name`);
    }
    let domain = null;
    if (typeof e.domain === 'string' && e.domain.trim()) domain = e.domain.trim();
    else if (typeof e.url === 'string' && e.url.trim()) {
      try { domain = new URL(e.url.trim()).hostname; }
      catch { throw new Error(`Entry "${e.name}" has an unparsable url: ${e.url}`); }
    }
    if (!domain) throw new Error(`Entry "${e.name}" has neither domain nor url`);
    return { name: e.name, domain };
  });
  return { entries, source };
}

async function fetchWithRetries(url, delayMs) {
  let lastStatus = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) await sleep(1000 * Math.pow(2, attempt - 1));
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { 'User-Agent': USER_AGENT, Accept: '*/*' },
        redirect: 'follow',
      });
      clearTimeout(timer);
      if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
        lastStatus = res.status;
        await res.text().catch(() => {});
        continue;
      }
      const text = await res.text().catch(() => '');
      return {
        ok: true,
        status: res.status,
        contentType: res.headers.get('content-type') || '',
        text,
      };
    } catch (err) {
      clearTimeout(timer);
      const kind = err && err.name === 'AbortError' ? 'timeout' : 'network';
      // Per spec, retries apply to 429/5xx only; timeout/network are gaps.
      return { ok: false, status: null, error: kind };
    }
  }
  return { ok: false, status: lastStatus, error: 'http' };
}

function looksLikeHtml(contentType, text) {
  if (/text\/html/i.test(contentType || '')) return true;
  const head = (text || '').trimStart().slice(0, 200).toLowerCase();
  return head.startsWith('<!doctype html') || head.startsWith('<html') ||
    head.startsWith('<head') || head.startsWith('<body');
}

function isSitewideDisallow(pattern) {
  const p = (pattern || '').trim().replace(/\*$/, '').replace(/\$$/, '');
  return p === '/';
}

function parseRobots(text) {
  const groups = [];
  let current = null;
  for (const rawLine of text.split(/\r?\n/)) {
    let line = rawLine.trim();
    const hash = line.indexOf('#');
    if (hash !== -1) line = line.slice(0, hash).trim();
    if (!line) continue;
    const m = line.match(/^([^:]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1].trim().toLowerCase();
    const value = m[2].trim();
    if (key === 'user-agent') {
      // A User-agent line after rules starts a new group; consecutive
      // User-agent lines accumulate into one group.
      if (!current || current.rules) {
        current = { agents: [], allow: [], disallow: [], rules: false };
        groups.push(current);
      }
      current.agents.push(value);
    } else if ((key === 'allow' || key === 'disallow') && current) {
      current.rules = true;
      // An empty Disallow means "allow everything" per the robots spec,
      // so it is not a rule at all; empty Allow is likewise meaningless.
      if (value === '') continue;
      if (key === 'allow') current.allow.push(value);
      else current.disallow.push(value);
    }
    // crawl-delay, sitemap, and unknown keys are ignored.
  }
  const namedAgents = {};
  let genericGroup = null;
  for (const g of groups) {
    const isGeneric = g.agents.some((a) => a === '*');
    if (isGeneric && !genericGroup) {
      genericGroup = { allow: [...g.allow], disallow: [...g.disallow] };
    }
    for (const agent of g.agents) {
      const lower = agent.toLowerCase();
      if (!NAMED_SET.has(lower)) continue;
      const display = NAMED_AGENTS.find((n) => n.toLowerCase() === lower) || agent;
      if (!namedAgents[display]) namedAgents[display] = { allow: [], disallow: [] };
      for (const p of g.allow) {
        if (!namedAgents[display].allow.includes(p)) namedAgents[display].allow.push(p);
      }
      for (const p of g.disallow) {
        if (!namedAgents[display].disallow.includes(p)) namedAgents[display].disallow.push(p);
      }
    }
  }
  const namedNames = Object.keys(namedAgents);
  return {
    groups: groups.map((g) => ({ agents: g.agents, allow: g.allow, disallow: g.disallow })),
    namedAgents,
    genericGroup,
    genericOnly: namedNames.length === 0,
  };
}

function parseUcp(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { isJson: false };
  }
  const names = [];
  const seen = new Set();
  const markers = { checkout: false, fulfillment: false, payment: false };
  const mark = (s) => {
    const l = String(s).toLowerCase();
    if (l.includes('checkout')) markers.checkout = true;
    if (l.includes('fulfillment') || l.includes('fulfilment')) markers.fulfillment = true;
    if (l.includes('payment')) markers.payment = true;
  };
  const stack = [data];
  let nodes = 0;
  while (stack.length > 0 && nodes < 5000) {
    const node = stack.pop();
    nodes += 1;
    if (Array.isArray(node)) {
      for (const item of node) stack.push(item);
      continue;
    }
    if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) {
        mark(k);
        if (typeof v === 'string') mark(v);
        if (k.toLowerCase() === 'capabilities') {
          if (Array.isArray(v)) {
            for (const item of v) {
              const nm = typeof item === 'string'
                ? item
                : (item && typeof item === 'object' ? (item.name || item.id || item.type || null) : null);
              if (nm && !seen.has(nm)) { seen.add(nm); names.push(String(nm)); }
            }
          } else if (v && typeof v === 'object') {
            for (const key of Object.keys(v)) {
              if (!seen.has(key)) { seen.add(key); names.push(key); }
            }
          }
        }
        stack.push(v);
      }
    }
  }
  const checkoutCapability =
    markers.checkout || names.some((n) => n.toLowerCase().includes('checkout'));
  return { isJson: true, capabilityNames: names.slice(0, 50), markers, checkoutCapability };
}

function parseLlms(text) {
  const lines = text.split(/\r?\n/);
  const directives = [];
  for (const line of lines) {
    if (/allow|disallow|permit|forbid|must not|may not|cannot|can not/i.test(line)) {
      directives.push(line.trim());
      if (directives.length >= 20) break;
    }
  }
  const totalForbid = /^disallow:\s*\/\s*$/m.test(text) || /forbid\s+all/i.test(text);
  return {
    excerpt: text.slice(0, 500),
    directives,
    mentionsAllow: /(allow|permit)/i.test(text),
    mentionsDisallow: /(disallow|forbid|prohibit)/i.test(text),
    mentionsTraining: /train/i.test(text),
    totalForbid,
  };
}

// Build one source result: fetch + classify into present / absent / gap /
// fallback. `kind` is 'robots' | 'ucp' | 'llms'.
async function checkSource(domain, kind, delayMs) {
  const paths = { robots: '/robots.txt', ucp: '/.well-known/ucp', llms: '/llms.txt' };
  const url = `https://${domain}${paths[kind]}`;
  const res = await fetchWithRetries(url, delayMs);
  const base = { url, status: res.status, error: res.error || null, fallback: false, gap: false, present: null };
  if (!res.ok) {
    base.gap = true;
    return base;
  }
  if (res.status === 404) {
    base.present = false;
    return base;
  }
  if (res.status < 200 || res.status >= 300) {
    base.gap = true;
    return base;
  }
  if (looksLikeHtml(res.contentType, res.text)) {
    base.fallback = true;
    return base;
  }
  base.present = true;
  if (kind === 'robots') {
    const parsed = parseRobots(res.text);
    base.namedAgents = parsed.namedAgents;
    base.genericGroup = parsed.genericGroup;
    base.genericOnly = parsed.genericOnly;
  } else if (kind === 'ucp') {
    const parsed = parseUcp(res.text);
    if (!parsed.isJson) {
      base.present = false;
      base.nonJson = true;
    } else {
      base.capabilityNames = parsed.capabilityNames;
      base.markers = parsed.markers;
      base.checkoutCapability = parsed.checkoutCapability;
    }
  } else if (kind === 'llms') {
    const parsed = parseLlms(res.text);
    base.excerpt = parsed.excerpt;
    base.directives = parsed.directives;
    base.mentionsAllow = parsed.mentionsAllow;
    base.mentionsDisallow = parsed.mentionsDisallow;
    base.mentionsTraining = parsed.mentionsTraining;
    base.totalForbid = parsed.totalForbid;
  }
  return base;
}

function agentHasAllow(rules) {
  return rules.allow.length > 0;
}

function agentSitewideDisallowed(rules) {
  return rules.disallow.some(isSitewideDisallow) && rules.allow.length === 0;
}

function agentTransactionDisallowed(rules) {
  return rules.disallow.some((p) => {
    const l = p.toLowerCase();
    return TRANSACTION_HINTS.some((h) => l.includes(h));
  });
}

function computeEntry(entry, sources) {
  const flags = ['announcement_check_required'];
  const evidence = [];
  const signals = [];

  const robots = sources.robots;
  const ucp = sources.ucp;
  const llms = sources.llms;

  // --- robots evidence + flags ---
  let consumerNamed = [];
  if (robots.gap) {
    flags.push(`gap:robots:${robots.status || robots.error}`);
    evidence.push(`robots.txt: gap (${robots.status || robots.error}); not absence.`);
  } else if (robots.fallback) {
    flags.push('fallback:robots');
    evidence.push('robots.txt: returned HTML, recorded as fallback, not a valid file.');
  } else if (robots.present === false) {
    evidence.push('robots.txt: absent (404).');
  } else if (robots.present === true) {
    consumerNamed = Object.entries(robots.namedAgents)
      .filter(([name]) => !NON_CONSUMER.has(name.toLowerCase()))
      .map(([name, rules]) => ({ name, rules }));
    if (robots.genericOnly) {
      flags.push('generic_only');
      evidence.push('robots.txt: no named-agent rules (generic * group only); generic rules are never agent policy.');
    } else {
      const names = consumerNamed.map((c) => c.name);
      evidence.push(`robots.txt: named agents present: ${names.join(', ') || '(none consumer)'}${robots.genericGroup ? '; generic * group also present' : ''}.`);
      for (const { name, rules } of consumerNamed) {
        if (rules.allow.length > 0) evidence.push(`robots.txt: ${name} allowed: ${rules.allow.join(', ')}.`);
        if (rules.disallow.length > 0) evidence.push(`robots.txt: ${name} disallowed: ${rules.disallow.join(', ')}.`);
      }
    }
  }

  // --- UCP evidence + flags ---
  if (ucp.gap) {
    flags.push(`gap:ucp:${ucp.status || ucp.error}`);
    evidence.push(`UCP: gap (${ucp.status || ucp.error}); not absence.`);
  } else if (ucp.fallback) {
    flags.push('fallback:ucp');
    evidence.push('UCP: returned HTML, recorded as fallback, not a valid file.');
  } else if (ucp.present === false) {
    evidence.push(`UCP: absent (${ucp.status || 'non-JSON body'}).`);
  } else if (ucp.present === true) {
    const caps = ucp.capabilityNames.length > 0 ? ucp.capabilityNames.join(', ') : '(no capability names extracted)';
    evidence.push(`UCP: JSON manifest; capabilities: ${caps}; checkout marker: ${ucp.checkoutCapability ? 'yes' : 'no'}.`);
  }

  // --- llms.txt evidence + flags ---
  if (llms.gap) {
    flags.push(`gap:llms:${llms.status || llms.error}`);
    evidence.push(`llms.txt: gap (${llms.status || llms.error}); not absence.`);
  } else if (llms.fallback) {
    flags.push('fallback:llms');
    evidence.push('llms.txt: returned HTML, recorded as fallback, not a valid file.');
  } else if (llms.present === false) {
    evidence.push('llms.txt: absent (404).');
  } else if (llms.present === true) {
    evidence.push(`llms.txt: present; mentionsAllow=${llms.mentionsAllow}, mentionsDisallow=${llms.mentionsDisallow}, totalForbid=${llms.totalForbid}.`);
    if (llms.directives.length > 0) evidence.push(`llms.txt directives: ${llms.directives.join(' | ')}.`);
  }

  // --- signals (deterministic; gaps never create or erase a signal) ---
  const checkoutSignal = ucp.present === true && ucp.checkoutCapability === true;
  const sitewideBlocked = consumerNamed.length > 0 &&
    consumerNamed.every(({ rules }) => agentSitewideDisallowed(rules));
  const browseSignal =
    consumerNamed.some(({ rules }) => agentHasAllow(rules)) ||
    (consumerNamed.length > 0 && !sitewideBlocked) ||
    (llms.present === true && !llms.totalForbid);
  if (checkoutSignal) signals.push('checkout');
  if (sitewideBlocked) signals.push('blocked');
  if (browseSignal) signals.push('browse');
  if (signals.length === 0) signals.push('unknown');

  // --- conflicts ---
  const anyAllow = consumerNamed.some(({ rules }) => agentHasAllow(rules));
  const anyTransactionDisallow = consumerNamed.some(({ rules }) => agentTransactionDisallowed(rules));
  if (anyAllow && anyTransactionDisallow) flags.push('conflict:agents-allowed-checkout-disallowed');
  if (checkoutSignal && sitewideBlocked) flags.push('conflict:ucp-checkout-robots-blocked');

  // --- suggested status/capability (script only; adjudication may refine) ---
  // Priority: checkout > blocked > browse > unknown. Limited (B) is never
  // suggested by this script: partial APIs are not visible in these three
  // fetches and require announcement/API evidence.
  let suggestedStatus;
  let suggestedCapability;
  if (checkoutSignal) { suggestedStatus = 'checkout'; suggestedCapability = 'A+'; }
  else if (sitewideBlocked) { suggestedStatus = 'blocked'; suggestedCapability = 'F'; }
  else if (browseSignal) { suggestedStatus = 'browse'; suggestedCapability = 'C-'; }
  else { suggestedStatus = 'unknown'; suggestedCapability = '—'; }
  evidence.push(`signal: ${signals.join(', ')} -> suggested status ${suggestedStatus}, capability ${suggestedCapability}.`);

  return {
    name: entry.name,
    domain: entry.domain,
    sources,
    signals,
    suggestedStatus,
    suggestedCapability,
    flags,
    evidence,
  };
}

async function checkEntry(entry, delayMs, workerFirst) {
  const sources = {};
  const kinds = ['robots', 'ucp', 'llms'];
  for (let i = 0; i < kinds.length; i++) {
    if (i > 0 || !workerFirst.first) await sleep(delayMs);
    workerFirst.first = false;
    sources[kinds[i]] = await checkSource(entry.domain, kinds[i], delayMs);
  }
  return computeEntry(entry, sources);
}

async function runPool(items, concurrency, worker) {
  let next = 0;
  const results = new Array(items.length);
  async function run() {
    const state = { first: true };
    while (true) {
      const i = next;
      next += 1;
      if (i >= items.length) return;
      if (!state.first) await sleep(0); // workers already delay inside checkEntry
      results[i] = await worker(items[i], state);
    }
  }
  const n = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: n }, run));
  return results;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { entries, source } = loadEntries(args.input);
  const limited = args.limit !== null ? entries.slice(0, args.limit) : entries;
  const results = await runPool(limited, 4, (e, state) => checkEntry(e, args.delay, state));

  const byStatus = {};
  const bySignal = {};
  const flagCounts = {};
  for (const r of results) {
    byStatus[r.suggestedStatus] = (byStatus[r.suggestedStatus] || 0) + 1;
    for (const s of r.signals) bySignal[s] = (bySignal[s] || 0) + 1;
    for (const f of r.flags) flagCounts[f] = (flagCounts[f] || 0) + 1;
  }
  const report = {
    generatedAt: new Date().toISOString(),
    tool: 'check-access.js',
    input: { source, count: entries.length, checked: results.length },
    entries: results,
    summary: { byStatus, bySignal, flagCounts, total: results.length },
  };

  const summaryLines = [
    `Checked ${results.length} entries (input: ${source}).`,
    `Suggested status: ${Object.entries(byStatus).map(([k, v]) => `${k} ${v}`).join(', ') || '(none)'}.`,
    `Signals: ${Object.entries(bySignal).map(([k, v]) => `${k} ${v}`).join(', ') || '(none)'}.`,
    `Top flags: ${Object.entries(flagCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `${k} ${v}`).join(', ') || '(none)'}.`,
    ...results.map((r) => `  ${r.name}: ${r.suggestedStatus}/${r.suggestedCapability} [${r.signals.join(',')}] flags=${r.flags.join(',')}`),
  ];
  if (args.out === '-') {
    console.error(summaryLines.join('\n'));
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else {
    const outPath = args.out || path.join(process.cwd(), 'access-report.json');
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');
    console.log(summaryLines.join('\n'));
    console.log(`Report written to ${outPath}`);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`check-access.js failed: ${err.message}`);
    process.exit(1);
  });
}

// Exported for fixture tests. CLI behavior is unchanged: running the file
// directly still executes main(); requiring it does not.
module.exports = { parseRobots, parseUcp, parseLlms, computeEntry, NAMED_AGENTS };
