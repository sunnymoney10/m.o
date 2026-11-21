// Phone journey: Mom (a guest who answered) asks to bring Cynthia; the host approves; Mom sends Cynthia her own
// link; Cynthia answers and sees the address. A stranger never sees the request. Then the host opens the plan so
// guests can add people without asking. Everyone on a tall iPhone. Needs `npm run dev`. Usage: npm run journeys:plusones
const {chromium,devices}=require('playwright');const {personalLink}=require('./access.cjs');
const B=process.env.JOURNEY_URL||'http://127.0.0.1:5173',O=process.argv[2]||require('node:os').tmpdir();
(async()=>{
 const b=await chromium.launch();let fails=0;const check=(ok,msg)=>{if(!ok){fails++;console.log('FAIL:',msg)}else console.log('ok:',msg)};
 const phone=async()=>{const c=await b.newContext({...devices['iPhone 14 Pro Max']});const p=await c.newPage();p.on('pageerror',e=>{fails++;console.log('PAGEERROR',e.message)});p.on('dialog',d=>d.accept());return p};
 const fits=async(p,label)=>check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+': fits the screen');
 const toast=async p=>{try{await p.waitForTimeout(600);return await p.locator('.toast').last().innerText({timeout:3000})}catch{return ''}};
 const noSms=p=>p.evaluate(()=>document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('a[href^="sms:"]');if(a)e.preventDefault()},true));
 // Host makes the plan and invites Mom.
 const h=await phone();await h.goto(B);await h.waitForTimeout(2500);
 const id=await h.evaluate(async()=>(await (await fetch('/api/plans',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'Skate day',name:'Ari',date:'2026-11-29T21:00:00.000Z',place:'Roller Palace, 12 Oak Ave',tasks:[{title:'Snacks',category:'bring'}]})})).json()).id);
 await h.evaluate(async id=>fetch(`/api/plan/${id}/guests`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({names:['Mom']})}),id);
 const momLink=await personalLink(h,id,'Mom');
 // Mom answers from her text, then asks to bring Cynthia.
 const m=await phone();await m.goto(momLink);await m.waitForTimeout(2500);
 await m.locator('.quick-answers').getByRole('button',{name:'I’m in'}).click();await m.waitForTimeout(2500);
 await m.getByRole('tab',{name:'Overview'}).click();await m.waitForTimeout(400);
 const entry=m.getByRole('button',{name:'Bringing someone? Ask Ari'});check(await entry.count()===1,'Mom’s “You’re set” card offers “Bringing someone? Ask Ari”');
 await entry.click();await m.waitForTimeout(600);
 const card=m.locator('.bring-someone');check(await card.count()===1,'Mom sees “Bringing someone?”');
 check(/Ask Ari first/.test(await card.innerText())&&/bring 4 more/.test(await card.innerText()),'it says to ask Ari first and shows 4 spots');
 await card.getByPlaceholder('Their name').fill('Cynthia');await card.getByRole('button',{name:'Ask Ari'}).click();const said=await m.locator('.toast',{hasText:'Asked'}).first().innerText({timeout:5000}).catch(()=>'');await m.waitForTimeout(800);
 check(/Asked/.test(said),'Mom is told the request went to Ari: '+said);
 const nudge=await m.locator('.bring-someone-nudge a').getAttribute('href');check(/^sms:/.test(nudge)&&decodeURIComponent(nudge).includes('Can I bring Cynthia to Skate day?'),'Mom can text Ari about it (Messages opens with the note)');
 check((await m.locator('.bring-someone-list').innerText()).includes('Waiting for Ari'),'Mom sees “Waiting for Ari”');
 await fits(m,'Mom asking');await m.screenshot({path:O+'/po1-mom-asks.png',fullPage:true});
 // A stranger with the group link sees nothing about it.
 const s=await phone();await s.goto(B+'/?plan='+id);await s.waitForTimeout(2500);
 await s.getByRole('tab',{name:'People'}).click().catch(()=>{});await s.waitForTimeout(400);
 check(!(await s.locator('body').innerText()).includes('Cynthia'),'a stranger doesn’t see the request');
 // Host: the plan card says 1 request; the overview asks Ari to decide.
 await h.goto(B+'/?view=plans');await h.waitForTimeout(2500);
 check((await h.locator('.plan-card',{hasText:'Skate day'}).innerText()).includes('1 request'),'Ari’s plan list shows “1 request”');
 await h.goto(B+'/?plan='+id);await h.waitForTimeout(2500);
 const ask=h.locator('.plus-one-ask');check((await ask.innerText()).includes('Mom asks to bring Cynthia'),'Ari sees “Mom asks to bring Cynthia”');
 await fits(h,'Ari’s request card');await h.screenshot({path:O+'/po2-host-request.png'});
 await ask.getByRole('button',{name:'Yes, Cynthia can come'}).click();await h.waitForTimeout(1500);
 {const tell=h.locator('.plus-one-told a');check(await tell.count()===1&&decodeURIComponent(await tell.getAttribute('href')).includes('Yes, Cynthia can come to Skate day! Open it to send Cynthia the invite'),'after saying yes, Ari can tell Mom in one tap');
  await fits(h,'Ari after saying yes');await h.screenshot({path:O+'/po2b-tell-mom.png'});await h.getByRole('button',{name:'Done'}).click();}
 await h.getByRole('tab',{name:'People'}).click();await h.waitForTimeout(400);
 check((await h.locator('.guest-block',{hasText:'Cynthia'}).innerText()).includes('with Mom'),'Cynthia is on Ari’s list “with Mom”');
 // Mom sends Cynthia her invite.
 await m.reload();await m.waitForTimeout(2500);await m.getByRole('tab',{name:'Overview'}).click().catch(()=>{});await m.waitForTimeout(400);
 {const yes=m.getByRole('button',{name:/Ari said yes to Cynthia/});check(await yes.count()===1,'Mom’s overview says Ari said yes to Cynthia');await yes.click();await m.waitForTimeout(600)}
 await noSms(m);const send=m.locator('.bring-someone-list').getByRole('button',{name:'Send Cynthia the invite'});check(await send.count()===1,'Mom sees “Send Cynthia the invite”');
 check((await m.locator('.bring-someone-list li',{hasText:'Cynthia'}).innerText()).includes('hasn’t answered yet'),'Mom sees Cynthia hasn’t answered yet');
 await send.click();await m.waitForTimeout(2000);
 const cynLink=await m.evaluate(()=>{const v=Object.values(JSON.parse(localStorage.getItem('mo-plus-links')||'{}'))[0];return v&&v.url});
 check(/\/i\/[A-Za-z0-9_-]{43}$/.test(cynLink||''),'Cynthia’s own link was made on Mom’s phone');
 if(!m.url().startsWith(B)){await m.goto(B+'/?plan='+id);await m.waitForTimeout(2000);await m.getByRole('tab',{name:'People'}).click()}
 await m.waitForTimeout(500);const again=await m.locator('.bring-someone-list a').first().getAttribute('href');check(decodeURIComponent(again).includes('Hi Cynthia! I asked Ari if you could come to Skate day')&&decodeURIComponent(again).includes('as my plus one, and Ari said yes')&&/\/i\/[A-Za-z0-9_-]{43}/.test(decodeURIComponent(again)),'the text to Cynthia is filled in: '+decodeURIComponent(again).slice(4,90));
 // Ari's Send invites shows Mom already has it.
 await h.reload();await h.waitForTimeout(2000);await h.getByRole('tab',{name:'People'}).click();await h.getByRole('button',{name:'Send invites',exact:true}).click();await h.waitForTimeout(500);
 check((await h.locator('.invite-rows li',{hasText:'Cynthia'}).innerText()).includes('Mom already has their link'),'Ari’s Send invites says Mom already has Cynthia’s link');
 check(await h.getByRole('button',{name:'Prepare invite for Cynthia'}).count()===0,'Ari isn’t asked to make a second link');
 await fits(h,'Ari’s Send invites');
 // Cynthia answers and sees the address.
 const c=await phone();await c.goto(cynLink);await c.waitForTimeout(2500);
 {const card=await c.locator('.invite-card').innerText();check(/^No app or account needed\s+Hi Cynthia!\s+Mom is bringing you/.test(card),'Cynthia’s greeting says Mom is bringing her: '+card.split('\n')[0]);check(/Mom asked Ari if you could come as their plus one, and Ari said yes/.test(card),'it explains she’s Mom’s plus one');}
 check(await c.locator('.quick-answers').getByRole('button',{name:'Can’t make it'}).count()===1,'Cynthia answers for herself: I’m in / Still checking / Can’t make it');
 await c.locator('.quick-answers').getByRole('button',{name:'I’m in'}).click();await c.waitForTimeout(2500);
 await c.getByRole('tab',{name:'Overview'}).click();await c.waitForTimeout(500);
 check((await c.locator('body').innerText()).includes('Roller Palace'),'Cynthia sees the address after answering (Ari’s yes covered it)');
 await fits(c,'Cynthia');await c.screenshot({path:O+'/po3-cynthia.png'});
 await m.reload();await m.waitForTimeout(2000);await m.getByRole('tab',{name:'People'}).click();await m.waitForTimeout(400);
 check((await m.locator('.bring-someone-list li',{hasText:'Cynthia'}).innerText()).includes('Going'),'Mom sees Cynthia is going');
 await h.reload();await h.waitForTimeout(2000);await h.getByRole('tab',{name:'People'}).click();await h.waitForTimeout(400);
 check(/Going/.test(await h.locator('.guest-block',{hasText:'Cynthia'}).innerText()),'Ari sees Cynthia is going, in the main guest list');
 // Ari's own invite text for a plus-one is personal too (checked on a second plus-one Ari sends himself).
 // Open plan: Ari lets guests bring people without asking; Mom adds Gus straight away.
 await h.goto(B+'/?plan='+id);await h.waitForTimeout(2000);await h.getByRole('button',{name:'Edit plan details'}).click();await h.waitForTimeout(400);
 await h.getByLabel(/Guests can bring someone without asking me/).check();await h.getByRole('button',{name:/Save/}).first().click();await h.waitForTimeout(1500);
 await m.reload();await m.waitForTimeout(2500);await m.getByRole('tab',{name:'People'}).click();await m.waitForTimeout(400);
 check(/lets guests bring people/.test(await m.locator('.bring-someone').innerText()),'Mom sees she can add people herself');
 await m.locator('.bring-someone').getByPlaceholder('Their name').fill('Gus');await m.locator('.bring-someone').getByRole('button',{name:'Add them'}).click();await m.waitForTimeout(1500);
 check((await m.locator('.bring-someone-list li',{hasText:'Gus'}).innerText()).includes('On the list'),'Gus is on the list straight away');
 await h.reload();await h.waitForTimeout(2000);check(await h.locator('.plus-one-ask').count()===0,'Ari isn’t asked about Gus');
 // Ari sends Gus his invite himself: the text says Mom asked to bring him.
 await h.getByRole('tab',{name:'People'}).click();await h.getByRole('button',{name:'Send invites',exact:true}).click();await h.waitForTimeout(500);
 const gusRow=h.locator('.invite-rows li',{hasText:'Gus'});await gusRow.getByRole('button',{name:'Prepare personal link'}).click();await h.waitForTimeout(1200);
 {const href=decodeURIComponent(await gusRow.locator('a.outline-button').first().getAttribute('href'));check(href.includes('Hi Gus! Mom asked to bring you to Skate day')&&href.includes('as their plus one'),'Ari’s invite text to a plus-one is personal: '+href.split('body=')[1]?.slice(0,70))}
 await h.evaluate(async id=>fetch('/api/plan/'+id,{method:'DELETE'}),id);
 console.log(fails?`${fails} problem(s)`:'All plus-one checks passed');await b.close();process.exitCode=fails?1:0;
})();
