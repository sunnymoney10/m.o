# m.o release readiness (Friendsgiving)

Updated 2026-11-19. Each claim names its evidence level:
1 = design exists, 2 = code reviewed, 3 = automated tests pass, 4 = real people completed it on the live site.
Nothing is level 4 yet: no real guest has used m.o.

## Scorecard

| Area | Status | Evidence | Gap |
| --- | --- | --- | --- |
| Core journeys: create, invite, RSVP, update, cancel | Works | 3. Local phone journeys (host and guest) pass. Live check 2026-11-19: create, address search, add guests, personal invite text, guest RSVP, claim item, host sees it; test plan then deleted. | Update and cancel were tested locally, not live. No real users yet. |
| Data persists | Works | 3. Live: a guest's answer from a second browser showed on the host's page after reload (real database). | None found. |
| Permissions and privacy | Mostly | 3. API tests: host-only edits, address and booking link hidden until RSVP, phone numbers never reach the server. Live: a stranger did not see the address. | Anyone with the plan link can tap another guest's name and take over their spot (by design, for "answered on another phone"). The host is tied to one browser; clearing it loses host control, with no recovery. |
| Automated tests | Works | 3. 9 API suites and 8 phone journeys pass. GitHub runs type check, API tests and build before every deploy. | Phone journeys run only on demand, not in GitHub. |
| Live matches tested code | Works | 3. Every deploy goes through GitHub after checks pass. Live checks confirm new features are present. | The live site doesn't show which version it runs. |
| Monitoring and recovery | Not ready | 2. Cloudflare request logs are on. | No alert when errors happen. Database restore has never been tried. |

## Backlog, in order

1. Host recovery: a private host link so the host can manage the plan from another phone or after clearing the browser. Biggest risk for Kaela's real event.
2. Protect answered spots: once a guest has answered, taking over their name needs the host's OK (or their personal link).
3. Error alert: notify the owner when the live site has errors.
4. Restore drill: practise restoring the database once, and write down the steps.
5. Real-user check: Kaela sends invites to 2 or 3 friends; record what they got stuck on (level 4).

Not this release: trip sections, event search (waiting on Ticketmaster key approval), reminder texts.
