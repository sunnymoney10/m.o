import {registerHooks} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
const sqlite=new DatabaseSync(':memory:');
for(const f of readdirSync(new URL('../drizzle',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())sqlite.exec(readFileSync(new URL('../drizzle/'+f,import.meta.url),'utf8'));
class Statement{constructor(sql){this.sql=sql;this.args=[]}bind(...args){this.args=args;return this}async first(){return sqlite.prepare(this.sql).get(...this.args)||null}async all(){return {results:sqlite.prepare(this.sql).all(...this.args)}}async run(){const r=sqlite.prepare(this.sql).run(...this.args);return {meta:{changes:r.changes}}}}
globalThis.__moTestEnv={DB:{prepare:sql=>new Statement(sql),batch:async ss=>{sqlite.exec('BEGIN');try{const results=[];for(const s of ss)results.push(await s.run());sqlite.exec('COMMIT');return results}catch(e){sqlite.exec('ROLLBACK');throw e}}}};
registerHooks({resolve(specifier,context,next){if(specifier==='cloudflare:workers')return {url:'data:text/javascript,export const env = globalThis.__moTestEnv',shortCircuit:true};if(specifier==='../api/[[...path]]/route')return {url:new URL('../api/[[...path]]/route.ts',context.parentURL).href,shortCircuit:true};if(/^\.\.?\//.test(specifier)&&!/\.[cm]?[jt]sx?$/.test(specifier)&&context.parentURL?.includes('/app/'))return {url:new URL(specifier+'.ts',context.parentURL).href,shortCircuit:true};return next(specifier,context)}});
const route=await import('../app/api/[[...path]]/route.ts');
const originalFetch=globalThis.fetch;
globalThis.fetch=async (url,options={})=>{if(String(url).startsWith('http://127.0.0.1:4173/api/')){const req=new Request(url,options);return route[req.method](req)}return originalFetch(url,options)};
await import('./api.mjs');
await import('./features.mjs');
await import('./friendsgiving.mjs');
await import('./host-noted.mjs');
await import('./profile-photo.mjs');
console.log('Actual route handlers verified against SQLite with separate guest sessions.');

const assert=(await import('node:assert/strict')).default;
const mcp=await import('../app/mcp/route.ts');
async function rpc(method,params,identity){const r=await mcp.POST(new Request('https://mo.example/mcp',{method:'POST',headers:{'Content-Type':'application/json',...(identity?{'oai-authenticated-user-id':identity}:{})},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})}));return r.json()}
const tools=await rpc('tools/list');assert.equal(tools.result.tools.length,11);assert.equal(tools.result.tools.find(t=>t.name==='list_plans').annotations.readOnlyHint,true);
const denied=await rpc('tools/call',{name:'list_plans',arguments:{}});assert.equal(denied.result.isError,true);
const created=await rpc('tools/call',{name:'create_plan',arguments:{title:'ChatGPT test trip',name:'Test setter',kind:'trip',tasks:[{title:'Agree budget',category:'todo'}]}},'mcp-test-owner');assert.equal(created.result.isError,false);const createdPlan=JSON.parse(created.result.content[0].text);assert.match(createdPlan.url,/\/p\/[A-Za-z0-9_-]{22}$/);
const updated=await rpc('tools/call',{name:'update_plan',arguments:{plan_id:createdPlan.id,place:'Test cabin'}},'mcp-test-owner');assert.equal(updated.result.isError,false);
const read=await rpc('tools/call',{name:'read_plan',arguments:{plan_id:createdPlan.id}},'mcp-test-owner');const saved=JSON.parse(read.result.content[0].text);assert.equal(saved.plan.title,'ChatGPT test trip');assert.equal(saved.plan.place,'Test cabin');assert.equal(saved.tasks[0].title,'Agree budget');
const poll=await rpc('tools/call',{name:'start_decision',arguments:{plan_id:createdPlan.id,question:'Which weekend?',kind:'date',options:['2026-12-04T17:00:00Z','2026-12-11T17:00:00Z']}},'mcp-test-owner');assert.equal(poll.result.isError,false);
const guestVote=await rpc('tools/call',{name:'start_decision',arguments:{plan_id:createdPlan.id,question:'Nope',kind:'choice',options:['a','b']}},'mcp-test-guest');assert.equal(guestVote.result.isError,true);
const stop=await rpc('tools/call',{name:'add_itinerary_stop',arguments:{plan_id:createdPlan.id,title:'Check in'}},'mcp-test-owner');assert.equal(stop.result.isError,false);
const draft=await rpc('tools/call',{name:'draft_group_update',arguments:{plan_id:createdPlan.id}},'mcp-test-owner');const drafted=JSON.parse(draft.result.content[0].text);assert.ok(drafted.group_update.includes('ChatGPT test trip'));assert.ok(drafted.group_update.includes('Which weekend?'));assert.ok(drafted.next_step);
const invalid=await rpc('tools/call',{name:'create_plan',arguments:{title:'Missing name'}},'mcp-test-owner');assert.equal(invalid.result.isError,true);
console.log('PASS: MCP discovery, eleven tool schemas, authenticated creation, partial updates preserving details, shared data and invalid-input rejection.');
