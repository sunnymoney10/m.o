import {registerHooks} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
const sqlite=new DatabaseSync(':memory:');
for(const f of readdirSync(new URL('../drizzle',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())sqlite.exec(readFileSync(new URL('../drizzle/'+f,import.meta.url),'utf8'));
class Statement{constructor(sql){this.sql=sql;this.args=[]}bind(...args){this.args=args;return this}async first(){return sqlite.prepare(this.sql).get(...this.args)||null}async all(){return {results:sqlite.prepare(this.sql).all(...this.args)}}async run(){const r=sqlite.prepare(this.sql).run(...this.args);return {meta:{changes:r.changes}}}}
globalThis.__moTestEnv={DB:{prepare:sql=>new Statement(sql),batch:async ss=>{sqlite.exec('BEGIN');try{const results=[];for(const s of ss)results.push(await s.run());sqlite.exec('COMMIT');return results}catch(e){sqlite.exec('ROLLBACK');throw e}}}};
registerHooks({resolve(specifier,context,next){if(specifier==='cloudflare:workers')return {url:'data:text/javascript,export const env = globalThis.__moTestEnv',shortCircuit:true};if(specifier.endsWith('/lib/setter'))return {url:new URL(specifier+'.ts',context.parentURL).href,shortCircuit:true};if(specifier==='../api/[[...path]]/route')return {url:new URL('../api/[[...path]]/route.ts',context.parentURL).href,shortCircuit:true};return next(specifier,context)}});
const route=await import('../app/api/[[...path]]/route.ts');
const originalFetch=globalThis.fetch;
globalThis.fetch=async (url,options={})=>{if(String(url).startsWith('http://127.0.0.1:4173/api/')){const req=new Request(url,options);return route[req.method](req)}return originalFetch(url,options)};
await import('./api.mjs');
console.log('Actual route handlers verified against SQLite with separate guest sessions.');

const assert=(await import('node:assert/strict')).default;
const mcp=await import('../app/mcp/route.ts');
async function rpc(method,params,identity){const r=await mcp.POST(new Request('https://mo.example/mcp',{method:'POST',headers:{'Content-Type':'application/json',...(identity?{'oai-authenticated-user-id':identity}:{})},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})}));return r.json()}
const tools=await rpc('tools/list');assert.equal(tools.result.tools.length,9);assert.equal(tools.result.tools.find(t=>t.name==='list_plans').annotations.readOnlyHint,true);
const denied=await rpc('tools/call',{name:'list_plans',arguments:{}});assert.equal(denied.result.isError,true);
const created=await rpc('tools/call',{name:'create_plan',arguments:{title:'ChatGPT test trip',name:'Test setter',kind:'trip',tasks:[{title:'Agree budget',category:'todo'}]}},'mcp-test-owner');assert.equal(created.result.isError,false);const createdPlan=JSON.parse(created.result.content[0].text);assert.ok(createdPlan.url.includes(createdPlan.id));
const updated=await rpc('tools/call',{name:'update_plan',arguments:{plan_id:createdPlan.id,place:'Test cabin'}},'mcp-test-owner');assert.equal(updated.result.isError,false);
const read=await rpc('tools/call',{name:'read_plan',arguments:{plan_id:createdPlan.id}},'mcp-test-owner');const saved=JSON.parse(read.result.content[0].text);assert.equal(saved.plan.title,'ChatGPT test trip');assert.equal(saved.plan.place,'Test cabin');assert.equal(saved.tasks[0].title,'Agree budget');
const invalid=await rpc('tools/call',{name:'create_plan',arguments:{title:'Missing name'}},'mcp-test-owner');assert.equal(invalid.result.isError,true);
console.log('PASS: MCP discovery, nine tool schemas, authenticated creation, partial updates preserving details, shared data and invalid-input rejection.');

