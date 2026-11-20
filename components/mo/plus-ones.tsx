'use client';
// Bringing someone: a guest who answered asks the host if they can bring a friend (or adds them, when the host
// has opened the plan). Once they're on the list, the guest sends them their own invite from their phone.
// m.o never sends texts: each button opens Messages with the text filled in, and the person taps Send.
import {useEffect,useState} from 'react';
import {UserPlus,Send,Clock,X,Check} from 'lucide-react';
import type {Act,Detail,PlusOne} from '@/lib/types';
import {smsHref} from '@/lib/invite';
import {planLink} from '@/lib/short-link';
import {whenRange} from '@/lib/when';

// Links this phone made for the people it is bringing (kept on this phone only, like the host's).
const KEY='mo-plus-links';
type Saved=Record<string,{url:string;expires:string}>;
function loadLinks():Saved{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}}
function saveLinks(s:Saved){try{localStorage.setItem(KEY,JSON.stringify(s))}catch{}}

export function BringSomeone({detail,act,busy,notify}:{detail:Detail;act:Act;busy:boolean;notify:(t:string)=>void}){
 const id=detail.plan.id,host=detail.organizer||'the host',open=!!detail.openPlusOnes,people=detail.myPlusOnes||[],left=detail.plusOnesLeft??0;
 const me=detail.guests.find(g=>g.isMe),[name,setName]=useState(''),[asked,setAsked]=useState<string|null>(null),[links,setLinks]=useState<Saved>({}),[making,setMaking]=useState(false);
 useEffect(()=>{setLinks(loadLinks())},[]);
 const origin=typeof location==='undefined'?'':location.origin;
 const when=detail.plan.date?' on '+whenRange(detail.plan.date,detail.plan.end_date,' at '):'';
 const linkFor=(p:PlusOne)=>{const v=links[p.id];return v&&v.expires>new Date().toISOString()?v.url:''};
 const inviteText=(p:PlusOne,url:string)=>`Hi ${p.name.split(' ')[0]}! I’m bringing you to ${detail.plan.title}${when}. ${host} said yes. Tap to say if you can make it: ${url}`;
 const nudge=(n:string)=>`Hi ${host}! Can I bring ${n} to ${detail.plan.title}? You can say yes or no in m.o: ${planLink(origin,id)}`;

 async function ask(e:React.FormEvent){e.preventDefault();const n=name.trim();if(!n){notify('Type their name.');return}
  const ok=await act('plus-ones','POST',{name:n},d=>{d.myPlusOnes=[...(d.myPlusOnes||[]),{id:'demo-'+n,name:n,status:open?'invited':'requested',hasLink:false}];d.plusOnesLeft=Math.max(0,(d.plusOnesLeft||0)-1)},open?`${n} is on the list. Send them their invite below.`:`Asked. ${host} will see your request.`);
  if(ok){setName('');if(!open)setAsked(n)}}
 async function makeLink(p:PlusOne){if(id.startsWith('demo-')){notify('Demo only. Make a real plan to send invites.');return ''}
  setMaking(true);try{const r=await fetch(`/api/plan/${id}/guests/${p.id}/invite`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});const j=await r.json() as {error?:string;link?:string;expires?:string};if(!r.ok||!j.link)throw Error(j.error||'Could not make the link.');
   const next={...loadLinks(),[p.id]:{url:j.link,expires:j.expires||''}};saveLinks(next);setLinks(next);return j.link}catch(e){notify(e instanceof Error?e.message:'Could not make the link.');return ''}finally{setMaking(false)}}

 if(!people.length&&left<=0)return null;
 return <section className="soft-card bring-someone" aria-labelledby="bring-someone-title">
  <h3 id="bring-someone-title"><UserPlus size={18}/>Bringing someone?</h3>
  <p className="fine">{open?`${host} lets guests bring people. Add them, then send them their own invite.`:`Ask ${host} first. If ${host} says yes, you can send them their own invite.`} {left>0?`You can bring ${left} more.`:'You’ve used all 4 spots.'}</p>
  {left>0&&<form className="bring-someone-form" onSubmit={ask}>
   <label className="bring-someone-name"><span className="sr-only">Their name</span><input maxLength={60} value={name} onChange={e=>setName(e.target.value)} placeholder="Their name" autoComplete="off"/></label>
   <button className="primary bring-someone-ask" disabled={busy||!name.trim()}>{open?'Add them':`Ask ${host}`}</button>
  </form>}
  {asked&&<div className="bring-someone-nudge"><p>Want to text {host} too, so they see it sooner?</p><a className="outline-button" href={smsHref('',nudge(asked))} onClick={()=>setAsked(null)}><Send size={15}/>Text {host}</a><button className="text-button small quiet" onClick={()=>setAsked(null)}>No thanks</button></div>}
  {people.length>0&&<ul className="bring-someone-list">{people.map(p=>{const url=linkFor(p),waiting=p.status==='requested',no=p.status==='declined';return <li key={p.id}>
   <div className="bring-someone-who"><strong>{p.name}</strong>
    <span className={'bring-someone-status'+(no?' declined':waiting?' waiting':' yes')}>{waiting?<><Clock size={14}/>Waiting for {host}</>:no?<><X size={14}/>{host} said not this time</>:<><Check size={14}/>{p.status==='in'?'Going':p.status==='maybe'?'Still checking':p.status==='out'?'Can’t make it':'On the list'}</>}</span></div>
   {waiting||no?<button className="text-button small quiet" disabled={busy} onClick={()=>act(`plus-ones/${p.id}`,'DELETE',{},d=>{d.myPlusOnes=(d.myPlusOnes||[]).filter(x=>x.id!==p.id)},waiting?`Request for ${p.name} withdrawn.`:'Cleared.')}>{waiting?'Withdraw':'Clear'}</button>
    :url?<a className="outline-button" href={smsHref('',inviteText(p,url))}><Send size={15}/>Send {p.name.split(' ')[0]} the invite</a>
    :!p.hasLink?<button className="outline-button brick" disabled={making} onClick={async()=>{const u=await makeLink(p);if(u)location.href=smsHref('',inviteText(p,u))}}><Send size={15}/>{making?'Making the link…':`Send ${p.name.split(' ')[0]} the invite`}</button>
    :<span className="fine">Their invite link was already made. To send it again, ask {host}.</span>}
  </li>})}</ul>}
 </section>;
}
