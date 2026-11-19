// Accessibility checks on a phone: every tappable thing is at least 44px tall (or wide, for icon buttons),
// and the main screens still fit at large text (no sideways scrolling). Needs `npm run dev` running.
// Usage: npm run a11y
const {chromium,devices}=require('playwright');
const B=process.env.JOURNEY_URL||'http://127.0.0.1:5173';
(async()=>{
 const b=await chromium.launch();let fails=0;
 const ctx=await b.newContext({...devices['iPhone 14']});const p=await ctx.newPage();
 await p.goto(B);await p.waitForTimeout(1200);
 const id=await p.evaluate(async()=>{const c=(path,method,body)=>fetch('/api/'+path,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined}).then(r=>r.json());const r=await c('plans','POST',{title:'Friendsgiving',name:'Ari',date:'2026-11-26T23:00:00.000Z',place:'12 Oak Ave',tasks:[{title:'Pie',category:'bring'},{title:'Ice',category:'bring'}]});await c(`plan/${r.id}/guests`,'POST',{names:['Tess','Jordan']});return r.id});
 const small=async label=>{const found=await p.evaluate(()=>[...document.querySelectorAll('button,a[href],select,input:not([type=hidden]),label.file-button,summary')].filter(e=>{const r=e.getBoundingClientRect();if(!r.width||!r.height)return false;if(e.closest('.sr-only'))return false;if(e.matches('input[type=checkbox]'))return false;return r.height<43.5}).map(e=>`${(e.innerText||e.getAttribute('aria-label')||e.tagName).trim().slice(0,30)} ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`));
  if(found.length){fails+=found.length;console.log(`SMALL TARGETS on ${label}:`,[...new Set(found)].join(' | '))}else console.log(`ok targets: ${label}`)};
 await p.goto(B+'/?plan='+id);await p.waitForTimeout(1200);await small('host overview');
 await p.getByRole('tab',{name:'People'}).click();await p.waitForTimeout(300);await small('host people');
 await p.getByRole('tab',{name:/Bring list/}).click();await p.waitForTimeout(300);await small('host bring list');
 // Nothing wider than the phone: host with More tools open (long links in the group message), then a guest.
 const wide=async label=>{const over=await p.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);if(over>1){fails++;console.log(`SIDEWAYS SCROLL on ${label}: ${over}px wider than the screen`)}else console.log(`ok width: ${label}`)};
 await p.getByRole('tab',{name:'Overview'}).click();await p.getByText('More tools').click();await p.waitForTimeout(400);await wide('host overview with More tools open');
 {const gp=await (await b.newContext({...devices['iPhone 14']})).newPage();await gp.goto(B+'/?plan='+id);await gp.waitForTimeout(1500);const over=await gp.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);if(over>1){fails++;console.log('SIDEWAYS SCROLL on guest view')}else console.log('ok width: guest view')}
 await p.goto(B+'/?view=me');await p.waitForTimeout(1000);await small('profile');
 // Large text: 150% root font size, then check nothing scrolls sideways.
 for(const [label,url] of [['home','/'],['plan',`/?plan=${id}`],['profile','/?view=me']]){
  await p.goto(B+url);await p.waitForTimeout(900);await p.addStyleTag({content:'html{font-size:150%} body{font-size:150%}'});await p.waitForTimeout(300);
  const over=await p.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  if(over>1){fails++;console.log(`LARGE TEXT overflow on ${label}: ${over}px wider than the screen`)}else console.log(`ok large text: ${label}`);
 }
 console.log(fails?`${fails} problem(s)`:'All accessibility checks passed');await b.close();process.exitCode=fails?1:0;
})();
