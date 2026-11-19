// Phone journey: personal invites. The host pastes names with numbers, sends each person their own text,
// and a guest answers from their personal link in one tap. Checks that numbers never reach the server.
// Needs `npm run dev` running. Usage: npm run journeys:invites [-- <screenshot dir>]
const {chromium,devices}=require('playwright');
const B=process.env.JOURNEY_URL||'http://127.0.0.1:5173',O=process.argv[2]||require('node:os').tmpdir();
const log=(...a)=>console.log(...a);
(async()=>{
 const b=await chromium.launch();let fails=0;const check=(ok,msg)=>{if(!ok){fails++;log('FAIL:',msg)}else log('ok:',msg)};
 const phone=async()=>{const c=await b.newContext({...devices['iPhone 14'],timezoneId:'America/New_York'});const p=await c.newPage();p.on('pageerror',e=>{fails++;log('PAGEERROR',e.message)});p.on('dialog',d=>d.accept());return p};
 const h=await phone();await h.goto(B);await h.waitForTimeout(2500);
 const id=await h.evaluate(async()=>(await (await fetch('/api/plans',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'Friendsgiving',name:'Ari',date:'2026-11-26T23:00:00.000Z',place:'12 Oak Ave',tasks:[{title:'Pie',category:'bring'},{title:'Ice',category:'bring'}]})})).json()).id);
 await h.goto(B+'/?plan='+id);await h.waitForTimeout(2500);
 // Paste a list with numbers
 await h.getByRole('tab',{name:'People'}).click();await h.getByRole('button',{name:/Add names to the guest list/}).click();
 // iPhone: AutoFill Contact fills the name and phone boxes (simulated here: Safari fills by these autocomplete hints).
 const one=h.locator('.one-guest');check(await one.locator('input[autocomplete="name"]').count()===1&&await one.locator('input[autocomplete="tel"]').count()===1,'one-person form uses the name and phone AutoFill hints');
 await one.getByLabel('Name').fill('Tess Morgan');await one.getByLabel(/^Phone/).fill('215-555-0134');await one.getByRole('button',{name:'Add to the list below'}).click();
 check(await one.getByLabel('Name').inputValue()===''&&(await h.getByLabel(/Your list/).inputValue())==='Tess Morgan 215-555-0134','added person moves to the list; boxes clear for the next one');
 await one.getByLabel('Name').fill('Jordan');await one.getByLabel(/^Phone/).fill('+1 (267) 555 0199');await one.getByLabel(/^Phone/).press('Enter');
 await h.getByLabel(/Your list/).fill((await h.getByLabel(/Your list/).inputValue())+'\nSam');
 check((await h.locator('.name-preview').innerText()).includes('Tess Morgan, Jordan, Sam'),'preview shows names only');
 await h.getByRole('button',{name:/^Add \d+ people$/}).click();await h.waitForTimeout(1500);
 const server=await h.evaluate(async id=>JSON.stringify(await (await fetch('/api/plan/'+id)).json()),id);
 check(!/555|0134|0199/.test(server),'no phone numbers stored on the server');
 // Checklist → Send invites
 await h.getByRole('tab',{name:'Overview'}).click();await h.waitForTimeout(300);
 await h.locator('.next-steps').getByRole('button',{name:/Send invites/}).click();await h.waitForTimeout(600);
 check(await h.locator('.send-invites').count()===1,'checklist opens Send invites');
 await h.locator('.send-invites').screenshot({path:O+'/pi1-send.png'});
 const tessNum=await h.locator('.invite-rows li',{hasText:'Tess Morgan'}).locator('input').inputValue();
 check(tessNum.includes('215-555-0134'),'Tess’s number kept on this phone from the paste ('+tessNum+')');
 await h.getByRole('button',{name:/^Prepare invite for/}).click();await h.locator('.send-invites a.primary').waitFor();
 const next=h.locator('.send-invites a.primary');const href=await next.getAttribute('href');const label=await next.innerText();
 log('next button:',label);log('sms link:',decodeURIComponent(href).slice(0,240));
 check(/^sms:2155550134[&?]body=/.test(href),'Send opens Messages to Tess’s number');
 const body=decodeURIComponent(href.split('body=')[1]);check(body.startsWith('Hi Tess!')&&body.includes('Friendsgiving')&&/\/i\/[A-Za-z0-9_-]{43}/.test(body),'message is personal with her own link');
 await h.evaluate(()=>document.querySelectorAll('.send-invites a').forEach(a=>a.addEventListener('click',e=>e.preventDefault())));
 await next.click();await h.waitForTimeout(500);
 check((await h.locator('.send-invites .primary').innerText()).includes('Jordan'),'Send to everyone moves on to Jordan');
 check((await h.locator('.invite-rows li',{hasText:'Tess Morgan'}).innerText()).includes('Invite sent'),'Tess marked as sent');
 await h.locator('.invite-rows li',{hasText:'Sam'}).getByRole('button',{name:'Prepare personal link'}).click();
 const samHref=await h.locator('.invite-rows li',{hasText:'Sam'}).locator('a').getAttribute('href');check(/^sms:[&?]body=Hi%20Sam!/.test(samHref),'no number: Messages opens with the message, you pick the contact');
 // Tess opens her personal link
 const link=body.match(/https?:\/\/\S+/)[0];const t=await phone();await t.goto(link);await t.waitForTimeout(2500);
 await t.screenshot({path:O+'/pi2-personal.png'});
 check((await t.locator('.invite-card h2').innerText()).startsWith('Hi Tess! Ari invited you'),'personal greeting');
 await t.locator('.quick-answers').getByRole('button',{name:'I’m in'}).click();await t.waitForTimeout(2500);
 check(await t.getByRole('tab',{name:/Bring list/}).getAttribute('aria-selected')==='true','after one tap Tess lands on the bring list');
 check(!t.url().includes('&g='),'personal part removed from the address after answering');
 await h.reload();await h.waitForTimeout(2000);await h.getByRole('tab',{name:'People'}).click();
 check((await h.locator('.guest-block',{hasText:'Tess Morgan'}).innerText()).includes('Going'),'host sees Tess going');
 log(fails?`${fails} problem(s)`:'All personal-invite checks passed');await b.close();process.exitCode=fails?1:0;
})();
