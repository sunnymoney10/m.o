// Phone journey: the host searches for the venue instead of looking it up, and pastes an Airbnb link.
// Search results are stubbed here (the real ones come from OpenStreetMap). Needs `npm run dev` running.
// Usage: npm run journeys:places [-- <screenshot dir>]
const {chromium,devices}=require('playwright');
const B=process.env.JOURNEY_URL||'http://127.0.0.1:5173',O=process.argv[2]||require('node:os').tmpdir();
(async()=>{
 const b=await chromium.launch();let fails=0;const check=(ok,msg)=>{if(!ok){fails++;console.log('FAIL:',msg)}else console.log('ok:',msg)};
 const c=await b.newContext({...devices['iPhone 14']});const h=await c.newPage();h.on('pageerror',e=>{fails++;console.log('PAGEERROR',e.message)});
 let asked='';await h.route('**/api/places?**',r=>{asked=new URL(r.request().url()).searchParams.get('q');r.fulfill({json:{results:[{name:'Atlanta Civic Center',address:'395 Piedmont Ave NE, Atlanta, Georgia, 30308'},{name:'Atlanta Civic Center Station',address:'Atlanta, Georgia'}]}})});
 await h.goto(B);await h.waitForTimeout(2500);
 await h.evaluate(()=>fetch('/api/plans',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'Warm-up',name:'Ari'})}));
 await h.goto(B);await h.waitForTimeout(1500);
 await h.getByRole('button',{name:/new plan|start a plan|plan something/i}).first().click();await h.waitForTimeout(500);
 const trip=h.getByRole('button',{name:'Trip'});if(await trip.count())await trip.click();
 await h.getByLabel('Give it a name').fill('UniverSoul Circus');const yn=h.getByLabel('Your name');if(await yn.count())await yn.fill('Ari');
 const where=h.getByRole('combobox');await where.fill('civic center atlanta');await h.waitForTimeout(900);
 check(asked==='civic center atlanta','searches what the host typed');
 await h.screenshot({path:O+'/pl1-suggestions.png'});
 await h.getByRole('option',{name:/Atlanta Civic Center 395/}).click();
 check(await where.inputValue()==='Atlanta Civic Center, 395 Piedmont Ave NE, Atlanta, Georgia, 30308','picking fills the full address');
 await where.fill('https://www.airbnb.com/trips/v1/abc123');await h.waitForTimeout(300);
 check(await where.inputValue()===''&&await h.getByLabel(/Booking link/).inputValue()==='https://www.airbnb.com/trips/v1/abc123','an Airbnb link pasted in Where becomes the booking link');
 await where.fill('Atlanta Civic Center');await h.waitForTimeout(900);await h.getByRole('button',{name:'Use what I typed'}).click();
 check(await where.inputValue()==='Atlanta Civic Center','typing your own text still works');
 await h.getByRole('button',{name:/create plan/i}).click();await h.waitForTimeout(2000);
 const there=h.locator('.getting-there');await there.scrollIntoViewIfNeeded().catch(()=>{});
 check(await h.getByRole('link',{name:/Open the Airbnb booking/}).count()>0,'plan shows Open the Airbnb booking');
 check(await h.getByRole('link',{name:/Open in Maps/}).count()>0,'plan shows Open in Maps');
 await h.screenshot({path:O+'/pl2-plan.png',fullPage:true});
 await b.close();console.log(fails?`${fails} problem(s)`:'All place checks passed');process.exit(fails?1:0);
})();
