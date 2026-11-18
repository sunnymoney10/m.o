// m.o house illustration style: flat cut-paper scenes and "the regulars" — rounded characters with
// simple faces, drawn in the brand palette. Every scene is generated from a seed (a plan ID or a name),
// so the same plan or person always gets the same picture, and nothing is a stock or rendered photo.
import {useId} from 'react';

const C={ink:'#3a1a2b',ink2:'#2a1120',paper:'#fffaf3',cream:'#f6eee4',brick:'#b23b28',brickSoft:'#f7e2da',butter:'#f5d36a',butterSoft:'#fbefc6',sky:'#c5d4f0',skySoft:'#e4ebf8',sky2:'#8ea4d8',blush:'#e8a598',sage:'#a9c4a0',line:'#e6d9ca'};
const SKIN=['#f1c9a5','#d9a27a','#b8794f','#8d5636','#6b3d26','#4a2a1c'];
const HAIR=['#2a1120','#3b2418','#1d1416','#5a3a22','#2a1120'],DARK_HAIR=['#1d1416','#120b0e','#2a1120'];
const SHIRT=[C.brick,C.butter,C.sky2,C.ink,C.blush,C.sage,C.paper];
const STYLES=['afro','curls','short','bun','cap','braids','fade','locs'] as const;
type Look={skin:string;hair:string;style:typeof STYLES[number];shirt:string;hat:string;earring:boolean;glasses:boolean;armsUp:boolean};

