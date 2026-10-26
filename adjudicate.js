#!/usr/bin/env node
/**
 * adjudicate.js — LLM pass for flagged entries from check-access.js.
 *
 * The script pass is deterministic but blind: it never searches the web
 * and never verifies announcements. This file adjudicates the entries
 * the script flags, using an LLM (live mode) or prompt files answered by
 * any LLM (dry-run mode) plus a merge path for externally produced
 * verdicts.
 *
 * Requires Node 18+ (global fetch). Zero dependencies.
 *
 * Usage:
 *   node adjudicate.js --report <report.json> [--evidence <evidence.json>]
 *                      [--out <json>] [--dry-run] [--verdicts <json>]
 *
 *   --report    Report JSON from check-access.js (required).
 *   --evidence  Optional JSON map: entry name -> array of search-snippet
 *               strings (gathered externally). Lets new entries without a
 *               data.js record be adjudicated too.
 *   --out       Adjudicated report JSON (default ./adjudicated-report.json).
 *   --dry-run   Do not call any LLM. Write one prompt markdown file per
 *               flagged entry into ./prompts/ plus prompts/SUMMARY.md, and
 *               a skeleton adjudicated report to --out. Answer the prompts
 *               with any LLM (Claude, Copilot, Muse) and merge back with
 *               --verdicts.
 *   --verdicts  JSON of externally produced verdicts to merge. Accepts:
 *               a map {name: verdict}, an array of {name, verdict}, or an
 *               array of verdict objects carrying their own name field.
 *               Verdicts go through the same validation as live mode.
 *
 * Live mode (no --dry-run, no --verdicts) needs env vars:
 *   LLM_API_KEY   Required. No key -> error (use --dry-run instead).
 *   LLM_BASE_URL  Default https://api.openai.com/v1 (OpenAI-compatible).
 *   LLM_MODEL     Required. No invented default: set the model you want.
 *
 * An entry is "flagged" for adjudication when it has any gap flag, any
 * conflict flag, the generic_only flag, or a suggested status of unknown.
 * Every script entry also carries announcement_check_required, but that
 * alone does not flag it: the script never verifies announcements, so
 * the prompt still tells the adjudicator to check them.
 *
 * Output keeps three things separate, always: the script's signal, the
 * LLM verdict, and the final suggestion. A verdict NEVER silently
 * overwrites a script signal. Invalid verdicts are rejected, recorded,
 * and the entry stays in the review queue. Low-confidence verdicts also
 * stay in the review queue. The final suggestion takes the verdict's
 * status/capability only when the verdict is valid, confidence is high
 * or medium, and needs_human_review is false; otherwise it keeps the
 * script's suggestion.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const STATUSES = new Set([
  'checkout', 'announced', 'onboarding', 'browse', 'limited', 'blocked', 'unknown',
]);
const CAPABILITIES = new Set(['A+', 'B+', 'B', 'C-', 'D', 'F', '—']);

const TAXONOMY = `Directory taxonomy (apply exactly; do not invent grades):
- checkout: a third-party agent can complete a purchase or booking today, payment included, verified live.
- announced: an agent integration has been announced but live checkout is NOT verified. Announced NEVER counts as live.
- onboarding: named as onboarding to an agent commerce suite, no live checkout yet.
- browse: an agent can search or browse only; no transaction.
- limited: partial support, manual setup, case-by-case, or eligibility-restricted.
- blocked: third-party agents are blocked from purchasing or booking.
- unknown: no policy found after the checks above.
Rules that override naive readings:
- B2B APIs such as NDC (airline/travel-agent distribution) do NOT count as consumer-agent checkout. An entry whose only agent surface is B2B grades at most limited.
- A Q&A-only support bot is NOT an agent. It does not make an entry partial or full.
- A first-party assistant that takes steps toward a transaction (search, compare, plan, cart, change, refund) but hands the human the final purchase is partial evidence, not full checkout.
- A fetch failure (403, 429, timeout) is a gap, never evidence of absence. Do not conclude "no policy" from a failed fetch.
- Conflicting sources resolve conservatively: prefer the company's own announcement, then reputable reporting, then trade press; an unreconciled conflict lowers confidence.`;

const VERDICT_SCHEMA = `Return ONLY this verdict JSON, no other text:
{
  "status": "checkout|announced|onboarding|browse|limited|blocked|unknown",
  "capability": "A+|B+|B|C-|D|F|—",
  "reasoning": "1-2 sentences tying the verdict to the evidence",
  "confidence": "high|medium|low",
  "sources_used": ["urls or snippet labels you relied on"],
  "needs_human_review": false
}
Capability follows status the way the directory grades it: checkout -> A+,
cart-only channel -> B+, partial -> B, browse-only -> C-, no usable channel
but not blocked -> D, blocked -> F, no policy found -> —.`;

function parseArgs(argv) {
  const args = { report: null, evidence: null, out: null, dryRun: false, verdicts: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--report') args.report = argv[++i];
    else if (a === '--evidence') args.evidence = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--verdicts') args.verdicts = argv[++i];
    else if (a === '--help' || a === '-h') {
      console.log(
        'Usage: node adjudicate.js --report <report.json> [--evidence <evidence.json>] [--out <json>] [--dry-run] [--verdicts <json>]\n' +
        '  --report    Report JSON from check-access.js (required).\n' +
        '  --evidence  JSON map: entry name -> search-snippet strings.\n' +
        '  --out       Adjudicated report JSON (default ./adjudicated-report.json).\n' +
        '  --dry-run   Write prompt files to ./prompts/ instead of calling an LLM.\n' +
        '  --verdicts  JSON of externally produced verdicts to merge.\n' +
        'Live mode env: LLM_API_KEY (required), LLM_BASE_URL (default https://api.openai.com/v1), LLM_MODEL (required).'
      );
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${a}`);
      process.exit(2);
    }
  }
  if (!args.report) {
    console.error('--report is required');
    process.exit(2);
  }
  return args;
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'entry';
}

function isFlagged(entry) {
  if (entry.suggestedStatus === 'unknown') return true;
  return (entry.flags || []).some((f) =>
    f.startsWith('gap:') || f.startsWith('conflict:') || f === 'generic_only' || f.startsWith('fallback:'));
}

function loadExistingEvidence() {
  try {
    const dataJs = path.join(__dirname, 'data.js');
    const src = fs.readFileSync(dataJs, 'utf8');
    const keyIdx = src.indexOf('BUSINESSES');
    const start = src.indexOf('[', keyIdx);
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
          const map = new Map();
          for (const e of arr) {
            map.set(e.name, {
              status: e.status, capability: e.capability, overall: e.overall,
              evidence: e.evidence, source: e.source, verified: e.verified,
              platformAgent: e.platformAgent || null,
            });
          }
          return map;
        }
      }
    }
  } catch {
    return new Map();
  }
  return new Map();
}

function buildBundle(entry, existingMap, evidenceMap) {
  const existing = existingMap.get(entry.name) || null;
  const snippets = evidenceMap ? (evidenceMap[entry.name] || null) : null;
  return {
    name: entry.name,
    domain: entry.domain,
    script: {
      sources: entry.sources,
      signals: entry.signals,
      suggestedStatus: entry.suggestedStatus,
      suggestedCapability: entry.suggestedCapability,
      flags: entry.flags,
      evidence: entry.evidence,
    },
    existingDataJs: existing,
    searchSnippets: snippets,
  };
}

function buildPrompt(bundle) {
  return `# Adjudication task: ${bundle.name}

You are adjudicating one Agent Yellow Pages entry. The deterministic script
already fetched robots.txt, UCP, and llms.txt, but it does not search the web
and does not verify announcements. Your job is the nondeterministic part:
weigh the evidence, resolve conflicts conservatively, and return a verdict.

${TAXONOMY}

## Evidence bundle

\`\`\`json
${JSON.stringify(bundle, null, 2)}
\`\`\`

Notes on the bundle:
- \`script\` is what the deterministic checker found. A gap flag means that
  source could not be fetched; it is not evidence of absence.
- \`existingDataJs\` is the entry's current directory record, when this is
  a re-check of a known entry. It may be stale; the script's fresh fetch
  takes precedence for robots/UCP/llms facts.
- \`searchSnippets\` are externally gathered snippets, when provided. Treat
  them as leads, not verdicts: prefer the company's own announcement, then
  reputable reporting.
- Every entry carries \`announcement_check_required\`: if the snippets or
  the existing record mention an announced integration, judge whether it
  is live today. Announced never counts as live.

${VERDICT_SCHEMA}
`;
}

function normalizeCapability(c) {
  if (typeof c !== 'string') return c;
  const t = c.trim();
  if (t === '-' || t === '–') return '—';
  return t;
}

function validateVerdict(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) {
    return { valid: false, errors: ['verdict is not an object'], normalized: null };
  }
  const errors = [];
  if (!STATUSES.has(v.status)) errors.push(`status ${JSON.stringify(v.status)} not in taxonomy`);
  const cap = normalizeCapability(v.capability);
  if (!CAPABILITIES.has(cap)) errors.push(`capability ${JSON.stringify(v.capability)} not in taxonomy`);
  if (typeof v.reasoning !== 'string' || v.reasoning.trim() === '') errors.push('reasoning empty');
  if (!['high', 'medium', 'low'].includes(v.confidence)) errors.push(`confidence ${JSON.stringify(v.confidence)} invalid`);
  if (v.sources_used !== undefined && !Array.isArray(v.sources_used)) errors.push('sources_used must be an array');
  if (v.needs_human_review !== undefined && typeof v.needs_human_review !== 'boolean') errors.push('needs_human_review must be boolean');
  if (errors.length > 0) return { valid: false, errors, normalized: null };
  return {
    valid: true,
    errors: [],
    normalized: {
      status: v.status,
      capability: cap,
      reasoning: v.reasoning.trim(),
      confidence: v.confidence,
      sources_used: Array.isArray(v.sources_used) ? v.sources_used : [],
      needs_human_review: typeof v.needs_human_review === 'boolean' ? v.needs_human_review : (v.confidence === 'low'),
    },
  };
}

function extractJson(text) {
  if (typeof text !== 'string') return null;
  try { return JSON.parse(text); } catch { /* fall through to brace scan */ }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)); } catch { return null; }
}

