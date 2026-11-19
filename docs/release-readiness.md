# m.o release readiness (Friendsgiving)

Updated 2026-11-19. Each claim names its evidence level:
1 = design exists, 2 = code reviewed, 3 = automated tests pass, 4 = real people completed it on the live site.
First level 4 evidence (2026-11-19): a real host (Queen Valesha) sent a real guest (Kofi) a personal invite to a UniverSoul Circus trip. Found: the page needed zooming out on his iPhone, guests could copy the invite link, and the trip said "bring". Also found: new trips came with vague placeholder jobs ("Agree the accommodation budget", "Choose the accommodation", "Organize the ride") that guests can't sensibly take. Trips now start with no jobs, show specific examples, and point decisions to votes. All fixed (level 3) and waiting for a second real try.

## Scorecard

| Area | Status | Evidence | Gap |
| --- | --- | --- | --- |
| Core journeys: create, invite, RSVP, update, cancel | Works | 3. Local phone journeys (host and guest) pass. Live check 2026-11-19: create, address search, add guests, personal invite text, guest RSVP, claim item, host sees it; test plan then deleted. | Update and cancel were tested locally, not live. No real users yet. |
| Data persists | Works | 3. Live: a guest's answer from a second browser showed on the host's page after reload (real database). | None found. |
| Permissions and privacy | Mostly | 3. API tests: host-only edits, address and booking link hidden until RSVP, phone numbers never reach the server, host links (host-only, hashed, replaceable, tries capped). Live: a stranger did not see the address. | This branch blocks answered-spot takeover by name, adds expiring/revocable personal secrets and requires host approval for arrival access. Local API and independent-device browser checks pass. Forwarded links still authorize their intended guest; door codes stay host-only. Not deployed or tested by real users yet. Host recovery is level 3 until tried live. |
| Automated tests | Works | 3. 9 API suites and 8 phone journeys pass. GitHub runs type check, API tests and build before every deploy. | Phone journeys run only on demand, not in GitHub. |
| Live matches tested code | Works | 3. Every deploy goes through GitHub after checks pass. Live checks confirm new features are present. | The live site doesn't show which version it runs. |
| Monitoring and recovery | Partly | 3. Every 30 minutes GitHub checks the live site, its database and new errors, and fails (emailing the owner) on a problem. API test: a failed request is counted by route only, with nothing private. The check was run locally for all three cases: fine, one error, site down. | The email itself is level 2 until the owner gets one from a real failure or a test run. Checks can be up to 30 minutes late (GitHub may delay scheduled runs). Errors in page rendering (not the API) only show up if the home page fails. Database restore has never been tried. |

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

1. ~~Host recovery~~ built 2026-11-19 (level 3: API tests and a three-device journey). Known limit: opening a host link on a browser that already has its own plans hides those plans there.
2. Protect answered spots: implemented on this branch; host-issued personal secrets recover a guest across devices. Replacement/revocation invalidate prior devices. Pending PR review and deployment; evidence level 3.
3. ~~Error alert~~ built 2026-11-19 (level 3; email delivery level 2 until tried). GitHub checks the live site every 30 minutes and emails the owner on failure.
4. Restore drill: practise restoring the database once, and write down the steps.
5. Real-user check: Kaela sends invites to 2 or 3 friends; record what they got stuck on (level 4).

Done outside the backlog (2026-11-19): trip "Search Airbnb / Search hotels" links (level 3, host and guest journeys), and Escape no longer closes the plan form while suggestions are open (level 3).

Fixed 2026-11-19 (found by the owner on a real iPhone): the schedule only made the trip's days obvious as a blank box that also overflowed the screen. It now has a Day picker for every trip day plus a Time box, and the width check covers the schedule and vote forms (level 3).

From the same real use (2026-11-19): fast taps between Home, Plans and You got stuck (31 Back steps from 30 taps, and double-tap zoom). Fixed and tested (level 3). Owner asked for a thank-you screen after "Can't make it" and a check-back day for "Still checking": built (level 3).

Found on a real iPhone (2026-11-19): a vote made Final ran off the screen. Cause: the vote card and the "Address shared after you RSVP" line shared the class name `locked`, so the vote took the line's side-by-side layout. Renamed to `locked-note`; `journeys:guest` now makes a vote final and checks it fits for host and guest (level 3).

Lesson: tests on short test phones hid the plan picture, so they never saw it widen the page. `journeys:guest` now uses a tall iPhone too, and forces the picture to its drawn width like Safari does.

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
