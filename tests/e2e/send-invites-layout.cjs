// Send invites layout on three iPhone sizes: name, phone box and Send/Again have room and don't overlap; link actions sit on
// their own line; the message preview wraps inside its box. (Link actions once stretched the picture column.) Needs `npm run dev`.
const {chromium,devices}=require('playwright');const B=process.env.JOURNEY_URL||'http://127.0.0.1:5173',O=process.argv[2]||require('node:os').tmpdir();
(async()=>{const b=await chromium.launch();let fails=0;const check=(ok,m)=>{if(!ok)fails++;console.log(ok?'ok:':'FAIL:',m)};
for(const dev of ['iPhone 14 Pro Max','iPhone 14','iPhone SE']){
const c=await b.newContext({...devices[dev]});const h=await c.newPage();h.on('dialog',d=>d.accept());await h.goto(B);await h.waitForTimeout(2500);
const id=await h.evaluate(async()=>{const c=(u,m,bd)=>fetch('/api/'+u,{method:m,headers:{'Content-Type':'application/json'},body:bd?JSON.stringify(bd):undefined}).then(r=>r.json());const r=await c('plans','POST',{title:'Skate day',name:'Ari',date:'2026-11-29T19:00:00Z',place:'Roller rink',tasks:[]});await c('plan/'+r.id+'/guests','POST',{names:['Mom','Khama','Selie']});return r.id});
await h.goto(B+'/?plan='+id);await h.waitForTimeout(2500);await h.getByRole('tab',{name:'People'}).click();await h.waitForTimeout(300);
await h.getByRole('button',{name:'Send invites',exact:true}).click();await h.waitForTimeout(600);
const rows=h.locator('.invite-rows li');
for(const [i,n] of [[0,'215-555-0134'],[1,'+1 (267) 555 0199']])await rows.nth(i).locator('input').fill(n);
// Prepare and send to Mom and Khama, like the owner did; Selie only prepared.
for(const n of ['Mom','Khama']){await h.getByRole('button',{name:'Prepare invite for '+n}).click();await h.waitForTimeout(800);await h.evaluate(()=>document.querySelectorAll('.send-invites a').forEach(a=>a.addEventListener('click',e=>e.preventDefault())));await h.locator('.send-invites a.primary').click();await h.waitForTimeout(500)}
await h.getByRole('button',{name:'Prepare invite for Selie'}).click();await h.waitForTimeout(800);
const m=await h.evaluate(()=>[...document.querySelectorAll('.invite-rows li')].map(li=>{const r=li.getBoundingClientRect(),who=li.querySelector('.invite-who').getBoundingClientRect(),inp=li.querySelector('input').getBoundingClientRect(),a=li.querySelector('a.outline-button')?.getBoundingClientRect(),av=li.querySelector('.mini-avatar').getBoundingClientRect();return {name:li.querySelector('strong').textContent,who:Math.round(who.width),input:Math.round(inp.width),avatar:Math.round(av.width),overlap:!!a&&a.left<who.right-1&&a.top<who.bottom&&a.bottom>who.top,inside:who.right<=r.right+1}}));
console.log(dev,JSON.stringify(m));
for(const r of m){check(r.who>=150,`${dev} ${r.name}: name and phone box have room (${r.who}px)`);check(r.input>=140,`${dev} ${r.name}: phone box readable (${r.input}px)`);check(!r.overlap,`${dev} ${r.name}: Send/Again doesn't cover the name or phone`);check(r.avatar<=48,`${dev} ${r.name}: picture stays small`)}
check(await h.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),dev+': fits the screen');
check(await h.evaluate(()=>{const p=document.querySelector('.send-invites .preview p');return p.scrollWidth<=p.clientWidth+1&&p.getBoundingClientRect().right<=document.querySelector('.send-invites .preview').getBoundingClientRect().right+1}),dev+': preview message wraps inside its box');
await h.locator('.send-invites').screenshot({path:`${O}/send-${dev.replace(/ /g,'')}.png`});
await h.evaluate(async id=>fetch('/api/plan/'+id,{method:'DELETE'}),id);await c.close()}
await b.close();console.log(fails?fails+' FAILED':'ALL PASSED');process.exitCode=fails?1:0})();
