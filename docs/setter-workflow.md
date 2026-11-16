# Reviewable ChatGPT preparation drafts

## Existing and added behavior

Existing: D1 plans, guest sessions/RSVPs, exclusive item claims, seven authorized MCP operations, organizer plan editing, Apple invitation URL, ICS export, private Sites deployment.

Added: two MCP operations for structured preparation proposals and review actions, organizer-private draft persistence, editable web review, atomic apply with optimistic concurrency and retry protection, current RSVP-aware briefings and unsent follow-up text, a generated additive migration. No inference, bookings, messaging, payments, or new Apple API was added. The core stays free.

## Working ChatGPT path

1. Create a real plan in mo., or ask the connected ChatGPT mo. plugin to create one using supplied facts. Missing fields can be blank. `create_plan` registers only the caller; it does not represent the whole headcount.
2. Connect the existing Site’s mo. plugin in ChatGPT (Plugins → Personal → Created by you). After a future deployment, Sites refreshes its MCP tool list. This branch does not deploy itself; the hosted plugin currently still has its old tools.
3. Open the organizer’s plan and paste an outing description or relevant conversation excerpt in “Plan with ChatGPT.” Copy its prompt into ChatGPT with the mo. plugin connected. Alternatively, give ChatGPT the plan UUID and description directly.
4. ChatGPT calls `read_plan`, interprets that supplied source, then calls `propose_preparation_draft`. Its response includes a review URL and revision. The model separates confirmed fields/decisions, suggestions and questions. Proposed items have no assignee. No model/provider key is needed in the browser.
5. Open the review URL as the same organizer. Check the source, proposed fields, decisions, suggestions, questions and items. Correct text, reject individual items, or keep existing fields. Save corrections first; revision increments and approval remains disabled until the saved version is shown. Rejecting the draft changes no plan data.
6. Approve the saved revision in the web app, or explicitly tell ChatGPT to approve that exact revision with `review_preparation_draft`. Applying patches only the proposed fields and creates unclaimed items. It never interprets a comment, inferred assignment, or silence as a guest commitment. Participants still RSVP and claim through their own sessions.
7. Read the plan in either web or ChatGPT. The same API supplies both. Review and copy follow-up drafts to share yourself. No send action exists.

The briefing is deterministic and labeled accordingly. It uses current plan fields, RSVP counts, guest notes, and open tasks. Dietary needs/headcount remain questions when absent; attending count reflects recorded mo. RSVPs, not assumed total guest count. Draft decisions/questions remain in the organizer’s review record; applying does not overwrite the plan note with them.

Web and ChatGPT must resolve to the same organizer identity. Browser guest-cookie ownership does not automatically transfer to ChatGPT; guest-session boundaries are deliberately preserved. If a plan is not yours in ChatGPT, use the owning session or create a plan through ChatGPT. Sharing the URL alone grants no organizer privilege and does not override the Site’s private audience.

## Review and concurrency

Draft edits and resolutions require organizer authorization and the exact revision. Apply is a D1 batch transaction: an SQL snapshot check of plan, guests and tasks first gates the transition to `applying`; every write depends on that transition; the final statement resolves it to `applied`. Errors roll back the batch. A retry of an applied revision succeeds without new items. Concurrent approvals cannot reuse the gate. Draft contents and raw source are returned only to the organizer, not other plan visitors.

If attendance, claims, preparation or plan details change after proposal, apply returns 409 with instructions to read current state and make a fresh draft. Edits to an old draft do not reset that snapshot. This intentionally favors another review over applying an interpretation of old information. Rejected drafts cannot apply.

Unknown source details are questions, not validation-inferred facts. The schema rejects malformed data and assignee fields, but factual interpretation remains a model plus organizer responsibility. No fallback response is fabricated after model/tool failures. Validation, authorization, stale review, and storage errors are surfaced; the review panel explains how to retry after a failed ChatGPT operation.

## Examples

