# m.o release readiness (Friendsgiving)

Updated 2026-11-19. Each claim names its evidence level:
1 = design exists, 2 = code reviewed, 3 = automated tests pass, 4 = real people completed it on the live site.
First level 4 evidence (2026-11-19): a real host (Queen Valesha) sent a real guest (Kofi) a personal invite to a UniverSoul Circus trip. Found: the page needed zooming out on his iPhone, guests could copy the invite link, and the trip said "bring". Also found: new trips came with vague placeholder jobs ("Agree the accommodation budget", "Choose the accommodation", "Organize the ride") that guests can't sensibly take. Trips now start with no jobs, show specific examples, and point decisions to votes. All fixed (level 3) and waiting for a second real try.

## Scorecard

| Area | Status | Evidence | Gap |
| --- | --- | --- | --- |
| Core journeys: create, invite, RSVP, update, cancel | Works | 3. Local phone journeys (host and guest) pass. Live check 2026-11-19: create, address search, add guests, personal invite text, guest RSVP, claim item, host sees it; test plan then deleted. | Update and cancel were tested locally, not live. No real users yet. |
| Data persists | Works | 3. Live: a guest's answer from a second browser showed on the host's page after reload (real database). | None found. |
| Permissions and privacy | Mostly | 3. API tests: host-only edits, address and booking link hidden until RSVP, phone numbers never reach the server, host links (host-only, hashed, replaceable, tries capped). Live: a stranger did not see the address. | Anyone with the plan link can tap another guest's name and take over their spot (by design, for "answered on another phone"). Host recovery is level 3 until tried live. |
| Automated tests | Works | 3. 9 API suites and 8 phone journeys pass. GitHub runs type check, API tests and build before every deploy. | Phone journeys run only on demand, not in GitHub. |
| Live matches tested code | Works | 3. Every deploy goes through GitHub after checks pass. Live checks confirm new features are present. | The live site doesn't show which version it runs. |
| Monitoring and recovery | Not ready | 2. Cloudflare request logs are on. | No alert when errors happen. Database restore has never been tried. |

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
2. Protect answered spots: once a guest has answered, taking over their name needs the host's OK (or their personal link).
3. Error alert: notify the owner when the live site has errors.
4. Restore drill: practise restoring the database once, and write down the steps.
5. Real-user check: Kaela sends invites to 2 or 3 friends; record what they got stuck on (level 4).

Done outside the backlog (2026-11-19): trip "Search Airbnb / Search hotels" links (level 3, host and guest journeys), and Escape no longer closes the plan form while suggestions are open (level 3).

Fixed 2026-11-19 (found by the owner on a real iPhone): the schedule only made the trip's days obvious as a blank box that also overflowed the screen. It now has a Day picker for every trip day plus a Time box, and the width check covers the schedule and vote forms (level 3).

From the same real use (2026-11-19): fast taps between Home, Plans and You got stuck (31 Back steps from 30 taps, and double-tap zoom). Fixed and tested (level 3). Owner asked for a thank-you screen after "Can't make it" and a check-back day for "Still checking": built (level 3).

Lesson: tests on short test phones hid the plan picture, so they never saw it widen the page. `journeys:guest` now uses a tall iPhone too, and forces the picture to its drawn width like Safari does.

Not this release: trip sections, event search (waiting on Ticketmaster key approval), reminder texts.
