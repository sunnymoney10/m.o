// Phone journey: use a Genmoji (or an emoji) as your picture, then a host sees it in their plan's guest list.
// Safari puts a Genmoji into an editable box as an <img>; this test does the same with a see-through picture,
// since a real Genmoji needs an iPhone with Apple Intelligence. Tall iPhone. Needs `npm run dev`. Usage: npm run journeys:genmoji
const {chromium,devices}=require('playwright');
const B=process.env.JOURNEY_URL||'http://127.0.0.1:5173',O=process.argv[2]||require('node:os').tmpdir();
(async()=>{
 const b=await chromium.launch();let fails=0;const check=(ok,msg)=>{if(!ok){fails++;console.log('FAIL:',msg)}else console.log('ok:',msg)};
 const phone=async()=>{const c=await b.newContext({...devices['iPhone 14 Pro Max']});const p=await c.newPage();p.on('pageerror',e=>{fails++;console.log('PAGEERROR',e.message)});return p};
 const fits=async(p,label)=>check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+': fits the screen');
 const a=await phone();await a.goto(B+'/?view=me');await a.waitForTimeout(2000);
 await a.getByLabel('Name').fill('Ari');await a.getByLabel('Handle').fill('ari_'+Date.now().toString(36));
 await a.getByRole('button',{name:/Save my m.o/}).click();await a.waitForTimeout(1500);
 const openPicker=async()=>{const ed=a.getByRole('button',{name:/Edit my m.o/});if(await ed.count())await ed.click();const more=a.locator('details.profile-extras');if(await more.count()&&!(await more.evaluate(d=>d.open)))await more.locator('summary').click();await a.waitForTimeout(300)};
 await openPicker();const picker=a.locator('.avatar-picker');
 await picker.getByRole('button',{name:'Genmoji'}).click();
 const box=picker.getByRole('textbox',{name:/pick a Genmoji or emoji/});check(await box.count()===1,'Genmoji box is there');
 check(/smiley-face key/.test(await picker.innerText()),'it explains: tap the box, then the smiley-face key');
 // A Genmoji arrives the way Safari inserts it: a see-through picture inside the box.
 await box.click();await a.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=160;const x=c.getContext('2d');x.fillStyle='#b23b28';x.beginPath();x.arc(80,80,60,0,7);x.fill();
  // Like a real iPhone: a <picture> with Safari's glyph source, the <img> filled in a moment later, and no "input" event.
  const box=document.querySelector('.genmoji-box');const pic=document.createElement('picture');const s=document.createElement('source');s.type='image/x-apple-adaptive-glyph';s.srcset=c.toDataURL('image/png');
  const img=document.createElement('img');img.alt='skating cat';pic.append(s,img);box.appendChild(pic);c.toBlob(b=>{img.src=URL.createObjectURL(b)},'image/png')});
 await a.waitForTimeout(1200);check(await picker.locator('.genmoji-preview img').count()===1,'the Genmoji shows in a round preview (no input event, picture wrapper, loading late)');
 check(await a.locator('.genmoji-box').evaluate(b=>b.innerHTML==='')&&!/Couldn’t read/.test(await picker.innerText()),'the box is cleared and no error shows');
 await picker.getByRole('button',{name:'Background: sky'}).click();
 await fits(a,'Genmoji picker');await picker.screenshot({path:O+'/gm1-picker.png'});
 await picker.getByRole('button',{name:'Use this picture'}).click();await a.locator('.toast',{hasText:/saved/i}).first().waitFor({timeout:15000}).catch(()=>{});
 const me=await a.evaluate(async()=>(await (await fetch('/api/me')).json()).profile);check(!!me.photo,'saved as your picture');
 const px=await a.evaluate(async u=>{const r=await fetch(u);const bm=await createImageBitmap(await r.blob());const c=document.createElement('canvas');c.width=bm.width;c.height=bm.height;const x=c.getContext('2d');x.drawImage(bm,0,0);const p=y=>[...x.getImageData(5,y,1,1).data].slice(0,3);return {corner:p(5),center:[...x.getImageData(bm.width/2,bm.height/2,1,1).data].slice(0,3)}},me.photo);
 const near=(c,t)=>c.every((v,i)=>Math.abs(v-t[i])<30);
 check(near(px.corner,[0xc5,0xd4,0xf0]),'the see-through part became the sky background, not black: '+px.corner);
 check(near(px.center,[0xb2,0x3b,0x28]),'the Genmoji itself is in the middle: '+px.center);
 // An ordinary emoji works too (typed from the keyboard).
 const reopen=async()=>{if(!await box.isVisible().catch(()=>false)){await openPicker();await picker.getByRole('button',{name:'Genmoji'}).click();await a.waitForTimeout(300)}};
 await reopen();check(/Remove picture/.test(await picker.innerText()),'the saved picture can be removed from here');
 // Safari variant with only the glyph source (no <img>) also works.
 await reopen();await box.click();await a.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=120;const x=c.getContext('2d');x.fillStyle='#2f6b3a';x.fillRect(20,20,80,80);
  const pic=document.createElement('picture');const s=document.createElement('source');s.type='image/x-apple-adaptive-glyph';s.srcset=c.toDataURL('image/png');pic.append(s);document.querySelector('.genmoji-box').appendChild(pic)});
 await a.waitForTimeout(1200);check(await picker.locator('.genmoji-preview img').count()===1,'a Genmoji with only a source picture also previews');
 await picker.getByRole('button',{name:'Pick a different one'}).click();
 // If the phone turns the Genmoji into a blank placeholder (U+FFFC), m.o says so and suggests pasting.
 await box.click();await a.keyboard.insertText('\uFFFC');await a.waitForTimeout(600);check(/sent that Genmoji as a blank box/.test(await picker.innerText()),'a Genmoji that arrives as a blank box gets a clear “paste it instead” message');
 // Pasting a copied Genmoji (rich text with a picture inside) works.
 await box.click();await a.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=100;const x=c.getContext('2d');x.fillStyle='#b23b28';x.fillRect(10,10,80,80);
  const dt=new DataTransfer();dt.setData('text/html','<span><img src="'+c.toDataURL('image/png')+'" alt="Genmoji"></span>');dt.setData('text/plain','\uFFFC');
  document.querySelector('.genmoji-box').dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}))});
 await a.waitForTimeout(1200);check(await picker.locator('.genmoji-preview img').count()===1,'pasting a copied Genmoji shows the preview');
 await picker.getByRole('button',{name:'Pick a different one'}).click();
 // A picture we can't read never fails silently: it says so and describes what arrived, for a screenshot.
 await box.click();await a.evaluate(()=>{const img=document.createElement('img');img.src='x-apple-unknown://glyph';document.querySelector('.genmoji-box').appendChild(img)});
 await a.waitForTimeout(3500);{const t=await picker.innerText();check(/Couldn’t read that Genmoji/.test(t)&&/arrived as: img x-apple-unknown/.test(t),'an unreadable Genmoji shows a clear message to screenshot')}
 await box.click();await a.keyboard.insertText('🛼');await a.waitForTimeout(600);
 check((await picker.locator('.genmoji-preview span').innerText())==='🛼','an emoji shows in the preview');
 await picker.getByRole('button',{name:'Use this picture'}).click();await a.waitForTimeout(2000);
 const me2=await a.evaluate(async()=>(await (await fetch('/api/me')).json()).profile);check(me2.photo&&me2.photo!==me.photo,'the emoji replaced it');
 // Letters are ignored with a hint.
 await reopen();await box.click();await a.keyboard.insertText('abc');await a.waitForTimeout(400);check(/Letters don’t work here/.test(await picker.innerText()),'typing letters shows a hint');
 // Guest side: Ari answers Sam's plan; Sam (a separate phone) sees Ari's Genmoji picture in the guest list.
 const s=await phone();await s.goto(B);await s.waitForTimeout(1500);
 const id=await s.evaluate(async()=>(await (await fetch('/api/plans',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'Skate day',name:'Sam'})})).json()).id);
 await a.evaluate(async id=>{await fetch(`/api/plan/${id}/rsvp`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Ari',status:'in'})})},id);
 await s.goto(B+'/?plan='+id);await s.waitForTimeout(2000);await s.getByRole('tab',{name:'People'}).click();await s.waitForTimeout(800);
 const img=s.locator('.guest-list img.face.photo');check(await img.count()===1&&await img.first().evaluate(i=>i.complete&&i.naturalWidth>0),'Sam sees Ari’s picture in the guest list');
 await fits(s,'Sam’s guest list');await s.locator('.guest-list').screenshot({path:O+'/gm2-guestlist.png'});
 await s.evaluate(async id=>fetch('/api/plan/'+id,{method:'DELETE'}),id);
 console.log(fails?`${fails} problem(s)`:'All Genmoji checks passed');await b.close();process.exitCode=fails?1:0;
})();
