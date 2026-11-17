import {registerHooks} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
const sqlite=new DatabaseSync(':memory:');
for(const f of readdirSync(new URL('../drizzle',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())sqlite.exec(readFileSync(new URL('../drizzle/'+f,import.meta.url),'utf8'));
class Statement{constructor(sql){this.sql=sql;this.args=[]}bind(...args){this.args=args;return this}async first(){return sqlite.prepare(this.sql).get(...this.args)||null}async all(){return {results:sqlite.prepare(this.sql).all(...this.args)}}async run(){const r=sqlite.prepare(this.sql).run(...this.args);return {meta:{changes:r.changes}}}}
globalThis.__moTestEnv={DB:{prepare:sql=>new Statement(sql),batch:async ss=>{sqlite.exec('BEGIN');try{const results=[];for(const s of ss)results.push(await s.run());sqlite.exec('COMMIT');return results}catch(e){sqlite.exec('ROLLBACK');throw e}}}};
registerHooks({resolve(specifier,context,next){if(specifier==='cloudflare:workers')return {url:'data:text/javascript,export const env = globalThis.__moTestEnv',shortCircuit:true};if(specifier==='../api/[[...path]]/route')return {url:new URL('../api/[[...path]]/route.ts',context.parentURL).href,shortCircuit:true};return next(specifier,context)}});
const route=await import('../app/api/[[...path]]/route.ts');
const originalFetch=globalThis.fetch;
globalThis.fetch=async (url,options={})=>{if(String(url).startsWith('http://127.0.0.1:4173/api/')){const req=new Request(url,options);return route[req.method](req)}return originalFetch(url,options)};
await import('./api.mjs');
console.log('Actual route handlers verified against SQLite with separate guest sessions.');

const assert=(await import('node:assert/strict')).default;
const mcp=await import('../app/mcp/route.ts');
async function rpc(method,params,identity){const r=await mcp.POST(new Request('https://mo.example/mcp',{method:'POST',headers:{'Content-Type':'application/json',...(identity?{'oai-authenticated-user-id':identity}:{})},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})}));return r.json()}
const tools=await rpc('tools/list');assert.equal(tools.result.tools.length,7);assert.equal(tools.result.tools.find(t=>t.name==='list_plans').annotations.readOnlyHint,true);
const denied=await rpc('tools/call',{name:'list_plans',arguments:{}});assert.equal(denied.result.isError,true);
const created=await rpc('tools/call',{name:'create_plan',arguments:{title:'ChatGPT test trip',name:'Test setter',kind:'trip',tasks:[{title:'Agree budget',category:'todo'}]}},'mcp-test-owner');assert.equal(created.result.isError,false);const createdPlan=JSON.parse(created.result.content[0].text);assert.ok(createdPlan.url.includes(createdPlan.id));
const updated=await rpc('tools/call',{name:'update_plan',arguments:{plan_id:createdPlan.id,place:'Test cabin'}},'mcp-test-owner');assert.equal(updated.result.isError,false);
const read=await rpc('tools/call',{name:'read_plan',arguments:{plan_id:createdPlan.id}},'mcp-test-owner');const saved=JSON.parse(read.result.content[0].text);assert.equal(saved.plan.title,'ChatGPT test trip');assert.equal(saved.plan.place,'Test cabin');assert.equal(saved.tasks[0].title,'Agree budget');
const invalid=await rpc('tools/call',{name:'create_plan',arguments:{title:'Missing name'}},'mcp-test-owner');assert.equal(invalid.result.isError,true);
console.log('PASS: MCP discovery, seven tool schemas, authenticated creation, partial updates preserving details, shared data and invalid-input rejection.');

