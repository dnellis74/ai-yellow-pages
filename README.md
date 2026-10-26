# Agent Yellow Pages

A static, data-driven directory of businesses by AI agent policy: which let
third-party AI agents browse, check out, or are blocked.

## Files

- `index.html` — the whole site. No build step, no framework, no server code.
- `data.js` — the only file you edit to update the directory. Every listing on
  the page renders from the `BUSINESSES` array in this file.

## Updating a listing

Edit `data.js`: add, remove, or edit an entry. Fields are documented in the
header comment of that file. Then redeploy. Nothing else changes.

## Detail pages

Cards show summary info only: business name, status badge, category,
annual sales value ("$X.XXB" or "not reported"), and the three grade
badges. Everything else lives on the detail page.

Click a card (or focus it and press Enter or Space) to open its detail
page, which shows everything: name, domain linked to the business
homepage, status, category, sales plus salesNote, capability plus
capabilityNote, depth plus depthNote, overall plus overallNote (with the
provisional flag where set), platform-provided agent (value, note, source
link where present), channels, full evidence text, source linked,
and verified date, plus a "Back to listings" control.

Deep links: `#/business/<slugified-name>`, e.g. `#/business/walmart`.
Browser back and forward work, opening a detail URL directly shows that
entry, and an unknown slug falls back to the listings. Filter, sort, and
search state is preserved when returning to the listings, because the
controls are hidden, not reset, while a detail page is open.

## Annual sales

Each entry carries `sales` (billions of US dollars, or null) and, where the
figure needs explaining, `salesNote`. The 100 NRF entries use NRF Top 100
Retailers 2026 (Kantar) 2025 US retail sales; other figures use the period
stated in their note. Platforms (Shopify, Wix, BigCommerce, Squarespace,
WooCommerce) get no figure by design. Where the checked banner differs from
the NRF company (e.g. Stop & Shop for Ahold Delhaize USA, TJ Maxx for TJX),
`salesNote` says whose total the figure is. Sales figures are for sorting
and scale context only, not a quality signal; nulls sort last in the
default size sort.

To turn an outbound link into an affiliate link, replace that entry's `url`
with your affiliate URL. Outbound links already carry `rel="sponsored"`, and
the page footer carries an affiliate disclosure.

## Capability, depth, and overall grades

Each entry carries three grades, each with a one-line note, derived from
the entry's existing status, evidence, category, and sales fields; no new
verification was done to grade them. The previous single `shopAbility`
grade was split into capability and depth on 2026-10-24 (see Verification
history); no entry retains any `shopAbility` field.

- `capability` + `capabilityNote`: what an agent can actually do, pure
  automation, no depth adjustment.
- `depth` + `depthNote`: depth of products offered, shoppable online.
- `overall` + `overallNote`: the weighted blend below.
- `overallProvisional: true`, only for announced or onboarding entries.

### Capability grade

Scale: A+, B+, B, C-, D, F, and "—" (ungraded).

- Verified full agent checkout (status checkout) → A+.
- Agent fills a cart or orders through a constrained channel, human or site
  completes checkout (cart-only) → B+.
- Partial agent interaction with no verified cart or checkout: agent
  API/schema (CVS), checkout existing only for some merchants/segments
  (all four platforms: Wix, BigCommerce, Squarespace, WooCommerce) → B.
- Products viewable/discoverable only (status browse) → C-.
- No usable agent channel but not actively blocked: eligibility-gated
  sellers (AAFES, Defense Commissary Agency, Amway) and networks with no
  single national checkout (Health Mart, Good Neighbor Pharmacy, AVB
  BrandSource, Piggly Wiggly, Save-A-Lot, Grocery Outlet) → D.
- Actively blocked for third-party agents (status blocked) → F.
- No policy found (status unknown) → "—", except the six networks above,
  which are D. Ungraded is not a failing grade: absence of evidence is
  not a block.

