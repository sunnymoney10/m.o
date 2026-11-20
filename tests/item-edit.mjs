// Bring list: only the host can fix an item's wording or remove an item (added by mistake, e.g. "Grandma").
import assert from 'node:assert/strict';
const origin='http://127.0.0.1:4173';
const host=crypto.randomUUID(),guest=crypto.randomUUID(),stranger=crypto.randomUUID();
async function request(actor,path,method='GET',body){const r=await fetch(origin+'/api/'+path,{method,headers:{Origin:origin,Cookie:'mo_session='+actor,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json()}}
let r=await request(host,'plans','POST',{title:'Skate day',name:'Ari',tasks:[{title:'Grandma',category:'bring'},{title:'Snaks',category:'bring'}]});const id=r.body.id;
const item=n=>request(host,'plan/'+id).then(r=>r.body.tasks.find(t=>t.title===n));
const grandma=await item('Grandma'),snaks=await item('Snaks');
await request(guest,`plan/${id}/rsvp`,'POST',{name:'Tess',status:'in'});
r=await request(guest,`plan/${id}/tasks/${snaks.id}`,'PATCH',{action:'claim'});assert.equal(r.status,200);
// Guests and strangers can't change or remove items.
for(const who of [guest,stranger]){
 r=await request(who,`plan/${id}/tasks/${grandma.id}`,'DELETE');assert.equal(r.status,403,'only the host removes items');
 r=await request(who,`plan/${id}/tasks/${snaks.id}`,'PATCH',{action:'rename',title:'Nothing'});assert.equal(r.status,403,'only the host renames items');}
// The host fixes a typo; Tess still has it.
r=await request(host,`plan/${id}/tasks/${snaks.id}`,'PATCH',{action:'rename',title:'   '});assert.equal(r.status,400,'empty names are refused');
r=await request(host,`plan/${id}/tasks/${snaks.id}`,'PATCH',{action:'rename',title:'Snacks'});assert.equal(r.status,200);
r=await request(guest,'plan/'+id);{const t=r.body.tasks.find(t=>t.id===snaks.id);assert.equal(t.title,'Snacks');assert.ok(t.isMine,'whoever was bringing it keeps it')}
// The host removes Grandma.
r=await request(host,`plan/${id}/tasks/${grandma.id}`,'DELETE');assert.equal(r.status,200);
r=await request(guest,'plan/'+id);assert.ok(!r.body.tasks.some(t=>t.id===grandma.id),'removed for everyone');
r=await request(host,`plan/${id}/tasks/${grandma.id}`,'DELETE');assert.equal(r.status,404);
r=await request(host,`plan/${crypto.randomUUID()}/tasks/${snaks.id}`,'DELETE');assert.equal(r.status,404,'another plan’s items can’t be reached');
r=await request(host,'plan/'+id);assert.ok(r.body.activity.some(a=>a.text==='You removed Grandma')&&r.body.activity.some(a=>a.text==='You changed Snaks to Snacks'),'both show in Recent updates');
console.log('PASS: bring list: only the host renames or removes items; whoever is bringing a renamed item keeps it; removals are logged.');