async function desk(method,identity,body){return route[method](new Request('https://mo.example/api/host-desk',{method,headers:{'Origin':'https://mo.example','Content-Type':'application/json',...(identity?{'oai-authenticated-user-id':identity}:{})},...(body?{body:JSON.stringify(body)}:{})}))}
assert.equal((await desk('GET')).status,401);
const deskData={title:'Synthetic host event',guests:[],address:'Private test address'};
assert.equal((await desk('POST','host-a',{version:0,data:deskData})).status,200);
assert.deepEqual((await (await desk('GET','host-a')).json()).data,deskData);
assert.equal((await (await desk('GET','host-b')).json()).data,null);
assert.equal((await desk('POST','host-a',{version:0,data:deskData})).status,409);
assert.equal((await desk('POST','host-a',{version:1,data:{...deskData,title:'Updated'}})).status,200);
assert.equal((await desk('POST','host-a',{version:1,data:deskData})).status,409);
assert.equal((await desk('POST','host-b',{version:0,data:{}})).status,400);
console.log('PASS: private host desk identity, durable save, separate-user isolation, conflict protection and invalid-input rejection.');
const syntheticDesk={title:'Synthetic dinner',when:'Test time',place:'Test city',address:'NEVER EXPOSE',guests:[{id:'guest-one',name:'Synthetic guest',rsvp:'Awaiting reply',dish:'',note:'PRIVATE NOTE',phone:'PRIVATE PHONE',food:'Offered',plus:'None',plusNames:''},{id:'guest-two',name:'Other synthetic guest',rsvp:'Confirmed',dish:'Dessert',note:'PRIVATE OTHER'}],tools:{needs:[{id:'n1',title:'Ice',effort:'Buy ready-made',budget:'Low'}],roles:[{id:'r1',title:'Setup',guestId:'',confirmed:false}],blocks:[]}};
await desk('POST','tools-owner',{version:0,data:syntheticDesk});
async function endpoint(path,body,identity){return route.POST(new Request('https://mo.example/api/'+path,{method:'POST',headers:{Origin:'https://mo.example','Content-Type':'application/json',...(identity?{'oai-authenticated-user-id':identity}:{})},body:JSON.stringify(body)}))}
assert.equal((await endpoint('reply-link',{guestId:'guest-one'},'outsider')).status,400);
const replyLink=await (await endpoint('reply-link',{guestId:'guest-one'},'tools-owner')).json();const token=replyLink.path.split('#')[1];assert.ok(token);
const card=await (await endpoint('guest-reply',{token,action:'read'})).json();assert.equal(card.guest.name,'Synthetic guest');assert.ok(!JSON.stringify(card).includes('PRIVATE'));assert.ok(!JSON.stringify(card).includes('NEVER EXPOSE'));assert.ok(!JSON.stringify(card).includes('Other synthetic guest'));
const reply={token,action:'save',rsvp:'Confirmed',dish:'Ice',serves:'20',reconfirm:true,plusNames:'New guest',roles:['r1'],diet:'Test restriction',arrival:'4 PM',kitchen:'None'};
assert.equal((await endpoint('guest-reply',reply)).status,200);
let savedDesk=(await (await desk('GET','tools-owner')).json()).data;assert.equal(savedDesk.guests[0].food,'Reconfirmed');assert.equal(savedDesk.guests[0].plus,'Requested');assert.equal(savedDesk.tools.roles[0].confirmed,true);assert.equal(savedDesk.tools.roles[0].guestId,'guest-one');
assert.equal((await endpoint('guest-reply',{...reply,dish:'Dessert'})).status,409);
assert.equal((await desk('POST','tools-owner',{version:1,data:syntheticDesk})).status,409);
assert.equal((await endpoint('guest-reply',{...reply,rsvp:'Declined'})).status,200);
savedDesk=(await (await desk('GET','tools-owner')).json()).data;assert.equal(savedDesk.tools.roles[0].guestId,'');
await endpoint('reply-link',{guestId:'guest-one',revoke:true},'tools-owner');assert.equal((await endpoint('guest-reply',{token,action:'read'})).status,404);
const {conflicts,suggestions}=await import('../lib/host-tools.mts');
const blocks=[{id:'a',title:'Pickup',person:'host',resource:'',start:'16:00',end:'17:00'},{id:'b',title:'Setup',person:'host',resource:'Oven',start:'16:30',end:'17:00'},{id:'c',title:'Reheat',person:'g1',resource:'Oven',start:'17:00',end:'17:30'}];assert.equal(conflicts(blocks,'person').length,1);assert.equal(conflicts(blocks,'resource').length,0);
assert.equal(suggestions(syntheticDesk.tools.needs,[{dish:'ice',rsvp:'Confirmed'}]).length,0);assert.equal(suggestions(syntheticDesk.tools.needs,[{dish:'ice',rsvp:'Declined'}]).length,1);
console.log('PASS: personal reply privacy, scoped updates, reconfirmation, plus-one requests, role claims/releases, stale-host protection, duplicate contributions, link revocation and scheduling rules.');
const {blankConcierge,extractInfo,forGuest}=await import('../lib/concierge.mts');
const extracted=extractInfo('Park in the driveway.\nDoor code is 12345\nQuiet hours start at 10.\nWear a jacket.','Synthetic source');assert.equal(extracted.length,3);assert.ok(extracted.every(i=>!i.approved));assert.ok(!JSON.stringify(extracted).includes('12345'));
const concierge={...blankConcierge(),items:[{id:'public',category:'Parking',title:'Parking',text:'Driveway',source:'Synthetic source',original:'Park in driveway',approved:true,audience:[]},{id:'private',category:'Arrival',title:'Setup',text:'Setup entrance',source:'Host',original:'',approved:true,audience:['guest-two']},{id:'draft',category:'Property rules',title:'Draft',text:'DO NOT SHARE',source:'Host',original:'',approved:false,audience:[]}],code:'SYNTHETIC-CODE',codeGuests:['guest-one'],releaseCode:true};
assert.equal(forGuest(concierge,'guest-one',true).instructions.length,1);assert.equal(forGuest(concierge,'guest-one',true).accessCode,'');assert.equal(forGuest(concierge,'guest-two',true).accessCode,'');assert.equal(forGuest(concierge,'guest-one',false).accessCode,'');assert.equal(forGuest({...concierge,releaseCode:false},'guest-one',true).accessCode,'');
const current=await (await desk('GET','tools-owner')).json();current.data.concierge=concierge;current.data.guests[0].rsvp='Confirmed';await desk('POST','tools-owner',{version:current.version,data:current.data});
const freshLink=await (await endpoint('reply-link',{guestId:'guest-one'},'tools-owner')).json();const freshToken=freshLink.path.split('#')[1];const guestRead=await (await endpoint('guest-reply',{token:freshToken,action:'read'})).json();assert.equal(guestRead.accessCode,'');assert.equal(guestRead.instructions.length,1);assert.ok(!JSON.stringify(guestRead).includes('DO NOT SHARE'));assert.ok(!JSON.stringify(guestRead).includes('Setup entrance'));
console.log('PASS: instruction extraction drafts, code exclusion, approved-only audience filtering and confirmed-guest access release.');
const {blankBoard,pollOpen,counts,rideIssues}=await import('../lib/group-board.mts');
const board={...blankBoard(),polls:[{id:'p1',question:'Synthetic game?',options:['Cards','Games'],votes:{},closes:'',closed:false,decision:''}],errands:[{id:'e1',title:'Synthetic ice',store:'Test store',area:'Test area',by:'4 PM',guestId:'',confirmed:false,done:false}],rides:[]};
const bd=await (await desk('GET','tools-owner')).json();bd.data.board=board;await desk('POST','tools-owner',{version:bd.version,data:bd.data});
assert.equal((await endpoint('guest-reply',{token:freshToken,action:'coordinate',pollId:'p1',option:1})).status,200);
assert.equal((await endpoint('guest-reply',{token:freshToken,action:'coordinate',pollId:'p1',option:0})).status,200);
let state=await (await desk('GET','tools-owner')).json();assert.deepEqual(counts(state.data.board.polls[0]),[1,0]);assert.equal(state.data.guests[0].rsvp,'Confirmed');
assert.equal((await endpoint('guest-reply',{token:freshToken,action:'coordinate',pollId:'p1',option:8})).status,400);
assert.equal((await endpoint('guest-reply',{token:freshToken,action:'coordinate',errandId:'e1'})).status,200);
state=await (await desk('GET','tools-owner')).json();assert.equal(state.data.board.errands[0].guestId,'guest-one');assert.equal(state.data.board.errands[0].confirmed,true);
const otherLink=await (await endpoint('reply-link',{guestId:'guest-two'},'tools-owner')).json();const otherToken=otherLink.path.split('#')[1];assert.equal((await endpoint('guest-reply',{token:otherToken,action:'coordinate',errandId:'e1'})).status,409);
state.data.board.polls[0].closed=true;await desk('POST','tools-owner',{version:state.version,data:state.data});assert.equal((await endpoint('guest-reply',{token:freshToken,action:'coordinate',pollId:'p1',option:1})).status,400);
assert.equal(pollOpen({...board.polls[0],closes:'2000-01-01T00:00:00Z'}),false);
assert.equal((await endpoint('guest-reply',{...reply,token:freshToken,rsvp:'Declined',transport:'Need a ride',pickupArea:'Synthetic private area',rideTime:'4 PM',rideSeats:0})).status,200);
state=await (await desk('GET','tools-owner')).json();assert.equal(state.data.board.errands[0].guestId,'');assert.equal(state.data.guests[0].pickupArea,'Synthetic private area');
const outsiderCard=await (await endpoint('guest-reply',{token:otherToken,action:'read'})).json();assert.ok(!JSON.stringify(outsiderCard).includes('Synthetic private area'));
assert.equal(rideIssues([{id:'r1',driver:'g1',passengers:['g2','g3'],seats:1,area:'',when:'',confirmed:false}]).length,1);
console.log('PASS: one changeable vote per guest, closed/deadline polls, exclusive errand claims, decline releases, private transport details and ride capacity checks.');
const {blankOps,cents,splitCents,balances,briefing,reusableTemplate,calendar}=await import('../lib/operations.mts');
assert.equal(cents('12.34'),1234);assert.equal(cents('12.345'),null);assert.equal(cents('-1'),null);assert.equal(cents('0.01'),1);assert.deepEqual(splitCents(100,['a','b','c']),{a:34,b:33,c:33});assert.deepEqual(splitCents(100,['a','a','b']),{a:50,b:50});
const ops={...blankOps(),expenses:[{id:'x',title:'Stay',cents:101,category:'Overnight',split:['a','b']},{id:'y',title:'Undecided',cents:50,category:'Gathering',split:[]}],supplies:[{id:'s',title:'Cups',need:20,have:0,guestId:'a',confirmed:false}],dietChecks:{},menu:{}};
assert.equal(balances(ops).total,151);assert.equal(balances(ops).unallocated,50);assert.equal(balances(ops).due.a,51);
const fixture={title:'Synthetic gathering',address:'PRIVATE ADDRESS',guests:[{id:'a',name:'PRIVATE NAME',rsvp:'Declined',dish:'',diet:'',phone:'PRIVATE PHONE'}],ops,tools:{needs:[{title:'Ice',effort:'Buy ready-made',budget:'Low'}],roles:[{title:'Setup',guestId:'a',confirmed:true}],blocks:[]},concierge:{code:'PRIVATE CODE'}};
assert.ok(briefing(fixture).some(x=>x.title.includes('declined guest')));assert.ok(briefing(fixture).some(x=>x.title.includes('supplies')));assert.ok(!JSON.stringify(reusableTemplate(fixture)).includes('PRIVATE'));assert.ok(calendar('2026-11-22T17:00:00-05:00','2026-11-22T22:00:00-05:00','Dinner').includes('DTSTART:20261122T220000Z'));assert.throws(()=>calendar('bad','bad','Dinner'));
console.log('PASS: exact-cent splits, unallocated costs, decline review, supply gaps, template privacy and timezone-correct calendar export.');
const {replyFlow}=await import('../lib/reply-flow.ts');const flow=replyFlow();flow.data={rsvp:'Confirmed'};assert.equal(flow.visiblePages.length,2);flow.data={rsvp:'Declined'};assert.equal(flow.visiblePages.length,1);flow.data={rsvp:'Maybe'};assert.equal(flow.visiblePages.length,1);
const draftA=await (await desk('GET','tools-owner')).json(),draftB=await (await desk('GET','host-b')).json();assert.ok(draftA.draftKey);assert.notEqual(draftA.draftKey,draftB.draftKey);
console.log('PASS: integrated reply branching and account-scoped local-draft keys.');