async function call(name,args,identity='mcp-test-owner') {const r=await rpc('tools/call',{name,arguments:args},identity);return {error:r.result.isError,data:JSON.parse(r.result.content[0].text)}}
async function web(path,method='GET',body,identity='mcp-test-owner') {const r=await route[method](new Request('https://mo.example/api/'+path,{method,headers:{Origin:'https://mo.example','Content-Type':'application/json','oai-authenticated-user-id':identity},...(body?{body:JSON.stringify(body)}:{})}));return {status:r.status,data:await r.json()}}
const planId=createdPlan.id;
const proposal={source:'Friendsgiving at my home. We have not checked dietary needs, headcount or who brings what.',fields:{place:'My home'},items:[{title:'Ask about dietary needs',category:'todo'},{title:'Confirm headcount',category:'todo'},{title:'Bring a side dish',category:'bring'}],decisions:['Host at my home'],suggestions:['Share contributions after checking dietary needs'],questions:['What dietary needs should we plan for?','How many people can attend?','Who wants to bring a dish?']};
const before=(await web('plan/'+planId)).data;
const proposed=await call('propose_preparation_draft',{plan_id:planId,...proposal});assert.equal(proposed.error,false);assert.ok(proposed.data.reviewUrl.includes(planId));
let current=(await call('read_plan',{plan_id:planId})).data;assert.equal(current.plan.place,before.plan.place);assert.equal(current.tasks.length,before.tasks.length);assert.deepEqual(current.drafts[0].content.questions,proposal.questions);
assert.equal((await call('propose_preparation_draft',{plan_id:planId,...proposal},'unrelated-guest')).error,true);
assert.equal((await web('plan/'+planId,'GET',undefined,'unrelated-guest')).data.drafts.length,0);
assert.equal((await call('review_preparation_draft',{plan_id:planId,draft_id:proposed.data.id,revision:1,action:'apply'},'unrelated-guest')).error,true);
const corrected={...proposal,fields:{place:'Host’s apartment'},items:proposal.items.slice(0,2)};
assert.equal((await call('review_preparation_draft',{plan_id:planId,draft_id:proposed.data.id,revision:1,action:'edit',content:corrected})).error,false);
assert.equal((await call('review_preparation_draft',{plan_id:planId,draft_id:proposed.data.id,revision:1,action:'apply'})).error,true);
const applyArgs={plan_id:planId,draft_id:proposed.data.id,revision:2,action:'apply'};
assert.equal((await call('review_preparation_draft',applyArgs)).error,false);
assert.equal((await call('review_preparation_draft',applyArgs)).error,false);
current=(await web('plan/'+planId)).data;assert.equal(current.plan.place,'Host’s apartment');assert.equal(current.plan.title,before.plan.title);assert.equal(current.tasks.length,before.tasks.length+2);assert.ok(current.tasks.slice(-2).every(t=>!t.claimed_name&&!t.isMine));assert.deepEqual(current,(await call('read_plan',{plan_id:planId})).data);
const reject=await call('propose_preparation_draft',{plan_id:planId,...proposal});
assert.equal((await web(`plan/${planId}/drafts/${reject.data.id}`,'PATCH',{action:'reject',revision:1})).status,200);
assert.equal((await call('review_preparation_draft',{plan_id:planId,draft_id:reject.data.id,revision:1,action:'apply'})).error,true);
assert.equal((await web('plan/'+planId)).data.tasks.length,current.tasks.length);
// A guest claims an existing item, then declines: item reopens and the briefing follows persisted state.
await call('respond_to_plan',{plan_id:planId,name:'Guest',status:'in'},'guest');
await call('update_plan_item',{plan_id:planId,task_id:current.tasks[0].id,action:'claim'},'guest');
const stale=await call('propose_preparation_draft',{plan_id:planId,...proposal});
await call('respond_to_plan',{plan_id:planId,name:'Guest',status:'out'},'guest');
const afterDecline=(await call('read_plan',{plan_id:planId})).data;
assert.equal(afterDecline.briefing.declined,1);assert.equal(afterDecline.tasks[0].claimed_name,null);assert.ok(afterDecline.briefing.gaps.some(g=>g.includes(afterDecline.tasks[0].title)));assert.ok(afterDecline.briefing.followUps.every(f=>f.sent===false));
assert.equal((await call('review_preparation_draft',{plan_id:planId,draft_id:stale.data.id,revision:1,action:'apply'})).error,true);
assert.equal((await web('plan/'+planId)).data.tasks.length,current.tasks.length);
// Invalid source, invented assignment fields and dates are rejected rather than silently normalized.
for(const invalidProposal of [{...proposal,source:''},{...proposal,fields:{date:'not a date'}},{...proposal,items:[{title:'Bring bread',category:'bring',claimed_by:'guest'}]}]) assert.equal((await web(`plan/${planId}/drafts`,'POST',invalidProposal)).status,400);
// Atomic rollback: a storage failure after the gate leaves both the draft and plan untouched.
const rollback=await call('propose_preparation_draft',{plan_id:planId,...proposal});
const actualPrepare=globalThis.__moTestEnv.DB.prepare;
globalThis.__moTestEnv.DB.prepare=sql=>{const stmt=actualPrepare(sql);if(sql.startsWith('INSERT INTO tasks')&&sql.includes('SELECT'))stmt.run=async()=>{throw Error('Injected storage failure')};return stmt};
const oldConsole=console.error;console.error=()=>{};
assert.equal((await web(`plan/${planId}/drafts/${rollback.data.id}`,'PATCH',{action:'apply',revision:1})).status,500);
console.error=oldConsole;globalThis.__moTestEnv.DB.prepare=actualPrepare;
let rolled=(await web('plan/'+planId)).data;assert.equal(rolled.plan.place,'Host’s apartment');assert.equal(rolled.tasks.length,current.tasks.length);assert.equal(rolled.drafts.find(d=>d.id===rollback.data.id).status,'pending');
// Change the plan between preflight read and apply batch; SQL snapshot guard prevents a lost update.
const actualBatch=globalThis.__moTestEnv.DB.batch;
globalThis.__moTestEnv.DB.batch=async ss=>{sqlite.prepare('UPDATE plans SET budget=? WHERE id=?').run('Newly agreed budget',planId);return actualBatch(ss)};
assert.equal((await web(`plan/${planId}/drafts/${rollback.data.id}`,'PATCH',{action:'apply',revision:1})).status,409);
globalThis.__moTestEnv.DB.batch=actualBatch;
assert.equal((await web('plan/'+planId)).data.plan.budget,'Newly agreed budget');
const trip=await call('create_plan',{title:'Cabin idea',name:'Setter',kind:'trip'});
const tripDraft={source:'We are considering a cabin weekend. No dates, budget or cabin selected. Pat said maybe.',fields:{},decisions:[],suggestions:['Compare cabins once dates and budget are agreed'],questions:['Which dates work?','What is the per-person budget?','Who can attend?'],items:[{title:'Agree travel dates',category:'todo'},{title:'Compare accommodation options; do not book yet',category:'todo'},{title:'Discuss transport',category:'todo'}]};
const td=await call('propose_preparation_draft',{plan_id:trip.data.id,...tripDraft});assert.equal(td.error,false);
assert.equal((await call('review_preparation_draft',{plan_id:trip.data.id,draft_id:td.data.id,revision:1,action:'apply'})).error,false);
const tr=(await call('read_plan',{plan_id:trip.data.id})).data;assert.equal(tr.plan.budget,'');assert.equal(tr.plan.date,'');assert.equal(tr.guests.length,1);assert.ok(tr.tasks.every(t=>!t.claimed_name));assert.ok(tr.drafts[0].content.questions.includes('Who can attend?'));
console.log('PASS: review/edit/reject, atomic idempotent apply, source validation, host-only draft privacy, stale revision/attendance/concurrent-plan rejection, rollback, web/MCP parity, unsent briefing, Friendsgiving and trip drafts.');
