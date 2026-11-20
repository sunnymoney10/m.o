'use client';
import {whenRange} from '@/lib/when';
// Send invites: a personal text for each guest, opened in the phone's Messages app (the host taps Send).
// "Send to everyone" walks the list one person at a time. Numbers stay on this phone only.
import {useEffect,useState} from 'react';
import {Send,Check,X,Pencil,Lock} from 'lucide-react';
import type {Detail,Guest} from '@/lib/types';
import {ago} from '@/lib/types';
import {DEFAULT_MESSAGE,TRIP_MESSAGE,fillMessage,loadInvites,nameKey,saveInvites,smsHref} from '@/lib/invite';
import type {InviteStore} from '@/lib/invite';
import {Face} from './art';

function whenText(date:string,end?:string){return whenRange(date,end,' at ')}

export function SendInvites({detail,notify,onClose,onSent}:{detail:Detail;notify:(t:string)=>void;onClose:()=>void;onSent:()=>void}){
 const id=detail.plan.id,[store,setStore]=useState<InviteStore>({phones:{},sent:{}}),[editing,setEditing]=useState(false);
 useEffect(()=>{setStore(loadInvites(id))},[id]);
 const update=(s:InviteStore)=>{setStore(s);saveInvites(id,s)};
 const template=store.template||(detail.plan.kind==='trip'?TRIP_MESSAGE:DEFAULT_MESSAGE);
 const guests=detail.guests.filter(g=>!g.isHost&&g.id);
 const [preparing,setPreparing]=useState(false);
 const linkFor=(g:Guest)=>{const v=store.links?.[g.id!];return v&&v.expires>new Date().toISOString()?v.url:''};
 async function prepare(g:Guest,revoke=false){if(id.startsWith('demo-')){notify('Demo only. Make a real plan to create personal links.');return}setPreparing(true);try{const r=await fetch(`/api/plan/${id}/guests/${g.id}/invite`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revoke})});const j=await r.json() as {error?:string;link:string;expires:string};if(!r.ok)throw Error(j.error);const links={...store.links};if(revoke)delete links[g.id!];else links[g.id!]={url:j.link,expires:j.expires};update({...store,links});notify(revoke?'Personal link revoked. Existing access is stopped.':'Personal link ready. Older links for this person no longer work.')}catch(e){notify(e instanceof Error?e.message:'Could not prepare the link.')}finally{setPreparing(false)}}
 const message=(g:Guest)=>fillMessage(template,{first:g.name.split(' ')[0],plan:detail.plan.title,when:whenText(detail.plan.date,detail.plan.end_date),link:linkFor(g)});
 const madeByGuest=(g:Guest)=>!!g.withName&&!!g.hasLink&&!linkFor(g);
 const queue=guests.filter(g=>!store.sent[nameKey(g.name)]&&g.status==='invited'&&!madeByGuest(g));
 const viaText=(g:Guest,url:string)=>`Hi ${g.withName!.split(' ')[0]}! Here’s ${g.name.split(' ')[0]}’s invite to ${detail.plan.title}. Can you send it to them? ${url}`;
 const next=queue[0];
 function markSent(g:Guest){update({...store,sent:{...store.sent,[nameKey(g.name)]:new Date().toISOString()}});onSent();notify(`Opening Messages for ${g.name}. Tap Send there, then come back.`)}

 return <section className="send-invites" aria-labelledby="send-title">
  <div className="section-title"><h2 id="send-title">Send invites</h2><button className="icon-button" aria-label="Close send invites" onClick={onClose}><X size={20}/></button></div>
  <p className="fine">Links expire after 30 days. Replacing or revoking a link stops access on other devices. Keep links private: anyone you forward one to can reply as that guest. Door codes must be sent separately.</p><p className="fine">Each person gets their own message and link. Tapping Send opens Messages with it filled in. You tap Send there.</p>
  {guests.length===0?<p className="inline-empty">Add names to your guest list first.</p>:<>
   {next&&linkFor(next)?<a className="primary block" href={smsHref(store.phones[nameKey(next.name)]||'',message(next))} onClick={()=>markSent(next)}><Send size={17}/>Send to {next.name} ({guests.length-queue.length+1} of {guests.length})</a>
    :next?<button className="primary block" disabled={preparing} onClick={()=>prepare(next)}>{preparing?'Preparing…':`Prepare invite for ${next.name}`}</button>:<p className="all-sent"><Check size={16}/>Everyone on your list has an invite or has already answered.</p>}
   <ul className="invite-rows">{guests.map(g=>{const k=nameKey(g.name),sent=store.sent[k],answered=g.status!=='invited';return <li key={g.id}>
    <Face className="mini-avatar" seed={g.handle||g.name} avatar={g.avatar} photo={g.photo}/>
    <div className="invite-who"><strong>{g.name}{g.withName&&<span className="with-guest"> · with {g.withName}</span>}</strong>
     <input type="tel" inputMode="tel" autoComplete="off" aria-label={`${g.name}’s phone number (optional)`} placeholder="Phone (optional)" maxLength={24} value={store.phones[k]||''} onChange={e=>update({...store,phones:{...store.phones,[k]:e.target.value}})}/>
     <small>{answered?'Already answered':sent?`Invite sent ${ago(sent)}`:madeByGuest(g)?`${g.withName} already has their link`:'Not sent yet'}</small></div>
    {linkFor(g)&&<a className={sent||answered?'outline-button':'outline-button brick'} href={smsHref(store.phones[k]||'',message(g))} onClick={()=>markSent(g)}><Send size={15}/>{sent?'Again':'Send'}</a>}
    {g.withName&&linkFor(g)&&!answered&&<a className="text-button small via-guest-link" href={smsHref(store.phones[nameKey(g.withName)]||'',viaText(g,linkFor(g)))}><Send size={14}/>Send it to {g.withName} to pass on</a>}
    <div className="invite-access-actions"><button className="text-button small" disabled={preparing} onClick={()=>prepare(g)}>{linkFor(g)?'Replace personal link':'Prepare personal link'}</button><button className="text-button small quiet" disabled={preparing} onClick={()=>prepare(g,true)}>Revoke personal link</button></div>
   </li>})}</ul>
   {editing?<label className="template">Your message <small>{'{first}'} becomes their first name; {'{link}'} their personal link.</small><textarea rows={4} maxLength={600} value={template} onChange={e=>update({...store,template:e.target.value})}/><span className="row-gap"><button className="text-button" onClick={()=>setEditing(false)}>Done</button><button className="text-button quiet" onClick={()=>update({...store,template:undefined})}>Reset to default</button></span></label>
    :<div className="preview"><span className="eyebrow">PREVIEW</span><p>{linkFor(guests[0])?message(guests[0]):'Prepare a personal link to preview the invitation.'}</p><button className="text-button" onClick={()=>setEditing(true)}><Pencil size={14}/>Edit message</button></div>}
   <p className="hint"><Lock size={12}/>Phone numbers stay on this phone. m.o never saves them or sends texts for you.</p>
  </>}
 </section>
}
