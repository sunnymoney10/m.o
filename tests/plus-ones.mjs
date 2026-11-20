// Plus-ones: Mom (an invited guest who answered) asks to bring Cynthia; the host approves; Cynthia's link reaches
// her through Mom or the host; she joins "with Mom" and counts toward Mom's 4 extra spots. Open plans skip approval.
import assert from 'node:assert/strict';
const origin='http://127.0.0.1:4173';
const host=crypto.randomUUID(),mom=crypto.randomUUID(),cyn=crypto.randomUUID(),dee=crypto.randomUUID(),stranger=crypto.randomUUID();
async function req(actor,path,method='GET',body){const r=await fetch(origin+'/api/'+path,{method,headers:{Origin:origin,Cookie:'mo_session='+actor,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()}}
const id=(await req(host,'plans','POST',{title:'Skate day',name:'Ari',place:'PRIVATE RINK',tasks:[]})).body.id,base=`plan/${id}`;
await req(host,base+'/guests','POST',{names:['Mom']});
let d=(await req(host,base)).body;const momRow=d.guests.find(g=>g.name==='Mom');
const momLink=(await req(host,`${base}/guests/${momRow.id}/invite`,'POST',{})).body.link.split('/').pop();
assert.equal((await req(mom,`${base}/guests/${momRow.id}/pick`,'POST',{token:momLink})).status,200);

// Before answering, Mom can't ask; strangers and the host can't use the guest route.
assert.equal((await req(mom,`${base}/plus-ones`,'POST',{name:'Cynthia'})).status,403,'answer first');
assert.equal((await req(stranger,`${base}/plus-ones`,'POST',{name:'Cynthia'})).status,403);
assert.equal((await req(host,`${base}/plus-ones`,'POST',{name:'Cynthia'})).status,400,'the host adds people to the list directly');
await req(mom,base+'/rsvp','POST',{name:'Mom',status:'in'});

// Mom asks. It waits for the host, off the guest list; strangers can't see it.
assert.equal((await req(mom,`${base}/plus-ones`,'POST',{name:'  '})).status,400);
assert.equal((await req(mom,`${base}/plus-ones`,'POST',{name:'Mom'})).status,409,'names already on the list are refused');
let r=await req(mom,`${base}/plus-ones`,'POST',{name:'Cynthia +1 (215) 555-0134'});assert.equal(r.status,201);assert.equal(r.body.status,'requested');const cid=r.body.id;
d=(await req(mom,base)).body;assert.deepEqual(d.myPlusOnes.map(x=>[x.name,x.status]),[['Cynthia','requested']],'Mom sees her request; the number was stripped');assert.equal(d.plusOnesLeft,3);
assert.ok(!d.guests.some(g=>g.name==='Cynthia'),'not on the guest list yet');
d=(await req(stranger,base)).body;assert.ok(!JSON.stringify(d).includes('Cynthia'),'strangers don’t see requests');
d=(await req(host,base)).body;assert.deepEqual(d.plusOneRequests,[{id:cid,name:'Cynthia',withName:'Mom'}],'the host sees who asked');
assert.ok(d.activity.some(a=>a.text==='Mom asked to bring Cynthia'));
r=await req(host,'plans');assert.equal(r.body.plans.find(p=>p.id===id).requests,1,'home shows 1 request');
r=await req(mom,'plans');assert.equal(r.body.plans.find(p=>p.id===id).requests,0,'only the host sees the count');

// Nobody else can approve, and no link before approval.
assert.equal((await req(mom,`${base}/guests/${cid}/plus-one`,'POST',{decision:'approved'})).status,403);
assert.equal((await req(mom,`${base}/guests/${cid}/invite`,'POST',{})).status,400,'no link before approval');
assert.equal((await req(host,`${base}/guests/${cid}/invite`,'POST',{})).status,400);
assert.equal((await req(host,`${base}/guests/${cid}/plus-one`,'POST',{decision:'approved'})).status,200);
assert.equal((await req(host,`${base}/guests/${cid}/plus-one`,'POST',{decision:'declined'})).status,400,'already answered');
d=(await req(host,base)).body;assert.equal(d.plusOneRequests.length,0);{const c=d.guests.find(g=>g.name==='Cynthia');assert.equal(c.withName,'Mom');assert.equal(c.detailsApproved,true,'approving covers arrival details')}

// Mom makes Cynthia's link (once). A stranger can't; the host must replace it explicitly.
assert.equal((await req(stranger,`${base}/guests/${cid}/invite`,'POST',{})).status,403);
r=await req(mom,`${base}/guests/${cid}/invite`,'POST',{});assert.equal(r.status,200);const cynLink=r.body.link.split('/').pop();
assert.equal((await req(mom,`${base}/guests/${cid}/invite`,'POST',{})).status,403,'Mom can’t make a second link (it would break the first)');
assert.equal((await req(mom,`${base}/guests/${cid}/invite`,'POST',{revoke:true})).status,403,'only the host revokes');
d=(await req(mom,base)).body;assert.equal(d.myPlusOnes[0].hasLink,true);

// Cynthia opens it, says she's in, and sees the address.
assert.equal((await req(cyn,`${base}/guests/${cid}/pick`,'POST',{token:cynLink})).status,200);
assert.equal((await req(cyn,base+'/rsvp','POST',{name:'Cynthia',status:'in'})).status,200);
d=(await req(cyn,base)).body;assert.equal(d.plan.place,'PRIVATE RINK','approved plus-ones see the address after answering');
d=(await req(host,base)).body;assert.equal(d.guests.find(g=>g.name==='Cynthia').status,'in');
r=await req(host,'plans');assert.equal(r.body.plans.find(p=>p.id===id).going,3,'Ari, Mom and Cynthia');

// Mom's 4 spots: Cynthia + 3 more; extra guests on her RSVP share the same 4.
for(const n of ['Dee','Eli'])assert.equal((await req(mom,`${base}/plus-ones`,'POST',{name:n})).status,201);
await req(mom,base+'/rsvp','POST',{name:'Mom',status:'in',extraCount:4});
d=(await req(mom,base)).body;assert.equal(d.guests.find(g=>g.isMe).extra_count,1,'RSVP extras are capped by plus-ones');assert.equal(d.plusOnesLeft,0);
assert.equal((await req(mom,`${base}/plus-ones`,'POST',{name:'Fay'})).status,400,'no more than 4');
// The host declines Eli; Mom sees it and can clear it; a declined request frees the spot.
const eli=(await req(host,base)).body.plusOneRequests.find(x=>x.name==='Eli');
assert.equal((await req(host,`${base}/guests/${eli.id}/plus-one`,'POST',{decision:'declined'})).status,200);
d=(await req(mom,base)).body;assert.equal(d.myPlusOnes.find(x=>x.name==='Eli').status,'declined');assert.equal(d.plusOnesLeft,1);
assert.equal((await req(mom,`${base}/plus-ones/${eli.id}`,'DELETE')).status,200);
assert.equal((await req(mom,`${base}/plus-ones/${cid}`,'DELETE')).status,400,'approved people are removed by the host only');
assert.equal((await req(stranger,`${base}/plus-ones/${cid}`,'DELETE')).status,403);

// Open plans: the host lets guests bring people without asking.
assert.equal((await req(mom,base,'PATCH',{openPlusOnes:true})).status,403);
assert.equal((await req(host,base,'PATCH',{openPlusOnes:true})).status,200);
d=(await req(mom,base)).body;assert.equal(d.openPlusOnes,true);
const dee2=(await req(host,base)).body.plusOneRequests.find(x=>x.name==='Dee');await req(host,`${base}/plus-ones`,'POST',{});
await req(host,`${base}/guests/${dee2.id}/plus-one`,'POST',{decision:'declined'});await req(mom,`${base}/plus-ones/${dee2.id}`,'DELETE');
r=await req(mom,`${base}/plus-ones`,'POST',{name:'Gus'});assert.equal(r.status,201);assert.equal(r.body.status,'invited','open plans add them straight away');
d=(await req(host,base)).body;assert.ok(d.guests.some(g=>g.name==='Gus'&&g.withName==='Mom'));assert.ok(d.activity.some(a=>a.text==='Mom added Gus (bringing them)'));
assert.equal((await req(mom,`${base}/guests/${r.body.id}/invite`,'POST',{})).status,200,'Mom can send Gus his link right away');
r=await req(host,base,'PATCH',{title:'Skate day!'});d=(await req(host,base)).body;assert.equal(d.openPlusOnes,true,'other edits keep the setting');
console.log('PASS: plus-ones: guests who answered ask to bring someone; host approves or declines (or opens the plan); one link via the guest or host; "with" label; 4-spot cap shared with extras; private to host and asker.');
