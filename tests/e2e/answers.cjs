const {personalLink,approve}=require('./access.cjs');
// Phone journey, guest and host: "Can't make it" shows a thank-you and hides the plan's tasks;
// "Still checking" asks when to check back, offers a phone reminder, and the host sees the day.
// Needs `npm run dev` running. Usage: npm run journeys:answers [-- <screenshot dir>]
const {chromium,devices}=require('playwright');
const B=process.env.JOURNEY_URL||'http://127.0.0.1:5173',O=process.argv[2]||require('node:os').tmpdir();
(async()=>{
 const b=await chromium.launch();let fails=0;const check=(ok,msg)=>{if(!ok){fails++;console.log('FAIL:',msg)}else console.log('ok:',msg)};
 const phone=async()=>{const c=await b.newContext({...devices['iPhone 14 Pro Max'],acceptDownloads:true});const p=await c.newPage();p.on('pageerror',e=>{fails++;console.log('PAGEERROR',e.message)});return p};
 const h=await phone();await h.goto(B);await h.waitForTimeout(1500);
 const id=await h.evaluate(async()=>{const c=(u,m,bd)=>fetch('/api/'+u,{method:m,headers:{'Content-Type':'application/json'},body:bd?JSON.stringify(bd):undefined}).then(r=>r.json());const r=await c('plans','POST',{title:'Friendsgiving',name:'Kaela',date:new Date(Date.now()+20*86400000).toISOString(),place:'12 Oak Ave',tasks:[{title:'Pie',category:'bring'}]});await c('plan/'+r.id+'/guests','POST',{names:['Tess','Sam']});return r.id});
 const ids=await h.evaluate(async id=>Object.fromEntries((await (await fetch('/api/plan/'+id)).json()).guests.map(g=>[g.name,g.id])),id);
 // Tess can't make it
 const t=await phone();await t.goto(await personalLink(h,id,'Tess'));await t.waitForTimeout(2000);
 await t.getByRole('button',{name:'Can’t make it'}).first().click();await t.waitForTimeout(2000);
 const tt=await t.locator('main').innerText();
 check(/Thanks for letting Kaela know/.test(tt)&&/Make it out next time!/.test(tt),'can’t make it: thank-you and “Make it out next time!”');
 check(await t.getByRole('tab').count()===0&&!tt.includes('Pie')&&!tt.includes('12 Oak'),'no tabs, no bring list and no address after saying no');
 check(!tt.includes('any more tasks'),'no extra “tasks” line');
 check(await t.getByRole('heading',{name:'Planning something yourself?'}).count()===1,'declined guest is invited to try m.o');
 await t.screenshot({path:O+'/ans-declined.png',fullPage:true});
 await t.getByRole('button',{name:'I can make it'}).click();await t.waitForTimeout(2000);
 check(await t.getByRole('tab').count()===3,'changing to “I can make it” brings the plan back');
 await t.getByRole('tab',{name:'Overview'}).click();await t.waitForTimeout(400);
 check(await t.getByRole('heading',{name:'Planning something yourself?'}).count()===1,'going guest sees the invitation on the overview');
 await t.getByRole('button',{name:'Start your own plan'}).last().click();await t.waitForTimeout(500);
 check(await t.getByRole('heading',{name:'New plan'}).count()===1,'Start your own plan opens the new-plan form');
 await t.keyboard.press('Escape');await t.waitForTimeout(300);
 await t.getByRole('button',{name:'Not now'}).click();await t.waitForTimeout(300);
 check(await t.getByRole('heading',{name:'Planning something yourself?'}).count()===0,'Not now hides it');
 // Sam is still checking
 const s=await phone();await s.goto(await personalLink(h,id,'Sam'));await s.waitForTimeout(2000);
 await s.getByRole('button',{name:'Still checking'}).first().click();await s.waitForTimeout(2000);
 check(await s.getByRole('heading',{name:/When should Kaela check back with you/}).count()===1,'still checking: asks when to check back');
 await s.screenshot({path:O+'/ans-checking.png'});
 await s.getByRole('button',{name:'In 3 days'}).click();await s.waitForTimeout(1800);
 check(await s.getByRole('heading',{name:/You’ll decide by/}).count()===1,'shows the day they picked');
 const [dl]=await Promise.all([s.waitForEvent('download'),s.getByRole('button',{name:'Add a reminder to my calendar'}).click()]);
 const ics=require('node:fs').readFileSync(await dl.path(),'utf8');check(/BEGIN:VALARM/.test(ics)&&/Decide: Friendsgiving/.test(ics),'reminder file has an alert on that day');
 // Host sees it
 await h.goto(`${B}/?plan=${id}`);await h.waitForTimeout(1800);await h.getByRole('tab',{name:'People'}).click();await h.waitForTimeout(500);
 check(await h.getByRole('heading',{name:'Planning something yourself?'}).count()===0,'host never sees the invitation');
 check(/Will decide by/.test(await h.locator('.guest-block').filter({hasText:'Sam'}).innerText()),'host sees when Sam will decide');
 check(/Tess[\s\S]*(Going|going)/.test(await h.locator('.guest-block').filter({hasText:'Tess'}).innerText()),'host sees Tess changed to going');
 await b.close();console.log(fails?`${fails} problem(s)`:'All answer checks passed');process.exit(fails?1:0);
})();