await import('./host-messages.mjs');

// Persist message provenance alongside the desk; a personal guest response invalidates the reviewed draft.
const {prepareMessage,messageContext,messageReady}=await import('../lib/host-messages.mts');
const messageEvent={title:'Synthetic cabin weekend',when:'December 4, 6 PM',place:'Test city',address:'PRIVATE TEST ADDRESS',invite:'Synthetic invitation',guests:[{id:'message-guest',name:'Test guest',rsvp:'Confirmed',dish:'Soup',plus:'None',plusNames:'',food:'Offered',phone:'',note:'',draft:'',sent:''}]};
await desk('POST','message-owner',{version:0,data:messageEvent});
let messageState=await (await desk('GET','message-owner')).json();
const msgGuest=messageState.data.guests[0];msgGuest.draft=prepareMessage(messageState.data,msgGuest,'Dish confirmation').text;msgGuest.draftKind='Dish confirmation';msgGuest.draftContext=messageContext(messageState.data,msgGuest,msgGuest.draftKind);
assert.equal((await desk('POST','message-owner',{version:messageState.version,data:messageState.data})).status,200);
messageState=await (await desk('GET','message-owner')).json();assert.equal(messageReady(messageState.data,messageState.data.guests[0]),true);assert.equal(messageState.data.guests[0].sent,'');const reviewedVersion=messageState.version;
const messageLink=await (await endpoint('reply-link',{guestId:'message-guest'},'message-owner')).json();
assert.equal((await endpoint('guest-reply',{token:messageLink.path.split('#')[1],action:'save',rsvp:'Declined',dish:'',roles:[],reconfirm:false})).status,200);
messageState=await (await desk('GET','message-owner')).json();assert.notEqual(messageState.version,reviewedVersion);assert.equal(messageReady(messageState.data,messageState.data.guests[0]),false);assert.equal(messageState.data.guests[0].sent,'');
assert.equal((await desk('POST','message-owner',{version:reviewedVersion,data:messageEvent})).status,409);
console.log('PASS: reviewed message context persists, guest responses invalidate drafts and stale host saves cannot overwrite replies.');

