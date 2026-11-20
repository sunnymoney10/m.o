// Real local Worker + separate phone sessions. Never point this at a production origin.
const assert=require('node:assert/strict');const {chromium,devices}=require('playwright');const {personalLink,approve}=require('./access.cjs');
const B=process.env.JOURNEY_URL||'http://127.0.0.1:5174';if(!/^http:\/\/(127\.0\.0\.1|localhost):/.test(B))throw Error('Use an isolated local preview');
(async()=>{const b=await chromium.launch();try{
 const phone=async()=>{const c=await b.newContext({...devices['iPhone 14 Pro Max']});const p=await c.newPage();p.on('pageerror',e=>{throw e});return p};
 const host=await phone();await host.goto(B);await host.getByRole('button',{name:'Start a plan'}).first().waitFor();
 const id=await host.evaluate(async()=>{const post=(path,body)=>fetch('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json());const p=await post('plans',{title:'Access QA · fictional dinner',name:'Synthetic host',place:'PRIVATE TEST ADDRESS',doorCode:'PRIVATE DOOR CODE',tasks:[{title:'Ice',category:'bring'}]});await post(`plan/${p.id}/guests`,{names:['Synthetic guest','Other guest']});return p.id});
 const link=await personalLink(host,id,'Synthetic guest');
 const g=await phone();await g.goto(link);await g.locator('.quick-answers').waitFor();assert.match(await g.locator('.invite-card').innerText(),/Hi Synthetic/);
 assert.ok(!g.url().includes('#invite='),'secret removed from visible URL');
 await g.locator('.quick-answers').getByRole('button',{name:'I’m in',exact:true}).click();await g.getByRole('tab',{name:/Bring list/}).waitFor();await g.getByRole('button',{name:'I can bring this'}).click();await g.locator('.item-row').filter({hasText:'Ice'}).getByRole('button',{name:'Open it up again'}).waitFor().catch(async()=>{assert.match(await g.locator('.item-row').filter({hasText:'Ice'}).innerText(),/You’re bringing/)});
 let d=await g.evaluate(async id=>(await (await fetch('/api/plan/'+id)).json()),id);assert.equal(d.plan.place,'');assert.ok(!JSON.stringify(d).includes('PRIVATE DOOR CODE'));
 await approve(host,id,'Synthetic guest');await g.reload();await g.getByRole('tab',{name:'Overview',exact:true}).waitFor();d=await g.evaluate(async id=>(await (await fetch('/api/plan/'+id)).json()),id);assert.equal(d.plan.place,'PRIVATE TEST ADDRESS');assert.ok(!JSON.stringify(d).includes('PRIVATE DOOR CODE'));
 await host.goto(B+'/?plan='+id);await host.getByRole('tab',{name:'People',exact:true}).click();await host.getByRole('button',{name:'Send invites',exact:true}).click();await host.locator('.send-invites').waitFor();await host.screenshot({path:'/workspace/shared/mo-access-host.png',fullPage:true});
 const second=await phone();await second.goto(link);await second.getByRole('tab',{name:'People',exact:true}).click();await second.locator('.my-rsvp').waitFor();d=await second.evaluate(async id=>(await (await fetch('/api/plan/'+id)).json()),id);assert.ok(d.tasks[0].isMine);assert.equal(d.plan.place,'PRIVATE TEST ADDRESS');
 await second.screenshot({path:'/workspace/shared/mo-access-guest.png',fullPage:true});
 const revoke=host.locator('.invite-rows li').filter({hasText:'Synthetic guest'}).getByRole('button',{name:'Revoke personal link'});await revoke.click();await host.locator('.toast').filter({hasText:'revoked'}).waitFor();
 const status=await second.evaluate(async id=>(await fetch(`/api/plan/${id}/rsvp`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Synthetic guest',status:'out'})})).status,id);assert.equal(status,403);
 const revoked=await phone();const response=await revoked.goto(link);assert.equal(response.status(),410);assert.match(await revoked.locator('body').innerText(),/expired or was revoked/);
 await revoked.screenshot({path:'/workspace/shared/mo-access-revoked.png'});
 console.log('PASS: host prepares/revokes, guest answers/claims, independent arrival approval, second-device recovery, door-code exclusion, revoked session writes and revoked link screen.');
 }finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
