'use client';
import {whenRange} from '@/lib/when';
// Send invites: a personal text for each guest, opened in the phone's Messages app (the host taps Send).
// "Send to everyone" walks the list one person at a time. Numbers stay on this phone only.
import {useEffect,useState} from 'react';
import {Send,Check,X,Pencil,Lock} from 'lucide-react';
import type {Detail,Guest} from '@/lib/types';
import {ago} from '@/lib/types';
import {DEFAULT_MESSAGE,TRIP_MESSAGE,fillMessage,loadInvites,nameKey,personalLink,saveInvites,smsHref} from '@/lib/invite';
import {Face} from './art';

function whenText(date:string,end?:string){return whenRange(date,end,' at ')}

export function SendInvites({detail,notify,onClose,onSent}:{detail:Detail;notify:(t:string)=>void;onClose:()=>void;onSent:()=>void}){
 const id=detail.plan.id,[store,setStore]=useState<{phones:Record<string,string>;sent:Record<string,string>;template?:string}>({phones:{},sent:{}}),[editing,setEditing]=useState(false);
 useEffect(()=>{setStore(loadInvites(id))},[id]);
 const update=(s:{phones:Record<string,string>;sent:Record<string,string>;template?:string})=>{setStore(s);saveInvites(id,s)};
 const template=store.template||(detail.plan.kind==='trip'?TRIP_MESSAGE:DEFAULT_MESSAGE);
 const guests=detail.guests.filter(g=>!g.isHost&&g.id);
 const origin=typeof location!=='undefined'?location.origin:'';
 const message=(g:Guest)=>fillMessage(template,{first:g.name.split(' ')[0],plan:detail.plan.title,when:whenText(detail.plan.date,detail.plan.end_date),link:personalLink(origin,id,g.id!,g.key)});
 const queue=guests.filter(g=>!store.sent[nameKey(g.name)]&&g.status==='invited');
 const next=queue[0];
 function markSent(g:Guest){update({...store,sent:{...store.sent,[nameKey(g.name)]:new Date().toISOString()}});onSent();notify(`Opening Messages for ${g.name}. Tap Send there, then come back.`)}

 return <section className="send-invites" aria-labelledby="send-title">
  <div className="section-title"><h2 id="send-title">Send invites</h2><button className="icon-button" aria-label="Close send invites" onClick={onClose}><X size={20}/></button></div>
  <p className="fine">Each person gets their own message and link. Tapping Send opens Messages with it filled in. You tap Send there.</p>
  {guests.length===0?<p className="inline-empty">Add names to your guest list first.</p>:<>
   {next?<a className="primary block" href={smsHref(store.phones[nameKey(next.name)]||'',message(next))} onClick={()=>markSent(next)}><Send size={17}/>Send to {next.name} ({guests.length-queue.length+1} of {guests.length})</a>
    :<p className="all-sent"><Check size={16}/>Everyone on your list has an invite or has already answered.</p>}
   <ul className="invite-rows">{guests.map(g=>{const k=nameKey(g.name),sent=store.sent[k],answered=g.status!=='invited';return <li key={g.id}>
    <Face className="mini-avatar" seed={g.handle||g.name} avatar={g.avatar} photo={g.photo}/>
    <div className="invite-who"><strong>{g.name}</strong>
     <input type="tel" inputMode="tel" autoComplete="off" aria-label={`${g.name}’s phone number (optional)`} placeholder="Phone (optional)" maxLength={24} value={store.phones[k]||''} onChange={e=>update({...store,phones:{...store.phones,[k]:e.target.value}})}/>
     <small>{answered?'Already answered':sent?`Invite sent ${ago(sent)}`:'Not sent yet'}</small></div>
    <a className={sent||answered?'outline-button':'outline-button brick'} href={smsHref(store.phones[k]||'',message(g))} onClick={()=>markSent(g)}><Send size={15}/>{sent?'Again':'Send'}</a>
   </li>})}</ul>
   {editing?<label className="template">Your message <small>{'{first}'} becomes their first name; {'{link}'} their personal link.</small><textarea rows={4} maxLength={600} value={template} onChange={e=>update({...store,template:e.target.value})}/><span className="row-gap"><button className="text-button" onClick={()=>setEditing(false)}>Done</button><button className="text-button quiet" onClick={()=>update({...store,template:undefined})}>Reset to default</button></span></label>
    :<div className="preview"><span className="eyebrow">PREVIEW</span><p>{message(guests[0])}</p><button className="text-button" onClick={()=>setEditing(true)}><Pencil size={14}/>Edit message</button></div>}
   <p className="hint"><Lock size={12}/>Phone numbers stay on this phone. m.o never saves them or sends texts for you.</p>
  </>}
 </section>
}
