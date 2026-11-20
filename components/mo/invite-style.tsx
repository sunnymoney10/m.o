'use client';
import {useState,useRef,useEffect} from 'react';
import {INVITE_THEMES,INVITE_COLORS,suggestedTheme,themeError,styleFromEmoji} from '@/lib/invite-theme';
import {prepareInviteCover} from '@/lib/invite-cover';
import {InviteArt} from './invite-art';

type Style={title:string;kind:string;theme:string;accent:string;emoji:string;coverUrl:string;coverImage?:string;coverBusy:boolean};
export function InviteStyle({value,onChange}:{value:Style;onChange:(style:Partial<Style>)=>void}){
 const [uploadError,setUploadError]=useState('');const generation=useRef(0);
 useEffect(()=>()=>{generation.current++},[]);
 const error=themeError(value),suggestion=suggestedTheme(value.title),suggested=INVITE_THEMES.find(t=>t[0]===suggestion);
 function pick(style:Partial<Style>){generation.current++;setUploadError('');onChange({...style,coverImage:'',coverUrl:'',coverBusy:false});}
 async function upload(e:React.ChangeEvent<HTMLInputElement>){const file=e.target.files?.[0];e.target.value='';if(!file)return;const n=++generation.current;setUploadError('');onChange({coverBusy:true});try{const cover=await prepareInviteCover(file);if(n===generation.current)onChange({coverImage:cover,coverUrl:cover,coverBusy:false,emoji:themeError({emoji:value.emoji})?'':value.emoji});}catch(err){if(n===generation.current){setUploadError(err instanceof Error?err.message:'Couldn’t use that image.');onChange({coverBusy:false});}}}
 return <div className="invite-style">
  <p className="fine">Give us one emoji and we’ll style your invite. Or use your own image.</p>
  <label>Your own emoji <small>(optional)</small><input className="invite-emoji-input" maxLength={32} value={value.emoji} disabled={value.coverBusy} onChange={e=>{const emoji=e.target.value,style=styleFromEmoji(emoji);if(style)pick(style);else onChange({emoji});}} placeholder="e.g. 🛼" aria-invalid={!!error} aria-describedby="invite-emoji-help"/><small id="invite-emoji-help">One emoji automatically picks a matching theme and color. You can adjust them below.</small>{error&&<small className="theme-validation" role="alert">{error}</small>}</label>
  <label className="invite-cover-upload">Upload your own image<input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif" onChange={upload} disabled={value.coverBusy}/><small>Centered and cropped to fit. Visible to anyone with the plan link. Use an image you’re comfortable sharing.</small></label>
  {value.coverBusy&&<p className="fine" role="status">Preparing your image…</p>}
  {uploadError&&<p role="alert" className="theme-validation">{uploadError}</p>}
  {value.coverUrl&&<button type="button" className="text-button" onClick={()=>pick({})}>Remove cover image</button>}
  {suggested&&suggestion!==value.theme&&<button type="button" className="text-button" onClick={()=>pick({theme:suggestion!,emoji:''})}>Try a {suggested[1].toLowerCase()} theme</button>}
  <fieldset><legend>Theme</legend><div className="invite-theme-options">{INVITE_THEMES.map(([key,label,emoji])=><button type="button" key={key} aria-pressed={!value.coverUrl&&value.theme===key} onClick={()=>pick({theme:key,emoji:''})}><span aria-hidden="true">{emoji}</span>{label}</button>)}</div></fieldset>
  <fieldset><legend>Background color</legend><div className="invite-color-options">{Object.entries(INVITE_COLORS).map(([key,color])=><button type="button" key={key} aria-label={key+' background'} aria-pressed={value.accent===key} onClick={()=>onChange({accent:key})}><span aria-hidden="true" style={{background:color}}/>{key}</button>)}</div></fieldset>
  <div className="invite-style-preview" aria-label="Invite preview"><InviteArt plan={{...value,cover_url:value.coverUrl,id:'invite-preview',date:'',place:'',budget:'',note:''}}/><strong>{value.title||'Your plan name'}</strong></div>
 </div>;
}
