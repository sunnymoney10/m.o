const {chooseLayout}=require('./access.cjs');
// Phone journey, both sides: the host fixes the bring list (removes "Grandma" added by mistake, fixes a typo);
// a guest, first as a stranger and then after answering, sees the fixed list and no Edit/Remove buttons.
// Tall iPhone. Needs `npm run dev` running. Usage: npm run journeys:items [-- <screenshot dir>]
const {chromium,devices}=require('playwright');
const B=process.env.JOURNEY_URL||'http://127.0.0.1:5173',O=process.argv[2]||require('node:os').tmpdir();
(async()=>{
 const b=await chromium.launch();let fails=0;const check=(ok,msg)=>{if(!ok){fails++;console.log('FAIL:',msg)}else console.log('ok:',msg)};
 const phone=async()=>{const c=await b.newContext({...devices['iPhone 14 Pro Max']});const p=await c.newPage();p.on('pageerror',e=>{fails++;console.log('PAGEERROR',e.message)});p.on('dialog',d=>d.accept());return p};
 const fits=async(p,label)=>check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+': fits the screen');
 const titles=p=>p.locator('.item-row .item-info strong').allInnerTexts();
 // Host
 const h=await phone();await h.goto(B);await h.waitForTimeout(2500);
 const id=await h.evaluate(async()=>(await (await fetch('/api/plans',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'Skate day',name:'Ari',date:'2026-11-29T21:00:00.000Z',tasks:[{title:'Grandma',category:'bring'},{title:'Snaks',category:'bring'},{title:'Speaker',category:'bring'}]})})).json()).id);
 await h.goto(B+'/?plan='+id);await h.waitForTimeout(2500);await h.getByRole('tab',{name:/Bring list/}).click();await h.waitForTimeout(300);
 const row=n=>h.locator('.item-row',{has:h.locator('strong',{hasText:new RegExp('^'+n+'$')})});
 check(await row('Grandma').getByRole('button',{name:'Remove'}).count()===1&&await row('Grandma').getByRole('button',{name:'Edit'}).count()===1,'host sees Edit and Remove on each item');
 await fits(h,'host bring list');await h.screenshot({path:O+'/ie1-host.png'});
 await row('Grandma').getByRole('button',{name:'Remove'}).click();await h.waitForTimeout(1500);
 check(!(await titles(h)).includes('Grandma'),'Grandma is removed');
 await row('Snaks').getByRole('button',{name:'Edit'}).click();
 const box=h.getByLabel('Change “Snaks”');check(await box.inputValue()==='Snaks','edit box opens with the current wording');
 await fits(h,'host editing');await h.screenshot({path:O+'/ie2-editing.png'});
 await box.fill('Snacks');await h.getByRole('button',{name:'Save'}).click();await h.waitForTimeout(1500);
 check(JSON.stringify(await titles(h))===JSON.stringify(['Snacks','Speaker']),'list now reads Snacks, Speaker: '+(await titles(h)).join(', '));
 // Guest: a stranger with the group link, then after answering.
 const g=await phone();await g.goto(B+'/?plan='+id);await g.waitForTimeout(2500);
 await g.getByRole('tab',{name:/Bring list/}).click().catch(()=>{});await g.waitForTimeout(300);
 const before=await titles(g);check(!before.includes('Grandma')&&before.includes('Snacks'),'stranger sees the fixed list: '+before.join(', '));
 check(await g.getByRole('button',{name:'Remove'}).count()===0&&await g.getByRole('button',{name:'Edit'}).count()===0,'stranger has no Edit or Remove');
 await g.getByRole('button',{name:'Reply',exact:true}).first().click();await g.waitForTimeout(800);
 const nm=g.getByLabel(/Your name/).first();if(await nm.count())await nm.fill('Tess');
 await g.getByRole('button',{name:'I’m in'}).first().click();const send=g.getByRole('button',{name:'Send RSVP'});if(await send.count())await send.click();await g.waitForTimeout(1500);
 await g.getByRole('tab',{name:/Bring list/}).click();await g.waitForTimeout(300);
 check(await g.getByRole('button',{name:'Remove'}).count()===0&&await g.getByRole('button',{name:'Edit'}).count()===0,'guest who answered has no Edit or Remove');
 await g.getByRole('button',{name:'I can bring this'}).first().click();await g.waitForTimeout(1500);
 check(await g.locator('.item-row',{hasText:'Snacks'}).getByText('You’re bringing this').count()===1,'guest takes Snacks');
 await fits(g,'guest bring list');await g.screenshot({path:O+'/ie3-guest.png'});
 // The host fixes the wording again; Tess keeps it.
 await h.reload();await h.waitForTimeout(2000);await h.getByRole('tab',{name:/Bring list/}).click();await h.waitForTimeout(300);
 await row('Snacks').getByRole('button',{name:'Edit'}).click();await h.getByLabel('Change “Snacks”').fill('Snacks and juice');await h.getByRole('button',{name:'Save'}).click();await h.waitForTimeout(1500);
 await g.reload();await g.waitForTimeout(2000);await g.getByRole('tab',{name:/Bring list/}).click();await g.waitForTimeout(300);
 check(await g.locator('.item-row',{hasText:'Snacks and juice'}).getByText('You’re bringing this').count()===1,'after the host’s fix, Tess still has it under the new wording');
 // Plans change: in Edit plan the host switches Get-together → Trip and adds a job, without deleting anything.
 await h.getByRole('button',{name:'Edit plan details'}).click();await h.waitForTimeout(400);
 check(await h.getByRole('button',{name:'Trip',includeHidden:true}).count()===1,'Edit plan offers Get-together / Trip');
 await chooseLayout(h,'Trip');
 check(await h.evaluate(()=>!!document.querySelector('details.more-details')?.open),'Edit plan opens with all details showing');
 await h.getByLabel(/Add jobs to hand out/).fill('Book the rink by Friday');
 await fits(h,'host Edit plan');await h.screenshot({path:O+'/ie4-edit-plan.png',fullPage:true});
 await h.getByRole('button',{name:/Save/}).first().click();await h.waitForTimeout(2000);
 const hk=await h.evaluate(async id=>(await (await fetch('/api/plan/'+id)).json()),id);
 check(hk.plan.kind==='trip','plan is now a trip');
 check(hk.tasks.some(t=>t.title==='Book the rink by Friday'&&t.category==='todo')&&hk.tasks.some(t=>t.title==='Snacks and juice'&&t.claimed_name==='Tess'),'new job added; Tess still has Snacks and juice');
 await g.reload();await g.waitForTimeout(2000);
 const gk=await g.evaluate(async id=>(await (await fetch('/api/plan/'+id)).json()),id);check(gk.plan.kind==='trip'&&gk.tasks.some(t=>t.title==='Book the rink by Friday'),'guest sees the trip and the new job');
 await fits(g,'guest after the change');
 // And back again.
 await h.getByRole('button',{name:'Edit plan details'}).click();await h.waitForTimeout(400);await chooseLayout(h,'Get-together');await h.getByRole('button',{name:/Save/}).first().click();await h.waitForTimeout(1500);
 check((await h.evaluate(async id=>(await (await fetch('/api/plan/'+id)).json()).plan.kind,id))==='gathering','host switches it back to a get-together');
 const gid=await g.evaluate(async id=>{const r=await fetch('/api/plan/'+id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'trip'})});return r.status},id);check(gid===403,'a guest can’t change the plan type');
 await h.evaluate(async id=>fetch('/api/plan/'+id,{method:'DELETE'}),id);
 console.log(fails?`${fails} problem(s)`:'All bring-list edit checks passed');await b.close();process.exitCode=fails?1:0;
})();
