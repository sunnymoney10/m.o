'use client';
// "Your picture": draw your own avatar from a few choices, or upload a photo. Photos are shrunk on the phone
// to a small square before upload, so they fit the free database and load quickly for everyone.
import {useState} from 'react';
import {Camera,Trash2,LoaderCircle,Palette} from 'lucide-react';
import type {Avatar} from '@/lib/avatar';
import {AVATAR,DEFAULT_AVATAR,PHOTO_MAX_BYTES} from '@/lib/avatar';
import {Face} from './art';

async function shrink(file:File){
 const bitmap=await createImageBitmap(file);const size=320,side=Math.min(bitmap.width,bitmap.height);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=size;const ctx=canvas.getContext('2d')!;
 ctx.drawImage(bitmap,(bitmap.width-side)/2,(bitmap.height-side)/2,side,side,0,0,size,size);bitmap.close?.();
 for(const [type,q] of [['image/webp',.82],['image/webp',.68],['image/jpeg',.8],['image/jpeg',.65],['image/jpeg',.5]] as const){
  const url=canvas.toDataURL(type,q);if(url.startsWith('data:'+type)&&url.length*.75<PHOTO_MAX_BYTES)return url}
 throw Error('That photo is too detailed to shrink. Try another.');
}
const Swatches=({label,list,value,onPick}:{label:string;list:readonly (readonly [string,string])[];value:string;onPick:(k:string)=>void})=>
 <fieldset><legend>{label}</legend><div className="swatches">{list.map(([k,c])=><button type="button" key={k} className={'swatch'+(value===k?' on':'')} style={{background:c}} aria-label={label+': '+k.replace(/(\d)$/,' $1')} aria-pressed={value===k} onClick={()=>onPick(k)}/>)}</div></fieldset>;

export function AvatarPicker({seed,avatar,photo,canUpload,onAvatar,upload,remove}:{seed:string;avatar:Avatar|null|undefined;photo:string|null|undefined;canUpload:boolean;onAvatar:(a:Avatar|null)=>void;upload:(dataUrl:string)=>Promise<boolean>;remove:()=>Promise<boolean>}){
 const [mode,setMode]=useState<'draw'|'photo'>(photo?'photo':'draw'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const a=avatar||DEFAULT_AVATAR,set=(k:keyof Avatar,v:string|boolean)=>onAvatar({...a,[k]:v});
 async function choose(e:React.ChangeEvent<HTMLInputElement>){const file=e.target.files?.[0];e.target.value='';if(!file)return;setError('');setBusy(true);
  try{const url=await shrink(file);await upload(url)}catch(err:any){setError(err.message||'Couldn’t use that photo. Try another.')}finally{setBusy(false)}}
 return <fieldset className="avatar-picker"><legend>Your picture</legend>
  <div className="avatar-preview"><Face className="avatar-big" seed={seed} avatar={avatar} photo={mode==='photo'?photo:null}/>
   <div className="seg small" role="group" aria-label="Picture type"><button type="button" className={mode==='draw'?'on':''} aria-pressed={mode==='draw'} onClick={()=>setMode('draw')}><Palette size={15}/>Draw me</button><button type="button" className={mode==='photo'?'on':''} aria-pressed={mode==='photo'} onClick={()=>setMode('photo')}><Camera size={15}/>Photo</button></div></div>
  {mode==='draw'?<div className="picker-rows">
   {!avatar&&<p className="fine">You’re using a colourful default. Pick anything below to make it yours.</p>}
   <Swatches label="Face" list={AVATAR.tones} value={avatar?a.tone:''} onPick={k=>set('tone',k)}/>
   <fieldset><legend>Hair</legend><div className="chips">{AVATAR.hair.map(([k,l])=><button type="button" key={k} className={'chip'+(avatar&&a.hair===k?' on':'')} aria-pressed={!!avatar&&a.hair===k} onClick={()=>set('hair',k)}>{l}</button>)}</div></fieldset>
   <Swatches label="Hair colour" list={AVATAR.hairColors} value={avatar?a.hairColor:''} onPick={k=>set('hairColor',k)}/>
   <Swatches label="Top" list={AVATAR.shirts} value={avatar?a.shirt:''} onPick={k=>set('shirt',k)}/>
   <Swatches label="Background" list={AVATAR.backgrounds} value={avatar?a.bg:''} onPick={k=>set('bg',k)}/>
   <div className="chips"><button type="button" className={'chip'+(avatar&&a.glasses?' on':'')} aria-pressed={!!avatar&&a.glasses} onClick={()=>set('glasses',!a.glasses)}>Glasses</button><button type="button" className={'chip'+(avatar&&a.hoops?' on':'')} aria-pressed={!!avatar&&a.hoops} onClick={()=>set('hoops',!a.hoops)}>Hoop earrings</button></div>
   {avatar&&<button type="button" className="text-button small quiet" onClick={()=>onAvatar(null)}>Go back to the colourful default</button>}
   {photo&&<p className="fine">Your photo is showing instead. Remove it under Photo to use this drawing.</p>}
  </div>
  :<div className="picker-rows">
   {!canUpload?<p className="fine">Save your name and handle first, then add a photo.</p>:<>
    <label className="outline-button file-button">{busy?<LoaderCircle className="spin" size={16}/>:<Camera size={16}/>}{photo?'Choose a different photo':'Choose a photo'}<input type="file" accept="image/*" className="sr-only" disabled={busy} onChange={choose}/></label>
    {photo&&<button type="button" className="text-button small danger" disabled={busy} onClick={async()=>{setBusy(true);await remove();setBusy(false)}}><Trash2 size={14}/>Remove photo</button>}
    <p className="fine">Cropped to a square and shrunk on your phone before it’s saved. People in plans you join can see it.</p>
   </>}
   {error&&<p className="form-error" role="alert">{error}</p>}
  </div>}
 </fieldset>
}
