const {personalLink,approve}=require('./access.cjs');
// Measures how much work the core outcomes take on a phone, so UX changes can be compared before and after.
// Needs `npm run dev` running. Usage: npm run ux:metrics
const {chromium,devices}=require('playwright');
const B=process.env.JOURNEY_URL||'http://127.0.0.1:5173';
(async()=>{
 const b=await chromium.launch();
 const phone=async()=>{const c=await b.newContext({...devices['iPhone 14'],permissions:['clipboard-read','clipboard-write']});const p=await c.newPage();p.on('dialog',d=>d.accept());return p};
 const m={};let taps=0;const tap=async l=>{taps++;await l.click()};
 // Host: create a plan through the form
 const h=await phone();await h.goto(B);await h.waitForTimeout(1500);
 await h.getByRole('button',{name:'Start a plan'}).first().click();await h.waitForTimeout(300);
 m.createFieldsShown=await h.locator('[role="dialog"] input:visible, [role="dialog"] textarea:visible').count();
 await h.getByLabel('Give it a name').fill('Friendsgiving');
 const nameField=h.getByLabel('Your name');if(await nameField.count()&&await nameField.isVisible())await nameField.fill('Ari');
 await h.getByLabel(/When/).fill('2026-11-26T18:00');await h.getByLabel('Where').fill('12 Oak Ave');
 await h.locator('[role="dialog"] button.primary').click();await h.waitForTimeout(1800);
 const id=new URL(h.url()).searchParams.get('plan');
 await h.evaluate(async id=>{await fetch(`/api/plan/${id}/guests`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({names:['Tess','Jordan','Sam']})})},id);
 await h.reload();await h.waitForTimeout(1500);
 const ov=await h.evaluate(()=>{const s=document.querySelector('.stack');if(!s)return null;const kids=[...s.children].filter(e=>e.offsetHeight>0);return {sections:kids.length,height:Math.round(s.getBoundingClientRect().height)}});
 m.hostOverviewSections=ov.sections;m.hostOverviewHeightPx=ov.height;
 m.hostNextStepVisibleAboveFold=await h.evaluate(()=>{const el=document.querySelector('.next-steps,.host-notes');return !!el&&el.getBoundingClientRect().top<window.innerHeight});
 // Guest: open link, RSVP, claim one item
 const g=await phone();await g.goto(await personalLink(h,id,'Tess'));await g.waitForTimeout(1500);taps=0;
 await tap(g.getByRole('button',{name:/Add details:/}));await g.waitForTimeout(1200);
 await tap(g.getByRole('button',{name:'I’m in'}));await tap(g.getByRole('button',{name:'Send RSVP'}));await g.waitForTimeout(1500);
 const before=taps;
 m.guestLandsOnBringListAfterRsvp=await g.getByRole('tab',{name:/Bring list/}).getAttribute('aria-selected')==='true';
 if(!m.guestLandsOnBringListAfterRsvp){const next=g.getByRole('button',{name:/Pick something to bring/});if(await next.count())await tap(next.first());else await tap(g.getByRole('tab',{name:/Bring list/}))}
 await g.waitForTimeout(400);await tap(g.getByRole('button',{name:'I can bring this'}).first());await g.waitForTimeout(1500);
 m.guestTapsToRsvp=before;m.guestTapsToRsvpAndClaim=taps;
 m.guestSeesWhatTheyBringOnOverview=await (async()=>{await g.getByRole('tab',{name:'Overview'}).click();await g.waitForTimeout(300);const t=await g.locator('.stack').first().innerText();return /You’re bringing|bringing:/i.test(t)})();
 const gov=await g.evaluate(()=>{const s=document.querySelector('.stack');return {sections:[...s.children].filter(e=>e.offsetHeight>0).length,height:Math.round(s.getBoundingClientRect().height)}});
 m.guestOverviewSections=gov.sections;m.guestOverviewHeightPx=gov.height;
 console.log(JSON.stringify(m,null,1));await b.close();
})();
