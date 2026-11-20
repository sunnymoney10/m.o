// Owner's usage numbers: each successful action adds one to today's count for its kind (method and route shape
// only). Failed or refused actions and reads aren't counted, and no names, IDs or plan details are stored.
import assert from 'node:assert/strict';
const origin='http://127.0.0.1:4173',host=crypto.randomUUID(),guest=crypto.randomUUID(),db=globalThis.__moTestEnv.DB;
async function req(actor,path,method='GET',body){const r=await fetch(origin+'/api/'+path,{method,headers:{Origin:origin,Cookie:'mo_session='+actor,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json().catch(()=>null)}}
const day=new Date().toISOString().slice(0,10);
const count=async area=>((await db.prepare('SELECT n FROM usage_counts WHERE day=? AND area=?').bind(day,area).first())?.n)||0;
const plans0=await count('POST plans'),rsvp0=await count('POST plan/rsvp'),patch0=await count('PATCH plan');
const id=(await req(host,'plans','POST',{title:'Secret Usage Party',name:'Ari',tasks:[]})).body.id;
await req(host,'plans','POST',{title:'',name:''});                       // refused: no title
await req(guest,'plan/'+id+'/rsvp','POST',{name:'Tess',status:'in'});
await req(guest,'plan/'+id,'PATCH',{title:'Taken over'});                // refused: not the host
await req(host,'plan/'+id);                                              // a read
assert.equal(await count('POST plans'),plans0+1,'one plan made counts once; the refused one does not');
assert.equal(await count('POST plan/rsvp'),rsvp0+1,'the answer counts');
assert.equal(await count('PATCH plan'),patch0,'a refused change is not counted');
const rows=(await db.prepare('SELECT * FROM usage_counts').all()).results,text=JSON.stringify(rows);
assert.ok(!text.includes(id)&&!/Secret|Tess|Ari/.test(text)&&!text.includes(host)&&!text.includes(guest),'no IDs, names or titles are stored');
assert.deepEqual(Object.keys(rows[0]).sort(),['area','day','n']);
await req(host,'plan/'+id,'DELETE');
console.log('PASS: usage counts: successful actions counted per day by kind only; refused actions and reads skipped; no IDs, names or titles.');
