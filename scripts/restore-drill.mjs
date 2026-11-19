// Database restore drill. Proves a backup of the live database can be restored, without touching the live data.
//   1. Export the live D1 database to a file (read only).
//   2. Create a new, empty practice database.
//   3. Load the backup into it.
//   4. Compare row counts, table by table, between the backup file and the practice database.
//   5. Delete the practice database and the backup file.
// The repository is public, so the report shows table names and counts only: never rows, names or the backup itself.
// In GitHub: Actions → "Restore drill" → Run workflow. Needs CLOUDFLARE_API_TOKEN (the deploy secret).
// Local rehearsal (no Cloudflare): node scripts/restore-drill.mjs --local  (uses the local dev database and an in-memory restore).
import {readFileSync,appendFileSync,rmSync,mkdtempSync,existsSync,symlinkSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {parentsFirst} from './restore-order.mjs';

const local=process.argv.includes('--local');
const cf=JSON.parse(readFileSync('cloudflare.json','utf8'));
const env={...process.env,CLOUDFLARE_ACCOUNT_ID:cf.accountId,FORCE_COLOR:'0',NO_COLOR:'1'};
const say=line=>{console.log(line);if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,line+'\n')};
// Wrangler output stays hidden (it can mention data); on failure only a short, trimmed reason is shown.
const wrangler=(...args)=>{try{return execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js',...args],{env,encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:64<<20})}catch(e){const why=(String(e.stdout||'').match(/"text": *"([^"]{0,200})/)?.[1]||'')+' '+String(e.stderr||e.message).split('\n').filter(l=>/error|✘|denied|auth|not found|permission/i.test(l)).slice(0,3).join(' ').slice(0,300);throw new Error(`wrangler ${args[0]} ${args[1]||''} failed: ${why||'no reason given'}`)}};
const rowsOf=out=>{const j=JSON.parse(out);return (Array.isArray(j)?j:[j]).flatMap(r=>r.results||[])};
const SKIP=/^(_cf_|sqlite_|d1_migrations$)/;// Cloudflare's own tables; migrations are compared separately below.

// Foreign-key checks off here: D1's export lists tables alphabetically, so a child table's rows come before its parent table.
function countFile(file){const db=new DatabaseSync(':memory:',{enableForeignKeyConstraints:false});db.exec(readFileSync(file,'utf8'));const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r=>r.name).filter(n=>!SKIP.test(n)).sort();
 const counts=Object.fromEntries(tables.map(t=>[t,db.prepare(`SELECT count(*) AS n FROM "${t}"`).get().n]));let migrations=0;try{migrations=db.prepare('SELECT count(*) AS n FROM d1_migrations').get().n}catch{}db.close();return {counts,migrations,db:null}}

const started=Date.now();const dir=mkdtempSync(join(tmpdir(),'mo-drill-'));const file=join(dir,'backup.sql');
const drillName=`mo-db-restore-drill-${process.env.GITHUB_RUN_ID||Date.now()}`;let created=false,ok=false;
say(`## Restore drill ${new Date().toISOString().slice(0,16).replace('T',' ')} UTC${local?' (local rehearsal)':''}`);
try{
 // Where Time Travel would restore to (Cloudflare keeps point-in-time history of the live database).
 if(!local){try{const info=wrangler('d1','time-travel','info',cf.databaseName,'--json');const b=JSON.parse(info);say(`- Time Travel is on. Current restore point (bookmark): \`${String(b.bookmark||'').slice(0,40)}\``)}catch(e){say(`- Time Travel info not available: ${e.message}`)}}
 // 1. Backup
 if(local){// export has no --persist-to; it reads the dev database from next to the config file.
  if(!existsSync('dist/server/.wrangler'))symlinkSync('../../.wrangler','dist/server/.wrangler');
  wrangler('d1','export','DB','--local','--config','dist/server/wrangler.json','--output',file)}
 else wrangler('d1','export',cf.databaseName,'--remote','--output',file);
 const size=readFileSync(file).length;say(`- 1. Backup made: ${(size/1024).toFixed(0)} KB (kept only inside this run, then deleted).`);
 writeFileSync(file,parentsFirst(readFileSync(file,'utf8')));say('- Backup put in load order (plans before their guests and items).');
 const want=countFile(file);
 // 2–3. New practice database, then load the backup.
 // Local rehearsal: a fresh, empty local D1 database in a temporary folder (same D1 engine, no Cloudflare).
 const target=local?['DB','--local','--config','dist/server/wrangler.json','--persist-to',join(dir,'practice')]:[drillName,'--remote'];
 if(local)say('- 2. Practice database: a new, empty local D1 database.');
 else{wrangler('d1','create',drillName);created=true;say(`- 2. Practice database created: \`${drillName}\`.`)}
 wrangler('d1','execute',...target,'--file',file,'--yes');say('- 3. Backup loaded into the practice database.');
 const tables=Object.keys(want.counts);
 // One row, one column per table (D1 limits how many SELECTs a UNION can join).
 const q='SELECT '+tables.map(t=>`(SELECT count(*) FROM "${t}") AS "${t}"`).join(', ');
 const row=rowsOf(wrangler('d1','execute',...target,'--json','--command',q))[0]||{};
 const m=want.migrations?rowsOf(wrangler('d1','execute',...target,'--json','--command','SELECT count(*) AS n FROM d1_migrations'))[0]?.n??0:0;
 const got={counts:row,migrations:m};
 // 4. Compare
 say('\n| Table | In backup | Restored | Same? |\n| --- | --- | --- | --- |');
 let same=true;for(const t of Object.keys(want.counts)){const a=want.counts[t],b=got.counts[t];const eq=a===b;same&&=eq;say(`| ${t} | ${a} | ${b??'missing'} | ${eq?'yes':'**NO**'} |`)}
 const mEq=want.migrations===got.migrations;same&&=mEq;say(`| (database updates applied) | ${want.migrations} | ${got.migrations} | ${mEq?'yes':'**NO**'} |`);
 ok=same;say(`\n**${same?'PASSED':'FAILED'}**: ${same?'every table came back with the same number of rows.':'some tables did not match.'}`);
}catch(e){say(`\n**FAILED**: ${e.message}`)}
finally{
 // 5. Clean up: practice database and backup file.
 if(created){try{wrangler('d1','delete',drillName,'--skip-confirmation');say(`- 5. Practice database deleted.`)}catch(e){say(`- 5. Could not delete the practice database \`${drillName}\`: delete it in Cloudflare (Storage & Databases → D1). ${e.message}`)}}
 rmSync(dir,{recursive:true,force:true});say(`- Backup file deleted. Took ${Math.round((Date.now()-started)/1000)} seconds.`);
}
process.exitCode=ok?0:1;
