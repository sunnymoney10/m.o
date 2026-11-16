# Live connected-plugin verification

On 2026-11-16, this Codex session used the actual connected mo. plugin, separately from the local SQLite regression harness and replay script.

- Read the existing Site’s access configuration: current caller is owner, custom audience contains only the owner, no external visitors. No access changes were made.
- Called the real `list_plans`: it returned an empty list, so no existing plan was reused or modified.
- The current model structured a clearly fictional Friendsgiving verification plan and called the live `create_plan`. It left date, venue and budget blank; its note explicitly retained dietary needs, total headcount and contributions as unknown.
- Proposed three unclaimed preparation responsibilities: ask about dietary needs/allergies; agree a date and confirm attendance; discuss potluck contributions without recording commitments.
- The tool returned a persisted plan identifier and private Site URL.
- A separate live `read_plan` returned the saved title/note, all three items unclaimed and incomplete, and only the requesting organizer as attending. `list_plans` then returned that same persisted plan. No other guest was added or impersonated.

This is a real connected ChatGPT/Codex-model → hosted MCP → persisted plan → read round trip using the **existing deployed tools**, with no model mock or development identity adapter. No messages, bookings, payments, deployment or audience changes occurred. A clearly labeled fictional verification plan remains in the owner’s plan list. Private plan identifiers, access allowlists, and URLs are intentionally omitted from this repository evidence.

The new `propose_preparation_draft` and `review_preparation_draft` tools exist on this branch only. Their persistence/approval path was verified locally with actual handlers and a separate model-authored draft, not through the hosted plugin. Hosted verification of those new tools requires deployment and plugin refresh; this evidence does not claim otherwise.