Friendsgiving source: “I’m hosting at my apartment; no date yet. Potluck idea, nobody committed. Dietary needs and final headcount unknown.” A useful draft proposes questions about date, headcount, allergies and contribution expectations; unclaimed preparation to collect those answers; suggested contributions to coordinate once dietary needs are known. It can propose the supplied venue, but leaves date and budget blank.

Trip source: “We’re considering a cabin weekend. No dates, budget or cabin selected. Pat said maybe.” A useful draft asks dates/budget/headcount and proposes unclaimed comparison and transport responsibilities. It does not create a Pat RSVP, accommodation availability, price, booking or payment.

## Verification evidence

`npm run check`, `npm test`, and `npm run build` pass locally on Node 24. The SQLite route harness exercises real API/MCP handlers: existing authorization and claims plus proposal privacy, web/MCP parity, correction/revision, whole/item rejection, repeat apply, changed RSVP, stale snapshot, a plan change between preflight and transaction, injected mid-transaction storage failure/rollback, invalid dates/source/assignees, Friendsgiving and trip cases, and unsent follow-ups. These are regression tests with authored model payloads, not live inference tests.

Separate from those regressions, the implementing Codex model interpreted the fictional source in [codex-proposal.json](demo/codex-proposal.json) during this session. That output was passed through actual MCP → authorized API → a persistent local SQLite database, reviewed, and applied in separate invocations. [local-roundtrip.json](demo/local-roundtrip.json) records the result: proposal left the plan untouched; approval saved the supplied venue and five unclaimed items; retry stayed at five. The adapter simulates development identity/storage bindings. This demonstrates this session’s model-authored output reaching persistent app state. It does **not** verify hosted ChatGPT plugin discovery, production identity, a new live provider call, or browser interaction. Replaying the saved payload is not fresh inference.

To reproduce persistence locally (a replay, not new model generation):

```sh
node scripts/demo-setter.mjs /tmp/mo-demo.sqlite propose < docs/demo/codex-proposal.json
# Review the printed before/after state and draft, then use its exact id/revision:
node scripts/demo-setter.mjs /tmp/mo-demo.sqlite apply <draft-id> 1
node scripts/demo-setter.mjs /tmp/mo-demo.sqlite apply <draft-id> 1
```

Use a new database path for a fresh run. Nothing contacts real guests or production. URLs ending in `local-demo.invalid` in the receipt are intentionally non-hosted demo URLs.

A separate [live connected-plugin round trip](demo/hosted-roundtrip.md) was also performed through the existing owner-private deployment: the actual connected plugin created a fictional model-structured plan and independently read it back. The saved date/place/budget stayed unknown and all three preparation items stayed unclaimed. This verifies the existing hosted conversational path; the new draft tools still need deployment before their hosted path can be verified.

## Remaining verification and configuration

The branch has not been deployed. Before hosted acceptance: deploy the reviewed branch through Sites without changing audience, apply the tracked migration through that workflow, refresh/connect the existing plugin, and exercise the steps above in ChatGPT and browser with the organizer’s actual Site identity. Confirm a guest decline reopens a claimed item, draft approval appears in both clients, and the Apple link/ICS buttons still work in-browser. Browser QA and a hosted ChatGPT round trip **for the new draft tools** have not been performed in this environment. The existing hosted tools’ real round trip is recorded above.

No server-side inference provider or secret is configured; the app states this. Embedded inference is deliberately deferred. No visitors are asked to paste credentials. Existing owner-private Site identity and hosting manifest remain unchanged; GitHub does not deploy it automatically.

## Apple handoff

The existing manual handoff is retained: copy the coordination link into an Apple Invites Link tile, optionally retain the original HTTPS invitation link, and download the one-time ICS export after setting a date. RSVPs remain separate. There is no new Apple integration, private guest-list access, automatic synchronization, booking or messaging. The existing implementation was preserved; no undocumented Apple API is assumed.
