'use client';
// The host's private link. Opening it on another phone or computer lets the host manage this plan there too.
// Making a new link turns the old one off. m.o only keeps a scrambled copy, so a lost link can't be shown again.
import {useState} from 'react';
import {KeyRound,Copy,Send} from 'lucide-react';
import {smsHref} from '@/lib/invite';

export function HostLink({planId,hasKey,notify,onMade}:{planId:string;hasKey:boolean;notify:(t:string)=>void;onMade:()=>void}){
 const [link,setLink]=useState(''),[busy,setBusy]=useState(false);
 async function make(){
  if(hasKey&&!confirm('Make a new host link? The old link and other recovered devices will stop working.'))return;
  setBusy(true);try{const r=await fetch(`/api/plan/${planId}/host-link`,{method:'POST'});const d:any=await r.json();if(!r.ok)throw new Error(d.error||'Couldn’t make a host link.');setLink(d.link);onMade()}
  catch(e:any){notify(e.message)}finally{setBusy(false)}}
 async function copy(){try{await navigator.clipboard.writeText(link);notify('Host link copied. Save it somewhere only you can see, like Notes.')}catch{notify('Press and hold the link to copy it.')}}
 const body=`My m.o host link (keep it private): ${link}`;
 return <section className="soft-card host-link" aria-labelledby="host-link-title">
  <span className="eyebrow"><KeyRound size={13}/> ONLY FOR YOU</span>
  <h3 id="host-link-title">Your host link</h3>
  {link?<>
   <p>Open this link on any phone or computer to manage this plan there. <strong>Keep it private:</strong> anyone with it can manage this plan. Other plans on this device are not shared.</p>
   <p className="host-link-url">{link}</p>
   <div className="draft-actions"><a className="primary" href={smsHref('',body)}><Send size={16}/>Text it to myself</a><button className="outline-button" onClick={copy}><Copy size={16}/>Copy</button></div>
   <small>It won’t be shown again. If you lose it, make a new one here.</small>
  </>:<>
   <p>{hasKey?'You already made a host link. Lost it? Make a new one; the old link and other recovered devices stop working.':'If you switch phones or clear your browser, this link restores host access to this plan. It does not restore your profile or other plans.'}</p>
   <button className="outline-button brick" disabled={busy} onClick={make}><KeyRound size={16}/>{hasKey?'Make a new host link':'Get my host link'}</button>
  </>}
 </section>
}
