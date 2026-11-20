const {personalLink,approve}=require('./access.cjs');
// Guest view, as a real guest gets it: a trip from a personal text link, on small and regular iPhones.
// Checks the page never needs zooming out (including a Safari-like picture size), that host-only tools stay hidden,
// and that trips talk about things to handle, not things to bring. Needs `npm run dev` running.
// Usage: npm run journeys:guest [-- <screenshot dir>]
const {chromium,devices}=require('playwright');
const B=process.env.JOURNEY_URL||'http://127.0.0.1:5173',O=process.argv[2]||require('node:os').tmpdir();
(async()=>{
 const b=await chromium.launch();let fails=0;const check=(ok,msg)=>{if(!ok){fails++;console.log('FAIL:',msg)}else console.log('ok:',msg)};
 // Safari can size a picture to its drawn width (400) before shrinking it; force that here, since this test runs Chrome.
 const safariLike='svg.scene{width:400px!important}';
 const fits=async(p,label)=>{await p.addStyleTag({content:safariLike});await p.waitForTimeout(200);const over=await p.evaluate(()=>{document.documentElement.style.overflowX='visible';document.body.style.overflowX='visible';const o=document.documentElement.scrollWidth-window.innerWidth;document.documentElement.style.overflowX='';document.body.style.overflowX='';return o});check(over<=1,`${label}: fits the screen (${over>1?over+'px too wide':'no zooming needed'})`)};
 for(const dev of ['iPhone SE','iPhone 14','iPhone 14 Pro Max']){
  const hc=await b.newContext({...devices[dev]});const h=await hc.newPage();await h.goto(B);await h.waitForTimeout(1500);
  const id=await h.evaluate(async()=>{const c=(u,m,bd)=>fetch('/api/'+u,{method:m,headers:{'Content-Type':'application/json'},body:bd?JSON.stringify(bd):undefined}).then(r=>r.json());const r=await c('plans','POST',{title:'UniverSoul Circus',name:'Queen Valesha',kind:'trip',date:'2026-11-26T00:00:00Z',place:'Dorton Arena, Raleigh',tasks:[{title:'Buy the tickets by Nov 20',category:'todo'}]});await c('plan/'+r.id+'/guests','POST',{names:['Kofi','Ama']});return r.id});
  // A vote the host has made final (this once picked up the address line's side-by-side style and ran off screen).
  await h.evaluate(async id=>{const c=(u,m,bd)=>fetch('/api/'+u,{method:m,headers:{'Content-Type':'application/json'},body:bd?JSON.stringify(bd):undefined}).then(r=>r.json());await c('plan/'+id+'/polls','POST',{question:'Concessions',kind:'general',options:['Popcorn','Cotton candy']});const d=await c('plan/'+id);const poll=d.polls[0];await c('plan/'+id+'/polls/'+poll.id+'/decide','POST',{optionId:poll.options[0].id})},id);
  const gid=await h.evaluate(async id=>(await (await fetch('/api/plan/'+id)).json()).guests.find(g=>g.name==='Kofi').id,id);
  const g=await (await b.newContext({...devices[dev]})).newPage();g.on('pageerror',e=>{fails++;console.log('PAGEERROR',e.message)});
  await g.goto(await personalLink(h,id,'Kofi'));await g.waitForTimeout(2500);
  await fits(g,dev+' invite');
  check(await g.getByRole('button',{name:'Copy invite link'}).count()===0,dev+' guest has no Copy invite link before answering');
  check((await g.locator('.invite-card').innerText()).includes('pick something to handle'),dev+' trip invite talks about things to handle');
  await g.screenshot({path:`${O}/gv-${dev}-1.png`});
  await g.getByRole('button',{name:'I’m in'}).first().click();await g.waitForTimeout(2000);
  for(const t of ['Overview','People','To-do list']){try{await g.getByRole('tab',{name:new RegExp(t)}).click({timeout:5000});await g.waitForTimeout(500);await fits(g,`${dev} after answering, ${t}`)}catch{check(false,`${dev}: the ${t} tab can't be tapped (pushed off the screen)`)}}
  await g.getByRole('tab',{name:'Overview'}).click();await g.waitForTimeout(300);
  {const r=await g.evaluate(()=>{const e=document.querySelector('.poll');if(!e)return null;const b=e.getBoundingClientRect();return {right:b.right,w:window.innerWidth,display:getComputedStyle(e).display}});check(!!r&&r.right<=r.w+1&&r.display==='block',dev+' final vote card fits and stacks ('+JSON.stringify(r)+')')}
  check(await g.getByRole('button',{name:'Copy invite link'}).count()===0,dev+' guest has no Copy invite link after answering');
  check(await g.getByRole('button',{name:'Add to calendar'}).count()===1,dev+' Add to calendar shows once');
  check(!(await g.locator('body').innerText()).includes('something to bring'),dev+' no "bring" wording on a trip');
  await g.screenshot({path:`${O}/gv-${dev}-2.png`,fullPage:true});
  // Host still has the link to share
  await h.goto(`${B}/?plan=${id}`);await h.waitForTimeout(1500);check(await h.getByRole('button',{name:'Copy invite link'}).count()===1,dev+' host still has Copy invite link');await h.getByText('More tools').click();await h.waitForTimeout(300);{const r=await h.evaluate(()=>{const e=document.querySelector('.poll');const b=e.getBoundingClientRect();return b.right<=window.innerWidth+1});check(r,dev+' host final vote card fits')}await fits(h,dev+' host overview');
 }
 // A new trip starts with no placeholder jobs, and its list talks about jobs, not bringing.
 {const hc=await b.newContext({...devices['iPhone 14']});const h=await hc.newPage();await h.goto(B);await h.waitForTimeout(1500);
  // A get-together (like a skate day) starts with an empty bring list: m.o never guesses items (it once filled in Thanksgiving dishes).
  await h.getByRole('button',{name:'Start a plan'}).first().click();await h.getByText('Add more details').click();
  {const bring=h.getByLabel(/Things to bring/);check(await bring.inputValue()==='','new get-together has no pre-filled items');
   check(/Things one person can bring/.test(await bring.getAttribute('placeholder')),'the bring box shows examples as grey hints only');
   await bring.fill('Skates');await h.getByRole('button',{name:'Trip'}).click();check(await h.getByLabel(/Jobs to hand out/).inputValue()==='Skates','switching plan type keeps what you typed');
   await h.getByRole('button',{name:'Get-together'}).click();await h.getByLabel(/Things to bring/).fill('');}
  await h.getByRole('button',{name:'Trip'}).click();
  const jobs=h.getByLabel(/Jobs to hand out/);check(await jobs.inputValue()==='','new trip has no placeholder jobs');
  check(/Drive from Wilson/.test(await jobs.getAttribute('placeholder')),'the jobs box shows specific examples');
  await h.getByLabel('Give it a name').fill('Beach weekend');const yn=h.getByLabel('Your name');if(await yn.count()&&await yn.isVisible())await yn.fill('Ari');
  await h.getByRole('button',{name:/Create plan/}).click();await h.waitForTimeout(1800);await h.getByRole('tab',{name:/To-do list/}).click();await h.waitForTimeout(400);
  const t=await h.locator('body').innerText();check(t.includes('No jobs yet')&&t.includes('Start a vote'),'empty trip list explains jobs and points decisions to votes');
  check(await h.locator('#item-kind').inputValue()==='todo'&&!t.includes('bringing'),'trip list adds jobs by default and never says bringing');
  await h.screenshot({path:`${O}/gv-trip-list.png`,fullPage:true});}
 await b.close();console.log(fails?`${fails} problem(s)`:'All guest-view checks passed');process.exit(fails?1:0);
})();
