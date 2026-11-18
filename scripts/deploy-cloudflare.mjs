// Deploys the built app to Cloudflare Workers with the real D1 database, then applies any new migrations.
// Needs CLOUDFLARE_API_TOKEN (in CI: a GitHub secret). Runs automatically on every push to main (.github/workflows/deploy.yml). Manual use: npm run build && npm run deploy
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const cf=JSON.parse(readFileSync('cloudflare.json','utf8'));
const config=JSON.parse(readFileSync('dist/server/wrangler.json','utf8'));
config.name=cf.workerName;config.account_id=cf.accountId;
config.d1_databases=[{binding:'DB',database_name:cf.databaseName,database_id:cf.databaseId,migrations_dir:'../../drizzle'}];
writeFileSync('dist/server/wrangler.deploy.json',JSON.stringify(config));
const env={...process.env,CLOUDFLARE_ACCOUNT_ID:cf.accountId};
const wrangler=(...args)=>execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js',...args],{stdio:'inherit',env});
// New migrations run before the new code goes live; ones already applied are skipped.
wrangler('d1','migrations','apply',cf.databaseName,'--remote','--config','dist/server/wrangler.deploy.json');
wrangler('deploy','--config','dist/server/wrangler.deploy.json');
console.log(`Deployed: https://${cf.workerName}.${process.env.WORKERS_SUBDOMAIN||'<your-subdomain>'}.workers.dev`);
