# m.o — Make it out the groupchat

A free, organizer-first coordination MVP. Pronounced “em-oh.”

## Product center

The setter is the friend who makes an outing happen. m.o gives that person a shared, current plan and helps other people take responsibility. The initial situations are a group trip with shared accommodation and a Friendsgiving potluck where the host keeps asking who’s bringing what. Demo dates, guests and details are fictional.

## Working scope

- Create, edit and delete a shared trip or get-together (only the host can delete; everything in the plan is removed).
- RSVP with the current participant’s name and optional note.
- Guest list: the host adds names, then prepares each person’s personal link in Send invites. New invitations require a random secret distinct from the public guest ID. A guest can reuse their personal link on another device; choosing an answered name alone cannot recover or take over that spot. The host can replace or revoke the link. Replacement, revocation and 30-day expiry invalidate existing device access as well as the old URL.
- Friends who never open the link: the host records what someone told them by text or in person (their answer, extra guests, dietary needs, staying over) and notes who said they’d bring an item. These are labelled “noted by the host, not confirmed” everywhere. That person sees a one-tap “Is that right?” when they do open the link. The host can copy a personal check-in message for anyone (m.o never sends it), and a host-only “Recent updates” list shows what changed, when, and whether the person did it themselves or the host noted it.
- Personal invites: the host's "Send invites" screen opens the phone's Messages app with a personal message for each guest (their first name and their own link), one at a time or "Send to everyone" in order. Each personal link greets that guest by name with one-tap answers. Phone numbers come from Android contacts, iPhone AutoFill Contact (the "Add one person" name and phone boxes), or pasted lists and stay in the host's browser only; m.o never stores them or sends texts.
- Guest answers: "Can't make it" shows a thank-you ("Make it out next time!") and hides the plan's tasks, address and tabs, with buttons to change the answer. Guests who answered (never hosts) see a "Planning something yourself?" card with Start a plan and Set up my profile; "Not now" hides it on that phone. "Still checking" asks when to check back (Tomorrow, In 3 days, In a week, or a day), saves it on the guest (`check_back`, migration 0011; only the host and that guest see it), offers a calendar reminder with an alert, and shows the host "Will decide by …". m.o never sends the nudge itself.
- Fast tab taps: Home, Plans and You replace the address instead of stacking Back steps, only the newest load updates the screen, and double-tap zoom is off.
- Host link (recovery): the host taps "Get my host link" (overview, then More tools once made) to get a private `/h/<key>` link. Opening it on another device and tapping "Open as host" makes that browser the host too; the first device stays host. Only a hash of the key is stored (`host_key_hash`, migration 0010). Making a new link turns the old one off. Tries are capped at 10 per 10 minutes. Opening it in a browser that has its own plans hides those there.
- Short links: shared plan links are `/p/<code>` and personal invites `/i/<code>`; plan links retain their 22-character record ID; new personal links use an independent 43-character random secret whose SHA-256 hash is stored in D1. They redirect to the full `/?plan=…` address, which still works and still shows the group-chat preview.
- Search in "Where": venues and addresses come from OpenStreetMap (free, no key) through `GET /api/places?q=`, capped at 30 searches a minute per person. Home addresses: when the map knows the street but not the house, the typed house number is added to the street result; addresses starting with a number are also checked with the free US Census address finder (no key). With the optional free Ticketmaster key (`TICKETMASTER_KEY` GitHub secret, set as a Worker secret on deploy), events show first: "UniverSoul Circus Raleigh" tries the whole phrase, then the last words as the city. Picking an event fills in the venue address, date and time, and the name if empty. "near me" asks the phone for its rough location (about 1 km) for that search only; it is never stored. Events not sold through Ticketmaster won't show; search the venue instead.
- Booking links: a plan can keep an Airbnb, Vrbo or hotel link (`booking_url`, migration 0008). Pasting one into "Where" moves it to the booking field. It shows as "Open the Airbnb booking" and, like the address, only to the host and guests with host-approved arrival access who said they are coming or checking. m.o can't read the booking or its address. With no booking yet (any plan), "Need a place to stay?" sits under the booking link box and opens an Airbnb or hotel (Booking.com) search for the Where area and dates in a new tab.
- Multi-day plans: "More than one day? Add an end date" adds an end (`end_date`, migration 0009). Everyone sees "Fri, Dec 4, 6:00 PM – Sun, Dec 6", invite texts use it, and Add to calendar spans the whole stay. The schedule offers a Day picker with every day of the trip plus an optional time ("Any time" when left blank), and groups stops by day.
- End times: a get-together can have an end time ("Add an end time", filled 3 hours after the start; it can also be a later day). Everyone sees "Sun, Nov 29 · 4:00 PM – 7:00 PM", invite texts use it, and Add to calendar ends then. Stored in the same `end_date` field as multi-day plans.
- Extra guests: a guest can ask to bring up to four people; they count in the headcount only after the organizer approves.
- Dietary needs and sleepover requests are visible only to the organizer and that guest. The address, arrival and house notes, booking link and itinerary require both an in/checking RSVP and explicit host approval in People → Approve arrival access. RSVP alone does not authorize private arrival information. Door codes have a separate host-only field and must be sent through a separately verified channel; personal links never reveal that field.
- Claim, release, add and complete contributions and responsibilities.
- Prevent other guests from taking over claimed items or editing organizer-only details.
- Release a participant’s claimed items if they decline.
- Persist real plans to Cloudflare D1; demo changes stay temporary.
- Put dates, places or anything else to a group vote. Members vote and suggest options; only the organizer can lock one in, and a locked date or place updates the plan. Votes are suggestions, never commitments.
- Keep a live plan: an organizer-maintained itinerary of timed stops and key HTTPS links.
- Replay: after the plan, people who were in post memories (optional HTTPS photo/album link) and shout-outs; the organizer marks the plan “made it out.” Authors and the organizer can remove posts.
- Profile pictures: choose your own avatar (face colour, including skin tones, hair, hair colour, top, background, glasses, hoops) or upload a photo. Photos are cropped and shrunk on the phone (a few KB), stored in D1, and served from a cached URL; people in plans you join can see them.
- “What’s your mo?” profiles: name, unique handle, a one-line mo, interests and planning style. Shown to people in shared plans. The profile page lists plans you made it out to, places conquered, and private counts of what you hosted and took care of — no scores or rankings.
- Home shows the next plan with one deterministic “thing to sort out” (an unclaimed item, an open vote, or a missing date/place) from saved data; plans have Overview, People and Bring list tabs.
- Show missing decisions, the next useful coordination step, and copyable group-chat drafts (status update and a nudge for maybes). These are deterministic templates built from saved plan data, not an in-app AI model. m.o never sends messages.
- Download an ICS calendar entry. This is a one-time calendar export, not continuous calendar sync.
- Save an existing HTTPS invitation URL and link back to it. An m.o plan can be added manually as an Apple Invites Link tile. Apple RSVPs are not automatically synchronized.
- Expose eleven authenticated MCP tools through the Site’s ChatGPT plugin. ChatGPT can structure a user’s supplied conversation, create/read/update plans, add unclaimed items, start organizer votes, record the caller’s own RSVP, votes and commitments, add itinerary stops, and draft a group-chat update from saved data. It must not invent commitments, book anything, or send invitations automatically.

