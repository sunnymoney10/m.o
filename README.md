# mo. — Make it out the group chat

A free, organizer-first coordination MVP. Pronounced “em-oh.”

## Product center

The setter is the friend who makes an outing happen. mo. gives that person a shared, current plan and helps other people take responsibility. The initial situations are a group trip (Malcom) and Friendsgiving contribution tracking (Kaela). Demo dates, guests and details are fictional.

## Working scope

- Create and edit a shared trip or get-together.
- RSVP with the current participant’s name and optional note.
- Claim, release, add and complete contributions and responsibilities.
- Prevent other guests from taking over claimed items or editing organizer-only details.
- Release a participant’s claimed items if they decline.
- Persist real plans to Cloudflare D1; demo changes stay temporary.
- Review, correct, reject, or atomically approve ChatGPT preparation drafts. Approved items remain unclaimed; retries do not duplicate them. Attendance or plan changes require a fresh draft.
- Show missing decisions and the next useful coordination prompt, current RSVP counts, and unsent follow-up drafts. This is a deterministic plan check, not an in-app AI model.
- Download an ICS calendar entry. This is a one-time calendar export, not continuous calendar sync.
- Save an existing HTTPS invitation URL and link back to it. A mo. plan can be added manually as an Apple Invites Link tile. Apple RSVPs are not automatically synchronized.
- Expose nine authenticated MCP tools through the Site’s ChatGPT plugin. ChatGPT can structure a user’s supplied conversation, create/read/update plans, add unclaimed items, and record the caller’s own RSVP/commitments. It must not invent commitments, book anything, or send invitations automatically.

## Access

The first hosted release is an owner-private preview. Copying a plan link does not override Site access. For a later public pilot, explicitly change Site audience through the supported access controls; anyone possessing a plan’s UUID link can read that plan, while guest sessions restrict writes to their own commitments. Do not publish private demo/test data or reuse preview sessions as production guests.

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
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_woozy_maximus.sql
npm run dev
```

Local identity is simulated by the development adapter; hosted identity comes from Sites. The production preview is private at https://mo-make-it-out-kofi.kofigladney.chatgpt.site. Hosting configuration is retained so this code maps to the existing deployment. GitHub commits do not automatically deploy that Site.

```sh
npm run check
npm test
npm run build
```

GitHub Actions runs these checks on pushes to main and pull requests. No repository secrets are needed for these validation checks. No automatic deployment credentials are included.

## Development and checks

Use the Sites build/install helpers for this checkout. `npm run db:generate` appends database migrations. `npx tsc --noEmit` checks types. `node tests/route-harness.mjs` exercises the actual API and MCP route handlers against SQLite: persistence, RSVP changes, exclusive claims, authorization, partial plan updates, cross-origin protection, and MCP input validation. It creates only in-memory test data.

Use `sites-preview start /workspace/sites/mo` for managed browser QA. Apply pending local migrations with the starter’s documented Wrangler command. Production migrations apply through Sites publishing. Do not create schema at request time.

## ChatGPT preparation workflow

See [the workflow and verification guide](docs/setter-workflow.md) for connection steps, review behavior, fictional Friendsgiving and trip examples, local demonstration evidence, and configuration limits. No embedded inference provider is configured. The web app helps compose a ChatGPT prompt; it does not itself interpret conversation text.

## Deliberately unresolved

No payment processing, paid tier, booked inventory, affiliate revenue, social-platform scraping, automatic message sending, or automatic Apple/Google Calendar sync is implemented. The consumer core is free. A 30-day revenue route still requires validation and actual commercial terms; this prototype does not establish revenue or demand.
