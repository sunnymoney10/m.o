// Fast tapping between Home, Plans and You must never leave the app stuck or on the wrong screen,
// and must not pile up dozens of Back steps. Needs `npm run dev` running. Usage: npm run journeys:tabs
const {chromium,devices}=require('playwright');
const B=process.env.JOURNEY_URL||'http://127.0.0.1:5173';
(async()=>{
 const b=await chromium.launch();let fails=0;const check=(ok,msg)=>{if(!ok){fails++;console.log('FAIL:',msg)}else console.log('ok:',msg)};
 const c=await b.newContext({...devices['iPhone 14']});const p=await c.newPage();p.on('pageerror',e=>{fails++;console.log('PAGEERROR',e.message)});
 // Slow the server down so replies arrive late and out of order, like a weak phone signal.
 await p.route('**/api/**',async r=>{await new Promise(x=>setTimeout(x,150+Math.random()*450));r.continue()});
 await p.goto(B);await p.waitForTimeout(2500);const start=await p.evaluate(()=>history.length);
 const tabs=['Home','Plans','You'],nav=p.getByRole('navigation',{name:'Main'});
 for(let i=0;i<30;i++)await nav.getByRole('button',{name:tabs[i%3],exact:true}).click({delay:0,noWaitAfter:true});
 await nav.getByRole('button',{name:'Plans',exact:true}).click();await p.waitForTimeout(2500);
 check(await nav.getByRole('button',{name:'Plans',exact:true}).getAttribute('aria-current')==='page','after 30 fast taps, Plans is the selected tab');
 check(new URL(p.url()).search==='?view=plans','and the address matches');
 const grew=await p.evaluate(()=>history.length)-start;check(grew<=2,`Back history didn't pile up (${grew} new steps)`);
 await nav.getByRole('button',{name:'You',exact:true}).click();await p.waitForTimeout(1500);check(await nav.getByRole('button',{name:'You',exact:true}).getAttribute('aria-current')==='page','one more tap still responds');
 const ta=await p.evaluate(()=>getComputedStyle(document.documentElement).touchAction);check(ta==='manipulation','double-tap zoom is off, so fast taps aren\'t read as zoom');
 await b.close();console.log(fails?`${fails} problem(s)`:'All fast-tab checks passed');process.exit(fails?1:0);
})();