## Access

The owner has approved a public pilot. The Site audience itself is changed in the Sites access controls (not in this repo). Once public, anyone possessing a plan’s UUID link can read that plan and respond as a guest; guest sessions can write their own RSVP, votes, claims and posts. Personal invite credentials grant access to one guest record. Forwarded credentials allow replying as that guest, so the UI explains this risk; door codes stay outside the guest API. Other guests’ RSVP notes, dietary needs and check-back details are private. Basic abuse caps apply: 20 new plans per person per day, 150 guests and 100 items per plan, plus existing caps on votes, stops and memories. Do not publish private demo/test data or reuse preview sessions as production guests.

## Running at $0

m.o is built to need nothing paid:

- **No paid services or keys.** No AI provider, email, SMS, maps, payments or file storage (R2 is off). Group-chat drafts are templates, Maps is a plain link, and avatars and artwork are SVG drawn in code. Fonts load from Google Fonts (free).
- **Bounded database use.** Every per-plan query uses an index (migrations 0003–0005), so a request's cost doesn't grow with the total number of plans. An open plan refreshes every 30 seconds while visible and pauses after 10 minutes without interaction.
- **Abuse ceilings.** 20 new plans per person per day, a site-wide ceiling of 500 new plans per day (override with a `DAILY_NEW_PLANS` environment variable), and per-plan caps on guests (150), items (100), votes, stops and memories. RSVPs and existing plans are never blocked by the site-wide ceiling.
- **CI.** One GitHub Actions job on pushes to `main` and on pull requests, with superseded runs cancelled and a 15-minute timeout. Free for public repositories; private repositories use the account’s included Actions minutes.

- **Error alert.** `.github/workflows/monitor.yml` checks the live site every 30 minutes (free: the repository is public). It fails, and GitHub emails the owner, when the home page doesn't load, the database doesn't answer, or `/api/health` counts errors in the last 35 minutes. When an API request fails, m.o writes down only the time and the route shape, like `POST plan/rsvp` (`errors` table, migration 0014, newest 500 kept). It stores no IDs, names or error text. `/api/health` is public and returns counts and route shapes only. The email comes from GitHub's own Actions notifications (Settings → Notifications → Actions → email for failed workflows); details are in Cloudflare (Workers & Pages → mo → Logs). Run it by hand from the Actions tab ("Check the live site" → Run workflow).

- **Restore.** `docs/restore.md` has the steps for a real restore (Cloudflare Time Travel first, then a backup file). The **Restore drill** workflow (Actions → Restore drill → Run workflow) practises it: it backs up the live database (read only), loads the backup into a new practice database, compares row counts table by table and deletes the practice database. Its report shows counts only. `node scripts/restore-drill.mjs --local` rehearses it on the local dev database. D1 backups list tables alphabetically and fail to load as-is; `scripts/restore-order.mjs` puts plans before their guests and items.

