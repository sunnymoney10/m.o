// Owner's error alert: failed requests are written down (when and where only) and the health check counts them.
import assert from 'node:assert/strict';
const origin='http://127.0.0.1:4173';
const host=crypto.randomUUID();
async function request(actor,path,method='GET',body){const r=await fetch(origin+'/api/'+path,{method,headers:{Origin:origin,Cookie:'mo_session='+actor,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json()}}
let r=await request(host,'health');assert.equal(r.status,200);const before=r.body.recentErrors;assert.equal(r.body.database,true);
const plan=(await request(host,'plans','POST',{title:'Health check',name:'Ari',tasks:[]})).body.id;
// Make the database fail once while someone answers, like a real outage would.
const DB=globalThis.__moTestEnv.DB,prepare=DB.prepare;let broke=false;
DB.prepare=sql=>{if(!broke&&/INSERT INTO guests/.test(sql)){broke=true;throw new Error('simulated database failure for Ama Kofi')}return prepare(sql)};
r=await request(crypto.randomUUID(),`plan/${plan}/rsvp`,'POST',{name:'Ama Kofi',status:'in'});DB.prepare=prepare;
assert.equal(r.status,500);assert.equal(r.body.error,'We could not save that. Please try again.','the person sees a plain message');
r=await request(crypto.randomUUID(),'health');assert.equal(r.body.recentErrors,before+1,'the failure was counted');
assert.ok(r.body.areas.some(a=>a.startsWith('POST plan/rsvp')),'it says where: '+r.body.areas);
const raw=JSON.stringify(r.body);assert.ok(!raw.includes(plan)&&!raw.includes('Ama')&&!raw.includes('simulated'),'no plan IDs, names or error text');
r=await request(host,'health?minutes=5');assert.equal(r.status,200);
console.log('PASS: error alert: failures recorded by area only, counted by the health check, nothing private shown.');
