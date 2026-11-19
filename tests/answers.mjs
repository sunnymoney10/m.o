// "Still checking" with a check-back day, and what changes when the answer changes.
import assert from 'node:assert/strict';
const origin=process.env.SITE_TEST_URL||'http://127.0.0.1:4173';
const host=crypto.randomUUID(),tess=crypto.randomUUID(),sam=crypto.randomUUID();
async function request(actor,path,method='GET',body){const r=await fetch(origin+'/api/'+path,{method,headers:{Origin:origin,Cookie:'mo_session='+actor,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json()}}
const day=n=>{const d=new Date(Date.now()+n*86400000);return d.toISOString().slice(0,10)};
let r=await request(host,'plans','POST',{title:'Friendsgiving',name:'Kaela'});const id=r.body.id;
r=await request(tess,`plan/${id}/rsvp`,'POST',{name:'Tess',status:'in'});
r=await request(tess,`plan/${id}/check-back`,'POST',{date:day(3)});assert.equal(r.status,400,'only "still checking" guests set a day');
r=await request(tess,`plan/${id}/rsvp`,'POST',{name:'Tess',status:'maybe'});
for(const bad of ['tomorrow','2026-02-31x',day(-5),day(200)]){r=await request(tess,`plan/${id}/check-back`,'POST',{date:bad});assert.equal(r.status,400,'rejects '+bad)}
r=await request(tess,`plan/${id}/check-back`,'POST',{date:day(3)});assert.equal(r.status,200);
r=await request(host,'plan/'+id);assert.equal(r.body.guests.find(g=>g.name==='Tess').check_back,day(3),'host sees the day');
assert.ok(r.body.activity.some(a=>/Tess will decide by/.test(a.text)),'host activity notes it');
r=await request(sam,'plan/'+id);assert.equal(r.body.guests.find(g=>g.name==='Tess').check_back,undefined,'other guests do not see it');
r=await request(tess,`plan/${id}/rsvp`,'POST',{name:'Tess',status:'out'});r=await request(host,'plan/'+id);assert.equal(r.body.guests.find(g=>g.name==='Tess').check_back,'','answering clears the day');
console.log('PASS: still checking: guest picks a check-back day, validated, host-only, cleared on a new answer.');
