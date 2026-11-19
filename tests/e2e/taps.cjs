// Tap efficiency: counts taps (and boxes typed in) for every main task, host and guest, on an iPhone-sized screen.
// Scrolling isn't counted. Typing a box counts as one "box", not a tap. Needs `npm run dev` running.
// Usage: npm run ux:taps [-- <screenshot dir>]
const {chromium,devices}=require('playwright');
const B=process.env.JOURNEY_URL||'http://127.0.0.1:5173',O=process.argv[2]||require('node:os').tmpdir();
(async()=>{
 const b=await chromium.launch();const rows=[];let fails=0;
 const phone=async()=>{const c=await b.newContext({...devices['iPhone 14'],timezoneId:'America/New_York',permissions:['clipboard-read','clipboard-write'],acceptDownloads:true});
  await c.route('**/api/places?**',r=>r.fulfill({json:{results:[{name:'Oak Hall',address:'12 Oak Ave, Raleigh, North Carolina'}],events:[]}}));
  const p=await c.newPage();p.on('pageerror',e=>{fails++;console.log('PAGEERROR',e.message)});p.on('dialog',d=>d.accept());return p};
 let taps=0,boxes=0;const tap=async(l)=>{taps++;await l.click();await l.page().waitForTimeout(350)};const type=async(l,v)=>{boxes++;await l.fill(v)};
 const task=async(who,name,fn)=>{taps=0;boxes=0;try{await fn();rows.push({who,task:name,taps,boxes})}catch(e){fails++;rows.push({who,task:name,taps:'FAILED',boxes:''});console.log('FAIL',name,e.message.split('\n')[0]);for(const p of [h,g,s2].filter(Boolean)){try{console.log('  buttons:',(await p.getByRole('button').allInnerTexts()).filter(t=>t.trim()).slice(0,40).join(' | '))}catch{}}}};
 let g,s2;
 const h=await phone();await h.goto(B);await h.waitForTimeout(2500);
 // ---------- Host ----------
 await task('Host','Create a plan (name, where, when)',async()=>{
  await tap(h.getByRole('button',{name:'Start a plan'}).first());
  await type(h.getByLabel('Give it a name'),'Friendsgiving');const yn=h.getByLabel('Your name');if(await yn.count()&&await yn.isVisible())await type(yn,'Ari');
  await type(h.getByRole('combobox'),'oak hall');await h.waitForTimeout(900);await tap(h.getByRole('option').first());
  await type(h.getByLabel(/^When/),'2026-11-26T18:00');
  await tap(h.getByRole('button',{name:/Create plan/}));await h.waitForTimeout(1500)});
 const url=h.url(),id=new URL(url).searchParams.get('plan');
 await task('Host','Add 3 guests (pasted list)',async()=>{
  await tap(h.getByRole('tab',{name:'People'}));await tap(h.getByRole('button',{name:/Add names to the guest list/}));
  await type(h.getByLabel(/Your list|Who did you invite/),'Tess 215-555-0134\nJordan 267-555-0199\nSam');
  await tap(h.getByRole('button',{name:/^Add 3 people$/}));await h.waitForTimeout(1200)});
 await task('Host','Add 1 guest with iPhone AutoFill Contact',async()=>{
  await tap(h.getByRole('button',{name:/Add names to the guest list/}));const one=h.locator('.one-guest');
  await tap(one.getByLabel('Name'));/* AutoFill Contact: tap the bar, tap the contact */taps+=2;await one.getByLabel('Name').fill('Rio');await one.getByLabel(/^Phone/).fill('215-555-0111');
  await tap(one.getByRole('button',{name:'Add to the list below'}));await tap(h.getByRole('button',{name:/^Add to guest list$|^Add 1 people$/}));await h.waitForTimeout(1200)});
 await h.goto(url);await h.waitForTimeout(1800);
 await task('Host','Send the first invite (from the plan page)',async()=>{
  await tap(h.getByRole('tab',{name:'People'}));await tap(h.getByRole('button',{name:/Send invites/}).first());
  await h.evaluate(()=>document.querySelectorAll('.send-invites a').forEach(a=>a.addEventListener('click',e=>e.preventDefault())));
  await tap(h.locator('.send-invites a.primary'));taps++/* Send in Messages */;await h.waitForTimeout(300)});
 await task('Host','Send each next invite',async()=>{await tap(h.locator('.send-invites a.primary'));taps++/* Send in Messages */});
 const personal=decodeURIComponent(await h.locator('.send-invites a.primary').getAttribute('href')).match(/https?:\/\/\S+/)[0];
 await task('Host','Record an answer for a friend who texted back',async()=>{
  await h.goto(url);await h.waitForTimeout(1500);taps=0;
  await tap(h.getByRole('tab',{name:'People'}));await tap(h.locator('.guest-block').filter({has:h.locator('strong',{hasText:/^Jordan$/})}).getByRole('button',{name:'Update answer'}));
  await tap(h.getByRole('button',{name:'Going'}).last());await tap(h.getByRole('button',{name:'Save what they told you'}));await h.waitForTimeout(1000)});
 await task('Host','Change the date',async()=>{
  await tap(h.getByRole('button',{name:'Edit plan details'}));await type(h.getByLabel(/^When|^Starts/),'2026-11-27T18:00');await tap(h.getByRole('button',{name:'Save changes'}));await h.waitForTimeout(1200)});
 // ---------- Guest ----------
 g=await phone();
 await task('Guest','Personal link: say I’m in',async()=>{await g.goto(personal);await g.waitForTimeout(2000);await tap(g.getByRole('button',{name:'I’m in'}).first());await g.waitForTimeout(1200)});
 await task('Guest','…then pick something to bring',async()=>{await tap(g.getByRole('button',{name:'I can bring this'}).first());await g.waitForTimeout(800)});
 await task('Guest','Add to calendar',async()=>{await tap(g.getByRole('tab',{name:'Overview'}));await Promise.all([g.waitForEvent('download'),tap(g.getByRole('button',{name:'Add to calendar'}).first())])});
 await task('Guest','Open the address in Maps',async()=>{const l=g.getByRole('link',{name:/Open in Maps/}).first();taps++;if(!await l.count())throw new Error('no maps link')});
 await task('Guest','Change answer to can’t go',async()=>{
  await tap(g.getByRole('tab',{name:'People'}));await tap(g.getByRole('button',{name:'Change',exact:true}));await tap(g.getByRole('button',{name:/Can’t make it|Can’t go/}).first());
  const s=g.getByRole('button',{name:/Send RSVP|Save/});if(await s.count())await tap(s.first());await g.waitForTimeout(1000)});
 s2=await phone();
 await task('Guest','Group-chat link: answer (no personal link)',async()=>{await s2.goto(url);await s2.waitForTimeout(2000);console.log('  guest list:',(await h.evaluate(async id=>(await (await fetch('/api/plan/'+id)).json()).guests.map(x=>x.name+':'+x.status).join(', '),id)));
  const chip=s2.getByRole('button',{name:'Rio',exact:true});if(await chip.count())await tap(chip);else{const n=s2.getByLabel(/Your name/).first();await type(n,'Sam')}
  await tap(s2.getByRole('button',{name:'I’m in'}).first());const s=s2.getByRole('button',{name:'Send RSVP'});if(await s.count()&&await s.isVisible())await tap(s);await s2.waitForTimeout(1200)});
 await task('Host','Delete the plan',async()=>{await h.goto(url);await h.waitForTimeout(1500);taps=0;await tap(h.getByRole('button',{name:'Edit plan details'}));await tap(h.getByRole('button',{name:'Delete this plan'}));taps++/* confirm */;await h.waitForTimeout(1200)});
 console.table(rows);require('fs').writeFileSync(O+'/taps.json',JSON.stringify(rows,null,1));
 await b.close();process.exit(fails?1:0);
})();
