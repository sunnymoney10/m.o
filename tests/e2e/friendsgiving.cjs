// Friendsgiving phone journeys: Ari hosts, Tess, Jordan and Ramon respond. Needs `npm run dev` running.
// Usage: npm run journeys [-- <screenshot dir>]
const {chromium,devices}=require('playwright');
const B=process.env.JOURNEY_URL||'http://127.0.0.1:5173',O=process.argv[2]||require('node:os').tmpdir();
const log=(...a)=>console.log(...a);
(async()=>{
 const b=await chromium.launch();
 const phone=async()=>{const c=await b.newContext({...devices['iPhone 14'],permissions:['clipboard-read','clipboard-write'],timezoneId:'America/New_York'});const p=await c.newPage();p.on('pageerror',e=>log('PAGEERROR',e.message));p.on('dialog',d=>{log('  dialog:',d.message());d.accept()});return p};
 const shot=(p,n,full=true)=>p.screenshot({path:`${O}/${n}.png`,fullPage:full});
 const toast=async p=>{try{return await p.locator('.toast').last().innerText({timeout:3000})}catch{return '(no toast)'}};
 const text=async(p,sel)=>(await p.locator(sel).first().innerText()).replace(/\n+/g,' | ');
 const tab=(p,n)=>p.getByRole('tab',{name:n}).click();
 // Ari creates the plan
 const k=await phone();await k.goto(B);await k.waitForTimeout(1200);
 await k.getByRole('button',{name:'Start a plan'}).first().click();
 await k.getByLabel('Give it a name').fill('Friendsgiving');await k.getByLabel('Your name').fill('Ari');
 await k.getByLabel(/When/).fill('2026-11-26T17:00');await k.getByLabel('Where').fill('1420 Elm St, Apt 3B, Philadelphia');
 await k.getByText('Add more details').click();await k.getByLabel(/Arrival and house notes/).fill('Park on Elm, not in the lot (they tow). Buzz 3B and take the stairs. Shoes off inside.');
 await k.getByLabel(/What’s the plan/).fill('Doors at 5, food at 6. Bring your appetite.');
 await shot(k,'k1-form');
 await k.getByRole('button',{name:/Create plan/}).click();await k.waitForTimeout(1800);const url=k.url();
 // Ari adds the guest list
 await tab(k,'People');await k.getByRole('button',{name:/Add names to the guest list/}).click();
 await k.getByLabel(/Who did you invite|Your list/).fill('Tess\nJordan\nSam');await k.getByRole('button',{name:/^Add (\d+ people|to guest list)$/}).click();await k.waitForTimeout(1500);
 log('K guest list toast:',await toast(k));log('K people:',await text(k,'.guest-list'));await shot(k,'k2-guestlist');
 // Tess, first time, on her phone
 const t=await phone();await t.goto(url);await t.waitForTimeout(1500);await shot(t,'t1-open',false);
 log('T1 address hidden:',!(await t.locator('body').innerText()).includes('1420 Elm'),'| place line:',await t.locator('.meta-line').nth(1).innerText());
 await t.waitForTimeout(400);await shot(t,'t2-pick');
 await t.getByRole('button',{name:'Tess',exact:true}).click();await t.waitForTimeout(1500);log('T2 pick toast:',await toast(t));
 await shot(t,'t3-form');
 await t.getByRole('button',{name:'I’m in'}).click();await t.getByRole('button',{name:'One more'}).click();
 await t.getByPlaceholder(/Their names/).fill('Ben');await t.getByLabel(/Dietary needs/).fill('Vegetarian');await t.getByLabel(/stay over/).check();
 await shot(t,'t4-form-filled');
 await t.getByRole('button',{name:'Send RSVP'}).click();await t.waitForTimeout(1500);log('T4 RSVP toast:',await toast(t));
 await tab(t,'People');await shot(t,'t5-after');log('T5 my rsvp:',await text(t,'.my-rsvp'));
 await tab(t,'Overview');await t.waitForTimeout(300);log('T5 address visible now:',(await t.locator('body').innerText()).includes('Buzz 3B'));await shot(t,'t6-overview');
 await tab(t,/Bring list/);await t.getByRole('button',{name:'I can bring this'}).first().click();await t.waitForTimeout(1500);log('T6 claim toast:',await toast(t));
 // Jordan picks name, still checking
 const j=await phone();await j.goto(url);await j.waitForTimeout(1200);
 await j.getByRole('button',{name:'Jordan',exact:true}).click();await j.waitForTimeout(1200);await j.getByRole('button',{name:'Still checking'}).click();await j.getByRole('button',{name:'Send RSVP'}).click();await j.waitForTimeout(1500);
await tab(j,'People');
 log('J sees Tess dietary?',(await j.locator('.guest-list').innerText()).includes('Vegetarian'),'| sees Ben pending?',(await j.locator('.guest-list').innerText()).includes('Ben'));
 // Ramon is not on the list
 const r=await phone();await r.goto(url);await r.waitForTimeout(1200);await r.getByRole('button',{name:'I’m not on the list'}).click();
 await r.getByPlaceholder('What should we call you?').fill('Ramon');await r.getByRole('button',{name:'I’m in'}).click();await r.getByRole('button',{name:'Send RSVP'}).click();await r.waitForTimeout(1500);log('R toast:',await toast(r));
 // Ari's overview
 await k.reload();await k.waitForTimeout(1500);await shot(k,'k3-overview');
 log('K headcount:',await text(k,'.status-card'));log('K host notes:',await text(k,'.host-notes'));
 await tab(k,'People');await k.getByRole('button',{name:'Approve'}).click();await k.waitForTimeout(1500);log('K approve toast:',await toast(k));
 log('K people:',await text(k,'.guest-list'));await shot(k,'k4-people');
 await tab(k,'Overview');log('K headcount after approve:',await text(k,'.status-number'));
 // Ari changes the time
 await k.getByRole('button',{name:'Edit plan details'}).click();await k.getByLabel(/When/).fill('2026-11-26T18:00');await k.getByRole('button',{name:/Save changes/}).click();await k.waitForTimeout(1500);
 await t.reload();await t.waitForTimeout(1500);log('T sees new time:',await t.locator('.meta-line').first().innerText());
 // Tess on a second browser
 const t2=await phone();await t2.goto(url);await t2.waitForTimeout(1500);await t2.waitForTimeout(300);
 await shot(t2,'t7-second-browser');
 // Tapping her name alone doesn't move an answered spot; her personal link (from Ari) does.
 await tab(t2,'People');await t2.locator('.other-phone').getByRole('button',{name:'Answered on another phone?'}).click();await t2.locator('.other-phone').getByRole('button',{name:'Tess',exact:true}).click();await t2.waitForTimeout(800);log('T2 name tap without link:',await toast(t2));
 const personal=await k.evaluate(async()=>{const id=new URLSearchParams(location.search).get('plan');const d=await (await fetch('/api/plan/'+id)).json();const g=d.guests.find(x=>x.name==='Tess');return `/?plan=${id}&g=${g.id}&k=${g.key}`});
 await t2.goto(B+personal);await t2.waitForTimeout(1500);
 await tab(t2,'People');await t2.locator('.other-phone').getByRole('button',{name:'Answered on another phone?'}).click();await t2.locator('.other-phone').getByRole('button',{name:'Tess',exact:true}).click();await t2.waitForTimeout(1500);
 log('T2 my rsvp:',await text(t2,'.my-rsvp'));
 await tab(t2,/Bring list/);log('T2 still has claim:',(await t2.locator('.item-list').first().innerText()).includes('You’re bringing'));
 await tab(t2,'People');await t2.getByRole('button',{name:'Change'}).click();await t2.getByRole('button',{name:'Can’t make it'}).click();await t2.getByRole('button',{name:'Send RSVP'}).click();await t2.waitForTimeout(1500);log('T2 cancel toast:',await toast(t2));
 await k.reload();await k.waitForTimeout(1500);log('K after Tess cancels:',await text(k,'.status-card'));
 await tab(k,'People');log('K people final:',await text(k,'.guest-list'));
 await b.close();
})();
