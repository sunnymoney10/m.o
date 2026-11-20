# m.o project instructions

m.o (written with the dot between the letters) is pronounced em-oh. The promise is “Make it out the groupchat.”

## Product center

Empower the setter: the person who plans, clarifies responsibilities, and follows through. The originating cases are a shared accommodation trip and a Friendsgiving host having to repeatedly ask what guests are bringing.

Keep the consumer core genuinely free. Build from real coordination problems and preserve clear distinctions between confirmed decisions, unknowns, and suggestions. Do not introduce concierge fees, paid recaps, people scores, or a revenue model as settled decisions.

## Implementation

Real plans persist in D1. Demo details are fictional and temporary. Every write must validate inputs and enforce the current caller’s permissions. A shared plan link does not override the Site’s access policy. Never treat silence or an AI inference as someone’s commitment. Claiming an item records only the current user’s responsibility.

ChatGPT integration is through the Site MCP endpoint. The in-app setter check is deterministic; do not label it as a model response. Apple Invites integration is manual linking plus calendar export; do not claim automatic RSVP sync. Do not add provider calls that require secrets without configuring the required connection.

Run `npm run check`, `npm test`, and `npm run build` for relevant code changes. Keep generated migrations and their history immutable. Keep secrets, local session data, dependencies, and generated builds out of version control. The owner approved opening the Site to the public (Nov 2026). Treat every endpoint as reachable by strangers: keep per-actor and per-plan caps, never expose actor IDs, and remember a plan UUID link grants read access to that plan.

## Where code goes

- Screens and app state: `app/page.tsx`. Feature UI: `components/mo/` (one file per area: `people.tsx`, `ready.tsx`, `plan-sections.tsx`, `profile.tsx`, `avatar-picker.tsx`, `art.tsx`).
- All reads and writes: `app/api/[[...path]]/route.ts`. Permissions are checked there, never only in the UI. ChatGPT tools in `app/mcp/route.ts` call the same API.
- Shared rules used by both client and server: `lib/` (`names.ts`, `avatar.ts`, `group-update.ts`, `types.ts`).
- Schema: `db/schema.ts`, then `npm run db:generate`. Never edit an existing migration.
- `components/ui/` is unused scaffolding. Don't build on it.

## Design language

| Token | Value |
| --- | --- |
| Background / card | cream `#f6eee4` / paper `#fffaf3` |
| Text / headings | `#2c1b24` / plum ink `#3a1a2b`; secondary text `#6f6066` |
| Primary action | brick `#b23b28` (white text) |
| Selected / highlight | butter `#f5d36a` (ink text) |
| Info / callouts | periwinkle `#c5d4f0`, `#e4ebf8` |
| Noted (not confirmed) | `#7a5600`, dashed outlines; confirmed `#2f6b3a` |
| Type | Outfit 400–900; Caveat only for handwritten notes. Sizes 13/15/17/22/34 |
| Spacing / radius | 8px steps (8/16/24); cards 22px, buttons 14px, chips pill |

Every text colour pair above passes WCAG AA (4.5:1). Check new pairs before using them.

## Privacy rules

- Guests' phone numbers never go to the server: they stay in the host's browser (`lib/invite.ts`). The server strips numbers and emails from names.
- m.o never sends messages. It opens the phone's Messages app with a message filled in; the person taps Send.

## Design and copy rules

- Plain words. Short sentences. Buttons say exactly what happens ("Create plan", not "Let's go"). No slang or jargon.
- Outcomes first: the host sees what still needs doing; extra tools stay under "More tools".
- Artwork carries the personality; controls stay familiar. Art is SVG drawn in code (`art.tsx`), never stock photos.
- Avoid: purple/blue gradients, centring everything, emoji as icons, glassmorphism, lorem ipsum, data that only flatters the layout.
- Design the empty, loading and error states, not just the happy path.
- Tap targets at least 44px. Layouts must survive large text. Honour reduced motion.
- Tappable elements get the shared press effect (bottom of `globals.css`): add new button classes to that list.

## Before you finish

- `npm run check`, `npm test`, `npm run build` pass.
- Give CSS classes specific names (`locked-note`, not `locked`): a shared generic name once broke the final vote card.
- Test on a tall phone too (e.g. iPhone 14 Pro Max): short test phones hide the plan picture, which hid a real Safari zoom bug.
- Test both sides of every change: the host's interaction and the guest's (a separate browser, as a stranger first, then after they answer). A feature isn't done until both pass.
- For UI changes, with `npm run dev` running: `npm run journeys`, `npm run journeys:quiet`, `npm run journeys:invites`, `npm run journeys:places`, `npm run journeys:dates`, `npm run journeys:host`, `npm run journeys:guest`, `npm run journeys:answers`, `npm run journeys:tabs`, `npm run journeys:items`, `npm run journeys:plusones`, `npm run journeys:order`, `npm run journeys:previews`, `npm run journeys:genmoji`, `npm run journeys:access`, `npm run journeys:recovery`, `npm run journeys:themes`, `npm run journeys:profile -- <photo.jpg>`, `npm run a11y`, `npm run ux:metrics` and `npm run ux:taps` (compare with the last run in `docs/release-readiness.md`).
- Update the README when behaviour, migrations or scripts change.
- Update `docs/release-readiness.md`: scorecard, evidence level for each claim (1 design, 2 code, 3 automated tests, 4 real users on the live site), and the ordered backlog. Never claim a higher level than the evidence.
