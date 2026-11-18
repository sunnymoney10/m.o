// Friendsgiving readiness: guest list, name pick, plus-ones, private details and host controls.
import assert from 'node:assert/strict';
const origin=process.env.SITE_TEST_URL||'http://127.0.0.1:4173';
const ari=crypto.randomUUID(),tess=crypto.randomUUID(),tess2=crypto.randomUUID(),jordan=crypto.randomUUID(),stranger=crypto.randomUUID();
async function request(actor,path,method='GET',body){const r=await fetch(origin+'/api/'+path,{method,headers:{Origin:origin,Cookie:'mo_session='+actor,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json()}}
const leaks=(obj,...ids)=>ids.some(x=>JSON.stringify(obj).includes(x));

let r=await request(ari,'plans','POST',{title:'QA Friendsgiving',name:'Ari',date:'2026-11-26T22:00:00Z',place:'1420 Elm St, Apt 3B',details:'Park on Elm. Buzz 3B.',tasks:[{title:'Ice',category:'bring'},{title:'Pie',category:'bring'}]});assert.equal(r.status,201);const id=r.body.id;
r=await request(ari,`plan/${id}/guests`,'POST',{names:['Tess','Jordan','tess','']});assert.equal(r.body.added,2,'dedupes names');
r=await request(ari,`plan/${id}/guests`,'POST',{names:['Sam Lee +1 (215) 555-0134','sam@example.com','🎉 Rio 🎉','- Dee','555 0199']});assert.equal(r.body.added,3,'only real names are added');
{const g=(await request(ari,'plan/'+id)).body.guests.map(x=>x.name);assert.ok(g.includes('Sam Lee')&&g.includes('Rio')&&g.includes('Dee'));assert.ok(!JSON.stringify(g).match(/555|@|🎉/),'no numbers, emails or emoji stored');
 for(const n of ['Sam Lee','Rio','Dee']){const row=(await request(ari,'plan/'+id)).body.guests.find(x=>x.name===n);await request(ari,`plan/${id}/guests/${row.id}`,'DELETE')}}
r=await request(tess,`plan/${id}/guests`,'POST',{names:['Sneaky']});assert.equal(r.status,403,'only host adds invitees');

// A first-time guest sees the invitation but not the address or arrival notes.
r=await request(stranger,'plan/'+id);assert.equal(r.status,200);assert.equal(r.body.plan.place,'');assert.equal(r.body.details,'');assert.equal(r.body.hidden,true);
assert.ok(!leaks(r.body,'1420 Elm','Buzz 3B',ari,tess,'invite:'),'no private details or actor IDs before RSVP');
const tessRow=r.body.guests.find(g=>g.name==='Tess');assert.equal(tessRow.status,'invited');
r=await request(stranger,'plans');assert.ok(!r.body.plans.some(p=>p.id===id),'opening a link does not add the plan to your list');

// Tess picks her name, RSVPs with a plus-one, dietary needs and a sleepover request.
r=await request(tess,`plan/${id}/guests/${tessRow.id}/pick`,'POST');assert.equal(r.status,200);
r=await request(tess,'plan/'+id);assert.equal(r.body.plan.place,'','picking a name alone does not reveal the address');
r=await request(tess,`plan/${id}/rsvp`,'POST',{name:'Tess',status:'in',note:'',extraCount:1,extraNames:'Ben',dietary:'Vegetarian',staying:true});assert.equal(r.status,200);
r=await request(tess,'plan/'+id);assert.equal(r.body.plan.place,'1420 Elm St, Apt 3B');assert.equal(r.body.details,'Park on Elm. Buzz 3B.');
let me=r.body.guests.find(g=>g.isMe);assert.equal(me.extra_status,'requested');assert.equal(me.dietary,'Vegetarian');assert.equal(me.staying,true);
assert.equal(r.body.guests.filter(g=>g.name==='Tess').length,1,'picked spot, not a duplicate');

// Other guests can't see Tess's dietary needs, sleepover or pending plus-one.
r=await request(jordan,`plan/${id}/rsvp`,'POST',{name:'Jordan R',status:'maybe'});
r=await request(jordan,'plan/'+id);let t=r.body.guests.find(g=>g.name==='Tess');assert.equal(t.dietary,undefined);assert.equal(t.staying,undefined);assert.equal(t.extra_count,0);
r=await request(jordan,`plan/${id}/guests/${t.id}/extra`,'POST',{decision:'approved'});assert.equal(r.status,403,'guests cannot approve plus-ones');

// Ari sees everything and approves; the headcount includes Ben.
r=await request(ari,'plan/'+id);t=r.body.guests.find(g=>g.name==='Tess');assert.equal(t.dietary,'Vegetarian');assert.equal(t.extra_names,'Ben');
r=await request(ari,`plan/${id}/guests/${t.id}/extra`,'POST',{decision:'approved'});assert.equal(r.status,200);
r=await request(ari,'plans');let row=r.body.plans.find(p=>p.id===id);assert.equal(row.going,3,'Ari + Tess + Ben');assert.equal(row.invited,1,'Jordan on the list has not replied');assert.equal(row.place,'1420 Elm St, Apt 3B');
r=await request(jordan,'plan/'+id);t=r.body.guests.find(g=>g.name==='Tess');assert.equal(t.extra_names,'Ben','approved plus-one is visible');

// Changing the plus-one asks again.
r=await request(tess,`plan/${id}/rsvp`,'POST',{name:'Tess',status:'in',extraCount:2,extraNames:'Ben, Kai',dietary:'Vegetarian',staying:true});
r=await request(tess,'plan/'+id);assert.equal(r.body.guests.find(g=>g.isMe).extra_status,'requested');

// Tess claims pie on phone 1, then switches to another browser by picking her name: claims move with her.
r=await request(tess,'plan/'+id);const pie=r.body.tasks.find(x=>x.title==='Pie');
r=await request(tess,`plan/${id}/tasks/${pie.id}`,'PATCH',{action:'claim'});assert.equal(r.status,200);
r=await request(tess2,'plan/'+id);const spot=r.body.guests.find(g=>g.name==='Tess');
r=await request(tess2,`plan/${id}/guests/${spot.id}/pick`,'POST');assert.equal(r.status,200);
r=await request(tess2,'plan/'+id);assert.ok(r.body.tasks.find(x=>x.title==='Pie').isMine,'claim followed Tess');assert.equal(r.body.guests.filter(g=>g.name==='Tess').length,1);
r=await request(jordan,`plan/${id}/guests/${spot.id}/pick`,'POST');assert.equal(r.status,409,'a phone that already answered cannot take another spot');
r=await request(stranger,`plan/${id}/guests/not-a-row/pick`,'POST');assert.equal(r.status,404);
const kRow=(await request(ari,'plan/'+id)).body.guests.find(g=>g.isHost);
r=await request(stranger,`plan/${id}/guests/${kRow.id}/pick`,'POST');assert.equal(r.status,403,'nobody can take the organizer spot');

// Cancelling frees items and reports which ones.
r=await request(tess2,`plan/${id}/rsvp`,'POST',{name:'Tess',status:'out'});assert.deepEqual(r.body.freed,['Pie']);
r=await request(tess2,'plan/'+id);me=r.body.guests.find(g=>g.isMe);assert.equal(me.extra_count,0);assert.equal(me.staying,false);assert.equal(r.body.plan.place,'','declined guests lose the address');

// Host removes a guest; guests cannot.
const jRow=r.body.guests.find(g=>g.name==='Jordan R');
r=await request(tess2,`plan/${id}/guests/${jRow.id}`,'DELETE');assert.equal(r.status,403);
r=await request(ari,`plan/${id}/guests/${kRow.id}`,'DELETE');assert.equal(r.status,400,'organizer cannot be removed');
r=await request(ari,`plan/${id}/guests/${jRow.id}`,'DELETE');assert.equal(r.status,200);
r=await request(ari,'plan/'+id);assert.ok(!r.body.guests.some(g=>g.name==='Jordan R'));
assert.ok(!leaks(r.body,ari,tess,tess2,jordan,'invite:'),'organizer view never includes actor IDs');

// Arrival notes edit.
r=await request(ari,'plan/'+id,'PATCH',{details:'Park on Elm. Buzz 3B. Shoes off.'});assert.equal(r.status,200);
r=await request(ari,'plan/'+id);assert.equal(r.body.details,'Park on Elm. Buzz 3B. Shoes off.');assert.equal(r.body.plan.place,'1420 Elm St, Apt 3B','other fields kept');
// Site-wide daily ceiling on new plans protects the free tier; RSVPs keep working at the ceiling.
globalThis.__moTestEnv.DAILY_NEW_PLANS='1';
r=await request(crypto.randomUUID(),'plans','POST',{title:'Over the ceiling',name:'Someone'});assert.equal(r.status,429,'site-wide daily plan ceiling');
r=await request(crypto.randomUUID(),`plan/${id}/rsvp`,'POST',{name:'Late guest',status:'maybe'});assert.equal(r.status,200,'RSVPs unaffected by the ceiling');
delete globalThis.__moTestEnv.DAILY_NEW_PLANS;
console.log('PASS: Friendsgiving guest list, name pick across browsers, plus-one approval, private address and dietary details, cancellations, host removal and the site-wide plan ceiling.');
