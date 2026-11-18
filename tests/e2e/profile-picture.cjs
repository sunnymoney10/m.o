// Phone journey: choose an avatar, upload a photo, and see it in a plan from another guest's phone.
// Needs `npm run dev` running. Usage: npm run journeys:profile -- <photo.jpg> [screenshot dir]
const {chromium,devices}=require('playwright');
const B=process.env.JOURNEY_URL||'http://127.0.0.1:5173',PHOTO=process.argv[2],O=process.argv[3]||require('node:os').tmpdir();
const log=(...a)=>console.log(...a);
(async()=>{
 const b=await chromium.launch();
 const phone=async()=>{const c=await b.newContext({...devices['iPhone 14']});const p=await c.newPage();p.on('pageerror',e=>log('PAGEERROR',e.message));return p};
 const toast=async p=>{try{return await p.locator('.toast').last().innerText({timeout:4000})}catch{return '(no toast)'}};
 const a=await phone();await a.goto(B+'/?view=me');await a.waitForTimeout(1500);
 await a.getByLabel('Name').fill('Ari');await a.getByLabel('Handle').fill('ari_'+Date.now().toString(36));
 const picker=a.locator('.avatar-picker');
 await picker.getByRole('button',{name:'Face: skin 3'}).click();await picker.getByRole('button',{name:'Locs'}).click();await picker.getByRole('button',{name:'Hair colour: black'}).click();await picker.getByRole('button',{name:'Glasses'}).click();
 await picker.screenshot({path:O+'/p1-picker.png'});
 await a.getByRole('button',{name:/Save my m.o/}).click();await a.waitForTimeout(1500);log('save:',await toast(a));
 const saved=await a.evaluate(async()=>(await (await fetch('/api/me')).json()).profile.avatar);log('saved avatar:',JSON.stringify(saved));
 await a.screenshot({path:O+'/p2-profile.png'});
 // Upload a photo
 await a.getByRole('button',{name:/Edit my m.o/}).click();await a.locator('.avatar-picker').getByRole('button',{name:'Photo'}).click();
 const t0=Date.now();await a.locator('.avatar-picker input[type=file]').setInputFiles(PHOTO);await a.locator('.toast',{hasText:'Photo saved'}).waitFor({timeout:15000});log('upload: Photo saved',`(${Date.now()-t0} ms incl. resize)`);
 const me=await a.evaluate(async()=>(await (await fetch('/api/me')).json()).profile);log('photo url:',me.photo);
 const got=await a.evaluate(async u=>{const r=await fetch(u);return {type:r.headers.get('content-type'),bytes:(await r.arrayBuffer()).byteLength}},me.photo);log('stored photo:',got.type,got.bytes,'bytes');
 await a.locator('.avatar-picker').screenshot({path:O+'/p3-photo.png'});
 // Ari joins Sam's plan; Sam sees Ari's photo in the guest list
 const s=await phone();await s.goto(B);await s.waitForTimeout(1000);
 const id=await s.evaluate(async()=>(await (await fetch('/api/plans',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'Friendsgiving',name:'Sam'})})).json()).id);
 await a.evaluate(async id=>{await fetch(`/api/plan/${id}/rsvp`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Ari',status:'in'})})},id);
 await s.goto(B+'/?plan='+id);await s.waitForTimeout(1500);await s.getByRole('tab',{name:'People'}).click();await s.waitForTimeout(800);
 const img=s.locator('.guest-list img.face.photo');log('Sam sees Ari photo:',await img.count(),'| loaded:',await img.first().evaluate(i=>i.complete&&i.naturalWidth>0));
 await s.locator('.guest-list').screenshot({path:O+'/p4-guestlist.png'});
 // Remove the photo: the drawn avatar shows again
 await a.locator('.avatar-picker').getByRole('button',{name:'Remove photo'}).click();await a.locator('.toast',{hasText:'Photo removed'}).waitFor({timeout:8000});log('remove: Photo removed');
 await s.reload();await s.waitForTimeout(1500);await s.getByRole('tab',{name:'People'}).click();log('after removal, photos shown:',await s.locator('.guest-list img.face.photo').count());
 await b.close();
})();
