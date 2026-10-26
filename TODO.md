# Agent Yellow Pages — TODO

Open work items for the directory. Completed items move to the
Verification history section of README.md. Format follows the common
markdown-checklist convention: `- [ ]` open, `- [x]` done, with the
date added and the source or prior note cited per item.

## Expansion list (picks, in order, 2026-10-24)

Said when retail was done at 118 entries; re-supplied 2026-10-26
because it had never been written down. Checked pass 2026-10-26
added top-player entries with real evidence for all four categories;
depth grades for the 22 are still open (see Open).

- [x] Travel: airlines, hotels, OTAs, rental cars. Airlines DONE
  (11 majors merged 2026-10-25); hotels (Marriott, Hilton, Hyatt),
  OTAs (Expedia, Booking.com), rental cars (Enterprise, Hertz, Avis)
  added 2026-10-26, checked.
- [x] Food delivery and restaurants: DoorDash, Uber Eats, Domino's,
  Starbucks, Chipotle. All five added 2026-10-26, checked.
- [x] Tickets and entertainment: Ticketmaster, StubHub, SeatGeek, AMC.
  All four added 2026-10-26, checked.
- [x] Rides and home services: Uber, Lyft, TaskRabbit, Thumbtack,
  Rover. All five added 2026-10-26, checked.

## Open

- [ ] Verify Instacart's UCP status (2026-10-26). A checkout manifest
  at instacart.com/.well-known/ucp would raise the partner ceiling
  from B+ (cart-building) to A+ (checkout). The direct fetch was
  blocked in the prior pass and not re-attempted; try a browser check
  or search for UCP merchant coverage. Source: Instacart vector
  report, 2026-10-26.
- [ ] Re-check the 16 gap-walled unknown entries (2026-10-25 run).
  All three fetches (robots.txt, UCP, llms.txt) returned 403 bot
  walls or timeouts, so these are gaps, not absence: TJ Maxx, Meijer,
  O'Reilly Auto Parts, Tractor Supply, Health Mart, Good Neighbor
  Pharmacy, Saks Fifth Avenue, Lululemon, JCPenney, Petco, Raley's,
  Exxon Mobil, Overstock, Five Below, Advance Auto Parts, Spirit
  Airlines (defunct; network errors expected, lowest priority).
  Retry later or via a browser that can pass the wall. Never grade a
  gap as blocked.
- [ ] Verify WinCo Foods and Ingles Markets Instacart partnership
  (2026-10-26). Held unverified: branded product pages on Instacart's
  dev-tools domain do not prove retailer partnership. Needs a
  partnership announcement or Instacart retailer-directory listing.
- [ ] Resolve Sun Country Airlines 2026 Allegiant acquisition timing
  (2026-10-25). Secondary sources conflict; affects whether Sun
  Country stays a separate directory entry.
- [ ] Verify Southwest ChatGPT plugin handoff mechanics (2026-10-25).
  The plugin is discovery only today; if payment ever completes
  in-chat, Southwest could move from C- toward B+.
- [ ] Assign depth grades and sales figures for the 22 expansion
  entries (2026-10-26 pass left depth ungraded, so overall is
  ungraded for all 22 despite graded capability).
- [ ] Re-check gap-walled expansion entries via browser or a later
  run (SeatGeek, AMC, Uber, Marriott, Hyatt fetches 403/network/
  406-walled; Hilton llms.txt timed out).
- [ ] Decide: do action-taking help chatbots upgrade capability?
  (2026-10-26; see README Verification standard, "Help and support
  chatbots"). Q&A-only bots do not count (existing rule). Help bots
  that change or cancel orders, start returns, or issue refunds
  already count as platformAgent partial; whether they also lift
  capability to B is undecided. Until decided, help-bot actions do
  not change capability grades.

## Awaiting Dave

- [ ] REI draft entry: add as entry 130 or not (draft: Outdoor,
  $3.54B 2025 net sales, status unknown, capability ungraded,
  depth A). Decision pending.
- [ ] Delta platformAgent: confirm `none` or override (2026-10-25).
  The only first-party mention found was an unconfirmed agent-browser
  test; the builder set it to none, flagged for confirmation.

## Done

Completed items are recorded in README.md, Verification history.