function hash(s:string){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed:string){let a=hash(seed);return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
type R=()=>number;
const pick=<T,>(r:R,list:readonly T[])=>list[Math.floor(r()*list.length)];
// Rounded so the server and the browser render identical markup.
const between=(r:R,a:number,b:number)=>Math.round((a+r()*(b-a))*100)/100;
function lookFor(r:R,armsUp=false):Look{const shirt=pick(r,SHIRT);const skin=pick(r,SKIN),hair=pick(r,HAIR);return {skin,hair:SKIN.indexOf(skin)>=3?DARK_HAIR[HAIR.indexOf(hair)%DARK_HAIR.length]:hair,style:pick(r,STYLES),shirt,hat:pick(r,[C.brick,C.butter,C.sky2,C.ink].filter(c=>c!==shirt)),earring:r()<.4,glasses:r()<.25,armsUp}}

/* A head drawn around (0,0) = center of the face. */
function Head({l}:{l:Look}){
 const back=l.style==='afro'?<circle cx="0" cy="-5" r="27" fill={l.hair}/>
  :l.style==='curls'?<g fill={l.hair}>{[[-18,-8],[-14,-19],[-4,-25],[8,-24],[17,-17],[20,-6]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="9.5"/>)}</g>
  :l.style==='braids'?<g fill={l.hair}><rect x="-24" y="-8" width="9" height="46" rx="4.5"/><rect x="15" y="-8" width="9" height="46" rx="4.5"/></g>
  :l.style==='locs'?<g fill={l.hair}>{[-22,-14,14,22].map((x,i)=><rect key={i} x={x-3.5} y="-12" width="7" height={i%3?34:40} rx="3.5"/>)}</g>:null;
 const top=l.style==='cap'?<g><path d="M-20 -3 A20 20 0 0 1 20 -3 Z" fill={l.hat}/><rect x="10" y="-6" width="22" height="6" rx="3" fill={l.hat}/></g>
  :l.style==='fade'?<path d="M-19 -4 A19 19 0 0 1 19 -4 C12 -12 -12 -12 -19 -4 Z" fill={l.hair} opacity=".85"/>
  :l.style==='afro'?null
  :<path d="M-19.6 2 A19.6 19.6 0 0 1 19.6 2 C14 -9 -4 -12 -19.6 2 Z" fill={l.hair}/>;
 const deep=SKIN.indexOf(l.skin)>=4,feat=deep?'#120b0e':C.ink2;
 return <g>
  {back}
  {l.style==='bun'&&<circle cx="0" cy="-24" r="10" fill={l.hair}/>}
  <circle cx="0" cy="0" r="19" fill={l.skin}/>
  {top}
  <circle cx="-11" cy="7" r="3.4" fill={C.blush} opacity=".55"/><circle cx="11" cy="7" r="3.4" fill={C.blush} opacity=".55"/>
  <circle cx="-6.5" cy="1" r="2.3" fill={feat}/><circle cx="6.5" cy="1" r="2.3" fill={feat}/>{deep&&<g fill={C.paper}><circle cx="-5.7" cy="0.2" r=".8"/><circle cx="7.3" cy="0.2" r=".8"/></g>}
  {l.glasses&&<g fill="none" stroke={deep?C.butter:C.ink2} strokeWidth="1.8"><circle cx="-6.5" cy="1" r="5.6"/><circle cx="6.5" cy="1" r="5.6"/><path d="M-1 1h2"/></g>}
  <path d="M-6 8.5 Q0 13.5 6 8.5" fill="none" stroke={deep?C.blush:C.ink2} strokeWidth="2" strokeLinecap="round"/>
  {l.earring&&<g fill="none" stroke={C.butter} strokeWidth="2"><circle cx="-19" cy="9" r="3.6"/><circle cx="19" cy="9" r="3.6"/></g>}
 </g>
}
/* A person whose body bottom sits at (0,0). Head center is at (0,-92). */
function Person({l,x,y,s=1}:{l:Look;x:number;y:number;s?:number}){
 return <g transform={`translate(${x} ${y}) scale(${s})`}>
  {l.armsUp&&<g stroke={l.shirt} strokeWidth="13" strokeLinecap="round"><path d="M-22 -54 L-38 -104"/><path d="M22 -54 L38 -104"/></g>}
  {l.armsUp&&<g fill={l.skin}><circle cx="-39" cy="-108" r="6.5"/><circle cx="39" cy="-108" r="6.5"/></g>}
  <rect x="-7" y="-80" width="14" height="16" fill={l.skin}/>
  <path d="M-30 0 V-38 A30 30 0 0 1 30 -38 V0 Z" fill={l.shirt} stroke={l.shirt===C.paper?C.line:'none'} strokeWidth="1.5"/>
  <g transform="translate(0 -92)"><Head l={l}/></g>
 </g>
}

/* ---------- scenes (viewBox 400x225; they fill any frame) ---------- */
function Lights({r,y=34,amp=16,cord=C.ink}:{r:R;y?:number;amp?:number;cord?:string}){
 const ph=between(r,0,Math.PI*2),pts=Array.from({length:41},(_,i)=>{const x=i*10;return [x,Math.round((y+amp*Math.sin(x/400*Math.PI*2+ph))*10)/10]});
 return <g><path d={'M'+pts.map(p=>p.join(' ')).join(' L')} fill="none" stroke={cord} strokeWidth="1.6"/>
  {pts.filter((_,i)=>i%4===2).map(([x,yy],i)=><g key={i}><rect x={x-2} y={yy} width="4" height="4" fill={cord}/><circle cx={x} cy={yy+8} r="5" fill={i%3===1?C.paper:C.butter}/></g>)}</g>
}
function Confetti({r,n=14,top=10,bottom=120}:{r:R;n?:number;top?:number;bottom?:number}){
 return <g>{Array.from({length:n},(_,i)=>{const x=between(r,10,390),y=between(r,top,bottom);return <rect key={i} x={x} y={y} width="7" height="3.5" rx="1.5" fill={pick(r,[C.butter,C.brick,C.sky,C.blush,C.paper])} transform={`rotate(${between(r,-60,60).toFixed(1)} ${x+3.5} ${y+1.75})`}/>})}</g>
}
function Table({r}:{r:R}){
 const bg=pick(r,[C.skySoft,C.butterSoft,C.brickSoft]),n=3+Math.floor(r()*3),xs=Array.from({length:n},(_,i)=>60+i*(280/(n-1))+between(r,-12,12));
 const people=xs.map(x=>({x,s:between(r,.95,1.1),l:lookFor(r,r()<.18)}));
 return <>
  <rect width="400" height="225" fill={bg}/>
  <circle cx={between(r,70,330)} cy="70" r="46" fill={bg===C.butterSoft?C.sky:C.butter} opacity=".9"/>
  <Lights r={r}/>
  {people.map((p,i)=><Person key={i} l={p.l} x={p.x} y={178} s={p.s}/>)}
  <rect x="-10" y="160" width="420" height="80" fill={C.paper}/>
  <rect x="-10" y="188" width="420" height="40" fill={pick(r,[C.brick,C.sky2,C.ink])}/>
  {[0,1,2,3,4,5,6,7,8,9].map(i=><rect key={i} x={i*44} y="188" width="22" height="40" fill="#ffffff" opacity=".12"/>)}
  {people.map((p,i)=><ellipse key={i} cx={p.x} cy="170" rx="19" ry="5.5" fill="#fff" stroke={C.line} strokeWidth="1.5"/>)}
  <ellipse cx="200" cy="172" rx="40" ry="9" fill={C.butter}/>
  <ellipse cx="200" cy="160" rx="27" ry="16" fill="#c0773f"/><ellipse cx="193" cy="153" rx="9" ry="4" fill="#d99a5b"/>
  {[118,282].map((x,i)=><g key={i}><rect x={x-3} y="140" width="6" height="26" rx="2" fill={C.paper} stroke={C.line}/><ellipse cx={x} cy="135" rx="4" ry="6.5" fill={C.butter}/></g>)}
 </>
}
function Road({r}:{r:R}){
 const sunX=between(r,50,350),car=between(r,140,260),heads=[lookFor(r),lookFor(r),lookFor(r)],body=pick(r,[C.brick,C.butter,C.sky2]);
 return <>
  <rect width="400" height="225" fill={C.sky}/>
  <circle cx={sunX} cy="58" r="30" fill={C.butter}/>
  {[0,1].map(i=>{const x=between(r,40,360),y=between(r,30,80);return <g key={i} fill={C.paper}><ellipse cx={x} cy={y} rx="26" ry="10"/><ellipse cx={x+14} cy={y-7} rx="15" ry="10"/></g>})}
  <path d="M0 150 C70 105 140 120 210 145 S330 120 400 135 V225 H0Z" fill={C.butterSoft}/>
  <path d="M0 168 C90 140 180 150 260 168 S360 150 400 160 V225 H0Z" fill={C.sage}/>
  <rect y="182" width="400" height="43" fill={C.ink}/>
  {Array.from({length:9},(_,i)=><rect key={i} x={i*48+6} y="201" width="26" height="4" rx="2" fill={C.paper}/>)}
  <g transform={`translate(${car} 196)`}>
   <rect x="-44" y="-86" width="70" height="12" rx="5" fill={pick(r,[C.butter,C.brick,C.paper])}/><path d="M-20 -86v12M6 -86v12" stroke={C.ink} strokeWidth="2"/>
   <path d="M-62 -36 L-46 -70 Q-43 -74 -38 -74 H34 Q40 -74 43 -69 L62 -36 Z" fill={body}/>
   <path d="M-49 -38 L-38 -64 H-6 V-38Z M2 -38 V-64 H33 L48 -38Z" fill={C.skySoft}/>
   {[[-24,-45],[22,-45]].map(([x,y],i)=><g key={i} transform={`translate(${x} ${y}) scale(.55)`}><Head l={heads[i]}/></g>)}
   <path d="M-86 -2 V-26 Q-86 -38 -72 -38 H74 Q88 -38 88 -24 V-2 Q88 4 82 4 H-80 Q-86 4 -86 -2Z" fill={body}/>
   <rect x="78" y="-28" width="9" height="6" rx="3" fill={C.butterSoft}/><rect x="-86" y="-28" width="7" height="6" rx="3" fill={C.brick}/>
   {[-52,52].map(x=><g key={x}><circle cx={x} cy="4" r="15" fill={C.ink2}/><circle cx={x} cy="4" r="5.5" fill={C.paper}/></g>)}
  </g>
 </>
}
function Night({r}:{r:R}){
 const n=4+Math.floor(r()*3),xs=Array.from({length:n},(_,i)=>40+i*(320/(n-1))+between(r,-14,14));
 return <>
  <rect width="400" height="225" fill={C.ink}/>
  {Array.from({length:22},(_,i)=><circle key={i} cx={between(r,0,400)} cy={between(r,0,110)} r={between(r,.8,2.2)} fill={C.paper} opacity={between(r,.4,.9)}/>)}
  <g transform={`translate(${between(r,60,340)} 52)`}><circle r="24" fill={C.butter}/><circle cx="10" cy="-6" r="20" fill={C.ink}/></g>
  <Lights r={r} y={26} amp={10} cord={C.paper}/>
  <Confetti r={r}/>
  {xs.map((x,i)=><Person key={i} l={lookFor(r,r()<.7)} x={x} y={232} s={between(r,1,1.2)}/>)}
 </>
}
function Portrait({r,seed}:{r:R;seed:string}){
 return <>
  <rect width="400" height="225" fill={C.sky}/>
  <circle cx="300" cy="70" r="44" fill={C.butter}/>
  <Lights r={r} y={30} amp={12}/>
  <Confetti r={r} n={10} top={50} bottom={160}/>
  <Person l={faceLook(seed).look} x={200} y={262} s={1.55}/>
 </>
}

const FACE_BG=[C.butter,C.sky,C.brickSoft,C.butterSoft,C.skySoft];
// Avatars stand for real people, so the app never assigns them a human skin tone: faces use brand colours
// (a face tone that differs from the background). The fictional crowds in scenes keep a diverse range of skin tones.
const FACE_TONES=[C.butter,C.sky,C.sky2,C.sage],NEAR:Record<string,string>={[C.butterSoft]:C.butter,[C.skySoft]:C.sky};
function faceLook(seed:string){const r=rng('face:'+(seed||'?').trim().toLowerCase());const bg=pick(r,FACE_BG),look=lookFor(r),tones=FACE_TONES.filter(t=>t!==bg&&t!==NEAR[bg]&&t!==look.shirt);return {bg,look:{...look,skin:pick(r,tones)}}}

export type SceneKind='table'|'road'|'night'|'portrait';
export function sceneFor(kind:string,madeIt?:number|boolean):SceneKind{return madeIt?'night':kind==='trip'?'road':'table'}
export function Scene({kind,seed,className=''}:{kind:SceneKind;seed:string;className?:string}){
 const r=rng(kind+':'+seed);
 return <svg className={'scene '+className} viewBox="0 0 400 225" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
  {kind==='road'?<Road r={r}/>:kind==='night'?<Night r={r}/>:kind==='portrait'?<Portrait r={r} seed={seed}/>:<Table r={r}/>}
 </svg>
}
/* An illustrated avatar for a person, seeded by their name or handle. */
export function Face({seed,className=''}:{seed:string;className?:string}){
 const id=useId().replace(/:/g,''),{bg,look:l}=faceLook(seed);
 return <svg className={'face '+className} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
  <defs><clipPath id={'f'+id}><circle cx="50" cy="50" r="50"/></clipPath></defs>
  <g clipPath={`url(#f${id})`}><rect width="100" height="100" fill={bg}/><Person l={l} x={50} y={150} s={1.25}/></g>
 </svg>
}
