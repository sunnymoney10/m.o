const {personalLink,approve}=require('./access.cjs');
// Phone journey: the host searches for the venue instead of looking it up, and pastes an Airbnb link.
// Search results are stubbed here (the real ones come from OpenStreetMap). Needs `npm run dev` running.
// Usage: npm run journeys:places [-- <screenshot dir>]
const {chromium,devices}=require('playwright');
const B=process.env.JOURNEY_URL||'http://127.0.0.1:5173',O=process.argv[2]||require('node:os').tmpdir();
(async()=>{
 const b=await chromium.launch();let fails=0;const check=(ok,msg)=>{if(!ok){fails++;console.log('FAIL:',msg)}else console.log('ok:',msg)};
 const c=await b.newContext({...devices['iPhone 14'],timezoneId:'America/New_York'});const h=await c.newPage();h.on('pageerror',e=>{fails++;console.log('PAGEERROR',e.message)});
 let asked='';await h.route('**/api/places?**',r=>{asked=new URL(r.request().url()).searchParams.get('q');r.fulfill({json:{events:/circus/i.test(asked)?[{name:'UniverSoul Circus',date:'2026-12-05T00:00:00Z',venue:'Dorton Arena',address:'1025 Blue Ridge Rd, Raleigh, NC, 27607'}]:[],results:[{name:'Atlanta Civic Center',address:'395 Piedmont Ave NE, Atlanta, Georgia, 30308'},{name:'Atlanta Civic Center Station',address:'Atlanta, Georgia'}]}})});
 await h.goto(B);await h.waitForTimeout(2500);
 await h.evaluate(()=>fetch('/api/plans',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'Warm-up',name:'Ari'})}));
 await h.goto(B);await h.waitForTimeout(3000);
 await h.getByRole('button',{name:/new plan|start a plan|plan something/i}).first().click();await h.waitForTimeout(500);
 // Get-together: Airbnb and hotel buttons sit under the booking link box (in Add more details), even before Where is filled.
 await h.getByText('Add more details').click();
 check(await h.getByRole('link',{name:/Search Airbnb/}).first().getAttribute('href')==='https://www.airbnb.com/','get-together, no Where yet: Search Airbnb opens Airbnb');
 check(await h.getByRole('link',{name:/Search hotels/}).first().getAttribute('href')==='https://www.booking.com/','and Search hotels opens Booking.com');
 const trip=h.getByRole('button',{name:'Trip'});if(await trip.count())await trip.click();
 await h.getByLabel('Give it a name').fill('UniverSoul Circus');const yn=h.getByLabel('Your name');if(await yn.count())await yn.fill('Ari');
 const where=h.getByRole('combobox');await where.fill('civic center atlanta');await h.waitForTimeout(900);
 check(asked==='civic center atlanta','searches what the host typed');
 await h.screenshot({path:O+'/pl1-suggestions.png'});
 await h.getByRole('option',{name:/Atlanta Civic Center 395/}).click();
 check(await where.inputValue()==='Atlanta Civic Center, 395 Piedmont Ave NE, Atlanta, Georgia, 30308','picking fills the full address');
 await where.fill('https://www.airbnb.com/trips/v1/abc123');await h.waitForTimeout(300);
 check(await where.inputValue()===''&&await h.getByLabel(/Booking link/).inputValue()==='https://www.airbnb.com/trips/v1/abc123','an Airbnb link pasted in Where becomes the booking link');
 await where.fill('civic');await h.waitForTimeout(900);await where.press('Escape');await h.waitForTimeout(300);
 check(await h.getByRole('listbox').count()===0&&await where.isVisible(),'Escape closes the suggestions, not the form');
 await where.fill('Atlanta Civic Center');await h.waitForTimeout(900);await h.getByRole('button',{name:'Use what I typed'}).click();
 check(await where.inputValue()==='Atlanta Civic Center','typing your own text still works');
 await h.getByRole('button',{name:/create plan/i}).click();await h.waitForTimeout(2000);
 const there=h.locator('.getting-there');await there.scrollIntoViewIfNeeded().catch(()=>{});
 check(await h.getByRole('link',{name:/Open the Airbnb booking/}).count()>0,'plan shows Open the Airbnb booking');
 check(await h.getByRole('link',{name:/Open in Maps/}).count()>0,'plan shows Open in Maps');const atl=h.url();
 await h.screenshot({path:O+'/pl2-plan.png',fullPage:true});
 // Event search: a second plan from an event name; picking it fills Where and When, and the guest sees both.
 await h.goto(B);await h.waitForTimeout(3000);await h.getByRole('button',{name:'Start a plan'}).first().click();await h.waitForTimeout(400);
 const w2=h.getByRole('combobox');await w2.fill('universoul circus raleigh');await h.waitForTimeout(1100);
 check(await h.getByText('EVENTS').count()>0,'events show above places');await h.screenshot({path:O+'/pl4-events.png'});
 await h.getByRole('option',{name:/UniverSoul Circus/}).click();
 check(await w2.inputValue()==='Dorton Arena, 1025 Blue Ridge Rd, Raleigh, NC, 27607','picking the event fills the venue address');
 check(await h.getByLabel(/^When/).inputValue()==='2026-12-04T19:00','and the event’s date and time (local)');
 check(await h.getByLabel('Give it a name').inputValue()==='UniverSoul Circus','and the name, when empty');
 const yn2=h.getByLabel('Your name');if(await yn2.count())await yn2.fill('Ari');
 await h.getByRole('button',{name:/create plan/i}).click();await h.waitForTimeout(2000);const circus=h.url();
 const gc2=await b.newContext({...devices['iPhone 14'],timezoneId:'America/New_York'});const g2=await gc2.newPage();await g2.goto(circus);await g2.waitForTimeout(2000);
 check(/Sat, Dec 5|Fri, Dec 4/.test(await g2.locator('.meta-line').first().innerText()),'guest sees the event date');
 await g2.getByRole('button',{name:'Reply',exact:true}).first().click();await g2.waitForTimeout(600);const n3=g2.getByLabel(/Your name/).first();if(await n3.count())await n3.fill('Jordan');
 await g2.getByRole('button',{name:'I’m in'}).first().click();const s3=g2.getByRole('button',{name:'Send RSVP'});if(await s3.count())await s3.click();await g2.waitForTimeout(1500);
 await approve(h,new URL(circus).searchParams.get('plan'),'Jordan');await g2.reload();await g2.waitForTimeout(800);
 check((await g2.locator('body').innerText()).includes('Dorton Arena'),'after answering, the guest sees the venue address');
 // Guest side: the address and booking stay hidden until they answer, then both buttons appear.
 const gc=await b.newContext({...devices['iPhone 14']});const g=await gc.newPage();g.on('pageerror',e=>{fails++;console.log('PAGEERROR',e.message)});
 await g.goto(atl);await g.waitForTimeout(2000);
 check(await g.getByRole('link',{name:/Open the Airbnb booking/}).count()===0&&!(await g.locator('body').innerText()).includes('airbnb.com'),'guest who hasn’t answered sees no booking link');
 await g.getByRole('button',{name:'Reply',exact:true}).first().click();await g.waitForTimeout(800);
 const nm=g.getByLabel(/Your name/).first();if(await nm.count())await nm.fill('Tess');
 await g.getByRole('button',{name:'I’m in'}).first().click();const send=g.getByRole('button',{name:'Send RSVP'});if(await send.count())await send.click();await g.waitForTimeout(1500);
 await approve(h,new URL(atl).searchParams.get('plan'),'Tess');await g.reload();await g.waitForTimeout(800);await g.getByRole('tab',{name:'Overview'}).click().catch(()=>{});await g.waitForTimeout(500);
 check(await g.getByRole('link',{name:/Open the Airbnb booking/}).count()>0&&await g.getByRole('link',{name:/Open in Maps/}).count()>0,'after saying they’re in, the guest gets Open in Maps and Open the Airbnb booking');
 await g.screenshot({path:O+'/pl3-guest.png',fullPage:true});
 await b.close();console.log(fails?`${fails} problem(s)`:'All place checks passed');process.exit(fails?1:0);
})();
