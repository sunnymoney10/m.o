const {approve}=require('./access.cjs');
// Phone journey, both sides: a host makes a weekend trip with a start and end date; a guest sees the
// date range, answers, and adds it to their calendar; then the host makes it one day again.
// Needs `npm run dev` running. Usage: npm run journeys:dates [-- <screenshot dir>]
const {chromium,devices}=require('playwright');
const B=process.env.JOURNEY_URL||'http://127.0.0.1:5173',O=process.argv[2]||require('node:os').tmpdir();
(async()=>{
 const b=await chromium.launch();let fails=0;const check=(ok,msg)=>{if(!ok){fails++;console.log('FAIL:',msg)}else console.log('ok:',msg)};
 const phone=async()=>{const c=await b.newContext({...devices['iPhone 14'],timezoneId:'America/New_York',acceptDownloads:true});const p=await c.newPage();p.on('pageerror',e=>{fails++;console.log('PAGEERROR',e.message)});p.on('dialog',d=>d.accept());return p};
 const meta=p=>p.locator('.meta-line').first().innerText();
 // Host
 const h=await phone();await h.goto(B);await h.waitForTimeout(2500);
 await h.getByRole('button',{name:'Start a plan'}).first().click();await h.getByRole('button',{name:'Trip'}).click();
 await h.getByLabel('Give it a name').fill('Atlanta weekend');const yn=h.getByLabel('Your name');if(await yn.count())await yn.fill('Ari');
 await h.getByLabel(/^When/).fill('2026-12-04T18:00');
 check(await h.getByLabel(/^Ends/).count()===0,'one-day by default: no end date field');
 await h.getByRole('button',{name:/More than one day/}).click();
 check(await h.getByLabel(/^Starts/).count()===1&&await h.getByLabel(/^Ends/).inputValue()==='2026-12-06T18:00','end date appears, filled two days later');
 await h.getByLabel(/^Ends/).fill('2026-12-06T12:00');
 await h.getByRole('combobox').fill('Raleigh, NC');await h.waitForTimeout(900);await h.getByRole('button',{name:'Use what I typed'}).click().catch(()=>{});
 const air=await h.getByRole('link',{name:/Search Airbnb/}).getAttribute('href'),hot=await h.getByRole('link',{name:/Search hotels/}).getAttribute('href');
 check(air.includes('airbnb.com/s/Raleigh')&&air.includes('checkin=2026-12-04&checkout=2026-12-06')&&hot.includes('booking.com')&&hot.includes('checkout=2026-12-06'),'trip form offers Airbnb and hotel searches for the area and dates');
 await h.screenshot({path:O+'/md1-form.png'});
 await h.getByRole('button',{name:/Create plan/}).click();await h.waitForURL(/plan=/);const url=h.url();
 const hostWhen=await meta(h);check(/Fri, Dec 4.*6:00 PM – Sun, Dec 6/.test(hostWhen),'host sees the range: '+hostWhen);
 await h.screenshot({path:O+'/md2-host.png'});
 // Host schedule: pick any day of the trip
 await h.getByText('More tools').click();await h.getByRole('button',{name:'Add to the schedule'}).click();await h.waitForTimeout(300);
 const days=await h.getByLabel('Day').locator('option').allInnerTexts();check(days.join('|')==='Fri, Dec 4|Sat, Dec 5|Sun, Dec 6','schedule offers every day of the trip: '+days.join(', '));
 check(await h.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)<=1,'schedule form fits the phone (no sideways scroll)');
 await h.getByLabel('What').fill('Brunch');await h.getByLabel('Day').selectOption({label:'Sun, Dec 6'});await h.getByLabel(/^Time/).fill('11:00');
 await h.screenshot({path:O+'/md-schedule-form.png'});
 await h.getByRole('button',{name:'Add to the plan'}).click();await h.waitForTimeout(1200);
 const sched=await h.locator('.live-panel').innerText();check(/Sunday, Dec 6[\s\S]*11:00 AM[\s\S]*Brunch/i.test(sched),'brunch shows under Sunday at 11:00 AM');
 // Guest
 const g=await phone();await g.goto(url);await g.waitForTimeout(2000);
 const guestWhen=await meta(g);check(/Fri, Dec 4.*– Sun, Dec 6/.test(guestWhen),'guest sees the range before answering: '+guestWhen);
 await g.screenshot({path:O+'/md3-guest.png'});
 check(await g.getByRole('link',{name:/Search Airbnb|Search hotels/}).count()===0,'guests don’t see the host’s stay search');
 await g.getByRole('button',{name:'Reply',exact:true}).first().click();await g.waitForTimeout(800);
 const nm=g.getByLabel(/Your name/).first();if(await nm.count())await nm.fill('Tess');
 await g.getByRole('button',{name:'I’m in'}).first().click();const send=g.getByRole('button',{name:'Send RSVP'});if(await send.count())await send.click();await g.waitForTimeout(1500);
 await approve(h,new URL(url).searchParams.get('plan'),'Tess');await g.reload();await g.waitForTimeout(800);await g.getByRole('tab',{name:'Overview'}).click();await g.waitForTimeout(500);const gs=await g.locator('.live-panel').innerText().catch(()=>'');check(/Sunday, Dec 6[\s\S]*Brunch/i.test(gs),'after answering, the guest sees brunch on Sunday');
 const [dl]=await Promise.all([g.waitForEvent('download'),g.getByRole('button',{name:'Add to calendar'}).first().click()]);
 const ics=require('node:fs').readFileSync(await dl.path(),'utf8');
 check(/DTSTART:20261204T230000Z/.test(ics)&&/DTEND:20261206T170000Z/.test(ics),'guest calendar event spans Fri evening to Sun noon');
 // Host makes it one day again; guest sees a single date
 await h.getByRole('button',{name:'Edit plan details'}).click();await h.getByRole('button',{name:'It’s just one day'}).click();
 await h.getByRole('button',{name:/Save/}).first().click();await h.waitForTimeout(1500);
 await g.reload();await g.waitForTimeout(2000);const after=await meta(g);check(!after.includes('–')&&/Dec 4/.test(after),'after the host’s change the guest sees one day: '+after);
 await b.close();console.log(fails?`${fails} problem(s)`:'All multi-day checks passed');process.exit(fails?1:0);
})();