Provisional capability (status announced or onboarding): the grade the
announced integration targets: full checkout → A+, cart assistant → B+,
discovery/first-party assistant → C-. Provisional targets: A+ — Ulta, JD
Sports, Best Buy, Gap, Sephora, URBN, Ashley, Revolve, Halara, Abercrombie;
B+ — Sprouts, Aldi; C- — Lowe's, Macy's, Apple. Provisional capability
notes start with "Provisional: announced, live checkout unverified." (or
"onboarding" wording for onboarding entries).

Limited entries are graded from their evidence: cart-building first-party
channels → B+; an agent API/schema or partial interaction with no verified
cart or checkout → B; agent checkout that exists only for some
merchants/segments → B; eligibility-gated only or networks with no single
checkout → D.

### Depth grade

Scale: A+, A, B, C, D, F, and "—" (ungraded).

- A+: sales ≥ $50B, OR a marketplace with sales ≥ $10B, OR a marketplace
  with clearly massive listing breadth even at lower revenue (Etsy: tens
  of millions of listings → A+, noted as such).
- A: vertical specialist with sales ≥ $5B, OR generalist with sales
  ≥ $10B. Generalist categories for this rule: General, Groceries,
  Discount, Convenience. All other categories count as
  specialist/vertical.
- B: sales ≥ $1B with a real online catalog.
- C: sales < $1B, OR a narrow single-brand catalog with undisclosed scale
  (null-sales single brands → C unless evidence shows a broader catalog).
- D: minimal online catalog (locator/ads site, limited ordering).
- F: no online catalog to shop (in-store only with no e-commerce, no
  own-site online ordering, fuel-only).
- "—": depth cannot be assessed from available evidence; used sparingly
  and justified in the note (here: WinCo Foods only, where sources
  conflict on whether online shopping exists).
- Platforms: depth reflects merchant breadth: Shopify A+ (largest
  eligible US merchant base), other platforms A.
- Networks: depth from the network sales tier, with a note that it is
  network-wide, not one storefront.
- Depth is graded from sales, category, and evidence even for
  unknown-status entries (depth is about the catalog, not agent policy).
  Example: Walgreens has unknown agent status but $112.05B sales →
  depth A+.

### Overall rating

Weighted 60% capability, 40% depth.

Points: A+ 100, A 90, A- 80, B+ 70, B 60, B- 50, C+ 40, C 30, C- 20, D 10,
F 0. Score = round(0.6 × capability points + 0.4 × depth points).

Map: ≥95 A+, 85–94 A, 75–84 A-, 65–74 B+, 55–64 B, 45–54 B-, 35–44 C+,
25–34 C, 15–24 C-, 5–14 D, <5 F. If capability is "—", overall is "—"
regardless of depth. `overallProvisional` is true exactly when capability
is provisional (announced/onboarding entries only). `overallNote` states
the blend in plain words.

### Grade distributions (118 entries, 2026-10-24)

- Capability: A+ 28 (18 verified, 10 provisional), B+ 10 (8 verified, 2
  provisional), B 5, C- 18 (15 verified, 3 provisional), D 9, F 5, — 43.
- Depth: A+ 17, A 62, B 25, C 8, D 1, F 4, — 1.
- Overall: A+ 15 (9 verified, 6 provisional), A- 13 (9 verified, 4
  provisional), B+ 15 (13 verified, 2 provisional), B- 17 (14 verified, 3
  provisional), C+ 9, C 6, — 43. No entry lands on overall A, B, D, or F:
  no capability/depth combination in this data produces a score in those
  bands (e.g. A+ capability with B depth scores 84, an A-, not an A).

## Platform-provided agent

Each entry carries `platformAgent`, `platformAgentNote`, and (where a
source exists) `platformAgentSource`, shown on detail pages only. This
field is separate from `status` and `channels`: those describe
third-party agent access, while `platformAgent` describes the business's
OWN first-party agent or assistant.

- `full` — the business's own agent completes the transaction (purchase,
  booking, or payment) on the user's behalf.
