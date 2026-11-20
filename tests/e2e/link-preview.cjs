// Link previews: what iMessage and other apps show when someone pastes an m.o link. Every link gets a picture;
// a plan with its own cover uses that cover; no preview ever includes the address. Needs `npm run dev`.
const {chromium}=require('playwright');
const B=process.env.JOURNEY_URL||'http://127.0.0.1:5173';
(async()=>{
 const b=await chromium.launch();let fails=0;const check=(ok,msg)=>{if(!ok){fails++;console.log('FAIL:',msg)}else console.log('ok:',msg)};
 const tags=async path=>{const h=await (await fetch(B+path)).text();const get=k=>(h.match(new RegExp(`<meta (?:property|name)="${k}" content="([^"]*)"`))||[])[1]||'';return {html:h,title:get('og:title'),image:get('og:image'),card:get('twitter:card'),w:get('og:image:width')}};
 const loads=async u=>{const r=await fetch(u);return r.ok&&/^image\//.test(r.headers.get('content-type')||'')};
 const home=await tags('/');check(home.title.startsWith('m.o')&&/\/og\/home\.png$/.test(home.image)&&home.card==='summary_large_image','home page has a preview with a picture');check(await loads(home.image),'home picture loads');
 const p=await (await b.newContext()).newPage();await p.goto(B);await p.waitForTimeout(1500);
 const ids=await p.evaluate(async()=>{const mk=b=>fetch('/api/plans',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(r=>r.json()).then(r=>r.id);
  const c=document.createElement('canvas');c.width=1000;c.height=500;const x=c.getContext('2d');x.fillStyle='#b5c9aa';x.fillRect(0,0,1000,500);const cover=c.toDataURL('image/jpeg',.8);
  return {party:await mk({title:'Preview party',name:'Ari',place:'1420 SECRET Elm St'}),trip:await mk({title:'Preview trip',name:'Ari',kind:'trip',place:'SECRET cabin road'}),cover:await mk({title:'Preview cover',name:'Ari',place:'SECRET rink',coverImage:cover})}},null);
 for(const [k,file] of [['party','gathering'],['trip','trip']]){const t=await tags('/?plan='+ids[k]);check(t.title==='Ari invited you: Preview '+k&&t.image.endsWith(`/og/${file}.png`)&&t.w==='1200',`${k} link: “Ari invited you” with the ${file} picture`);check(await loads(t.image),`${k} picture loads`);check(!/SECRET/.test(t.html.split('</head>')[0]),`${k} preview never includes the address`)}
 {const t=await tags('/?plan='+ids.cover);check(t.image.includes(`/api/plan/${ids.cover}/cover`)&&t.w==='1000','a plan with its own cover uses that cover');check(await loads(t.image),'cover picture loads for anyone (no sign-in)');check(!/SECRET/.test(t.html.split('</head>')[0]),'cover preview never includes the address')}
 {const t=await tags('/?plan=00000000-0000-0000-0000-000000000000');check(!t.image&&!t.title,'a wrong plan link gets no plan preview')}
 await p.evaluate(async ids=>{for(const id of Object.values(ids))await fetch('/api/plan/'+id,{method:'DELETE'})},ids);
 console.log(fails?`${fails} problem(s)`:'All link preview checks passed');await b.close();process.exitCode=fails?1:0;
})();
