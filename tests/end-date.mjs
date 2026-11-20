// Multi-day plans: start and end dates.
import assert from 'node:assert/strict';
import {whenRange,multiDay,endFor} from '../lib/when.ts';
const origin=process.env.SITE_TEST_URL||'http://127.0.0.1:4173';
const host=crypto.randomUUID(),guest=crypto.randomUUID();
async function request(actor,path,method='GET',body){const r=await fetch(origin+'/api/'+path,{method,headers:{Origin:origin,Cookie:'mo_session='+actor,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json()}}
const start='2026-12-04T23:00:00.000Z',end='2026-12-06T17:00:00.000Z';
assert.ok(multiDay(start,end)&&!multiDay(start,'')&&!multiDay(start,'2026-12-04T23:30:00.000Z')&&!multiDay(end,start));
assert.match(whenRange(start,end),/–/);assert.doesNotMatch(whenRange(start,''),/–/);
assert.equal(+endFor(start,end),+new Date(end));
// Same day with an end time: "… · 4:00 PM – 7:00 PM"; calendars end at that time.
{const s=new Date(2026,10,29,16,0).toISOString(),e=new Date(2026,10,29,19,0).toISOString();assert.ok(!multiDay(s,e));assert.equal(whenRange(s,e),'Sun, Nov 29 · 4:00 PM – 7:00 PM');assert.equal(whenRange(s,e,' at '),'Sun, Nov 29 at 4:00 PM – 7:00 PM');assert.equal(whenRange(s,new Date(2026,10,29,15,0).toISOString()),'Sun, Nov 29 · 4:00 PM','an end before the start is ignored');assert.equal(+endFor(s,e),+new Date(e))}assert.equal(+endFor(start,''),+new Date(start)+7200000);

let r=await request(host,'plans','POST',{title:'Atlanta weekend',name:'Ari',kind:'trip',date:start,endDate:'2026-12-03T00:00:00.000Z'});assert.equal(r.status,400,'end before start');
r=await request(host,'plans','POST',{title:'Atlanta weekend',name:'Ari',kind:'trip',endDate:end});assert.equal(r.status,400,'end without start');
r=await request(host,'plans','POST',{title:'Atlanta weekend',name:'Ari',kind:'trip',date:start,endDate:'2027-03-01T00:00:00.000Z'});assert.equal(r.status,400,'over 60 days');
r=await request(host,'plans','POST',{title:'Atlanta weekend',name:'Ari',kind:'trip',date:start,endDate:end});assert.equal(r.status,201);const id=r.body.id;
r=await request(guest,'plan/'+id);assert.equal(r.body.plan.end_date,end,'guests see the end date');
r=await request(guest,'plan/'+id,'PATCH',{endDate:''});assert.equal(r.status,403,'only the host changes it');
r=await request(host,'plan/'+id,'PATCH',{title:'Atlanta weekend!'});r=await request(host,'plan/'+id);assert.equal(r.body.plan.end_date,end,'other edits keep the end date');
r=await request(host,'plan/'+id,'PATCH',{endDate:''});r=await request(host,'plan/'+id);assert.equal(r.body.plan.end_date,'','host can make it one day again');
r=await request(host,'plans');assert.ok('end_date' in r.body.plans.find(p=>p.id===id),'plan list includes the end date');
console.log('PASS: multi-day plans: start and end dates checked, shared with guests, host-only changes, and kept through other edits.');
