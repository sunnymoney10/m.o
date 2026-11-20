'use client';
import {INVITE_THEMES,INVITE_COLORS,suggestedTheme,themeError} from '@/lib/invite-theme';
import {InviteArt} from './invite-art';

type Style={title:string;kind:string;theme:string;accent:string;emoji:string};
export function InviteStyle({value,onChange}:{value:Style;onChange:(style:Partial<Style>)=>void}){
 const error=themeError(value);
 const suggestion=suggestedTheme(value.title),suggested=INVITE_THEMES.find(t=>t[0]===suggestion);
 return <div className="invite-style">
  <p className="fine">Choose a background for your plan. Your title and details stay easy to read below it.</p>
  {suggested&&suggestion!==value.theme&&<button type="button" className="text-button" onClick={()=>onChange({theme:suggestion!,emoji:''})}>Try a {suggested[1].toLowerCase()} theme</button>}
  <fieldset><legend>Theme</legend><div className="invite-theme-options">{INVITE_THEMES.map(([key,label,emoji])=><button type="button" key={key} aria-pressed={value.theme===key} onClick={()=>onChange({theme:key,emoji:''})}><span aria-hidden="true">{emoji}</span>{label}</button>)}</div></fieldset>
  <fieldset><legend>Background color</legend><div className="invite-color-options">{Object.entries(INVITE_COLORS).map(([key,color])=><button type="button" key={key} aria-label={key+' background'} aria-pressed={value.accent===key} onClick={()=>onChange({accent:key})}><span aria-hidden="true" style={{background:color}}/>{key}</button>)}</div></fieldset>
  <label>Your own emoji <small>(optional)</small><input className="invite-emoji-input" maxLength={32} value={value.emoji} onChange={e=>onChange({emoji:e.target.value})} placeholder="e.g. 🛼" aria-invalid={!!error} aria-describedby="invite-emoji-help"/><small id="invite-emoji-help">Use one emoji, or leave this empty to use the theme’s emoji.</small>{error&&<small className="theme-validation" role="alert">{error}</small>}</label>
  <div className="invite-style-preview" aria-label="Invite preview"><InviteArt plan={{...value,id:'invite-preview',date:'',place:'',budget:'',note:''}}/><strong>{value.title||'Your plan name'}</strong></div>
 </div>;
}
