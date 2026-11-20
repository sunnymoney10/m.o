// Phone journey: the Plans screen lists plans by date (soonest first, no date next, past last), for the host and
// for a guest who answered. Tall iPhone. Needs `npm run dev`. Usage: npm run journeys:order
const {chromium,devices}=require('playwright');
const B=process.env.JOURNEY_URL||'http://127.0.0.1:5173',O=process.argv[2]||require('node:os').tmpdir();
(async()=>{
 const b=await chromium.launch();let fails=0;const check=(ok,msg)=>{if(!ok){fails++;console.log('FAIL:',msg)}else console.log('ok:',msg)};
 const phone=async()=>{const c=await b.newContext({...devices['iPhone 14 Pro Max']});const p=await c.newPage();p.on('pageerror',e=>{fails++;console.log('PAGEERROR',e.message)});return p};
 const day=n=>new Date(Date.now()+n*86400e3).toISOString();
 const h=await phone();await h.goto(B);await h.waitForTimeout(2500);
 // Made in a jumbled order, like the owner's list.
 const ids=await h.evaluate(async list=>{const out=[];for(const [title,date] of list)out.push((await (await fetch('/api/plans',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title,name:'Ari',date})})).json()).id);return out},
  [['Circus',day(5)],['Mom’s birthday',day(1)],['Someday hike',''],['Skate day',day(15)],['Last week’s dinner',day(-7)]]);
 const expected=['Mom’s birthday','Circus','Skate day','Someday hike','Last week’s dinner'];
 const titles=p=>p.locator('.plan-card strong').allInnerTexts();
 await h.goto(B+'/?view=plans');await h.waitForTimeout(2500);
 const hostList=(await titles(h)).filter(t=>expected.includes(t));check(JSON.stringify(hostList)===JSON.stringify(expected),'host’s Plans in date order: '+hostList.join(' → '));
 await h.screenshot({path:O+'/po-host-plans.png'});
 // A guest answers each from the group link; their Plans list is in the same order.
 const g=await phone();await g.goto(B);await g.waitForTimeout(1500);
 await g.evaluate(async ids=>{for(const id of ids)await fetch(`/api/plan/${id}/rsvp`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Tess',status:'in'})})},ids);
 await g.goto(B+'/?view=plans');await g.waitForTimeout(2500);
 const guestList=(await titles(g)).filter(t=>expected.includes(t));check(JSON.stringify(guestList)===JSON.stringify(expected),'guest’s Plans in date order: '+guestList.join(' → '));
 check(await g.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'fits the screen');
 await h.evaluate(async ids=>{for(const id of ids)await fetch('/api/plan/'+id,{method:'DELETE'})},ids);
 console.log(fails?`${fails} problem(s)`:'All plan order checks passed');await b.close();process.exitCode=fails?1:0;
})();