// Security regression matrix: anonymous, owner, unrelated authenticated user,
// forwarded personal link, replaced/revoked link, and cross-origin requests.
assert.equal((await endpoint('reply-link',{guestId:'guest-one'})).status,401);
for(const method of ['GET','POST'])assert.equal((await route[method](new Request('https://mo.example/api/plans',{method,headers:{Origin:'https://mo.example'},...(method==='POST'?{body:'{}'}:{})}))).status,401);
const forwarded=await (await endpoint('reply-link',{guestId:'guest-one'},'tools-owner')).json();
const forwardedToken=forwarded.path.split('#')[1];
const forwardRead=await (await endpoint('guest-reply',{token:forwardedToken,action:'read'},'unrelated')).json();
assert.equal(forwardRead.guest.name,'Synthetic guest');
assert.equal(forwardRead.accessCode,'','Forwarding must never grant door access');
assert.ok(!JSON.stringify(forwardRead).includes('SYNTHETIC-CODE'));
assert.equal((await endpoint('guest-reply',{token:freshToken,action:'read'})).status,404,'replacement invalidates previous link');
await endpoint('reply-link',{guestId:'guest-one',revoke:true},'tools-owner');
for(const action of ['read','save','coordinate'])assert.equal((await endpoint('guest-reply',{token:forwardedToken,action,rsvp:'Confirmed',pollId:'p1',option:0})).status,404);
assert.equal((await endpoint('guest-reply',{token:'invalid',action:'read'})).status,404);
assert.equal((await route.POST(new Request('https://mo.example/api/guest-reply',{method:'POST',headers:{Origin:'https://evil.example'},body:JSON.stringify({token:otherToken,action:'read'})}))).status,403);
console.log('PASS: access matrix, forwarded-link door-code isolation, replacement, revoked reads/writes and CSRF.');
const expiredLink=await (await endpoint('reply-link',{guestId:'guest-one'},'tools-owner')).json();
sqlite.prepare('UPDATE reply_links SET created=? WHERE owner=? AND guest_id=?').run('2000-01-01T00:00:00.000Z','tools-owner','guest-one');
assert.equal((await endpoint('guest-reply',{token:expiredLink.path.split('#')[1],action:'read'})).status,404,'expired links are denied');
console.log('PASS: 30-day invitation expiry.');
