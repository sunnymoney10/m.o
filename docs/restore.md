# Restoring m.o's database

The live database is Cloudflare D1 `mo-db` (IDs in `cloudflare.json`). There are two ways back, fastest first.

## First: stop and check

1. Is the data really gone or wrong? Open a plan you know on https://mo.mymoapp.workers.dev and compare.
2. Note the time things were last right, in UTC (for example 2026-11-19 14:00).
3. Don't deploy anything while you restore.

## Way 1: Time Travel (rewind the live database)

Cloudflare keeps a minute-by-minute history of the live database: 7 days on the free plan, 30 days on paid.
Rewinding replaces everything in the live database with how it was at that time. **Anything people did after that time is lost.**

On a computer with this repository and a Cloudflare API token (the same kind as the `CLOUDFLARE_API_TOKEN` deploy secret):

```sh
npm ci
export CLOUDFLARE_API_TOKEN=...          # never commit or paste this anywhere else
export CLOUDFLARE_ACCOUNT_ID=a5357d9aa524e40caec78d5fbae7a9b9
npx wrangler d1 time-travel info mo-db --timestamp=2026-11-19T14:00:00Z    # shows the restore point; changes nothing
npx wrangler d1 time-travel restore mo-db --timestamp=2026-11-19T14:00:00Z # rewinds the live database
```

The restore command prints a bookmark for the state just before the rewind. Keep it: restoring to that bookmark undoes the rewind (`--bookmark=<it>`).

## Way 2: From a backup file

Use this when Time Travel doesn't reach back far enough, or to load data into a new database.

1. Make a backup now, while things are right: `npx wrangler d1 export mo-db --remote --output backup.sql`.
   Keep it private: it has every plan, name and note. Never put it in the repository.
2. **Put it in load order.** D1 writes tables alphabetically, so guests come before plans, and loading the file as-is fails with `no such table: main.plans`.
   `node -e "import('./scripts/restore-order.mjs').then(m=>{const f=require('fs');f.writeFileSync('ordered.sql',m.parentsFirst(f.readFileSync('backup.sql','utf8')))})"`
3. Load it into an **empty** database: `npx wrangler d1 create mo-db-restored`, then
   `npx wrangler d1 execute mo-db-restored --remote --file ordered.sql --yes`.
4. To make that the live database, put its `database_id` (printed by `create`) in `cloudflare.json` as `databaseId`, open a pull request and merge it. The deploy then uses it.
5. Delete `backup.sql` and `ordered.sql` when done.

## Practice

GitHub → Actions → **Restore drill** → Run workflow. It does Way 2 with a practice database and checks that every table comes back with the same number of rows, then deletes the practice database and the backup. The live database is only read. The report shows counts only.

| Date | Result | Notes |
| --- | --- | --- |
| 2026-11-19 | Local rehearsal passed (12 tables) | Found that D1's backup file can't be loaded as-is (guests before plans). Fixed with `scripts/restore-order.mjs`. Not yet run against the live database. |