What this repo can’t control: the hosting platform’s own plan and usage limits. Check the Site’s hosting account for its free allowance and set any spending limit there.

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
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0005_colorful_blacklash.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0006_overjoyed_synch.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0007_keen_archangel.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0008_slimy_stellaris.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0009_shocking_molly_hayes.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0010_violet_nehzno.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0011_low_ser_duncan.sql
npm run dev
```

The live app is https://mo.mymoapp.workers.dev (Cloudflare Workers + D1, free plan). Every push to `main` deploys automatically through `.github/workflows/deploy.yml`: checks, tests and build run first, then new D1 migrations are applied, then the Worker is deployed. Settings are in `cloudflare.json`; the `CLOUDFLARE_API_TOKEN` repository secret holds the deploy key. A person is identified by a browser cookie, so the host manages a plan from the browser they created it in.

```sh
npm run check
npm test
npm run build
```

With `npm run dev` running, `npm run journeys` replays the Friendsgiving phone journeys (a host; guests picking names, RSVPing with an extra guest, claiming, switching browsers and cancelling) using the preinstalled Playwright. Pass a folder to keep screenshots: `npm run journeys -- ./shots`. `npm run journeys:profile -- <photo.jpg>` checks avatars and photo upload. `npm run a11y` checks 44px tap targets and large text. `npm run ux:taps` counts taps and typed boxes for every main host and guest task. `npm run ux:metrics` measures form fields, overview length and guest taps for before/after comparisons. `npm run journeys:places` checks address search and booking links (host and guest). `npm run journeys:dates` checks multi-day plans (host and guest). `npm run journeys:host` checks host links across three devices. `npm run journeys:answers` checks the can't-make-it and still-checking screens (guest and host). `npm run journeys:tabs` taps the main tabs 30 times fast. `npm run journeys:guest` opens a trip from a personal text link on three iPhone sizes and checks nothing needs zooming, host-only tools stay hidden, and trips don't say "bring". `npm run journeys:invites` checks personal invites (and that no phone number reaches the server), plus the Send invites layout on three iPhone sizes. `npm run journeys:quiet` replays the host recording answers for friends who never open the link, then one of them confirming later.

GitHub Actions runs these checks on pull requests, and again before every deploy from `main`.

## Development and checks

Use the Sites build/install helpers for this checkout. `npm run db:generate` appends database migrations. `npx tsc --noEmit` checks types. `node tests/route-harness.mjs` exercises the actual API and MCP route handlers against SQLite: persistence, RSVP changes, exclusive claims, authorization, partial plan updates, cross-origin protection, and MCP input validation. It creates only in-memory test data.

Use `sites-preview start /workspace/sites/mo` for managed browser QA. Apply pending local migrations with the starter’s documented Wrangler command. Production migrations apply automatically during the deploy from `main` (`npm run deploy`). Do not create schema at request time.

## Deliberately unresolved

Photo uploads are not stored by m.o; replay photos are HTTPS links. Illustrations are m.o’s own: flat cut-paper scenes and characters drawn as SVG in `components/mo/art.tsx`, seeded by plan ID or name so each plan and person keeps a consistent picture. No stock or generated photos are bundled.

No payment processing, paid tier, booked inventory, affiliate revenue, social-platform scraping, automatic message sending, or automatic Apple/Google Calendar sync is implemented. The consumer core is free. A 30-day revenue route still requires validation and actual commercial terms; this prototype does not establish revenue or demand.

## Personal access rollout (this branch)

This branch is based on current main `cd3ca62`, not the older version 11 PR. New migrations `0012_military_squadron_sinister.sql` and `0013_graceful_lake.sql` add guest secrets, per-device grants, arrival approval, the host-only door code and a secret lookup index. Existing migrations are unchanged. Apply both new migrations before deploying this code; the existing deployment workflow already applies pending migrations first. No live migration or deployment was run while preparing this branch.

Existing answered spots keep their original device session until the host issues a new personal link. They cannot be recovered just by name. Legacy unclaimed 22-character invitations may still be claimed once; issuing a new secret link disables that legacy authorization. Hosts should replace old personal links and explicitly approve arrival access before rollout. Arrival approvals default to off for existing records. Existing codes in arrival notes are not automatically extracted: move them to the separate host-only field before approving arrival details.

A link is a bearer credential, not proof of a person's real identity. Up to 20 devices can redeem one link. Replacement revokes the prior device grants and resets arrival approval; revoked information already seen cannot be retracted. Host-issued plaintext links are cached only on the host's device; D1 keeps hashes. Opening a link on another host device requires preparing a replacement. The guest secret is moved to a URL fragment on redirect, captured in memory, and removed from the visible page URL; avoid logging full invitation paths in external analytics.

The initial HTML response establishes the HttpOnly visitor cookie before parallel client API requests to avoid first-load identity races. Existing host recovery remains unchanged.

`npm run journeys:access` verifies the complete host/guest/revoked-link flow with independent phone sessions and a synthetic local event. It refuses production URLs. API tests also cover answered-spot takeover, replacement, expiry, cross-guest writes, note privacy, arrival approval and door-code exclusion. Hosted deployment and real-user verification remain outstanding.
