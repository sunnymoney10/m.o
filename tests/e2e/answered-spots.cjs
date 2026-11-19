// Phone journey: answered spots are protected. Once a guest has answered, tapping their name on another phone
// doesn't take over their answer. Their personal link (which only the host can send) moves it to a new phone.
// Host and guests on a tall iPhone. Needs `npm run dev` running. Usage: npm run journeys:spots [-- <screenshot dir>]
const {chromium,devices}=require('playwright');
const B=process.env.JOURNEY_URL||'http://127.0.0.1:5173',O=process.argv[2]||require('node:os').tmpdir();
(async()=>{
 const b=await chromium.launch();let fails=0;const check=(ok,msg)=>{if(!ok){fails++;console.log('FAIL:',msg)}else console.log('ok:',msg)};
 const phone=async()=>{const c=await b.newContext({...devices['iPhone 14 Pro Max'],timezoneId:'America/New_York'});const p=await c.newPage();p.on('pageerror',e=>{fails++;console.log('PAGEERROR',e.message)});p.on('dialog',d=>d.accept());return p};
 const toast=async p=>{try{return await p.locator('.toast').first().innerText({timeout:3000})}catch{return ''}};
 const fits=async(p,label)=>check(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),label+': fits the screen');
 // Host makes the plan and lists Kofi and Ama.
 const h=await phone();await h.goto(B);await h.waitForTimeout(2500);
 const id=await h.evaluate(async()=>{const c=(u,m,bd)=>fetch('/api/'+u,{method:m,headers:{'Content-Type':'application/json'},body:bd?JSON.stringify(bd):undefined}).then(r=>r.json());const r=await c('plans','POST',{title:'Friendsgiving',name:'Ari',date:'2026-11-26T23:00:00.000Z',place:'12 Oak Ave',tasks:[{title:'Pie',category:'bring'}]});await c('plan/'+r.id+'/guests','POST',{names:['Kofi','Ama']});return r.id});
 await h.goto(B+'/?plan='+id);await h.waitForTimeout(2500);
 await h.getByRole('tab',{name:'People'}).click();await h.waitForTimeout(300);await h.getByRole('button',{name:'Send invites',exact:true}).click();await h.waitForTimeout(600);
 const href=await h.locator('.invite-rows li',{hasText:'Kofi'}).locator('a').getAttribute('href');
 const link=decodeURIComponent(href.split('body=')[1]).match(/https?:\/\/\S+/)[0];
 check(/\/i\/[A-Za-z0-9_-]{44}$/.test(link),'Kofi’s personal link carries his private key ('+link.replace(/^https?:\/\/[^/]+/,'')+')');
 // Kofi answers on his phone from his text.
 const k=await phone();await k.goto(link);await k.waitForTimeout(2500);
 await k.locator('.quick-answers').getByRole('button',{name:'I’m in'}).click();await k.waitForTimeout(2500);
 // A stranger with the group link taps Kofi's name: the answer stays Kofi's.
 const s=await phone();await s.goto(B+'/?plan='+id);await s.waitForTimeout(2500);
 await s.getByRole('tab',{name:'People'}).click();await s.waitForTimeout(300);
 await s.locator('.other-phone').getByRole('button',{name:'Answered on another phone?'}).click();
 check((await s.locator('.other-phone').innerText()).includes('personal link'),'the hint says to open the personal link');
 await s.locator('.other-phone').getByRole('button',{name:'Kofi',exact:true}).click();
 const said=await toast(s);check(/Kofi already answered on another phone.*personal link Ari sent you/.test(said),'stranger is told why: '+said);
 const spot=await s.evaluate(async id=>(await (await fetch('/api/plan/'+id)).json()).guests.find(g=>g.name==='Kofi'),id);
 check(!spot.isMe&&spot.status==='in','the stranger did not take Kofi’s spot');
 const forced=await s.evaluate(async([id,gid])=>(await fetch(`/api/plan/${id}/guests/${gid}/pick`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,[id,spot.id]);
 check(forced===403,'the server refuses it too, even without the screen ('+forced+')');
 await fits(s,'stranger');await s.screenshot({path:O+'/as1-stranger.png'});
 await k.reload();await k.waitForTimeout(2500);check(await k.evaluate(async id=>(await (await fetch('/api/plan/'+id)).json()).guests.find(g=>g.name==='Kofi').isMe,id),'Kofi’s first phone still has his answer');
 // Kofi gets a new phone and opens his personal link again: he continues there.
 const k2=await phone();await k2.goto(link);await k2.waitForTimeout(2500);
 check((await k2.locator('.invite-card h2').innerText()).startsWith('Hi Kofi!'),'new phone: personal greeting from his link');
 await k2.locator('.quick-answers').getByRole('button',{name:'Still checking'}).click();await k2.waitForTimeout(2500);
 const mine=await k2.evaluate(async id=>(await (await fetch('/api/plan/'+id)).json()).guests.find(g=>g.isMe),id);
 check(mine&&mine.name==='Kofi'&&mine.status==='maybe','new phone: Kofi continues and updates his answer');
 await fits(k2,'Kofi’s new phone');await k2.screenshot({path:O+'/as2-new-phone.png',fullPage:true});
 // Host sees one Kofi with his newest answer.
 await h.goto(B+'/?plan='+id);await h.waitForTimeout(2500);await h.getByRole('tab',{name:'People'}).click();await h.waitForTimeout(300);
 const kofis=await h.locator('.guest-block',{hasText:'Kofi'}).count();check(kofis===1,'host sees Kofi once');
 check((await h.locator('.guest-block',{hasText:'Kofi'}).innerText()).includes('hecking'),'host sees Kofi’s newest answer');
 await fits(h,'host');await h.screenshot({path:O+'/as3-host.png'});
 await h.evaluate(async id=>fetch('/api/plan/'+id,{method:'DELETE'}),id);
 console.log(fails?`${fails} problem(s)`:'All answered-spot checks passed');await b.close();process.exitCode=fails?1:0;
})();
