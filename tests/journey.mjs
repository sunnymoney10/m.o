// The plan journey: In the chat → Taking shape → Locked in → Made it out, and the host's "things left".
// Worked out only from saved data. Silence is never an answer; only the host sees what's left.
import assert from 'node:assert/strict';
import {stageOf,thingsLeft,factsFrom,seatSummary} from '../lib/journey.ts';
const base={hasDate:true,hasPlace:true,madeIt:false,others:2,noReply:0,checking:0,openItems:0,openDateVotes:0,openPlaceVotes:0,openOtherVotes:0,requests:0};
assert.equal(stageOf({...base,hasDate:false}),'chat','no date: still in the chat');
assert.equal(stageOf(base),'locked','date, place, everyone answered, nothing open: locked in');
assert.equal(stageOf({...base,noReply:1}),'shape','someone who hasn’t replied keeps it taking shape (silence is not a yes)');
assert.equal(stageOf({...base,checking:1}),'shape','still checking is not settled');
assert.equal(stageOf({...base,madeIt:true,noReply:3}),'out','made it out only when the host says so, whatever is left');
assert.deepEqual(thingsLeft({...base,others:0,hasDate:false,hasPlace:false,openItems:2}),['people','date','place','items']);
assert.deepEqual(thingsLeft({...base,hasDate:false,openDateVotes:1}),['date'],'an open date vote is part of the date line, not a separate one');
assert.deepEqual(thingsLeft({...base,openDateVotes:1}),['votes'],'a date vote still open after the date is set is its own line');
assert.deepEqual(thingsLeft({...base,requests:1,noReply:1}),['requests','answers']);
assert.deepEqual(thingsLeft({...base,madeIt:true,openItems:4}),[]);
const f=factsFrom({plan:{date:'2026-11-26T22:00:00Z',place:'Tess’s'},guests:[{status:'in',isHost:true},{status:'invited'},{status:'maybe'},{status:'out'},{status:'requested'}],tasks:[{claimed_name:null},{claimed_name:'Ari'}],polls:[{kind:'choice',decided_option:null},{kind:'date',decided_option:'x'}]});
assert.deepEqual([f.others,f.noReply,f.checking,f.openItems,f.openOtherVotes,f.openDateVotes],[3,1,1,1,1,0],'facts from a plan: host and pending requests are not on the list');
assert.equal(seatSummary({in:4,maybe:1,wait:2,cant:0}),'4 coming, 1 checking, 2 no reply');

// The real API: the stage is the same for the host and a guest; only the host gets the things left.
const origin='http://127.0.0.1:4173',host=crypto.randomUUID(),tess=crypto.randomUUID(),stranger=crypto.randomUUID();
async function req(actor,path,method='GET',body){const r=await fetch(origin+'/api/'+path,{method,headers:{Origin:origin,Cookie:'mo_session='+actor,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()}}
const listed=async(who,id)=>(await req(who,'plans')).body.plans.find(p=>p.id===id);
const idea=(await req(host,'plans','POST',{title:'Journey idea',name:'Ari'})).body.id;
let p=await listed(host,idea);assert.equal(p.stage,'chat');assert.deepEqual(p.left,['people','date','place']);
const id=(await req(host,'plans','POST',{title:'Journey dinner',name:'Ari',date:'2026-12-12T23:00:00Z',place:'12 Oak Ave',tasks:[{title:'Dessert',category:'bring'}]})).body.id;
await req(tess,`plan/${id}/rsvp`,'POST',{name:'Tess',status:'in'});
p=await listed(host,id);assert.equal(p.stage,'shape');assert.deepEqual(p.left,['items'],'Tess answered; only dessert is left');assert.equal(p.cant,0);
const g=await listed(tess,id);assert.equal(g.stage,'shape','the guest sees the same stage');assert.equal(g.left,undefined,'guests never get the host’s list');
const task=(await req(tess,`plan/${id}`)).body.tasks[0].id;
assert.equal((await req(tess,`plan/${id}/tasks/${task}`,'PATCH',{action:'claim'})).status,200);
p=await listed(host,id);assert.equal(p.stage,'locked');assert.deepEqual(p.left,[]);
// A stranger can't see the address, but still sees the right stage (worked out on the server from the real place).
const seen=(await req(stranger,`plan/${id}`)).body;assert.equal(seen.plan.place,'','address stays hidden');assert.equal(seen.plan.stage,'locked');
await req(host,`plan/${id}/guests`,'POST',{names:['Jordan']});
p=await listed(host,id);assert.equal(p.stage,'shape');assert.deepEqual(p.left,['answers'],'a new name with no reply reopens the plan');
assert.equal((await req(host,`plan/${id}`)).body.plan.stage,'shape');
console.log('PASS: journey: in the chat → taking shape → locked in → made it out from saved data only; same stage for host, guest and stranger; things left for the host only.');