- `partial` — the business's own assistant takes actions or steps toward
  a transaction (search, compare, plan, reserve, change, refund) but the
  human completes the transaction on the site or app.
- `none` — no first-party agent or action-taking assistant found. A
  Q&A-only support bot counts as none, noted as such.
- `unknown` — not yet checked.

Hard rule: third-party integrations (ChatGPT plugins, Perplexity, Google
AI Mode, UCP, NDC/B2B agency APIs) do NOT count toward this field and
stay in `status`/`channels`. `platformAgent` never changes capability,
depth, or overall grades.

Current coverage (2026-10-25): the 11 airlines are mapped (partial 4,
none 5, unknown 2, full 0); the 118 retail entries are unknown pending a
separate research pass.

## Hosting

Any static host works: GitHub Pages, Netlify, Cloudflare Pages, or any web
server. Upload `index.html` and `data.js` to the same directory and serve
`index.html`. No backend needed.

## Verification standard

Each entry carries an `evidence` statement, a `source` URL, and a `verified`
date. Policies in this space change without notice, so an entry is only as
good as its last check. Re-verify entries on a schedule and update the
`verified` date when you do.

Status meanings:

- `checkout` — a third-party agent can complete a purchase (verified live).
- `announced` — an agent integration has been announced, but live checkout is not verified.
- `onboarding` — named as onboarding to an agent commerce suite, no live checkout yet.
- `browse` — a agent can browse but not check out.
- `limited` — partial support, manual setup, or case-by-case.
- `blocked` — third-party agents are blocked.
- `unknown` — no public policy found.

Status describes third-party agent access, not a business's own in-app
assistant (e.g. Amazon blocks outside agents while running Alexa for
Shopping in-app; Rufus was retired May 13, 2026).

### Help and support chatbots

Many sites run a help or support chatbot. Treat it by what it does,
not by what it is called:

- Q&A-only (answers questions, looks up order status or policies,
  no actions taken) does NOT count: `platformAgent` none, and
  capability is unaffected. This is the existing rule.
- Action-taking (changes or cancels an order, starts a return, issues
  a refund, modifies a reservation) counts as `platformAgent` partial
  when it is the business's own assistant. Precedent: Chewy Cai,
  IKEA Billie, Gap, Best Buy, AAFES Maven, and Verizon order-changers.
- Open question, tracked in TODO.md: whether action-taking help bots
  should also lift capability (to B partial), or whether capability
  stays reserved for shopping actions (search, cart, checkout). Until
  decided, help-bot actions do not change capability grades.
- Future verification passes should record a site's help chatbot and
  whether it takes actions, alongside the robots.txt, UCP, and
  llms.txt checks.

## Verification history

