// "Your m.o" habits: chosen by the person only, up to 5, short, no contact details; shown to people in their plans.
import assert from 'node:assert/strict';
const origin='http://127.0.0.1:4173',me=crypto.randomUUID(),host=crypto.randomUUID();
async function req(actor,path,method='GET',body){const r=await fetch(origin+'/api/'+path,{method,headers:{Origin:origin,Cookie:'mo_session='+actor,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()}}
const handle='habit'+Math.floor(Math.random()*1e6);
assert.equal((await req(me,'me','PUT',{name:'Tess',handle,mo:'I book the place, you bring the pie.',habits:['The one who books','Always early','The one who books','call me 215-555-0134','tess@example.com','🎉','Brings dessert','Drives','Takes the photos','Handles the money']})).status,200);
let p=(await req(me,'me')).body.profile;
assert.deepEqual(p.habits,['The one who books','Always early','call me','Brings dessert','Drives'],'duplicates, phone numbers, emails and emoji-only removed; at most 5');
assert.equal(p.mo,'I book the place, you bring the pie.');
assert.equal((await req(me,'me','PUT',{name:'Tess',handle,habits:'not a list'})).status,200);
assert.deepEqual((await req(me,'me')).body.profile.habits,[],'anything but a list saves no habits');
await req(me,'me','PUT',{name:'Tess',handle,habits:['Always early']});
const id=(await req(host,'plans','POST',{title:'Habits dinner',name:'Ari'})).body.id;
await req(me,`plan/${id}/rsvp`,'POST',{name:'Tess',status:'in'});
const seen=(await req(host,`plan/${id}`)).body.guests.find(g=>g.name==='Tess');
assert.deepEqual(seen.habits,['Always early'],'people in the plan see the habits Tess chose');
assert.equal((await req(host,`plan/${id}`)).body.guests.find(g=>g.isHost).habits.length,0,'no profile, no habits');
console.log('PASS: Your m.o habits: self-chosen only, up to 5, cleaned of contact details, visible to people in shared plans.');
