// Launch basics: browser protections on pages and API answers, and the m.o "page not found" screen on a tall
// and a small iPhone. Needs `npm run dev` (or a production preview via JOURNEY_URL). Part of npm run journeys:previews.
const {chromium,devices}=require('playwright');
const B=process.env.JOURNEY_URL||'http://127.0.0.1:5173';
(async()=>{let fails=0;const check=(ok,msg)=>{if(!ok){fails++;console.log('FAIL:',msg)}else console.log('ok:',msg)};
 const page=await fetch(B+'/'),api=await fetch(B+'/api/health');const csp=page.headers.get('content-security-policy')||'';
 check(/frame-ancestors 'none'/.test(csp)&&/object-src 'none'/.test(csp)&&/connect-src 'self'/.test(csp),'pages carry a content policy that stops framing and outside connections');
 check(page.headers.get('x-frame-options')==='DENY','pages can’t be shown inside another site');
 for(const [n,r] of [['page',page],['API',api]]){check(r.headers.get('x-content-type-options')==='nosniff',n+': nosniff');check(/max-age=\d+/.test(r.headers.get('strict-transport-security')||''),n+': HTTPS only');check(/camera=\(\)/.test(r.headers.get('permissions-policy')||''),n+': camera and microphone off')}
 const b=await chromium.launch();
 for(const d of ['iPhone 14 Pro Max','iPhone SE']){const p=await (await b.newContext({...devices[d]})).newPage();const bad=[];p.on('pageerror',e=>bad.push(e.message));
  await p.addInitScript(()=>document.addEventListener('securitypolicyviolation',e=>console.log('CSP-BLOCKED '+e.violatedDirective)));p.on('console',m=>{if(m.text().startsWith('CSP-BLOCKED')&&!/eval/.test(m.text()))bad.push(m.text())});
  const r=await p.goto(B+'/no-such-page');await p.waitForTimeout(1500);
  check(r.status()===404,d+': a wrong link answers 404');
  check((await p.locator('h1').innerText())==='We can’t find that page.','the m.o page explains it: '+d);
  check(await p.getByRole('link',{name:'Go to my plans'}).count()===1&&await p.getByRole('link',{name:'Go to the home page'}).count()===1,'it offers two ways back');
  check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),d+': fits the screen');
  await p.getByRole('link',{name:'Go to my plans'}).click();await p.waitForTimeout(1500);check(/view=plans/.test(p.url()),'“Go to my plans” opens the plans list');
  for(const [path,h] of [['/privacy','Privacy'],['/terms','Terms']]){const r2=await p.goto(B+path);await p.waitForTimeout(800);
   check(r2.status()===200&&(await p.locator('h1').innerText())===h,d+': '+path+' opens');check(await p.locator('a[href^="mailto:"]').count()===1,path+' shows a contact email');
   check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),d+': '+path+' fits the screen');if(d==='iPhone 14 Pro Max')await p.screenshot({path:require('node:os').tmpdir()+'/legal'+path.slice(1)+'.png',fullPage:true})}
  await p.goto(B+'/');await p.waitForTimeout(2000);
  check(await p.locator('.foot-links a[href="/privacy"]').count()===1&&await p.locator('.foot-links a[href="/terms"]').count()===1,d+': the home page footer links Privacy and Terms');
  check(!bad.length,d+': no page errors or blocked content '+bad.join(' | '))}
 await b.close();console.log(fails?`${fails} problem(s)`:'All site basics checks passed');process.exitCode=fails?1:0})();
