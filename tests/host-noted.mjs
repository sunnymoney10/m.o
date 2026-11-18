// Friends who never open the link: the host records what they said, tracks it, and the guest can confirm later.
import assert from 'node:assert/strict';
const origin=process.env.SITE_TEST_URL||'http://127.0.0.1:4173';
const host=crypto.randomUUID(),tess=crypto.randomUUID(),stranger=crypto.randomUUID();
async function request(actor,path,method='GET',body){const r=await fetch(origin+'/api/'+path,{method,headers:{Origin:origin,Cookie:'mo_session='+actor,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json()}}

let r=await request(host,'plans','POST',{title:'QA potluck',name:'Ari',date:'2026-11-26T22:00:00Z',place:'12 Oak Ave',tasks:[{title:'Pie',category:'bring'},{title:'Ice',category:'bring'}]});const id=r.body.id;
await request(host,`plan/${id}/guests`,'POST',{names:['Tess','Jordan','Sam']});
r=await request(host,'plan/'+id);const row=n=>r.body.guests.find(g=>g.name===n);const tessId=row('Tess').id,jordanId=row('Jordan').id,samId=row('Sam').id;const pie=r.body.tasks.find(t=>t.title==='Pie').id,ice=r.body.tasks.find(t=>t.title==='Ice').id;

// Only the host can record answers or assign items.
r=await request(stranger,`plan/${id}/guests/${tessId}/response`,'POST',{status:'in'});assert.equal(r.status,403);
r=await request(stranger,`plan/${id}/tasks/${pie}`,'PATCH',{action:'assign',guestId:tessId});assert.equal(r.status,403);
r=await request(host,`plan/${id}/guests/${(await request(host,'plan/'+id)).body.guests.find(g=>g.isHost).id}/response`,'POST',{status:'out'});assert.equal(r.status,400,'host updates their own RSVP elsewhere');

// Tess texted: she's in with Ben, vegetarian, bringing pie. Jordan texted: can't make it.
r=await request(host,`plan/${id}/guests/${tessId}/response`,'POST',{status:'in',extraCount:1,extraNames:'Ben',dietary:'Vegetarian'});assert.equal(r.status,200);
r=await request(host,`plan/${id}/tasks/${pie}`,'PATCH',{action:'assign',guestId:tessId});assert.equal(r.status,200);
r=await request(host,`plan/${id}/tasks/${pie}`,'PATCH',{action:'assign',guestId:samId});assert.equal(r.status,409,'cannot assign a covered item');
r=await request(host,`plan/${id}/guests/${jordanId}/response`,'POST',{status:'out'});
r=await request(host,`plan/${id}/tasks/${ice}`,'PATCH',{action:'assign',guestId:jordanId});assert.equal(r.status,400,'cannot assign to someone who can’t make it');
r=await request(host,`plan/${id}/guests/${tessId}/response`,'POST',{status:'sideways'});assert.equal(r.status,400);

// The host sees it labelled as noted, counted in the headcount, and in the activity log.
r=await request(host,'plan/'+id);let t=r.body.guests.find(g=>g.name==='Tess');
assert.equal(t.status,'in');assert.equal(t.source,'host');assert.equal(t.extra_status,'approved');assert.ok(t.updated);
assert.equal(r.body.tasks.find(x=>x.title==='Pie').claim_source,'host');assert.equal(r.body.tasks.find(x=>x.title==='Pie').claimed_name,'Tess');
const log=r.body.activity.map(a=>a.text);assert.ok(log.includes('You noted Tess: going (+1 Ben)'));assert.ok(log.includes('You noted Tess is bringing Pie'));assert.ok(log.includes('You noted Jordan: can’t make it'));
r=await request(host,'plans');assert.equal(r.body.plans.find(p=>p.id===id).going,3,'Ari + Tess + Ben');

// Other people see "noted by host" status but never the activity log or Tess's dietary needs.
r=await request(stranger,'plan/'+id);t=r.body.guests.find(g=>g.name==='Tess');assert.equal(t.source,'host');assert.equal(t.dietary,undefined);assert.deepEqual(r.body.activity,[]);

// Tess opens the link later, picks her name, sees what was noted and confirms in one tap.
r=await request(tess,`plan/${id}/guests/${tessId}/pick`,'POST');assert.equal(r.status,200);
r=await request(tess,'plan/'+id);t=r.body.guests.find(g=>g.isMe);assert.equal(t.source,'host');assert.ok(r.body.tasks.find(x=>x.title==='Pie').isMine);assert.equal(r.body.plan.place,'12 Oak Ave','host-noted going counts as in for the address');
r=await request(tess,`plan/${id}/confirm`,'POST');assert.equal(r.status,200);
r=await request(tess,'plan/'+id);assert.equal(r.body.guests.find(g=>g.isMe).source,'guest');assert.equal(r.body.tasks.find(x=>x.title==='Pie').claim_source,'');
r=await request(host,'plan/'+id);assert.ok(r.body.activity.some(a=>a.text==='Tess opened the invite'&&!a.byHost));assert.ok(r.body.activity.some(a=>a.text==='Tess confirmed: going (+1 Ben) · bringing Pie'));

// If Tess changes her own answer, it's confirmed by her and logged; the host can still correct it later.
r=await request(tess,`plan/${id}/rsvp`,'POST',{name:'Tess',status:'maybe'});
r=await request(host,'plan/'+id);assert.equal(r.body.guests.find(g=>g.name==='Tess').source,'guest');assert.ok(r.body.activity.some(a=>a.text==='Tess confirmed: still checking'));
r=await request(host,`plan/${id}/guests/${samId}/response`,'POST',{status:'invited'});r=await request(host,'plan/'+id);assert.equal(r.body.guests.find(g=>g.name==='Sam').source,'','reset to no reply is not a noted answer');
console.log('PASS: host-noted answers and items for friends who never open the link, labels, privacy, activity log and guest confirmation.');
