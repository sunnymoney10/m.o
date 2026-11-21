// Phone journey: a host styles an invite with a Genmoji (iPhone blocks Genmoji in plain text boxes, so the invite has
// its own Genmoji box). The Genmoji arrives like a real iPhone (picture wrapper, loaded late, no input event), is
// drawn on the chosen colour, and a stranger opening the plan link sees it. Tall iPhone. Needs `npm run dev`.
const {chromium,devices}=require('playwright');
const B=process.env.JOURNEY_URL||'http://127.0.0.1:5173',O=process.argv[2]||require('node:os').tmpdir();
(async()=>{
 const b=await chromium.launch();let fails=0;const check=(ok,msg)=>{if(!ok){fails++;console.log('FAIL:',msg)}else console.log('ok:',msg)};
 const phone=async()=>{const c=await b.newContext({...devices['iPhone 14 Pro Max']});const p=await c.newPage();p.on('pageerror',e=>{fails++;console.log('PAGEERROR',e.message)});return p};
 const fits=async(p,label)=>check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+': fits the screen');
 const pixels=(p,sel)=>p.evaluate(async sel=>{const el=document.querySelector(sel);await el.decode().catch(()=>{});const c=document.createElement('canvas');c.width=el.naturalWidth;c.height=el.naturalHeight;const x=c.getContext('2d');x.drawImage(el,0,0);
  const at=(px,py)=>[...x.getImageData(Math.round(c.width*px),Math.round(c.height*py),1,1).data].slice(0,3);return {w:c.width,h:c.height,corner:at(.97,.5),center:at(.5,.62)}},sel);
 const near=(c,t)=>c.every((v,i)=>Math.abs(v-t[i])<40);
 const h=await phone();await h.goto(B);await h.waitForTimeout(2500);
 await h.getByRole('button',{name:'Start your own plan',exact:true}).first().click();
 await h.getByLabel('What’s the plan?').fill('Skate day');const yn=h.getByLabel('Your name',{exact:true});if(await yn.count()&&await yn.isVisible())await yn.fill('Ari');
 await h.getByText('Customize your invite (optional)',{exact:true}).click();await h.waitForTimeout(300);
 const box=h.getByRole('textbox',{name:/pick a Genmoji or emoji for your invite/});check(await box.count()===1,'the invite has a Genmoji box');
 check(/iPhone doesn’t allow Genmoji in the box above/.test(await h.locator('.invite-style').innerText()),'it explains why there are two boxes');
 await h.getByRole('button',{name:'sky background',exact:true}).click();
 await box.click();await h.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=160;const x=c.getContext('2d');x.fillStyle='#b23b28';x.beginPath();x.arc(80,80,70,0,7);x.fill();
  const pic=document.createElement('picture');const s=document.createElement('source');s.type='image/x-apple-adaptive-glyph';s.srcset=c.toDataURL('image/png');const img=document.createElement('img');img.alt='skating boy';pic.append(s,img);
  document.querySelector('.invite-genmoji .genmoji-box').appendChild(pic);c.toBlob(b=>{img.src=URL.createObjectURL(b)},'image/png')});
 await h.locator('.invite-style-preview .invite-cover').waitFor({timeout:8000}).catch(()=>{});
 check(await h.locator('.invite-style-preview .invite-cover').count()===1,'the Genmoji becomes the invite preview');
 {const px=await pixels(h,'.invite-style-preview .invite-cover');check(near(px.corner,[0xc5,0xd4,0xf0]),'background is the chosen sky colour: '+px.corner);check(near(px.center,[0xb2,0x3b,0x28]),'the Genmoji is in the middle: '+px.center)}
 // Change the colour after picking: the Genmoji invite is redrawn.
 await h.getByRole('button',{name:'sage background',exact:true}).click();await h.waitForTimeout(1500);
 {const px=await pixels(h,'.invite-style-preview .invite-cover');check(near(px.corner,[0xb5,0xc9,0xaa]),'changing colour redraws it in sage: '+px.corner)}
 check(await h.getByRole('button',{name:'Remove Genmoji'}).count()===1,'there’s a “Remove Genmoji” button');
 await fits(h,'host invite with Genmoji');await h.locator('.invite-style').screenshot({path:O+'/gi1-host.png'});
 await h.getByRole('button',{name:/Create plan/}).click();await h.waitForURL(/plan=/,{timeout:15000});const url=h.url();
 // A stranger opens the link and sees the Genmoji invite.
 const g=await phone();await g.goto(url);await g.getByRole('heading',{name:'Skate day',exact:true}).waitFor();
 const cover=g.locator('.plan-photo .invite-cover');await cover.waitFor({timeout:8000}).catch(()=>{});check(await cover.count()===1,'a stranger sees the Genmoji invite');
 if(await cover.count()){const px=await pixels(g,'.plan-photo .invite-cover');check(px.w===1000&&near(px.center,[0xb2,0x3b,0x28]),'it’s the saved 1000×500 cover with the Genmoji')}
 await fits(g,'guest');await g.screenshot({path:O+'/gi2-guest.png'});
 // An ordinary emoji in the Genmoji box still styles the invite the normal way.
 await h.getByRole('button',{name:'Edit plan details'}).click();await h.getByText('Customize your invite (optional)',{exact:true}).click();await h.waitForTimeout(300);
 await h.getByRole('textbox',{name:/for your invite/}).click();await h.keyboard.insertText('🎧');await h.waitForTimeout(800);
 check(await h.getByLabel('Your own emoji').inputValue()==='🎧','an emoji typed in the Genmoji box styles it like the emoji box');
 await h.evaluate(async id=>fetch('/api/plan/'+id,{method:'DELETE'}),new URL(url).searchParams.get('plan'));
 console.log(fails?`${fails} problem(s)`:'All Genmoji invite checks passed');await b.close();process.exitCode=fails?1:0;
})();
