import assert from 'node:assert/strict';
import {themeError,suggestedTheme,styleFromEmoji} from '../lib/invite-theme.ts';
const B='http://127.0.0.1:4173',host=crypto.randomUUID(),guest=crypto.randomUUID();
async function req(actor,path,method='GET',body){const r=await fetch(B+'/api/'+path,{method,headers:{Origin:B,Cookie:'mo_session='+actor,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return{status:r.status,body:await r.json()}}
assert.equal(suggestedTheme('Skating with friends'),'skating');assert.equal(suggestedTheme('My own idea'),null);
assert.equal(themeError({emoji:'👨‍👩‍👧‍👦'}),'');assert.ok(themeError({emoji:'🛼🎵'}));assert.ok(themeError({emoji:'skate'}));assert.ok(themeError({accent:'url(https://example.com)'}));
const c=await req(host,'plans','POST',{title:'Skate night: my own plan',name:'Host',theme:'skating',accent:'sky',emoji:'🛼'});assert.equal(c.status,201);const id=c.body.id;
let d=(await req(guest,'plan/'+id)).body;assert.equal(d.plan.title,'Skate night: my own plan');assert.equal(d.plan.theme,'skating');assert.equal(d.plan.accent,'sky');assert.equal(d.plan.emoji,'🛼');assert.equal(d.tasks.length,0,'arbitrary new plans do not invent a bring list');
assert.equal((await req(guest,'plan/'+id,'PATCH',{theme:'music'})).status,403,'guests cannot restyle another person’s plan');
await req(host,'plan/'+id,'PATCH',{theme:'outdoors',accent:'sage',emoji:'🌻'});d=(await req(guest,'plan/'+id)).body;assert.equal(d.plan.theme,'outdoors');assert.equal(d.plan.emoji,'🌻');assert.equal((await req(host,'plans')).body.plans.find(p=>p.id===id).accent,'sage');
await req(host,'plan/'+id,'PATCH',{title:'Sunday with friends'});assert.equal((await req(host,'plan/'+id)).body.plan.theme,'outdoors','unrelated edits preserve appearance');
for(const change of [{theme:'anything'},{accent:'red'},{emoji:'<script>'},{emoji:'🛼🎵'}])assert.equal((await req(host,'plan/'+id,'PATCH',change)).status,400);
assert.equal((await req(host,'plan/'+id)).body.plan.emoji,'🌻','invalid changes do not partly update the plan');
console.log('PASS: arbitrary custom plan titles, empty items, theme/color/emoji persistence, host-only styling, validated emoji and safe preset colors.');

assert.deepEqual(styleFromEmoji('🛼'),{emoji:'🛼',theme:'skating',accent:'sky'});
assert.equal(styleFromEmoji('🎧').theme,'music');assert.equal(styleFromEmoji('🌻').accent,'sage');assert.equal(styleFromEmoji('⚽️').theme,'games');assert.equal(styleFromEmoji('👩🏽‍🚀').emoji,'👩🏽‍🚀');assert.equal(styleFromEmoji('🦄').theme,'company');assert.equal(styleFromEmoji('nope'),null);
const photo='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jD1sAAAAASUVORK5CYII=';
assert.equal((await req(guest,'plan/'+id,'PATCH',{coverImage:photo})).status,403);
assert.equal((await req(host,'plan/'+id,'PATCH',{coverImage:photo})).status,200);
d=(await req(guest,'plan/'+id)).body;assert.ok(d.plan.cover_url.includes('/cover?v='));assert.equal(d.plan.cover_image,undefined,'large image bytes are not repeated in plan JSON');
const cover=await fetch(B+d.plan.cover_url);assert.equal(cover.status,200);assert.equal(cover.headers.get('content-type'),'image/png');assert.equal(cover.headers.get('cache-control'),'no-store');assert.equal(new Uint8Array(await cover.arrayBuffer()).length,atob(photo.split(',')[1]).length);
assert.equal((await req(host,'plans')).body.plans.find(p=>p.id===id).cover_url,d.plan.cover_url);
await req(host,'plan/'+id,'PATCH',{note:'Keep my photo'});assert.equal((await req(guest,'plan/'+id)).body.plan.cover_url,d.plan.cover_url);
for(const coverImage of ['https://example.com/private.jpg','data:image/svg+xml;base64,PHN2Zz4=',photo+'x','data:image/jpeg;base64,'+Buffer.alloc(96001,255).toString('base64')])assert.equal((await req(host,'plan/'+id,'PATCH',{coverImage})).status,400);
const other=await req(host,'plans','POST',{title:'An image from the start',name:'Host',coverImage:photo});assert.equal(other.status,201);assert.ok((await req(guest,'plan/'+other.body.id)).body.plan.cover_url);
await req(host,'plan/'+id,'PATCH',{coverImage:''});assert.equal((await req(guest,'plan/'+id)).body.plan.cover_url,'');assert.equal((await fetch(B+'/api/plan/'+id+'/cover')).status,404,'removed images stop being served');
console.log('PASS: emoji-only styling and fallback; host-only cover create/update/remove, raster validation and byte caps; separate cover URLs, no cached removed covers, unrelated edits preserve photos.');
