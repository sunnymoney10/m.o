# m.o — Make it out the groupchat

A free, organizer-first coordination MVP. Pronounced “em-oh.”

## Product center

The setter is the friend who makes an outing happen. m.o gives that person a shared, current plan and helps other people take responsibility. The initial situations are a group trip (Malcom) and Friendsgiving contribution tracking (Kaela). Demo dates, guests and details are fictional.

## Working scope

- Create and edit a shared trip or get-together.
- RSVP with the current participant’s name and optional note.
- Guest list: the organizer adds the names they invited. A guest opening the link taps their name (or “I’m not on the list”), so the organizer sees who hasn’t replied. Someone who answered on another phone or browser can tap their name to continue there; their claims move with them. The organizer’s spot can’t be taken, and the organizer can remove anyone else.
- Extra guests: a guest can ask to bring up to four people; they count in the headcount only after the organizer approves.
- Dietary needs and sleepover requests are visible only to the organizer and that guest. The address, arrival and house notes, and the itinerary are shared with the organizer and people who answered in or checking.
- Claim, release, add and complete contributions and responsibilities.
- Prevent other guests from taking over claimed items or editing organizer-only details.
- Release a participant’s claimed items if they decline.
- Persist real plans to Cloudflare D1; demo changes stay temporary.
- Put dates, places or anything else to a group vote. Members vote and suggest options; only the organizer can lock one in, and a locked date or place updates the plan. Votes are suggestions, never commitments.
- Keep a live plan: an organizer-maintained itinerary of timed stops and key HTTPS links.
- Replay: after the plan, people who were in post memories (optional HTTPS photo/album link) and shout-outs; the organizer marks the plan “made it out.” Authors and the organizer can remove posts.
- “What’s your mo?” profiles: name, unique handle, a one-line mo, interests and planning style. Shown to people in shared plans. The profile page lists plans you made it out to, places conquered, and private counts of what you hosted and took care of — no scores or rankings.
- Home shows the next plan with one deterministic “thing to sort out” (an unclaimed item, an open vote, or a missing date/place) from saved data; plans have Overview, People and Bring list tabs.
- Show missing decisions, the next useful coordination step, and copyable group-chat drafts (status update and a nudge for maybes). These are deterministic templates built from saved plan data, not an in-app AI model. m.o never sends messages.
- Download an ICS calendar entry. This is a one-time calendar export, not continuous calendar sync.
- Save an existing HTTPS invitation URL and link back to it. An m.o plan can be added manually as an Apple Invites Link tile. Apple RSVPs are not automatically synchronized.
- Expose eleven authenticated MCP tools through the Site’s ChatGPT plugin. ChatGPT can structure a user’s supplied conversation, create/read/update plans, add unclaimed items, start organizer votes, record the caller’s own RSVP, votes and commitments, add itinerary stops, and draft a group-chat update from saved data. It must not invent commitments, book anything, or send invitations automatically.

## Access

The owner has approved a public pilot. The Site audience itself is changed in the Sites access controls (not in this repo). Once public, anyone possessing a plan’s UUID link can read that plan and respond as a guest; guest sessions can only write their own RSVP, votes, claims and posts. Basic abuse caps apply: 20 new plans per person per day, 150 guests and 100 items per plan, plus existing caps on votes, stops and memories. Do not publish private demo/test data or reuse preview sessions as production guests.

## Reuse

The app uses open-source React, Vinext/Vite, Drizzle (schema/migrations), Zod (ChatGPT tool input validation), and Lucide (icons). Source dependencies and versions are in package.json/package-lock.json; their upstream licenses remain in the packages. Public invitation repos were researched as architectural references; this is not a fork of Apple Invites, Gathio, or OpenInvite.

## Local quick start

Requires Node.js 24 (see `.nvmrc`) and npm.

```sh
npm ci
npm run build
```

Before the first local database-backed preview, apply the tracked SQL migrations in filename order. The local database is separate from the hosted database:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_nice_lord_tyger.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_sharp_lake.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_live_replay_profiles.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0003_overrated_molly_hayes.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0004_ordinary_next_avengers.sql
npm run dev
```

Local identity is simulated by the development adapter; hosted identity comes from Sites. The production Site is https://mo-make-it-out-kofi.kofigladney.chatgpt.site. Hosting configuration is retained so this code maps to the existing deployment. GitHub commits do not automatically deploy that Site.

```sh
npm run check
npm test
npm run build
```

With `npm run dev` running, `npm run journeys` replays the Friendsgiving phone journeys (Kaela hosting; guests picking names, RSVPing with an extra guest, claiming, switching browsers and cancelling) using the preinstalled Playwright. Pass a folder to keep screenshots: `npm run journeys -- ./shots`.

GitHub Actions runs these checks on pushes to main and pull requests. No repository secrets are needed for these validation checks. No automatic deployment credentials are included.

## Development and checks

Use the Sites build/install helpers for this checkout. `npm run db:generate` appends database migrations. `npx tsc --noEmit` checks types. `node tests/route-harness.mjs` exercises the actual API and MCP route handlers against SQLite: persistence, RSVP changes, exclusive claims, authorization, partial plan updates, cross-origin protection, and MCP input validation. It creates only in-memory test data.

Use `sites-preview start /workspace/sites/mo` for managed browser QA. Apply pending local migrations with the starter’s documented Wrangler command. Production migrations apply through Sites publishing. Do not create schema at request time.

## Deliberately unresolved

Photo uploads are not stored by m.o; replay photos are HTTPS links. Illustrations are m.o’s own: flat cut-paper scenes and characters drawn as SVG in `components/mo/art.tsx`, seeded by plan ID or name so each plan and person keeps a consistent picture. No stock or generated photos are bundled.

No payment processing, paid tier, booked inventory, affiliate revenue, social-platform scraping, automatic message sending, or automatic Apple/Google Calendar sync is implemented. The consumer core is free. A 30-day revenue route still requires validation and actual commercial terms; this prototype does not establish revenue or demand.
