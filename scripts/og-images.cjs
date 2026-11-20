// Makes the link-preview pictures (1200×630) in public/og/ from m.o's own illustrations, so a plan link pasted into
// a group chat shows a picture. Plans with their own cover (photo or Genmoji) use that cover instead.
// Run with `npm run dev` going: node scripts/og-images.cjs  (writes public/og/gathering.png, trip.png, home.png)
const {chromium}=require('playwright');const fs=require('node:fs');
const B=process.env.OG_URL||'http://127.0.0.1:5173';
const page=(scene,headline,line)=>`<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;800;900&display=swap">
<style>*{box-sizing:border-box;margin:0}body{width:1200px;height:630px;background:#f6eee4;font-family:Outfit,sans-serif;color:#3a1a2b;display:grid;grid-template-columns:520px 1fr;overflow:hidden}
.left{padding:64px 0 56px 72px;display:flex;flex-direction:column;justify-content:space-between}.mark{height:64px;width:155px;align-self:flex-start;color:#3a1a2b}
h1{font-weight:900;font-size:84px;line-height:.98;letter-spacing:-.035em}p{font-weight:500;font-size:30px;color:#6f6066;margin-top:18px}
.right{padding:48px 48px 48px 8px;display:flex;align-items:center}.right svg{width:100%;height:auto;border-radius:36px;display:block}</style></head>
<body><div class="left"><svg class="mark" viewBox="0 20 160 66"><path d="M10 80V37M10 52a15 15 0 0 1 30 0v28M40 52a15 15 0 0 1 30 0v28" fill="none" stroke="currentColor" stroke-width="14"/><circle cx="91" cy="64" r="9.5" fill="#b23b28"/><rect x="80" y="75" width="22" height="5" rx="2.5" fill="currentColor"/><circle cx="131" cy="55" r="18" fill="none" stroke="currentColor" stroke-width="14"/></svg><div><h1>${headline}</h1><p>${line}</p></div></div><div class="right">${scene}</div></body></html>`;
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:430,height:900}});
 // Borrow the scenes the app draws: the home hero (dinner table) and an example trip (road).
 await p.goto(B);await p.waitForTimeout(2500);
 const scenes=await p.evaluate(()=>{const all=[...document.querySelectorAll('svg.scene')].map(s=>({w:s.getBoundingClientRect().width,html:s.outerHTML,label:s.getAttribute('aria-label')||'',road:!!s.querySelector('rect[y="182"][height="43"]')}));return {table:all.find(s=>!s.road)?.html,road:all.find(s=>s.road)?.html}});
 if(!scenes.table||!scenes.road)throw Error('Could not find the dinner and road scenes on the home page');
 fs.mkdirSync('public/og',{recursive:true});
 const shot=async(file,scene,headline,line)=>{const q=await b.newPage({viewport:{width:1200,height:630}});await q.setContent(page(scene,headline,line),{waitUntil:'networkidle'});await q.waitForTimeout(400);await q.screenshot({path:'public/og/'+file});await q.close();console.log('wrote public/og/'+file)};
 await shot('gathering.png',scenes.table,'You’re invited.','Say if you’re coming and pick something to bring.');
 await shot('trip.png',scenes.road,'You’re invited.','Say if you’re in and see what still needs doing.');
 await shot('home.png',scenes.table,'Make it out the groupchat.','One link for the plan, who’s coming, and who’s bringing what.');
 await b.close()})();
