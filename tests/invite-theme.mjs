import assert from 'node:assert/strict';
import {themeError,suggestedTheme} from '../lib/invite-theme.ts';
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
