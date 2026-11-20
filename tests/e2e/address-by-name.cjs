// Address rule, both sides on a tall iPhone: a guest the host invited by name sees the address as soon as they
// answer; a stranger who answers from the group link still needs the host's OK. Part of npm run journeys:access.
const {chromium,devices}=require('playwright');const {personalLink}=require('./access.cjs');
const B=process.env.JOURNEY_URL||'http://127.0.0.1:5173',O=process.argv[2]||require('node:os').tmpdir();
(async()=>{const b=await chromium.launch();let fails=0;const check=(ok,msg)=>{if(!ok){fails++;console.log('FAIL:',msg)}else console.log('ok:',msg)};
 const phone=async()=>{const p=await (await b.newContext({...devices['iPhone 14 Pro Max']})).newPage();p.on('pageerror',e=>{fails++;console.log('PAGEERROR',e.message)});return p};
 const h=await phone();await h.goto(B);await h.waitForTimeout(2500);
 const id=await h.evaluate(async()=>(await (await fetch('/api/plans',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'Address test dinner',name:'Ari',date:'2026-12-12T23:00:00.000Z',place:'77 Hidden Lane',tasks:[]})})).json()).id);
 await h.evaluate(async id=>fetch(`/api/plan/${id}/guests`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({names:['Tess']})}),id);
 const link=await personalLink(h,id,'Tess');
 // Tess, invited by name.
 const t=await phone();await t.goto(link);await t.waitForTimeout(2500);
 check(!(await t.locator('body').innerText()).includes('77 Hidden Lane'),'Tess doesn’t see the address before answering');
 check((await t.locator('.locked-note').first().innerText()).includes('Address shows after you answer'),'Tess is told the address shows after she answers');
 await t.locator('.quick-answers').getByRole('button',{name:'I’m in'}).click();await t.waitForTimeout(2500);
 await t.getByRole('tab',{name:'Overview'}).click().catch(()=>{});await t.waitForTimeout(400);
 check((await t.locator('body').innerText()).includes('77 Hidden Lane'),'Tess sees the address right after saying she’s in (no approval wait)');
 await t.screenshot({path:O+'/addr1-tess.png'});
 // A stranger from the group link.
 const s=await phone();await s.goto(B+'/?plan='+id);await s.waitForTimeout(2500);
 await s.getByRole('button',{name:'Reply',exact:true}).first().click().catch(()=>{});await s.waitForTimeout(600);
 await s.getByLabel(/Your name/).first().fill('Walk In');await s.getByRole('button',{name:'I’m in'}).first().click();
 const send=s.getByRole('button',{name:'Send RSVP'});if(await send.count())await send.click();await s.waitForTimeout(2500);
 await s.getByRole('tab',{name:'Overview'}).click().catch(()=>{});await s.waitForTimeout(400);
 check(!(await s.locator('body').innerText()).includes('77 Hidden Lane'),'a stranger who answers from the group link doesn’t see the address');
 check((await s.locator('.locked-note').first().innerText()).includes('Address needs host approval'),'the stranger is told it needs the host’s approval');
 // Host: Tess is already sharing; the walk-in waits for approval.
 await h.goto(B+'/?plan='+id);await h.waitForTimeout(2500);await h.getByRole('tab',{name:'People'}).click();await h.waitForTimeout(500);
 const tess=await h.locator('.guest-block',{hasText:'Tess'}).innerText(),walk=await h.locator('.guest-block',{hasText:'Walk In'}).innerText();
 check(/Hide arrival details/.test(tess),'Ari sees Tess already has the address (Hide arrival details)');
 check(/Approve arrival access/.test(walk),'Ari can approve the walk-in');
 await h.screenshot({path:O+'/addr2-host.png',fullPage:true});
 await h.evaluate(async id=>fetch('/api/plan/'+id,{method:'DELETE'}),id);
 console.log(fails?`${fails} problem(s)`:'All address checks passed');await b.close();process.exitCode=fails?1:0})();
