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

## Verification history

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