- 2026-10-26 — Category expansion, checked pass (22 entries, 129 → 151).
  Method: check-access.js deterministic pass (robots.txt named-agent
  rules, UCP, llms.txt) plus one announcement-search round per group,
  adjudicated by hand under the standing rules. Verdicts: limited/B+
  (8) — Marriott, Hilton via Google AI Mode hotel booking (live US
  Aug 27, 2026, partner merchant of record); Hyatt, Expedia,
  Booking.com, Ticketmaster, StubHub, SeatGeek via live ChatGPT apps
  (booking finishes on the brand's own platform); browse/C- (5) —
  Enterprise, Hertz (named shopping agents, no sitewide block), Avis,
  Rover (substantive llms.txt), TaskRabbit (browse allowed, /book/*
  barred); announced/D (2) — DoorDash, Uber Eats (ChatGPT apps
  announced for later in 2026, not live); unknown (7) — Domino's,
  Starbucks, Chipotle, AMC, Uber, Lyft, Thumbtack. Script suggestions
  rejected: Booking.com browse (robots names only Applebot, a
  single-vendor crawler, per the Tops precedent). First-party agents:
  DoorDash Messages text-to-order (beta), Uber Eats Cart Assistant
  (beta), Ticketmaster and SeatGeek conversational search tools,
  Uber in-app voice booking (rolling out, live status unconfirmed) —
  all partial. Depth unassessed for all 22 in this scoped pass (no
  sales figures looked up), so overall is ungraded for all 22 despite
  graded capability. Gaps, not absence: SeatGeek, AMC, Uber, Marriott,
  Hyatt fetches 403/network/406-walled; Hilton llms.txt timed out.
  Correction the same night: 22 unverified prototype placeholders
  were added, then reverted before any push, after Dave required real
  data; the entries above are the checked replacements, and no
  placeholder version was ever published.

- 2026-10-26 (Instacart platform-mediated upgrade): platform-mediated
  LIVE agent channels now count toward capability: agent cart-building
  via Instacart's Clementine assistant and the ChatGPT + Instacart app
  counts as B+ (cart-only) for confirmed partner chains, with the
  shopper paying in Instacart; partial, store-dependent coverage counts
  as B. 12 chains upgrade to B+ (Aldi, H-E-B, ShopRite, Hy-Vee,
  Sprouts Farmers Market, Tops, Smart & Final, Raley's, Market Basket,
  Stater Bros. Markets, Grocery Outlet, Weis Markets), 2 to B partial
  (Piggly Wiggly, Save-A-Lot), 7 already-B+ chains gain an "Instacart"
  channel only (Kroger, Albertsons, Publix, Stop & Shop, Wegmans,
  Giant Eagle, Schnucks), and Instacart itself is corrected from
  checkout/A+/A- to limited/B+/B+ (in-chat ACP Instant Checkout retired
  March 2026; live scope is cart-building). Announced-only white-label
  Cart Assistant (Kroger/Sprouts/Aldi/Publix) is never the justifying
  channel; human-app-only presence does not count. Market Basket is
  included despite its prior note (platform rule, same logic as Ulta's
  ChatGPT plugin). WinCo Foods, Ingles Markets, and Defense Commissary
  Agency are unchanged (no verified Instacart partnership). Cards now
  show a channel tag row for entries with channels. Directory status
  now unknown 34, limited 36, checkout 17, announced 9; capability
  B+ 22, B 11, A+ 17, D 15, ungraded 31; overall B+ 22, A- 15, B- 23,
  C+ 18, ungraded 31. Portable copy rebuilt.

- 2026-10-25 (check-access run on 50 unknown entries, adjudicated by
  hand): `check-access.js` run over all 50 unknown-status entries; 44
  stay unknown, 4 move to browse on live llms.txt evidence
  (Discount Tire, Dillard's, Kay, American Eagle, all C- capability;
  overalls B-, B-, B-, C+), each with an announcement search finding
  no live agent-checkout integration. Two script suggestions
  rejected: Tops blocked/F (robots names only Amazonbot sitewide, a
  single-vendor crawler block, not consumer shopping-agent policy;
  prior Oct 24 judgment confirmed) and Sherwin-Williams browse/C-
  (llms.txt returns 200 with an empty body, confirmed twice, so no
  discoverability signal). 16 entries could not be read at all (403
  bot walls or timeouts on all three fetches, including Lululemon,
  JCPenney, Petco, Five Below) and remain unknown as gaps, not
  absence. Directory status now unknown 46, browse 23; capability
  C- 27, ungraded 40; overall B- 24, C+ 17, ungraded 40. Portable copy
  rebuilt.

- 2026-10-25 (announced/onboarding re-grade on available capability):
  announced is very different from implemented, so the 15 announced (11)
  and onboarding (4) entries were re-graded on what is actually
  available today; announcement data (status, evidence, source,
  channels, sales, depth) is untouched. Provisional target grades are
  retired: `overallProvisional` removed from all 15 entries, and no
  entry in the file carries it. New capability: Best Buy C-, Gap D,
  Sephora D, URBN D, Ashley C-, Revolve D, Halara D, Lowe's C-
  (unchanged, Mylow discovery is live), Apple D, Aldi D, Macy's C-
  (unchanged, Ask Macy's discovery is live), Ulta B+ (live ChatGPT
  bag-transfer handoff; claimed Google AI Mode checkout unverified and
  not counted), Sprouts D, JD Sports D, Abercrombie D. New overall:
  Best Buy B-, Gap C+, Sephora C+, URBN C, Ashley B-, Revolve C,
  Halara C-, Lowe's B-, Apple B-, Aldi B-, Macy's B-, Ulta A-, Sprouts
  C, JD Sports C+, Abercrombie C. Directory capability now A+ 18, B+
  9, B 9, C- 23, D 20, F 6, ungraded 44; overall now A+ 9, A- 12, B+ 14,
  B 1, B- 21, C+ 16, C 11, C- 1, ungraded 44. No announced or onboarding
  entry now ranks on an announcement: the highest, Ulta B+, rests on a
  live cart channel, not a target.

- 2026-10-25 (platform-provided agent retail merge): the 118 retail
  entries' `platformAgent` values merged from
  `retail-platform-agents-report-2026-10-25.md` (full 2: Amazon,
  Casey's; partial 34; none 81; unknown 1: Five Below). Directory-wide
  distribution now full 2, partial 38, none 86, unknown 3. Caveats
  carried in notes: Casey's full rests on order completion with
  in-agent card payment not explicitly documented; Wix partial is
  merchant-side only; WooCommerce partial is an experimental reference
  implementation with no orders or payment. No grades, statuses,
  channels, or evidence changed; only the three `platformAgent*` keys
  per retail entry. Portable copy rebuilt.

- 2026-10-25 (platform-provided agent field): every entry gained
  `platformAgent`/`platformAgentNote` (plus `platformAgentSource` where
  a source exists), shown on detail pages only; cards unchanged. The
  field covers the business's OWN first-party agent only: full = the own
  agent completes the transaction, partial = the own assistant takes
  steps toward a transaction while the human completes it, none = no
  first-party agent or action-taking assistant found (a Q&A-only support
  bot counts as none), unknown = not yet checked. Third-party
  integrations (ChatGPT plugins, Perplexity, Google AI Mode, UCP, NDC/B2B
  APIs) do NOT count and stay in status/channels; the field never
  changes capability, depth, or overall grades. The 11 airlines were
  mapped from `airlines-policy-report-2026-10-25.md` (partial 4:
  American, Alaska, JetBlue, Frontier; none 5: Delta, United, Southwest,
  Spirit, Hawaiian; unknown 2: Allegiant, Sun Country; full 0); the 118
  retail entries are unknown pending a separate research pass. No
  grades, statuses, channels, or evidence changed. The portable copy was
  rebuilt with `node build_portable.js`. The live GitHub Pages site was
  NOT updated in this pass; pushing happens separately.

- 2026-10-25 (major airlines merge): 11 US major airlines added as a new
  Airlines category (American, Delta, United, Southwest, Alaska, JetBlue,
  Frontier, Spirit, Hawaiian, Allegiant, Sun Country), policy-checked
  2026-10-25 (report: `airlines-policy-report-2026-10-25.md`), directory
  now 129 entries. No airline offers verified consumer AI-agent booking
  with payment. Spirit is included flagged as defunct (`defunct: true`):
  it ceased all flight operations May 2, 2026, shows a Defunct badge on
  its card and a defunct notice on its detail page, and keeps its
  reported grades (status unknown, capability D, overall C, the C being
  an arithmetic artifact of historical revenue). No existing entry
  changed. The portable copy was rebuilt with `node build_portable.js`.
  The hosted page was NOT rebuilt or re-shared in this pass and still
  serves the previous version.

- 2026-10-25 (detail pages): cards reduced to summary info (name, status
  badge, category, sales value, three grade badges); all technical
  details moved to per-entry detail pages with hash deep links
  (`#/business/<slugified-name>`), browser back/forward support, and
  filter/sort/search state preserved on return. No entry data changed.
  The portable copy was rebuilt with `node build_portable.js`. The hosted
  page was NOT rebuilt or re-shared in this pass and still serves the
  previous version.

- 2026-10-24 (capability/depth split): the single `shopAbility` grade was
  replaced on every entry with `capability`/`capabilityNote`,
  `depth`/`depthNote`, `overall`/`overallNote`, and (announced/onboarding
  only) `overallProvisional`, under the rubric above; the page now shows
  three badges per card and Capability, Depth, and Overall sorts alongside
  Size, Name, and Status. Every overall was recomputed from its capability
  and depth with the 60/40 formula and verified to match. No retailer was
  re-verified for this split; grades derive from existing evidence, status,
  category, and sales. The portable copy was rebuilt with
  `node build_portable.js`. The hosted page was NOT rebuilt or re-shared
  in this pass and still serves the pre-grade version.
- 2026-10-24 (shop ability grades): every entry gained `shopAbility`,
  `shopAbilityNote`, and (announced/onboarding only) `shopAbilityProvisional`
  under the rubric documented above; the page shows a grade badge per card
  and a shop-ability sort. Grades derive from existing evidence, status,
  category, and sales; no retailer was re-verified for grading.
- 2026-10-24 (NRF merge): directory grew from 31 to 118 entries with the
  full NRF Top 100 Retailers 2026 list. All 87 new names were policy-checked
  the same day (see `nrf-policy-report-2026-10-24.md`); counts after the
  merge: 18 checkout, 11 announced, 4 onboarding, 15 browse, 17 limited,
  5 blocked, 48 unknown. Two report verdicts were downgraded on merge for
  insufficient verification: JD Sports and Ulta Beauty, both checkout in
  the report, are listed as announced. Default sort is now by sales
  descending, with a sort control for size, name, and status.
- 2026-10-24: all 31 entries checked against live web sources (robots.txt
  agent rules, UCP profiles, llms.txt, vendor announcements). See
  `verification-2026-10-24.md` for the per-entry report: 15 confirmed,
  14 corrected, 2 unconfirmed (Kohl's, QVC/HSN, which rest on the WSJ
  survey and could not be re-verified). The systematic error this pass
  corrected was announced/onboarding integrations presented as live
  checkout.

## Access checker scripts

Two scripts re-run the directory's access checks without hand-fetching
robots.txt, UCP, and llms.txt for every entry. They never edit `data.js`
and never log in, check out, or submit a form. Requires Node 18+
(global fetch). Zero dependencies.

### check-access.js (deterministic pass)

Usage:

  node check-access.js [--input <json>] [--out <json>] [--limit N] [--delay ms]

- `--input`: JSON array of `{name, domain}` or `{name, url}`. Default:
  the `BUSINESSES` array in `./data.js` (domain derived from each
  entry's `url`).
- `--out`: report JSON path. Default `./access-report.json` in the
  working directory. Use `-` to print JSON to stdout (summary goes to
  stderr).
- `--limit`: check only the first N entries.
- `--delay`: milliseconds between requests (default 250). Concurrency
  is 4 entries at a time; each fetch times out after 10s and retries
  twice on 429/5xx with exponential backoff. The User-Agent identifies
  the directory checker.

For each entry it fetches `robots.txt`, `/.well-known/ucp`, and
`/llms.txt` from the entry's domain and records, per source: URL, HTTP
status (or error kind: timeout or network; DNS failures surface as
network), and parsed results (not full bodies, except short excerpts).

- robots.txt: parsed into User-agent groups with Allow/Disallow lists.
  Named AI agents are reported per agent (GPTBot, ChatGPT-User,
  OAI-SearchBot, ClaudeBot, Claude-User, Claude-SearchBot, anthropic-ai,
  PerplexityBot, Perplexity-User, Google-Extended, Applebot,
  Applebot-Extended, Amazonbot, Meta-ExternalAgent,
  Meta-ExternalFetcher, DuckAssistBot, CCBot, Bytespider, cohere-ai,
  YouBot). The generic `User-agent: *` group is recorded separately and
  NEVER counted as agent policy; `generic_only` is flagged when no named
  rules exist.
- UCP: if the body is JSON, capability names are extracted defensively
  (arrays or nested objects) and checkout/fulfillment/payment markers
  recorded. Non-JSON or 404 is absent; a 2xx HTML body is an SPA
  fallback, not a valid file.
- llms.txt: presence plus AI-permission directives and allowed/disallowed
  path patterns from a loose markdown-structure parse, with short
  excerpts. A 2xx HTML body is a fallback, not a valid file.

Deterministic signals (these rules only):
- Named-agent sitewide Disallow, or named consumer agents all
  sitewide-disallowed -> blocked signal. CCBot and Bytespider are bulk
  scrapers, not consumer agents, and are excluded from this signal.
- UCP with a checkout capability -> checkout signal.
- llms.txt browse permission, or robots discovery allowed for named
  agents -> browse signal.
- No positive signal from successfully fetched sources -> unknown
  signal (never none).
- Any fetch failure (403, 429, 5xx, timeout, network) is a gap flag on
  that source. Gaps NEVER flip a signal to absence.

Suggested status/capability follow the signals (checkout -> A+,
blocked -> F, browse -> C-, unknown -> "—"). Limited (B) is never
suggested by this script: partial APIs are not visible in these three
fetches. Every entry gets `announcement_check_required`, because this
script does not search the web and does not verify announcements.
Conflicts are flagged (e.g. named agents allowed but checkout paths
disallowed; UCP checkout with robots blocking).

Output: a report JSON (one object per entry: name, domain, per-source
fetch results, parsed rules, signals, suggested status, suggested
capability, flags, evidence lines) plus a console summary (counts by
signal and by flag).

### adjudicate.js (LLM pass for flagged entries)

Usage:

  node adjudicate.js --report <report.json> [--evidence <evidence.json>]
                     [--out <json>] [--dry-run] [--verdicts <json>]

- `--report`: report JSON from check-access.js (required).
- `--evidence`: optional JSON map of entry name -> search-snippet
  strings, gathered externally. Lets new entries without a `data.js`
  record be adjudicated too.
- `--out`: adjudicated report JSON (default
  `./adjudicated-report.json`).
- `--dry-run`: no LLM call. Writes one prompt markdown file per flagged
  entry into `./prompts/` plus `prompts/SUMMARY.md`, and a skeleton
  adjudicated report to `--out`. Answer the prompts with any LLM and
  merge back with `--verdicts`.
- `--verdicts`: JSON of externally produced verdicts to merge. Accepts
  a map `{name: verdict}`, an array of `{name, verdict}`, or an array
  of verdict objects carrying their own `name`. Verdicts go through the
  same validation as live mode.

An entry is flagged for adjudication when it has any gap flag, any
conflict flag, the `generic_only` flag, or a suggested status of
unknown.

Each flagged entry gets an evidence bundle: the script's fetch results,
signals, and flags; the entry's existing `data.js` evidence (when
re-checking a known entry); and the optional search snippets. The prompt
encodes the directory taxonomy (checkout = live consumer-agent
purchase/booking verified; announced = announced but live unverified;
onboarding = named onboarding, no live checkout; browse = search/browse
only; limited = partial/manual/eligibility-restricted; blocked =
third-party agents blocked; unknown = no policy found; B2B APIs such as
NDC do NOT count as consumer checkout; announced never counts as live;
Q&A-only support bots are not agents) and requires a verdict JSON:
`{status, capability, reasoning (1-2 sentences), confidence
(high/medium/low), sources_used[], needs_human_review (bool)}`.

Live mode env vars (OpenAI-compatible chat completions):
- `LLM_API_KEY`: required for live mode. No key -> use `--dry-run`.
- `LLM_BASE_URL`: default `https://api.openai.com/v1`.
- `LLM_MODEL`: required. No invented default: set the model you want.

Validation: status and capability must be in the taxonomy, reasoning
non-empty, confidence in range. Invalid verdicts are rejected, recorded
in the output, and the entry stays in the review queue. Low-confidence
verdicts also stay flagged. The output keeps script signal, LLM verdict,
and final suggestion as separate fields: the final suggestion takes the
verdict's status/capability only when the verdict is valid, confidence
is high or medium, and `needs_human_review` is false; otherwise it keeps
the script's suggestion. A verdict never silently overwrites a script
signal.

#### Worked backend example: Meta's Model API

`adjudicate.js` speaks OpenAI-compatible chat completions, so any
OpenAI-compatible backend works through the same three env vars. One
concrete example is Meta's Model API, in public preview since July 9,
2026, with US-developer availability. Details below follow third-party
coverage of Meta's docs, so confirm pricing and availability in Meta's
docs before relying on them:

  export LLM_API_KEY=<your MODEL_API_KEY from the Meta Model API dashboard>
  export LLM_BASE_URL=https://api.meta.ai/v1
  export LLM_MODEL=muse-spark-1.3
  node adjudicate.js --report access-report.json

Notes:
- The script reads `LLM_API_KEY`; the dashboard calls the credential a
  MODEL_API_KEY. Same value, different label. Auth is a Bearer token,
  as with other OpenAI-compatible backends.
- Model IDs include `muse-spark-1.3` (also `1.2`, `1.1`) plus
  contributor variants such as `muse-spark-1.3-contributor`.
- Pricing quoted for the standard tier: $1.25 per million input tokens,
  $4.25 per million output tokens, $0.15 per million cached tokens.
  Contributor tier: $0.10 / $0.20 / $0.002. Contributor prompts and
  completions may be used for training; standard-tier prompts are not.
- The older Llama API at `api.llama.com` is reported retired as of
  July 6, 2026, so it is not documented here as a current backend.
  Llama weights remain available via third-party OpenAI-compatible
  hosts (Together, Fireworks, Groq, DeepInfra), which work through the
  same env vars with their own base URLs.

### Secrets hygiene

- Keys come from the environment only. `adjudicate.js` reads
  `LLM_API_KEY` (plus `LLM_BASE_URL` and `LLM_MODEL`) from
  `process.env`. The key is never hardcoded, never given a default,
  and never read from any file by the scripts.
- Local runs: copy `.env.example` to `.env` and fill it in (for Meta's
  Model API, put your MODEL_API_KEY value in `LLM_API_KEY`; see the
  example above). `.env` is gitignored; `.env.example` is the template
  and contains no secrets. Load the file into your shell before
  running, e.g. `set -a; source .env; set +a` — the scripts only read
  the environment and never open `.env` themselves.
- The key is never printed to the console and never written to any
  file the scripts produce: not report JSON, not prompt files, not
  verdict files. Live mode fails loudly if `LLM_API_KEY` is unset
  ("LLM_API_KEY is not set; use --dry-run...") instead of proceeding
  without one.
- Push rule: the GitHub repo is public, and pushes use an explicit
  file allowlist (exactly `index.html`, `data.js`, `README.md`,
  `build_portable.js`, `check-access.js`, `adjudicate.js`,
  `.gitignore`, `.env.example`, `TODO.md`). `.env` and run outputs must never be added to
  a push paths file. `.env` and `prompts/` are gitignored, but report
  JSONs (`access-report.json`, `adjudicated-report.json`) and verdict
  files are not — only the allowlist keeps them out of the repo — so
  never extend it with run outputs.

### Limits

- No web search: announcements are never verified by `check-access.js`.
  Adjudication needs `--evidence` snippets or the existing `data.js`
  record to judge them.
- No live-browser checks: app-only surfaces, JS-rendered pages, and
  on-site checkout behavior are out of reach for both scripts.
- No checkout, login, or form-submission attempts, ever.
- Rate limits and bot walls (403, 429) produce gap flags, not verdicts;
  re-run later rather than treating a gap as absence.
- The scripts check access only. They do not grade depth, do not touch
  sales figures, and do not write `data.js`.
