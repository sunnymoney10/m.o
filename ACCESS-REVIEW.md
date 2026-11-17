# Version 11 access review

## Source provenance

The authoritative source is the Sites Git repository for project
`appgprj_6afa796d8bb081919aa07964f3109ea2`, branch `main`, commit
`565166838f2c2fbc064cc25a0d25a6367956eee7` (saved version 11).
Sites version history and the fetched repository HEAD both match that SHA.
GitHub main was `f231349556abafe65e705556b8659636a31b78bd` and did not match:
it contained a different plan/profile interface and lacked the current host desk.
This branch reconciles the source to version 11 before applying access changes.
Review the source reconciliation separately from the security changes below.
No production source branch, database, deployment or audience was changed.

## Acceptance criteria and implementation

- `/host` requires Sites identity at server render; private desk data and link management require identity and scope all records by owner. Sign-in creates a separate user's empty desk, never another host's records.
- Guest reply links authorize only the linked guest. Body-supplied guest/owner IDs cannot change that scope. Other guests' private notes, phone numbers, dietary/transport responses and host address are absent from reply cards.
- Personal links are random bearer capabilities, hashed in storage, expiring after 30 days. Replacement/revocation denies reads and writes. Guest writes also recheck link existence within the conditional SQL update so revocation wins over in-flight saves.
- Forwarding a link permits replying as its invited guest. This is explained on the card. Clear the fragment from browser history after capture; never include it in request URLs. API responses disable caching and referrers.
- Door codes never appear in guest API responses, even after confirmation and host release. Host sends these through a separately verified channel. Revocation cannot retract information already viewed; rotate an exposed physical door code separately.
- Legacy plan endpoints require authentication and existing membership; UUID possession no longer grants access or self-enrollment. Existing authenticated members retain their own RSVP and task actions. Other members' RSVP notes are redacted.
- `/demo` contains fictional host records, saves only in memory, and offers guest demo cards at `/reply?demo=inez` and `/reply?demo=omar`. These demo URLs have no live bearer token or database writes.

## Test evidence

`npm test`: actual API handlers against an in-memory SQLite database with all migrations; independent signed-out, host, invited guest, unrelated user, replaced/revoked/expired link cases. Includes scoped contributions, role/errand exclusivity, privacy, forwarded-link code exclusion, CSRF and stale-save conflicts. Identities are simulated trusted gateway headers; this does not verify the deployed gateway itself.

`npm run check`: TypeScript.
`npm run build`: production bundle (existing large-client-chunk warning).

Browser QA: local `/demo` renders the fictional simulation and displays its isolation label; Save changes displays "Demo only". Guest demo card renders and allows temporary reply testing. Local preview has no production database or audience connection. Hosted multi-account sign-in tests remain necessary before rollout.

## Hosting and rollout restriction

The live Site is currently `custom` access, with only the owner allowed and zero external visitors. Sites enforces that gate before `/reply` reaches the app: a personal link cannot admit a signed-out visitor or someone outside that audience. Native platform supports `custom` and `public`, plus external visitor invitations. Keep the existing audience until hosted multi-account tests pass; decide between explicitly invited platform accounts and a separately approved public deployment afterwards. No bypass token belongs in browser code or guest links.

Preview: `npm run dev`, then http://127.0.0.1:5173/demo (Cloud browser/local workspace only). The live Site still runs version 11. This PR does not publish a new release or create a public preview. Local preview cannot certify hosted guest reachability.

Migration reconciliation retains GitHub's original SQL and snapshots and adds the version 11 host/reply tables. The histories diverged at migration 0002. Do not automatically run a merged journal on production: compare the actual migration ledger first. No live migration was executed. Future schema generation needs a reconciled snapshot including both histories.
