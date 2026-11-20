// Makes m.o's home-screen and app icons from the brand mark (a head over a table line; see docs/brand.md).
// Writes public/apple-touch-icon.png (180), icon-192.png, icon-512.png and icon-maskable-512.png.
// Run: node scripts/brand-icons.cjs   (no dev server needed)
const {chromium}=require('playwright');
const mark=(size,scale)=>{const s=64*scale,o=(64-s)/2;return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64"><rect width="64" height="64" fill="#f6eee4"/><g transform="translate(${o} ${o}) scale(${scale})"><circle cx="32" cy="25" r="13" fill="#b23b28"/><rect x="13" y="43" width="38" height="8" rx="4" fill="#3a1a2b"/></g></svg>`};
(async()=>{const b=await chromium.launch();
 // iPhone and Android round the corners themselves, so the icons are full squares. The maskable icon keeps the
 // mark inside the middle 60% so any mask shape leaves it whole.
 for(const [file,size,scale] of [['apple-touch-icon.png',180,1],['icon-192.png',192,1],['icon-512.png',512,1],['icon-maskable-512.png',512,.72]]){
  const p=await b.newPage({viewport:{width:size,height:size}});await p.setContent(`<body style="margin:0">${mark(size,scale)}</body>`);
  await p.screenshot({path:'public/'+file,omitBackground:false});await p.close();console.log('wrote public/'+file)}
 await b.close()})();
