// Phone journey: friends who answer by text and never open the link. The host records, tracks and confirms.
// Needs `npm run dev` running. Usage: npm run journeys:quiet [-- <screenshot dir>]
const {chromium,devices}=require('playwright');
const B=process.env.JOURNEY_URL||'http://127.0.0.1:5173',O=process.argv[2]||require('node:os').tmpdir();
const log=(...a)=>console.log(...a);
(async()=>{
 const b=await chromium.launch();
 const phone=async()=>{const c=await b.newContext({...devices['iPhone 14'],permissions:['clipboard-read','clipboard-write'],timezoneId:'America/New_York'});const p=await c.newPage();p.on('pageerror',e=>log('PAGEERROR',e.message));p.on('dialog',d=>d.accept());return p};
 const shot=(p,n,full=true)=>p.screenshot({path:`${O}/${n}.png`,fullPage:full});
 const toast=async p=>{try{return await p.locator('.toast').last().innerText({timeout:3000})}catch{return '(no toast)'}};
 const text=async(p,sel)=>(await p.locator(sel).first().innerText()).replace(/\n+/g,' | ');
 const tab=(p,n)=>p.getByRole('tab',{name:n}).click();
 const row=(p,name)=>p.locator('.guest-block').filter({has:p.locator('.guest-info strong',{hasText:new RegExp('^'+name)})});
 const h=await phone();await h.goto(B);await h.waitForTimeout(1000);
 const id=await h.evaluate(async()=>{const c=(path,method,body)=>fetch('/api/'+path,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined}).then(r=>r.json());const r=await c('plans','POST',{title:'Friendsgiving',name:'Ari',date:'2026-11-26T23:00:00.000Z',place:'12 Oak Ave',details:'Buzz 2B.',tasks:[{title:'Pie',category:'bring'},{title:'Drinks & ice',category:'bring'},{title:'Mac and cheese',category:'bring'}]});await c(`plan/${r.id}/guests`,'POST',{names:['Tess','Jordan','Sam']});return r.id});
 await h.goto(B+'/?plan='+id);await h.waitForTimeout(1200);
 // Tess texted: "I'm in, bringing Ben, I'm vegetarian"
 await tab(h,'People');await row(h,'Tess').getByRole('button',{name:'Update answer'}).click();
 const form=h.locator('.note-form');await form.getByRole('button',{name:'Going'}).click();await form.getByRole('button',{name:'One more'}).click();
 await form.getByLabel(/extra guests/).fill('Ben');await form.getByLabel(/Dietary/).fill('Vegetarian');await shot(h,'q1-note-form');
 await form.getByRole('button',{name:'Save what they told you'}).click();await h.waitForTimeout(1500);log('noted Tess:',await toast(h));
 // Jordan texted: can't make it
 await row(h,'Jordan').getByRole('button',{name:'Update answer'}).click();await h.locator('.note-form').getByRole('button',{name:'Can’t make it'}).click();await h.locator('.note-form').getByRole('button',{name:'Save what they told you'}).click();await h.waitForTimeout(1500);log('noted Jordan:',await toast(h));
 log('people:',await text(h,'.guest-list'));await shot(h,'q2-people');
 // Tess said she'd bring pie
 await tab(h,/Bring list/);await h.locator('.item-row').filter({hasText:'Pie'}).locator('select').selectOption({label:'Tess'});await h.waitForTimeout(1500);log('assign:',await toast(h));
 log('pie row:',await text(h,'.item-row:has-text("Pie")'));await shot(h,'q3-list');
 // Copy a check-in for Tess to send by text
 await tab(h,'People');await row(h,'Tess').getByRole('button',{name:'Copy check-in'}).click();await h.waitForTimeout(400);log('check-in text:',await h.evaluate(()=>navigator.clipboard.readText()));
 await row(h,'Sam').getByRole('button',{name:'Copy check-in'}).click();await h.waitForTimeout(300);log('Sam check-in:',await h.evaluate(()=>navigator.clipboard.readText()));
 // Overview: headcount, unconfirmed, recent updates
 await tab(h,'Overview');await h.waitForTimeout(300);log('headcount:',await text(h,'.status-number'));log('host notes:',await text(h,'.host-notes'));log('updates:',await text(h,'.activity ul'));await shot(h,'q4-overview');
 // Days later, Tess opens the link and confirms in one tap
 const t=await phone();await t.goto(B+'/?plan='+id);await t.waitForTimeout(1200);await t.locator('.rsvp-prompt .primary').click().catch(()=>{});
 await t.getByRole('button',{name:'Tess',exact:true}).first().click();await t.waitForTimeout(1500);
 await tab(t,'Overview');await t.waitForTimeout(300);log('Tess banner:',await text(t,'.noted-banner'));await shot(t,'q5-tess-banner',false);
 await t.getByRole('button',{name:'Yes, that’s right'}).click();await t.waitForTimeout(1500);log('Tess confirm:',await toast(t),'| banner gone:',await t.locator('.noted-banner').count()===0);
 await h.reload();await h.waitForTimeout(1500);log('updates after:',await text(h,'.activity ul'));
 await tab(h,'People');log('Tess row after:',await text(h,'.guest-block:has-text("Tess")'));await shot(h,'q6-people-after');
 await b.close();
})();
