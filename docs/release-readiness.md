# m.o release readiness (Friendsgiving)

Updated 2026-11-20. Historical live evidence is retained; PR #27 changes below remain unshipped. Each claim names its evidence level:
1 = design exists, 2 = code reviewed, 3 = automated tests pass, 4 = real people completed it on the live site.
First level 4 evidence (2026-11-19): a real host (Queen Valesha) sent a real guest (Kofi) a personal invite to a UniverSoul Circus trip. Found: the page needed zooming out on his iPhone, guests could copy the invite link, and the trip said "bring". Also found: new trips came with vague placeholder jobs ("Agree the accommodation budget", "Choose the accommodation", "Organize the ride") that guests can't sensibly take. Trips now start with no jobs, show specific examples, and point decisions to votes. All fixed (level 3) and waiting for a second real try.

## Scorecard

| Area | Status | Evidence | Gap |
| --- | --- | --- | --- |
| Custom invites | Implemented, unshipped | 3. Emoji-only style selection, browser-resized covers, host-only save/remove and host/guest phone checks pass. | Public preview unavailable; no physical-device or live-user check of these additions yet. |
| Core journeys: create, invite, RSVP, update, cancel | Works | 3. Local phone journeys (host and guest) pass. Live check 2026-11-19: create, address search, add guests, personal invite text, guest RSVP, claim item, host sees it; test plan then deleted. | Update and cancel were tested locally, not live. No real users yet. |
| Data persists | Works | 3. Live: a guest's answer from a second browser showed on the host's page after reload (real database). | None found. |
| Permissions and privacy | Mostly | 3. API tests: host-only edits, address and booking link hidden until RSVP, phone numbers never reach the server, host links (host-only, hashed, replaceable, tries capped). Live: a stranger did not see the address. | This branch blocks answered-spot takeover by name, adds expiring/revocable personal secrets and requires host approval for arrival access. Local API and independent-device browser checks pass. Forwarded links still authorize their intended guest; door codes stay host-only. Not deployed or tested by real users yet. Host recovery is level 3 until tried live. |
| Automated tests | Works | 3. 9 API suites and 8 phone journeys pass. GitHub runs type check, API tests and build before every deploy. | Phone journeys run only on demand, not in GitHub. |
| Live matches tested code | Works | 3. Every deploy goes through GitHub after checks pass. Live checks confirm new features are present. | The live site doesn't show which version it runs. |
| Monitoring and recovery | Partly | 3. Every 30 minutes GitHub checks the live site, its database and new errors, and fails (emailing the owner) on a problem. API test: a failed request is counted by route only, with nothing private. The check was run locally for all three cases: fine, one error, site down. | The email itself is level 2 until the owner gets one from a real failure or a test run. Checks can be up to 30 minutes late (GitHub may delay scheduled runs). Errors in page rendering (not the API) only show up if the home page fails. Restore from a backup was practised on 2026-11-19 against the live database (all tables matched; steps in `docs/restore.md`). Rewinding with Time Travel was not practised, because it changes the live data. |

## Tap counts (`npm run ux:taps`, 2026-11-19, level 3)

Typing in a box is counted separately from taps. "Send in Messages" counts as one tap.

| Who | Task | Taps | Boxes typed |
| --- | --- | --- | --- |
| Host | Create a plan (name, where, when) | 3 | 4 |
| Host | Add 3 guests (pasted list) | 3 | 1 |
| Host | Add 1 guest with iPhone AutoFill Contact | 6 | 0 |
| Host | Send the first invite | 4 | 0 |
| Host | Send each next invite | 2 | 0 |
| Host | Record an answer for a friend who texted back | 4 | 0 |
| Host | Change the date | 2 | 1 |
| Host | Delete the plan | 3 | 0 |
| Guest | Personal link: say I'm in | 1 | 0 |
| Guest | then pick something to bring | 1 | 0 |
| Guest | Add to calendar | 2 | 0 |
| Guest | Open the address in Maps | 1 | 0 |
| Guest | Change answer to can't go | 4 | 0 |
| Guest | Group-chat link: answer | 3 | 0 |

