'use client';
// A box for a Genmoji (iPhone with Apple Intelligence) or any emoji. Plain text boxes can't take a Genmoji, so
// this is an editable area: Safari puts a Genmoji in it as a picture, which we read and hand back.
// Used for your profile picture and for an invite's emoji.
import {useEffect,useRef,useState} from 'react';

export type Picked={image?:Blob;emoji?:string;preview:string};
const EMOJI=/\p{Extended_Pictographic}/u;
const lastEmoji=(t:string)=>{const parts=[...new Intl.Segmenter('en',{granularity:'grapheme'}).segment(t)].map(x=>x.segment).filter(x=>EMOJI.test(x));return parts.at(-1)||''};

// Tap the box, open the emoji keyboard and pick a Genmoji (iPhone with Genmoji) or any emoji. Safari puts a
// Genmoji into an editable box as a small picture; we read that picture and save it like a photo.
// Turn whatever picture Safari put in the box into a file. Copy it from the screen first (works for data:, blob:
// and Safari's own internal picture links); fall back to downloading it.
async function pictureFile(el:HTMLImageElement){
 if(!el.complete||!el.naturalWidth)await el.decode().catch(()=>new Promise(r=>{el.addEventListener('load',r,{once:true});el.addEventListener('error',r,{once:true});setTimeout(r,2500)}));
 if(el.naturalWidth){try{const c=document.createElement('canvas');c.width=el.naturalWidth;c.height=el.naturalHeight;c.getContext('2d')!.drawImage(el,0,0);const b=await new Promise<Blob|null>(r=>c.toBlob(r,'image/png'));if(b&&b.size)return b}catch{}}
 const src=el.currentSrc||el.src;if(src){const r=await fetch(src);if(r.ok)return await r.blob()}
 throw Error('unreadable');
}
// A short description of what arrived in the box, shown only if we can't read it (to fix it from a screenshot).
const describe=(box:HTMLElement)=>[...box.querySelectorAll('*')].slice(0,6).map(n=>{const src=n.getAttribute('src')||n.getAttribute('srcset')||'';return n.tagName.toLowerCase()+(n.getAttribute('type')?' '+n.getAttribute('type'):'')+(src?' '+src.split(':')[0]:'')}).join(', ')||'text only';

export const GENMOJI_AS_TEXT='Your iPhone sent that Genmoji as a blank box, not a picture. Try pasting it instead: in Notes or Messages, press and hold the Genmoji, tap Copy, then come back, press and hold this box and tap Paste.';

export function GenmojiBox({label,onPicked,disabled=false}:{label:string;onPicked:(p:Picked)=>void;disabled?:boolean}){
 const [hint,setHint]=useState('');
 // The box watcher is set up once, so it reads the latest callback (and the latest settings it uses) from here.
 const latest=useRef(onPicked);latest.current=onPicked;
 const ref=useRef<HTMLDivElement>(null),reading=useRef(false);
 async function read(){const box=ref.current;if(!box||reading.current)return;
  // A Genmoji arrives as a picture (sometimes inside <picture>, sometimes only as a <source>).
  let img=box.querySelector('img');const source=box.querySelector('source[srcset]');
  if(!img&&source){img=new Image();img.src=(source.getAttribute('srcset')||'').split(/\s+/)[0]}
  if(img){reading.current=true;setHint('');const what=describe(box);
   try{const blob=await pictureFile(img);latest.current({image:blob,preview:URL.createObjectURL(blob)})}
   catch{setHint(`Couldn’t read that Genmoji. Please take a screenshot of this message and send it to us. (It arrived as: ${what})`)}
   finally{box.innerHTML='';reading.current=false}return}
  const text=box.textContent||'';if(!text.trim())return;
  // Some places turn a Genmoji into a blank placeholder (U+FFFC) instead of a picture: say so and offer pasting.
  if(text.includes('\uFFFC')){box.textContent='';setHint(GENMOJI_AS_TEXT);return}
  const e=lastEmoji(text);if(e){setHint('');latest.current({emoji:e,preview:''});box.textContent='';return}
  setHint('Pick a Genmoji or emoji from the emoji keyboard. Letters don’t work here.');box.textContent=''}
 // Watch the box itself: Safari doesn't always send an "input" event when it puts a Genmoji in.
 useEffect(()=>{const box=ref.current;if(!box)return;let t=0;const obs=new MutationObserver(()=>{clearTimeout(t);t=window.setTimeout(read,60)});obs.observe(box,{childList:true,subtree:true,characterData:true});return()=>{obs.disconnect();clearTimeout(t)}},[]);
 async function pasted(e:React.ClipboardEvent<HTMLDivElement>){const d=e.clipboardData;
  const f=[...d.files,...[...d.items].filter(i=>i.kind==='file').map(i=>i.getAsFile()).filter((x):x is File=>!!x)].find(f=>f.type.startsWith('image/'));
  if(f){e.preventDefault();setHint('');latest.current({image:f,preview:URL.createObjectURL(f)});return}
  // Copied as rich text: the picture is inside the HTML. Put it in the box and let the watcher read it.
  const html=d.getData('text/html');const src=html&&new DOMParser().parseFromString(html,'text/html').querySelector('img[src],source[srcset]');
  if(src&&ref.current){e.preventDefault();const img=new Image();img.src=src.getAttribute('src')||(src.getAttribute('srcset')||'').split(/\s+/)[0];ref.current.replaceChildren(img);return}
  if((d.getData('text/plain')||'').includes('\uFFFC')){e.preventDefault();setHint(GENMOJI_AS_TEXT)}}
 return <>
  <div className="genmoji-box" role="textbox" aria-label={label} aria-disabled={disabled} contentEditable={!disabled} suppressContentEditableWarning spellCheck={false} ref={ref} onInput={()=>read()} onPaste={pasted}/>
  {hint&&<p className="form-error" role="alert">{hint}</p>}
 </>;
}
