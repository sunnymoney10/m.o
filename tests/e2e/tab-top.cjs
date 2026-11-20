// Phone journey: scroll to the bottom of one tab, tap another, and the new tab opens at its top (just under the
// tab bar), for the host and for a guest who answered. Near the top already? The screen doesn't jump. Tall iPhone.
const {chromium,devices}=require('playwright');
const B=process.env.JOURNEY_URL||'http://127.0.0.1:5173';
(async()=>{
 const b=await chromium.launch();let fails=0;const check=(ok,msg)=>{if(!ok){fails++;console.log('FAIL:',msg)}else console.log('ok:',msg)};
 const phone=async()=>{const c=await b.newContext({...devices['iPhone 14 Pro Max']});const p=await c.newPage();p.on('pageerror',e=>{fails++;console.log('PAGEERROR',e.message)});return p};
 const where=p=>p.evaluate(()=>{const bar=document.querySelector('.plan-tabs').getBoundingClientRect(),next=document.querySelector('.plan-tabs').nextElementSibling.getBoundingClientRect();return {y:scrollY,bar:Math.round(bar.bottom),content:Math.round(next.top)}});
 const fromBottom=async(p,tab,label)=>{await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await p.waitForTimeout(300);await p.getByRole('tab',{name:tab}).click();await p.waitForTimeout(500);
  const w=await where(p);check(w.content>=w.bar&&w.content-w.bar<60,`${label}: ${tab} opens at its top, right under the tab bar (${JSON.stringify(w)})`)};
 const h=await phone();await h.goto(B);await h.waitForTimeout(2500);
 const id=await h.evaluate(async()=>{const r=await (await fetch('/api/plans',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'Tab test',name:'Ari',date:new Date(Date.now()+86400e3).toISOString(),place:'1 Main St',tasks:[{title:'Chips',category:'bring'},{title:'Ice',category:'bring'}]})})).json();
  await fetch(`/api/plan/${r.id}/guests`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({names:['Ama','Bo','Cy','Di','Ed','Flo']})});return r.id});
 await h.goto(B+'/?plan='+id);await h.waitForTimeout(2500);
 await fromBottom(h,'People','host');await fromBottom(h,/Bring list/,'host');await fromBottom(h,'Overview','host');
 await h.evaluate(()=>window.scrollTo(0,0));await h.waitForTimeout(200);await h.getByRole('tab',{name:'People'}).click();await h.waitForTimeout(400);check((await where(h)).y===0,'host near the top: the screen doesn’t jump');
 const g=await phone();await g.goto(B+'/?plan='+id);await g.waitForTimeout(2000);
 await g.evaluate(async id=>fetch(`/api/plan/${id}/rsvp`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Tess',status:'in'})}),id);await g.reload();await g.waitForTimeout(2500);
 await fromBottom(g,'People','guest');await fromBottom(g,/Bring list/,'guest');
 await h.evaluate(async id=>fetch('/api/plan/'+id,{method:'DELETE'}),id);
 console.log(fails?`${fails} problem(s)`:'All tab-top checks passed');await b.close();process.exitCode=fails?1:0;
})();
