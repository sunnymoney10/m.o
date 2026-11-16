// Local MCP demonstration against a real SQLite file. No provider or model response is mocked.
// JSON on stdin is interpreted by the calling model (or a supplied replay), not generated here.
import {registerHooks} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
const [file,action,draftId,revision]=process.argv.slice(2);
if(!file||!['propose','apply','read'].includes(action))throw Error('Usage: node scripts/demo-setter.mjs /tmp/demo.sqlite propose|read|apply [draft_id revision]');
const sqlite=new DatabaseSync(file);
sqlite.exec('PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS demo_migrations (name TEXT PRIMARY KEY)');
for(const name of readdirSync(new URL('../drizzle',import.meta.url)).filter(f=>f.endsWith('.sql')).sort()){
 if(!sqlite.prepare('SELECT name FROM demo_migrations WHERE name=?').get(name)){
  sqlite.exec('BEGIN');try{sqlite.exec(readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));sqlite.prepare('INSERT INTO demo_migrations VALUES (?)').run(name);sqlite.exec('COMMIT')}catch(e){sqlite.exec('ROLLBACK');throw e}
 }
}
class Statement{
 constructor(sql){this.sql=sql;this.args=[]}
 bind(...args){this.args=args;return this}
 async first(){return sqlite.prepare(this.sql).get(...this.args)||null}
 async all(){return {results:sqlite.prepare(this.sql).all(...this.args)}}
 async run(){return {meta:{changes:sqlite.prepare(this.sql).run(...this.args).changes}}}
}
globalThis.__moDemoEnv={DB:{prepare:sql=>new Statement(sql),batch:async statements=>{sqlite.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());sqlite.exec('COMMIT');return results}catch(e){sqlite.exec('ROLLBACK');throw e}}}};
registerHooks({resolve(specifier,context,next){
 if(specifier==='cloudflare:workers')return {url:'data:text/javascript,export const env=globalThis.__moDemoEnv',shortCircuit:true};
 if(specifier.endsWith('/lib/setter')||specifier==='../api/[[...path]]/route')return {url:new URL(specifier+'.ts',context.parentURL).href,shortCircuit:true};
 return next(specifier,context);
}});
const mcp=await import('../app/mcp/route.ts');
async function call(name,args){const response=await mcp.POST(new Request('https://local-demo.invalid/mcp',{method:'POST',headers:{'Content-Type':'application/json','oai-authenticated-user-id':'local-demo-organizer'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}})}));const rpc=await response.json();if(rpc.error||rpc.result.isError)throw Error(JSON.stringify(rpc));return JSON.parse(rpc.result.content[0].text)}
let plans=await call('list_plans',{});
let planId=plans.plans[0]?.id;
if(!planId){if(action!=='propose')throw Error('Propose first.');planId=(await call('create_plan',{title:'Fictional Friendsgiving demo',name:'Demo organizer',kind:'gathering'})).id}
const before=await call('read_plan',{plan_id:planId});
let result;
if(action==='propose')result=await call('propose_preparation_draft',{...JSON.parse(readFileSync(0,'utf8')),plan_id:planId});
if(action==='apply')result=await call('review_preparation_draft',{plan_id:planId,draft_id:draftId,revision:Number(revision),action:'apply'});
const after=await call('read_plan',{plan_id:planId});
console.log(JSON.stringify({action,storage:'Local SQLite file; actual MCP and API handlers; development identity',planId,result,before,after},null,2));
sqlite.close();
