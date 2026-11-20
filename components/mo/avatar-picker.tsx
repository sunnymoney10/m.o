'use client';
// "Your picture": draw your own avatar from a few choices, use a Genmoji or emoji, or upload a photo. Photos are shrunk on the phone
// to a small square before upload, so they fit the free database and load quickly for everyone.
import {useState} from 'react';
import {Camera,Trash2,LoaderCircle,Palette,Smile} from 'lucide-react';
import type {Avatar} from '@/lib/avatar';
import {AVATAR,DEFAULT_AVATAR,PHOTO_MAX_BYTES} from '@/lib/avatar';
import {Face} from './art';
import {GenmojiBox} from './genmoji-box';

const SIZE=320;
const square=()=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=SIZE;return {canvas,ctx:canvas.getContext('2d')!}};
function encode(canvas:HTMLCanvasElement){
 for(const [type,q] of [['image/webp',.82],['image/webp',.68],['image/jpeg',.8],['image/jpeg',.65],['image/jpeg',.5]] as const){
  const url=canvas.toDataURL(type,q);if(url.startsWith('data:'+type)&&url.length*.75<PHOTO_MAX_BYTES)return url}
 throw Error('That picture is too large. Try another one.');
}
async function shrink(file:Blob){
 const bitmap=await createImageBitmap(file);const side=Math.min(bitmap.width,bitmap.height),{canvas,ctx}=square();
 ctx.drawImage(bitmap,(bitmap.width-side)/2,(bitmap.height-side)/2,side,side,0,0,SIZE,SIZE);bitmap.close?.();return encode(canvas);
}
// A Genmoji (a picture, often see-through) or an emoji (text), placed whole on a coloured square. Saved pictures
// can't stay see-through, so the background colour fills in behind it.
async function stickerPicture(source:{image?:Blob;emoji?:string},bg:string){
 const {canvas,ctx}=square();ctx.fillStyle=bg;ctx.fillRect(0,0,SIZE,SIZE);const pad=SIZE*.14,box=SIZE-pad*2;
 if(source.image){const bitmap=await createImageBitmap(source.image);const k=Math.min(box/bitmap.width,box/bitmap.height),w=bitmap.width*k,h=bitmap.height*k;ctx.drawImage(bitmap,(SIZE-w)/2,(SIZE-h)/2,w,h);bitmap.close?.()}
 else if(source.emoji){ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`${Math.round(box*.86)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;ctx.fillText(source.emoji,SIZE/2,SIZE/2+box*.04)}
 return encode(canvas);
}
function GenmojiPicker({upload,busy,setBusy,setError}:{upload:(dataUrl:string)=>Promise<boolean>;busy:boolean;setBusy:(b:boolean)=>void;setError:(e:string)=>void}){
 const [picked,setPicked]=useState<{image?:Blob;emoji?:string;preview:string}|null>(null),[bg,setBg]=useState<string>(AVATAR.backgrounds[0][1]);
 async function use(){if(!picked)return;setError('');setBusy(true);try{const url=await stickerPicture(picked,bg);if(await upload(url))setPicked(null)}catch(err:any){setError(err.message||'Couldn’t use that picture. Try another.')}finally{setBusy(false)}}
 return <>
  <GenmojiBox label="Tap here, then pick a Genmoji or emoji" onPicked={setPicked}/>
  <p className="fine">Tap the box, then the smiley-face key on your keyboard, and pick a Genmoji you made or any emoji. To make a new Genmoji on iPhone, tap the smiley-face key, then the Genmoji button.</p>
  {picked&&<>
   <div className="genmoji-preview" style={{background:bg}} aria-label="Your new picture">{picked.preview?<img src={picked.preview} alt=""/>:<span>{picked.emoji}</span>}</div>
   <Swatches label="Background" list={AVATAR.backgrounds} value={AVATAR.backgrounds.find(([,c])=>c===bg)?.[0]||''} onPick={k=>setBg(AVATAR.backgrounds.find(([x])=>x===k)![1])}/>
   <div className="genmoji-actions"><button type="button" className="primary genmoji-use" disabled={busy} onClick={use}>{busy?'Saving…':'Use this picture'}</button><button type="button" className="text-button small quiet" onClick={()=>setPicked(null)}>Pick a different one</button></div>
  </>}
 </>;
}
const Swatches=({label,list,value,onPick}:{label:string;list:readonly (readonly [string,string])[];value:string;onPick:(k:string)=>void})=>
 <fieldset><legend>{label}</legend><div className="swatches">{list.map(([k,c])=><button type="button" key={k} className={'swatch'+(value===k?' on':'')} style={{background:c}} aria-label={label+': '+k.replace(/(\d)$/,' $1')} aria-pressed={value===k} onClick={()=>onPick(k)}/>)}</div></fieldset>;

export function AvatarPicker({seed,avatar,photo,canUpload,onAvatar,upload,remove}:{seed:string;avatar:Avatar|null|undefined;photo:string|null|undefined;canUpload:boolean;onAvatar:(a:Avatar|null)=>void;upload:(dataUrl:string)=>Promise<boolean>;remove:()=>Promise<boolean>}){
 const [mode,setMode]=useState<'draw'|'photo'|'genmoji'>(photo?'photo':'draw'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const a=avatar||DEFAULT_AVATAR,set=(k:keyof Avatar,v:string|boolean)=>onAvatar({...a,[k]:v});
 async function choose(e:React.ChangeEvent<HTMLInputElement>){const file=e.target.files?.[0];e.target.value='';if(!file)return;setError('');setBusy(true);
  try{const url=await shrink(file);await upload(url)}catch(err:any){setError(err.message||'Couldn’t use that photo. Try another.')}finally{setBusy(false)}}
 return <fieldset className="avatar-picker"><legend>Your picture</legend>
  <div className="avatar-preview"><Face className="avatar-big" seed={seed} avatar={avatar} photo={mode!=='draw'?photo:null}/>
   <div className="seg small" role="group" aria-label="Picture type"><button type="button" className={mode==='draw'?'on':''} aria-pressed={mode==='draw'} onClick={()=>setMode('draw')}><Palette size={15}/>Draw me</button><button type="button" className={mode==='genmoji'?'on':''} aria-pressed={mode==='genmoji'} onClick={()=>setMode('genmoji')}><Smile size={15}/>Genmoji</button><button type="button" className={mode==='photo'?'on':''} aria-pressed={mode==='photo'} onClick={()=>setMode('photo')}><Camera size={15}/>Photo</button></div></div>
  {mode==='draw'?<div className="picker-rows">
   {!avatar&&<p className="fine">This is a random picture. Change anything below to make it yours.</p>}
   <Swatches label="Face" list={AVATAR.tones} value={avatar?a.tone:''} onPick={k=>set('tone',k)}/>
   <fieldset><legend>Hair</legend><div className="chips">{AVATAR.hair.map(([k,l])=><button type="button" key={k} className={'chip'+(avatar&&a.hair===k?' on':'')} aria-pressed={!!avatar&&a.hair===k} onClick={()=>set('hair',k)}>{l}</button>)}</div></fieldset>
   <Swatches label="Hair colour" list={AVATAR.hairColors} value={avatar?a.hairColor:''} onPick={k=>set('hairColor',k)}/>
   <Swatches label="Top" list={AVATAR.shirts} value={avatar?a.shirt:''} onPick={k=>set('shirt',k)}/>
   <Swatches label="Background" list={AVATAR.backgrounds} value={avatar?a.bg:''} onPick={k=>set('bg',k)}/>
   <div className="chips"><button type="button" className={'chip'+(avatar&&a.glasses?' on':'')} aria-pressed={!!avatar&&a.glasses} onClick={()=>set('glasses',!a.glasses)}>Glasses</button><button type="button" className={'chip'+(avatar&&a.hoops?' on':'')} aria-pressed={!!avatar&&a.hoops} onClick={()=>set('hoops',!a.hoops)}>Hoop earrings</button></div>
   {avatar&&<button type="button" className="text-button small quiet" onClick={()=>onAvatar(null)}>Go back to the colourful default</button>}
   {photo&&<p className="fine">Your photo shows instead of this. Remove the photo to use the drawing.</p>}
  </div>
  :mode==='genmoji'?<div className="picker-rows">
   {!canUpload?<p className="fine">Save your name and handle first, then pick a Genmoji.</p>:<>
    <GenmojiPicker upload={upload} busy={busy} setBusy={setBusy} setError={setError}/>
    {photo&&<button type="button" className="text-button small danger" disabled={busy} onClick={async()=>{setBusy(true);await remove();setBusy(false)}}><Trash2 size={14}/>Remove picture</button>}
   </>}
   {error&&<p className="form-error" role="alert">{error}</p>}
  </div>
  :<div className="picker-rows">
   {!canUpload?<p className="fine">Save your name and handle first, then add a photo.</p>:<>
    <label className="outline-button file-button">{busy?<LoaderCircle className="spin" size={16}/>:<Camera size={16}/>}{photo?'Choose a different photo':'Choose a photo'}<input type="file" accept="image/*" className="sr-only" disabled={busy} onChange={choose}/></label>
    {photo&&<button type="button" className="text-button small danger" disabled={busy} onClick={async()=>{setBusy(true);await remove();setBusy(false)}}><Trash2 size={14}/>Remove photo</button>}
    <p className="fine">We crop and shrink it before saving. People in your plans can see it.</p>
   </>}
   {error&&<p className="form-error" role="alert">{error}</p>}
  </div>}
 </fieldset>
}