async function callLlm(prompt) {
  const apiKey = process.env.LLM_API_KEY;
  const baseUrl = (process.env.LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = process.env.LLM_MODEL;
  if (!apiKey) throw new Error('LLM_API_KEY is not set; use --dry-run to generate prompts without a key.');
  if (!model) throw new Error('LLM_MODEL is not set (no invented default); set it to the model you want.');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60000);
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          { role: 'system', content: 'You adjudicate Agent Yellow Pages entries. Return ONLY the verdict JSON.' },
          { role: 'user', content: prompt },
        ],
      }),
    });
    clearTimeout(timer);
    const body = await res.text();
    if (!res.ok) throw new Error(`LLM API ${res.status}: ${body.slice(0, 300)}`);
    const data = JSON.parse(body);
    const content = data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content : null;
    return extractJson(content);
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

function parseVerdictsFile(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const out = new Map();
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [name, verdict] of Object.entries(raw)) out.set(name, verdict);
  } else if (Array.isArray(raw)) {
    for (const item of raw) {
      if (item && typeof item === 'object' && typeof item.name === 'string') {
        out.set(item.name, item.verdict !== undefined ? item.verdict : item);
      }
    }
  } else {
    throw new Error('--verdicts file must be a map {name: verdict} or an array of {name, verdict}');
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const report = JSON.parse(fs.readFileSync(args.report, 'utf8'));
  if (!report || !Array.isArray(report.entries)) throw new Error('--report file does not contain an entries array');
  let evidenceMap = null;
  if (args.evidence) {
    evidenceMap = JSON.parse(fs.readFileSync(args.evidence, 'utf8'));
    if (!evidenceMap || typeof evidenceMap !== 'object') throw new Error('--evidence must be a JSON object');
  }
  const existingMap = loadExistingEvidence();
  const outPath = args.out || path.join(process.cwd(), 'adjudicated-report.json');

  const flagged = report.entries.filter(isFlagged);
  const rejectedVerdicts = [];
  const outEntries = [];

  if (args.dryRun) {
    const promptsDir = path.join(process.cwd(), 'prompts');
    fs.mkdirSync(promptsDir, { recursive: true });
    const summary = [
      '# Adjudication prompts (dry run)',
      '',
      `Source report: ${args.report}`,
      `Flagged entries: ${flagged.length} of ${report.entries.length}`,
      '',
      'Each file below is one prompt: evidence bundle + taxonomy + required verdict JSON.',
      'Answer each prompt with any LLM (Claude, Copilot, Muse), collect the verdict',
      'JSON objects, and merge them back with:',
      '',
      '  node adjudicate.js --report <report.json> --verdicts <verdicts.json> --out <json>',
      '',
      'Verdicts file formats accepted: a map {name: verdict}, an array of',
      '{name, verdict}, or an array of verdict objects carrying their own name.',
      '',
      '## Entries',
      '',
    ];
    for (const entry of flagged) {
      const bundle = buildBundle(entry, existingMap, evidenceMap);
      const prompt = buildPrompt(bundle);
      const file = path.join(promptsDir, `${slugify(entry.name)}.md`);
      fs.writeFileSync(file, prompt);
      summary.push(`- ${entry.name} -> prompts/${slugify(entry.name)}.md (script: ${entry.suggestedStatus}/${entry.suggestedCapability}; flags: ${entry.flags.join(', ')})`);
      outEntries.push({
        ...entry,
        scriptStatus: entry.suggestedStatus,
        scriptCapability: entry.suggestedCapability,
        verdict: null,
        finalStatus: entry.suggestedStatus,
        finalCapability: entry.suggestedCapability,
        inReviewQueue: true,
      });
    }
    for (const entry of report.entries) {
      if (!isFlagged(entry)) {
        outEntries.push({
          ...entry,
          scriptStatus: entry.suggestedStatus,
          scriptCapability: entry.suggestedCapability,
          verdict: null,
          finalStatus: entry.suggestedStatus,
          finalCapability: entry.suggestedCapability,
          inReviewQueue: false,
        });
      }
    }
    fs.writeFileSync(path.join(promptsDir, 'SUMMARY.md'), summary.join('\n') + '\n');
    const out = {
      generatedAt: new Date().toISOString(),
      tool: 'adjudicate.js',
      mode: 'dry-run',
      sourceReport: args.report,
      entries: outEntries,
      reviewQueue: flagged.map((e) => e.name),
      rejectedVerdicts,
    };
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
    console.log(`Dry run: wrote ${flagged.length} prompt files to ${promptsDir}`);
    console.log(`Summary: ${path.join(promptsDir, 'SUMMARY.md')}`);
    console.log(`Skeleton adjudicated report: ${outPath}`);
    console.log(`Review queue (${flagged.length}): ${flagged.map((e) => e.name).join(', ') || '(none)'}`);
    return;
  }

  let verdictsMap = null;
  let liveMode = false;
  if (args.verdicts) {
    verdictsMap = parseVerdictsFile(args.verdicts);
  } else {
    liveMode = true;
    if (!process.env.LLM_API_KEY) {
      throw new Error('LLM_API_KEY is not set; use --dry-run to generate prompts without a key.');
    }
    if (!process.env.LLM_MODEL) {
      throw new Error('LLM_MODEL is not set (no invented default); set it to the model you want.');
    }
  }

  for (const entry of report.entries) {
    const base = {
      ...entry,
      scriptStatus: entry.suggestedStatus,
      scriptCapability: entry.suggestedCapability,
    };
    if (!isFlagged(entry)) {
      outEntries.push({
        ...base, verdict: null,
        finalStatus: entry.suggestedStatus, finalCapability: entry.suggestedCapability,
        inReviewQueue: false,
      });
      continue;
    }
    let verdict = null;
    let rejected = null;
    if (verdictsMap) {
      if (verdictsMap.has(entry.name)) {
        const check = validateVerdict(verdictsMap.get(entry.name));
        if (check.valid) verdict = check.normalized;
        else rejected = check.errors;
      }
    } else {
      try {
        const bundle = buildBundle(entry, existingMap, evidenceMap);
        const raw = await callLlm(buildPrompt(bundle));
        if (raw === null) {
          rejected = ['could not parse verdict JSON from LLM output'];
        } else {
          const check = validateVerdict(raw);
          if (check.valid) verdict = check.normalized;
          else rejected = check.errors;
        }
      } catch (err) {
        rejected = [`LLM call failed: ${err.message}`];
      }
    }
    if (rejected) {
      rejectedVerdicts.push({ name: entry.name, reasons: rejected });
      outEntries.push({
        ...base, verdict: null,
        finalStatus: entry.suggestedStatus, finalCapability: entry.suggestedCapability,
        inReviewQueue: true,
      });
    } else if (verdict) {
      const accept = verdict.confidence !== 'low' && verdict.needs_human_review === false;
      outEntries.push({
        ...base, verdict,
        finalStatus: accept ? verdict.status : entry.suggestedStatus,
        finalCapability: accept ? verdict.capability : entry.suggestedCapability,
        inReviewQueue: !accept,
      });
    } else {
      // Flagged but no verdict supplied for it.
      outEntries.push({
        ...base, verdict: null,
        finalStatus: entry.suggestedStatus, finalCapability: entry.suggestedCapability,
        inReviewQueue: true,
      });
    }
  }
  // Verdicts naming entries absent from the report are rejected, not ignored.
  if (verdictsMap) {
    const known = new Set(report.entries.map((e) => e.name));
    for (const name of verdictsMap.keys()) {
      if (!known.has(name)) rejectedVerdicts.push({ name, reasons: ['no matching report entry'] });
    }
  }

  const out = {
    generatedAt: new Date().toISOString(),
    tool: 'adjudicate.js',
    mode: liveMode ? 'live' : 'verdicts',
    model: liveMode ? process.env.LLM_MODEL : null,
    sourceReport: args.report,
    entries: outEntries,
    reviewQueue: outEntries.filter((e) => e.inReviewQueue).map((e) => e.name),
    rejectedVerdicts,
  };
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
  console.log(`Adjudicated report: ${outPath}`);
  console.log(`Mode: ${out.mode}${liveMode ? ` (model ${process.env.LLM_MODEL})` : ''}`);
  console.log(`Review queue (${out.reviewQueue.length}): ${out.reviewQueue.join(', ') || '(none)'}`);
  console.log(`Rejected verdicts (${rejectedVerdicts.length}): ${rejectedVerdicts.map((r) => `${r.name} (${r.reasons.join('; ')})`).join(' | ') || '(none)'}`);
}

main().catch((err) => {
  console.error(`adjudicate.js failed: ${err.message}`);
  process.exit(1);
});