## Backlog, in order

1. ~~Host recovery~~ built 2026-11-19 (level 3: API tests and a three-device journey). The old recovery copied identity and hid the receiving browser’s plans; the review-fix branch below replaces that behavior with per-plan grants.
2. Protect answered spots: implemented on this branch; host-issued personal secrets recover a guest across devices. Replacement/revocation invalidate prior devices. Deployed in PR #21; evidence level 3.
3. ~~Error alert~~ built 2026-11-19 (level 3; email delivery level 2 until tried). GitHub checks the live site every 30 minutes and emails the owner on failure.
4. ~~Restore drill~~ built 2026-11-19: steps in `docs/restore.md`, and a Restore drill workflow. The local rehearsal passed (level 3) and found that a D1 backup can't be loaded as-is (guests before plans), now fixed. Live drill passed 2026-11-19: backup restored into a practice database, all 12 tables and 15 database updates matched, practice copy deleted.
5. Real-user check: a real host sends personal invites to 2 or 3 friends before Thanksgiving (Nov 26); record what they got stuck on (level 4). Steps: `docs/real-user-checklist.md` (also a private tick-off page for the owner's phone).

   Results (fill in after the run):

   | Step | Who (first name) | Phone / app | What happened | Fixed in |
   | --- | --- | --- | --- | --- |
   | | | | | |

Done outside the backlog (2026-11-19): trip "Search Airbnb / Search hotels" links (level 3, host and guest journeys), and Escape no longer closes the plan form while suggestions are open (level 3).

Fixed 2026-11-19 (found by the owner on a real iPhone): the schedule only made the trip's days obvious as a blank box that also overflowed the screen. It now has a Day picker for every trip day plus a Time box, and the width check covers the schedule and vote forms (level 3).

From the same real use (2026-11-19): fast taps between Home, Plans and You got stuck (31 Back steps from 30 taps, and double-tap zoom). Fixed and tested (level 3). Owner asked for a thank-you screen after "Can't make it" and a check-back day for "Still checking": built (level 3).

Found by the owner on a real iPhone (2026-11-20), fixed (level 3):
- A skate day plan came with Thanksgiving items ("The main dish, Something sweet, Drinks & ice") already filled in. Whatever is in that box becomes the real bring list, so guests would have seen it. Get-togethers now start with an empty list, like trips. Examples show only as grey hints, and switching plan type keeps what the host typed (`journeys:guest`).
- Owner asked for start and end times: get-togethers now have "Add an end time" (3 hours after the start by default). Plan page, invites and calendar show "4:00 PM – 7:00 PM" (`journeys:dates`: host and a stranger guest on an iPhone 14 Pro Max, and the guest's calendar after answering).
- The host couldn't remove or fix a bring-list item (the owner added "Grandma" by mistake). The host now has Edit and Remove on each item; guests don't (API tests and `journeys:items`, host and guest on an iPhone 14 Pro Max).
- The owner couldn't switch a plan between Get-together and Trip, and wanted to change plans without deleting them. Edit plan now has the type buttons and an "Add to the bring list" box; the server saves the type, host only (API tests and `journeys:items`).
- Owner asked how a guest (Mom) can bring someone the host doesn't know (Cynthia) without anyone sharing numbers. Built: ask, host approves (or opens the plan), the link goes through Mom or the host, and Cynthia joins "with Mom" within Mom's 4 spots (API tests and `journeys:plusones`: host, Mom, a stranger and Cynthia on iPhone 14 Pro Max). m.o can't send phone notifications; the host learns from Mom's text and the request at the top of the plan.
- Owner asked for Genmoji pictures, not only emoji: "Your picture" now has a Genmoji choice (any emoji works too). Level 3 with a simulated Genmoji picture, since a real one needs an iPhone with Apple Intelligence; a real Genmoji on the owner's iPhone would make it level 4.
- First real try failed (owner's iPhone, 2026-11-20): the Genmoji reached the box but no preview appeared. Likely cause: Safari doesn't always send an input event for a Genmoji, and the picture can load late or arrive only as a <source>. Fixed: the box watches itself, waits for the picture, copies it from the screen, handles <picture>/<source>, and shows a message describing what arrived if it still can't read it. Level 3 again (simulated); needs a second real try.
- Second real try (owner's iPhone): the owner was in "Customize your invite", whose emoji box is a plain text box, where iPhone greys out Genmoji. Added a Genmoji box there (shared with the profile picture), drawn into a cover image. Also fixed a stale-settings bug the test caught (the first Genmoji invite used the old colour). Level 3 (simulated Genmoji); needs a third real try.
- **Level 4 (2026-11-20):** the owner made a real plan on their iPhone ("Skating Day at Skyvue") with a real Genmoji in "Customize your invite". The invite shows the Genmoji big in the middle and twice small on sage, as designed. Profile-picture Genmoji is still level 3 until tried on a real phone.
- Owner asked for plans in date order (the list was newest-made first, so Nov 21, Dec 5, Nov 25). Now soonest first, then no date, then past; host and guest (API tests and `journeys:order`, level 3).
- Owner found that tapping a tab after scrolling to the bottom left the new tab scrolled to its bottom. Now the new tab opens at its top, just under the sticky tab bar (no jump when already near the top); host and guest (`journeys:tabs`, level 3).
- Owner found plus-ones didn't reach the main guest list, weren't greeted as plus-ones, and couldn't answer for themselves (the +1 counter only made a count). Now one way only: the counter is gone, pending plus-ones show in the host's guest list, invites and greetings say who brought them, and each plus-one answers for themselves (`journeys`, `journeys:plusones`; level 3).
- Send invites rows were squeezed: the Replace/Revoke link buttons landed in the picture column and stretched it. They now sit on their own line, and on small phones Send/Again moves under the phone box. The message preview also ran off the right edge; it now wraps. `journeys:invites` checks it on three iPhone sizes, including the 14 Pro Max.

Found on a real iPhone (2026-11-19): a vote made Final ran off the screen. Cause: the vote card and the "Address shared after you RSVP" line shared the class name `locked`, so the vote took the line's side-by-side layout. Renamed to `locked-note`; `journeys:guest` now makes a vote final and checks it fits for host and guest (level 3).

Lesson: tests on short test phones hid the plan picture, so they never saw it widen the page. `journeys:guest` now uses a tall iPhone too, and forces the picture to its drawn width like Safari does.

Launch audit fixes (2026-11-20, from the full audit; this branch, not deployed yet):
- Link previews: a plan link shows its cover picture (or an m.o illustration for a party or trip) and the home page has its own preview. The address never appears in the preview (`journeys:previews`, level 3).
- Browser protections: content policy, no framing, nosniff, HTTPS only, camera/microphone off on every response. Checked against a production build with no blocked content on the home page, plans, profile, covers, Genmoji and address search (level 3).
- Page not found: an m.o page with a 404 status and two ways back, on a tall and a small iPhone (level 3).
- Usage numbers: daily counts per kind of action only, no IDs or names, private to the owner in the Cloudflare dashboard (API test, level 3). Nobody has read them on the live site yet (level 2 there).
- Privacy and Terms pages: written from what the code actually stores and sends (level 2). Contact: Supportdesk_m.o@proton.me (owner's support address). A lawyer should read them before a wide launch.
- Live check after PR #33 (2026-11-20): headers, previews, 404, Privacy, Terms and the address rule (named guest sees it after answering; a stranger doesn't) all confirmed on the live site with a throwaway plan, then deleted (level 3 on live; no real users yet). Usage counts: not yet read on live (level 2 there).
- Brand, direction A (2026-11-20, this branch): drawn logo and mark, app icons and manifest, all stylesheet colours, sizes and corners on tokens, new link previews, and small-phone "Get it ready" rows that keep the text full width. Level 3 (journeys, a11y, icon/manifest checks). The home-screen icon on a real iPhone is still to be checked by the owner (level 4).
- Help page (`/help`): fixed answers to the common questions, "Still stuck?" email at the bottom; tall and small iPhone checks (level 3).
- Owner decision: guests invited by name see the address as soon as they answer; strangers from the group link still need the host's OK, and the host can hide it from anyone. API tests and `journeys:access` (host, named guest and stranger on a tall iPhone), level 3. Guests already on live plans keep their current setting.

Not this release: trip sections, event search (waiting on Ticketmaster key approval), reminder texts.

## Personal-link access branch — review evidence

Base: `cd3ca62` (#19). Production deployment and audience were left unchanged.

- Level 3: API handlers against SQLite verify independent random personal secrets, host-only issue/replace/revoke, private RSVP notes, guest-only changes, multi-device recovery, expiry and invalidated device access.
- Level 3: `journeys:access` passed against the local Worker/D1 database with independent phone sessions. Host prepares a link; guest answers and claims; arrival approval is checked separately; door codes remain absent; a second device recovers the same record; revocation blocks writes and the old URL returns 410.
- Guest RSVP remains one tap from a prepared personal invite. Host sending now includes an explicit preparation step: first invite 5 taps (previously 4); each next invite 3 (previously 2). This cost creates a revocable credential. Arrival approval is a separate host action.
- Existing deployment history is preserved. Only new migrations 0012 and 0013 are added.
- A first-HTML-response cookie avoids competing first-visit API responses replacing the visitor identity.
- Not claimed: production tests, verified real identities from links, automatic message delivery, error alerting, or a completed database restore drill.

Next: review and deploy the access branch, then run one controlled real host/three-guest check. Error alerts and a documented restore drill remain subsequent work; no monitoring credentials or live infrastructure were changed in this branch.

Validation completed locally for this branch: `npm test`, `npm run check`, `npm run build`; `journeys`, `journeys:quiet`, `journeys:invites`, `journeys:places`, `journeys:dates`, `journeys:host`, `journeys:guest`, `journeys:answers`, `journeys:tabs`, `journeys:profile`, `journeys:access`, `a11y`, `ux:metrics`, and `ux:taps` passed. Browser journey source fixtures now issue real personal secrets and explicitly approve arrival access. Final Friendsgiving run uses an exact plus-one Approve selector (the new arrival button also contains “Approve”); places rerun waits for hydration. Initial parallel attempts hit hydration/selector timeouts; the final reruns passed. Screenshots use synthetic local records only.

Host tap counts measured locally: create 3 taps/4 typed boxes; paste three guests 3/1; prepare/send first invite 5/0; each next invite 3/0; note a texted answer 4/0; change date 2/1. Guest: personal RSVP 1/0; claim 1/0; calendar 2/0; Maps 1/0 after host approval; cancel 4/0. Form-detail RSVP path measured 3 taps, 4 including a claim. These are automated level-3 measurements, not observed real-user conversion.

## Recovery review fixes — 2026-11-20 (not deployed)

Baseline checked before editing and checked again after the owner flagged updates: main `e3e760c` (#22 monitoring, #23 restore workflow, #24 live restore evidence), then open PR #25 `469371f`. After #25 merged, this branch was rebased onto current main `9d33a2e`; its empty bring lists, item editing/removal, type changes, end times and invitation layout are preserved. The existing historical evidence above is not a claim that these new fixes have shipped.

Implemented for review: preserve private RSVP fields on status-only changes; redeem personal credentials before clearing the fragment; scope new host recoveries to one plan; invalidate recovered-device grants on key replacement; preserve the receiving browser’s existing plans; validate end dates when a date vote is finalized; include authorized scoped contribution totals; explain device-owned profiles; require signed gateway identity for API/MCP integration; correct invitation delivery/privacy copy; complete temporary demo invitation previews; promote open trip decisions and completed replays; collapse optional profile customization; add keyboard address selection and plan tabs.

Compatibility: new migration 0015 only. New host grants are revocable; old releases that copied the owner cookie cannot be separated retroactively from the original device. Integration tool calls require the documented signed gateway and MO_IDENTITY_SECRET; neither was configured on production. Browser guest access does not require ChatGPT login.

Current live check during this work: health endpoint returned database=true, recentErrors=0. A preceding scheduled monitor run had failed with API 500 responses; its historical cause was not established and no live repair was attempted. Monitoring and restore work was preserved.

Validation completed locally on the rebased source: `npm test`, `npm run check`, `npm run build` passed. All 16 browser suite commands passed on their final runs: `journeys`, `journeys:quiet`, `journeys:invites` (including #25’s three-phone layout checks), `journeys:places`, `journeys:dates`, `journeys:host`, `journeys:guest`, `journeys:answers`, `journeys:tabs`, `journeys:items`, `journeys:profile` with a synthetic photo, `journeys:access`, new `journeys:recovery`, `a11y`, `ux:metrics`, `ux:taps`. No whole-journey address stubs were added for this run; provider-result fixtures remain in the relevant existing search tests and the keyboard regression.

Evidence level 3: the new API assertions verify preserved private RSVP fields, explicitly cleared form values, per-plan host recovery, retained browser identity, revoked recovered-host access, rotating-device retention, signed gateway authentication, rejected raw/tampered/expired assertions, scoped contribution totals and atomic rejection of an invalid date vote. The recovery browser journey verifies refresh without accidental RSVP, another device’s saved details and claims, keyboard selection, temporary demo links without writes/SMS, visible trip decisions and replay priority. The host journey also checks the generated/replacement link remains visible and recovered host tools disappear after rotation.

Initial browser failures identified a disappearing host-link display after parent refresh, collapsing profile customization after photo reload, and a changed greeting expectation. These were corrected and affected suites rerun successfully. New test helpers wait for client readiness. A local environment restart also interrupted a run; the final host/recovery checks passed on the restarted preview. Unrelated suites were not described as production checks.

Measured taps remain: guest RSVP 1 and claim 1 more; first host invite 5 and each next 3. Profile customization is one optional disclosure. These are scripted level-3 measurements. No new real-user (level-4), SMS-delivery or full WCAG-compliance claim is made. No production events, audience settings or deployments were changed.

### Custom-plan and appearance follow-up (same unshipped branch)

Owner clarification: plans must be entirely the host’s own, with Friendsgiving/Atlanta only examples; invite backgrounds should be customizable without a flyer editor. The entry action now says “Start your own plan” and appears above the example art. New plans remain blank. Layout modes are optional, while theme, background color and a host-chosen emoji style a compact header. There are eight theme presets plus a single custom emoji, with a live title preview. Appearance is saved on the plan, visible to guests, editable by hosts only, and independent of RSVPs/contributions. New migration 0016 adds defaults for existing records. Social-message thumbnails remain the standard card in this first version.

API tests cover title freedom, empty task lists, palette/emoji validation, persisted appearance, guest write denial and preserving appearance on unrelated edits. The new themes phone journey covers creation, preview, host/guest appearance across phone sizes and restyling without changing attendance. Existing trip-mode test helpers now open the optional layout disclosure. Final updated validation: API tests, type check and production build pass, and all 17 browser suite commands pass on final runs (the prior 16 plus `journeys:themes`). The original activity and item fixtures were preserved, with renamed CTA selectors and optional-layout helpers. Initial quiet/places failures were resolved: the places selector used the old CTA label, and a delayed host-note save could close a newer form. Update-answer controls now wait during a write, and completion closes only the corresponding form. The quiet fixture waits for the save to finish. Final isolated reruns pass. A prior attempt lost its detached local preview; a managed preview stayed up for the completed matrix.

Theme evidence level 3: a custom skating title and empty task list are created through the UI; theme suggestion is explicitly selected; invalid emoji is explained before submission; the compact live preview is inspected; a tall host phone and small signed-out guest phone see the saved header; a later host restyle preserves the guest RSVP. SVG header colors/emoji are validated on the server. No live rollout, real SMS delivery or full accessibility certification is claimed. Core tap counts remain guest RSVP 1, claim 1 more, first host invite 5 and each next 3; optional theme choices add their own interactions.

A final identity-domain regression also passes: signed gateway actors cannot alias browser bearer UUIDs, and a browser cookie cannot adopt a namespaced gateway owner. UUID-based gateway IDs must be prefixed as documented.


### Emoji-only styling and uploaded covers (unshipped PR #27 follow-up)

Source verified again before editing: main advanced to `4a25fdf` (#26 plus-one requests/approval). Merged it, retaining host approval, guest-passed links, privacy and four-person caps. All existing SQL migration contents remain unchanged. Reconciled the two differently named 0015 migrations in the unshipped journal/snapshots; generated `0018_swift_clea.sql` for cover image/time. Fresh-schema API tests execute every SQL migration and verify both plus-ones and host grants.

One emoji now selects a theme and color without requiring a preset selection. Unknown emoji get a stable palette and remain the header artwork; manual theme/color adjustments are available. Alternatively, the host can upload an image. The browser center-crops/redraws it to 1000×500 JPEG under 96 KB before saving (20 MB source limit); browser decoding may require HEIC/AVIF users to choose JPEG/PNG instead. Redrawing strips original metadata. Images live in D1, use a separate no-store image response, are omitted from plan JSON and list payloads, and can be replaced/removed only by a host. Anyone with the plan link can view the cover; the UI explains this. Arrival details and door codes retain their separate protections. No provider/API key or R2 setup is needed.

Evidence level 3: unit/API tests pass for emoji mapping/fallback, cover creation/update/removal, host-only writes, rejected remote URLs/SVG/oversize/malformed inputs, omitted image bytes in plan JSON, no-store responses, and preserving covers on unrelated edits. Tall-host/small-guest browser checks pass for emoji-only choices, bad upload recovery, image resize/display, retained image on reopen/save, removal back to emoji, and unchanged RSVP. `npm test`, `npm run check` and `npm run build` pass. All 18 merged browser suite commands passed: journeys, quiet, invites (including three-phone layout), places, dates, host, guest, answers, tabs, items, plusones, profile with a synthetic photo, access, recovery, themes, a11y, ux:metrics and ux:taps. Core interaction counts remain unchanged; optional emoji/upload choices add their own interactions. Public preview remains unavailable: this environment exposes no HTTP preview portal and temporary tunnel requests were blocked. No live deployment, audience change or real plan/RSVP mutation was made.


### Focused retest requested by owner (2026-11-20)

Retested the PR locally with independent tall-host/small-guest browser contexts and synthetic records. Found and fixed a validator bug: valid keycap emoji such as 1️⃣ and #️⃣ were rejected. Keycaps now work, while plain digits and multiple emoji remain rejected. Added API regressions covering keycaps, flags, skin-tone and joined sequences. Strengthened the browser journey to compare actual old/new image bytes and verify a guest gets the replacement cover, then removal restores the emoji and retains their RSVP. Fresh `npm test`, `npm run check`, `npm run build`, `journeys:themes` and `journeys:access` all pass (level 3). This focused rerun supplements the preceding 18-suite merged-source run; no physical-device, production or live-delivery claim is made. No live data was changed.
