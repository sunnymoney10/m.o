// Host recovery: a private host link lets the host manage the plan from another device.
import assert from 'node:assert/strict';
const origin=process.env.SITE_TEST_URL||'http://127.0.0.1:4173';
const host=crypto.randomUUID(),laptop=crypto.randomUUID(),guest=crypto.randomUUID(),stranger=crypto.randomUUID();
async function request(actor,path,method='GET',body){const r=await fetch(origin+'/api/'+path,{method,headers:{Origin:origin,Cookie:'mo_session='+actor,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')||''}}
let r=await request(host,'plans','POST',{title:'Friendsgiving',name:'Kaela'});const id=r.body.id;
r=await request(guest,`plan/${id}/rsvp`,'POST',{name:'Tess',status:'in'});
r=await request(guest,`plan/${id}/host-link`,'POST');assert.equal(r.status,403,'guests cannot make a host link');
r=await request(host,'plan/'+id);assert.equal(r.body.hasHostKey,false);assert.ok(!('host_key_hash' in r.body.plan),'the stored hash never leaves the server');
r=await request(host,`plan/${id}/host-link`,'POST');assert.equal(r.status,200);const key=r.body.link.split('/h/')[1];assert.match(key,/^[A-Za-z0-9_-]{24}$/);
r=await request(guest,'plan/'+id);assert.equal(r.body.hasHostKey,false,'guests are not told about host links');
// Wrong or malformed keys fail; the right key turns the laptop into the host's session.
r=await request(stranger,'host-link','POST',{key:'x'.repeat(24)});assert.equal(r.status,404);
r=await request(stranger,'host-link','POST',{key:'short'});assert.equal(r.status,400);
r=await request(laptop,'host-link','POST',{key});assert.equal(r.status,200);assert.equal(r.body.plan,id);
const session=r.cookie.match(/mo_session=([a-f0-9-]{36})/)?.[1];assert.equal(session,host,'laptop now carries the host session');assert.ok(/HttpOnly/.test(r.cookie));assert.ok(!JSON.stringify(r.body).includes(host),'the session ID is never in the response body');
r=await request(session,'plan/'+id,'PATCH',{title:'Friendsgiving 2026'});assert.equal(r.status,200,'the laptop can edit as host');
r=await request(host,'plan/'+id);assert.equal(r.body.host,true,'the original phone is still host');
// A new link turns the old one off.
r=await request(host,`plan/${id}/host-link`,'POST');assert.equal(r.body.replaced,true);
r=await request(stranger,'host-link','POST',{key});assert.equal(r.status,404,'old link stops working');
// Too many tries are capped.
for(let i=0;i<8;i++)await request(stranger,'host-link','POST',{key:'y'.repeat(24)});
r=await request(stranger,'host-link','POST',{key:'z'.repeat(24)});assert.equal(r.status,429);
console.log('PASS: host links: host-only, hash never shared, other device becomes host, old links turn off, tries capped.');
