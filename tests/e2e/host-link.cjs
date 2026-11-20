// Phone journey, three devices: the host gets a host link on their phone, opens it on a second device and manages
// the plan there; a guest never sees host tools; a replaced link stops working. Needs `npm run dev` running.
// Usage: npm run journeys:host [-- <screenshot dir>]
const {chromium,devices}=require('playwright');
const B=process.env.JOURNEY_URL||'http://127.0.0.1:5173',O=process.argv[2]||require('node:os').tmpdir();
(async()=>{
 const b=await chromium.launch();let fails=0;const check=(ok,msg)=>{if(!ok){fails++;console.log('FAIL:',msg)}else console.log('ok:',msg)};
 const phone=async()=>{const c=await b.newContext({...devices['iPhone 14']});const p=await c.newPage();p.on('pageerror',e=>{fails++;console.log('PAGEERROR',e.message)});p.on('dialog',d=>d.accept());return p};
 const h=await phone();await h.goto(B);await h.waitForTimeout(2500);
 const id=await h.evaluate(async()=>(await (await fetch('/api/plans',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'Friendsgiving',name:'Kaela'})})).json()).id);
 await h.goto(B+'/?plan='+id);await h.waitForTimeout(2000);
 check(await h.getByRole('heading',{name:'Your host link'}).count()===1,'host sees the host link card on the overview');
 await h.getByRole('button',{name:'Get my host link'}).click();await h.waitForTimeout(1200);
 const link=await h.locator('.host-link-url').innerText();check(/\/h\/[A-Za-z0-9_-]{24}$/.test(link),'host gets a private link');
 const sms=await h.getByRole('link',{name:'Text it to myself'}).getAttribute('href');check(decodeURIComponent(sms).includes(link),'Text it to myself puts the link in a message');
 await h.screenshot({path:O+'/hl1-host.png',fullPage:true});
 // Second device
 const d2=await phone();await d2.goto(link);await d2.waitForTimeout(2000);
 check(await d2.getByRole('heading',{name:/Manage this plan on this device/}).count()===1,'second device asks before taking over');
 await d2.screenshot({path:O+'/hl2-claim.png'});
 await d2.getByRole('button',{name:'Open as host'}).click();await d2.waitForTimeout(2500);
 check(await d2.getByRole('button',{name:'Edit plan details'}).count()===1,'second device is now the host');
 check(!d2.url().includes('hostkey'),'the key is gone from the address bar');
 await d2.getByRole('button',{name:'Edit plan details'}).click();await d2.getByLabel('Give it a name').fill('Friendsgiving at Kaela’s');await d2.getByRole('button',{name:'Save changes'}).click();await d2.waitForTimeout(1500);
 await h.reload();await h.waitForTimeout(2000);check((await h.locator('h1').first().innerText()).includes('Kaela’s'),'change made on the second device shows on the first phone, which is still host');
 check(await h.getByRole('button',{name:'Edit plan details'}).count()===1,'first phone still host');
 // Guest
 const g=await phone();await g.goto(B+'/?plan='+id);await g.waitForTimeout(2000);
 check(await g.getByRole('heading',{name:'Your host link'}).count()===0&&await g.getByRole('button',{name:'Edit plan details'}).count()===0,'guest sees no host link and no host tools');
 // New link turns off the old one
 await h.getByText('More tools').click();await h.getByRole('button',{name:'Make a new host link'}).click();await h.waitForTimeout(1200);
 const replaced=await h.locator('.host-link-url').innerText();check(replaced!==link,'replacement link stays visible so it can be saved');
 const d3=await phone();await d3.goto(link);await d3.waitForTimeout(1800);await d3.getByRole('button',{name:'Open as host'}).click();await d3.waitForTimeout(1500);
 check((await d3.locator('body').innerText()).includes('doesn’t work anymore'),'old link says it no longer works');
 check(await d3.getByRole('button',{name:'Edit plan details'}).count()===0,'and gives no host access');
 await d2.reload();await d2.getByRole('tab',{name:'Overview',exact:true}).waitFor();check(await d2.getByRole('button',{name:'Edit plan details'}).count()===0,'the already recovered second device loses host tools');
 await b.close();console.log(fails?`${fails} problem(s)`:'All host-link checks passed');process.exit(fails?1:0);
})();
