// Avatars and profile photos: only valid choices and real small images are stored; photos are served cached.
import assert from 'node:assert/strict';
const origin=process.env.SITE_TEST_URL||'http://127.0.0.1:4173';
const me=crypto.randomUUID(),friend=crypto.randomUUID();
async function request(actor,path,method='GET',body){const r=await fetch(origin+'/api/'+path,{method,headers:{Origin:origin,Cookie:'mo_session='+actor,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const type=r.headers.get('content-type')||'';return {status:r.status,headers:r.headers,body:type.includes('json')?await r.json():new Uint8Array(await r.arrayBuffer())}}
// A real 1x1 PNG.
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

let r=await request(me,'me/photo','PUT',{photo:png});assert.equal(r.status,400,'needs a profile first');
const handle='qa_'+me.slice(0,8);
r=await request(me,'me','PUT',{name:'Ari',handle,mo:'',interests:[],style:'setter',avatar:{tone:'skin3',hair:'locs',hairColor:'black',shirt:'sage',bg:'sky',glasses:true,hoops:false}});assert.equal(r.status,200);
r=await request(me,'me');assert.deepEqual(r.body.profile.avatar,{tone:'skin3',hair:'locs',hairColor:'black',shirt:'sage',bg:'sky',glasses:true,hoops:false});assert.equal(r.body.profile.photo,null);
// Unknown values are rejected rather than stored; leaving avatar out keeps the saved one.
r=await request(me,'me','PUT',{name:'Ari',handle,style:'setter',avatar:{tone:'<script>',hair:'locs',hairColor:'black',shirt:'sage',bg:'sky'}});
r=await request(me,'me');assert.equal(r.body.profile.avatar,null,'invalid avatar is not stored');
r=await request(me,'me','PUT',{name:'Ari',handle,style:'setter',avatar:{tone:'sky',hair:'bun',hairColor:'blonde',shirt:'brick',bg:'cream',glasses:false,hoops:true}});
r=await request(me,'me','PUT',{name:'Ari',handle,style:'down'});r=await request(me,'me');assert.equal(r.body.profile.avatar.hair,'bun','omitting avatar keeps it');

// Photo validation: type must match the bytes, size is capped.
r=await request(me,'me/photo','PUT',{photo:'data:image/jpeg;base64,'+png.split(',')[1]});assert.equal(r.status,400,'claimed type must match the file');
r=await request(me,'me/photo','PUT',{photo:'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='});assert.equal(r.status,400,'no SVG');
r=await request(me,'me/photo','PUT',{photo:'data:image/png;base64,'+Buffer.alloc(50000,1).toString('base64')});assert.ok([400,413].includes(r.status),'too large');
r=await request(me,'me/photo','PUT',{photo:png});assert.equal(r.status,200);
r=await request(me,'me');const url=r.body.profile.photo;assert.match(url,/^\/api\/me\/photo\?v=/);
r=await request(me,'me/photo');assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'image/png');assert.match(r.headers.get('cache-control'),/max-age/);assert.equal(r.body[0],0x89);

// In a plan, guests get the photo URL (not the image data) and can load it; no actor IDs leak.
r=await request(friend,'plans','POST',{title:'QA dinner',name:'Sam'});const id=r.body.id;
r=await request(me,`plan/${id}/rsvp`,'POST',{name:'Ari',status:'in'});
r=await request(friend,'plan/'+id);const ari=r.body.guests.find(g=>g.name==='Ari');assert.match(ari.photo,new RegExp(`^/api/plan/${id}/guests/${ari.id}/photo\\?v=`));assert.equal(ari.avatar.hair,'bun');
assert.ok(!JSON.stringify(r.body).includes('base64'),'plan data never includes photo bytes');assert.ok(!JSON.stringify(r.body).includes(me),'no actor IDs');
r=await request(crypto.randomUUID(),ari.photo.replace('/api/',''));assert.equal(r.status,200);assert.equal(r.body[0],0x89);
const sam=(await request(friend,'plan/'+id)).body.guests.find(g=>g.name==='Sam');r=await request(friend,`plan/${id}/guests/${sam.id}/photo`);assert.equal(r.status,404,'no photo, no image');

// Removing the photo.
r=await request(me,'me/photo','DELETE');assert.equal(r.status,200);r=await request(me,'me');assert.equal(r.body.profile.photo,null);
console.log('PASS: avatar choices validated and kept, profile photos checked, size-capped, cached, shared by URL only, and removable.');
