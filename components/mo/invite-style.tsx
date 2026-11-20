'use client';
import {useState,useRef,useEffect} from 'react';
import {INVITE_THEMES,INVITE_COLORS,suggestedTheme,themeError,styleFromEmoji} from '@/lib/invite-theme';
import {prepareInviteCover} from '@/lib/invite-cover';
import {InviteArt} from './invite-art';
import {GenmojiBox,type Picked} from './genmoji-box';

// A Genmoji invite: drawn like the emoji invites (colour, soft circles, lights, one big and two small faded copies),
// then saved through the same checked cover upload.
async function genmojiCover(image:Blob,color:string,dark:boolean){
 const c=document.createElement('canvas');c.width=1280;c.height=640;const x=c.getContext('2d')!;const k=2;
 x.fillStyle=color;x.fillRect(0,0,1280,640);x.fillStyle='rgba(255,250,243,.22)';
 x.beginPath();x.arc(80*k,80*k,125*k,0,7);x.fill();x.beginPath();x.arc(575*k,285*k,170*k,0,7);x.fill();
 x.strokeStyle=dark?'#f5d36a':'#3a1a2b';x.lineWidth=4*k;x.beginPath();x.moveTo(0,30*k);x.quadraticCurveTo(320*k,120*k,640*k,30*k);x.stroke();
 x.fillStyle='#fffaf3';[65,180,320,460,575].forEach((cx,i)=>{x.beginPath();x.arc(cx*k,(i===2?75:i%2?64:44)*k,7*k,0,7);x.fill()});
 const bm=await createImageBitmap(image);const put=(cx:number,cy:number,h:number,rot:number,alpha:number)=>{const w=h*bm.width/bm.height;x.save();x.globalAlpha=alpha;x.translate(cx*k,cy*k);x.rotate(rot*Math.PI/180);x.drawImage(bm,-w*k/2,-h*k/2,w*k,h*k);x.restore()};
 put(105,205,70,-18,.45);put(535,170,74,16,.45);put(320,200,150,0,1);bm.close?.();
 const blob=await new Promise<Blob|null>(r=>c.toBlob(r,'image/png'));if(!blob)throw Error('This browser couldn’t prepare the Genmoji.');
 return new File([blob],'genmoji-invite.png',{type:'image/png'});
}

type Style={title:string;kind:string;theme:string;accent:string;emoji:string;coverUrl:string;coverImage?:string;coverBusy:boolean};
export function InviteStyle({value,onChange}:{value:Style;onChange:(style:Partial<Style>)=>void}){
 const [uploadError,setUploadError]=useState('');const generation=useRef(0);
 useEffect(()=>()=>{generation.current++},[]);
 const error=themeError(value),suggestion=suggestedTheme(value.title),suggested=INVITE_THEMES.find(t=>t[0]===suggestion);
 const genmoji=useRef<Blob|null>(null);
 async function applyGenmoji(image:Blob,accent:string){const n=++generation.current;genmoji.current=image;setUploadError('');onChange({coverBusy:true});
  try{const cover=await prepareInviteCover(await genmojiCover(image,INVITE_COLORS[accent as keyof typeof INVITE_COLORS]||INVITE_COLORS.butter,accent==='plum'));if(n===generation.current)onChange({coverImage:cover,coverUrl:cover,coverBusy:false,emoji:''})}
  catch(err){if(n===generation.current){setUploadError(err instanceof Error?err.message:'Couldn’t use that Genmoji.');onChange({coverBusy:false})}}}
 function picked(p:Picked){if(p.image){void applyGenmoji(p.image,value.accent);return}if(p.emoji){const style=styleFromEmoji(p.emoji);if(style)pick(style);else onChange({emoji:p.emoji})}}
 function pick(style:Partial<Style>){genmoji.current=null;generation.current++;setUploadError('');onChange({...style,coverImage:'',coverUrl:'',coverBusy:false});}
 async function upload(e:React.ChangeEvent<HTMLInputElement>){const file=e.target.files?.[0];e.target.value='';if(!file)return;const n=++generation.current;setUploadError('');onChange({coverBusy:true});try{const cover=await prepareInviteCover(file);if(n===generation.current)onChange({coverImage:cover,coverUrl:cover,coverBusy:false,emoji:themeError({emoji:value.emoji})?'':value.emoji});}catch(err){if(n===generation.current){setUploadError(err instanceof Error?err.message:'Couldn’t use that image.');onChange({coverBusy:false});}}}
 return <div className="invite-style">
  <p className="fine">Give us one emoji and we’ll style your invite. Or use your own image.</p>
  <label>Your own emoji <small>(optional)</small><input className="invite-emoji-input" maxLength={32} value={value.emoji} disabled={value.coverBusy} onChange={e=>{const emoji=e.target.value,style=styleFromEmoji(emoji);if(style)pick(style);else onChange({emoji});}} placeholder="e.g. 🛼" aria-invalid={!!error} aria-describedby="invite-emoji-help"/><small id="invite-emoji-help">One emoji automatically picks a matching theme and color. You can adjust them below.</small>{error&&<small className="theme-validation" role="alert">{error}</small>}</label>
  <div className="invite-genmoji"><span className="invite-genmoji-label">Using a Genmoji? Tap here instead</span><GenmojiBox label="Tap here, then pick a Genmoji or emoji for your invite" disabled={value.coverBusy} onPicked={picked}/><small>iPhone doesn’t allow Genmoji in the box above, so use this one. Tap it, then the smiley-face key, and pick your Genmoji.</small></div>
  <label className="invite-cover-upload">Upload your own image<input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif" onChange={upload} disabled={value.coverBusy}/><small>Centered and cropped to fit. Visible to anyone with the plan link. Use an image you’re comfortable sharing.</small></label>
  {value.coverBusy&&<p className="fine" role="status">Preparing your image…</p>}
  {uploadError&&<p role="alert" className="theme-validation">{uploadError}</p>}
  {value.coverUrl&&<button type="button" className="text-button" onClick={()=>pick({})}>{genmoji.current?'Remove Genmoji':'Remove cover image'}</button>}
  {suggested&&suggestion!==value.theme&&<button type="button" className="text-button" onClick={()=>pick({theme:suggestion!,emoji:''})}>Try a {suggested[1].toLowerCase()} theme</button>}
  <fieldset><legend>Theme</legend><div className="invite-theme-options">{INVITE_THEMES.map(([key,label,emoji])=><button type="button" key={key} aria-pressed={!value.coverUrl&&value.theme===key} onClick={()=>pick({theme:key,emoji:''})}><span aria-hidden="true">{emoji}</span>{label}</button>)}</div></fieldset>
  <fieldset><legend>Background color</legend><div className="invite-color-options">{Object.entries(INVITE_COLORS).map(([key,color])=><button type="button" key={key} aria-label={key+' background'} aria-pressed={value.accent===key} onClick={()=>{onChange({accent:key});if(genmoji.current&&value.coverUrl)void applyGenmoji(genmoji.current,key)}}><span aria-hidden="true" style={{background:color}}/>{key}</button>)}</div></fieldset>
  <div className="invite-style-preview" aria-label="Invite preview"><InviteArt plan={{...value,cover_url:value.coverUrl,id:'invite-preview',date:'',place:'',budget:'',note:''}}/><strong>{value.title||'Your plan name'}</strong></div>
 </div>;
}
