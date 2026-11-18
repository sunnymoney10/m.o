import assert from 'node:assert/strict';
const origin=process.env.SITE_TEST_URL||'http://127.0.0.1:4173';
const alice=crypto.randomUUID(),bob=crypto.randomUUID(),cara=crypto.randomUUID();
async function request(actor,path,method='GET',body){const r=await fetch(origin+'/api/'+path,{method,headers:{Origin:origin,Cookie:'mo_session='+actor,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json()}}
let r=await request(alice,'plans','POST',{title:'QA Friendsgiving',name:'QA host',kind:'gathering',date:'2026-11-26T23:00:00Z',place:'Test table',budget:'Bring a dish',tasks:[{title:'Dessert',category:'bring'}]});assert.equal(r.status,201,JSON.stringify(r));const id=r.body.id;
r=await request(bob,'plan/'+id);assert.equal(r.status,200);assert.equal(r.body.host,false);assert.ok(!('owner' in r.body.plan));assert.equal(r.body.organizer,'QA host');assert.ok(!JSON.stringify(r.body).includes(alice),'no actor ids in plan detail');const task=r.body.tasks[0].id;
r=await request(bob,'plan/'+id,'PATCH',{title:'Unauthorized edit'});assert.equal(r.status,403);
r=await request(bob,`plan/${id}/tasks/${task}`,'PATCH',{action:'claim'});assert.equal(r.status,400);
assert.equal((await request(bob,`plan/${id}/rsvp`,'POST',{name:'QA guest',status:'in',note:'Vegetarian'})).status,200);
assert.equal((await request(cara,`plan/${id}/rsvp`,'POST',{name:'QA guest 2',status:'maybe'})).status,200);
assert.equal((await request(bob,`plan/${id}/tasks/${task}`,'PATCH',{action:'claim'})).status,200);
assert.equal((await request(cara,`plan/${id}/tasks/${task}`,'PATCH',{action:'claim'})).status,409);
assert.equal((await request(cara,`plan/${id}/tasks/${task}`,'PATCH',{action:'release'})).status,403);
assert.equal((await request(cara,`plan/${id}/tasks/${task}`,'PATCH',{action:'done'})).status,403);
assert.equal((await request(bob,`plan/${id}/tasks/${task}`,'PATCH',{action:'done'})).status,200);
r=await request(alice,'plan/'+id);assert.equal(r.body.tasks[0].done,1);assert.equal(r.body.tasks[0].claimed_name,'QA guest');assert.equal(r.body.guests.length,3);
assert.equal((await request(bob,`plan/${id}/rsvp`,'POST',{name:'QA guest',status:'out'})).status,200);
r=await request(alice,'plan/'+id);assert.equal(r.body.tasks[0].claimed_name,null);assert.equal(r.body.tasks[0].done,0);
r=await request(bob,'plans');assert.ok(r.body.plans.some(p=>p.id===id));assert.ok(!('owner' in r.body.plans[0]));{const row=r.body.plans.find(p=>p.id===id);for(const k of ['going','maybe','open_items','open_votes'])assert.equal(typeof row[k],'number',k);assert.ok(!('actor' in row)&&!('claimed_by' in row));}
r=await request(alice,'plan/'+id,'PATCH',{title:'Updated dinner',date:'bad-date'});assert.equal(r.status,400);
const csrf=await fetch(origin+'/api/plans',{method:'POST',headers:{Origin:'https://other.example','Content-Type':'application/json'},body:JSON.stringify({title:'No',name:'No'})});assert.equal(csrf.status,403);
console.log('PASS: persistence, RSVP, membership, exclusive claims, host-only edits, guest authorization, attendance changes, date validation and cross-origin protection.');
