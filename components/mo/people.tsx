'use client';
// The People tab: a guest finds their name, RSVPs (with extra guests, dietary needs and a sleepover request),
// and the organizer manages the guest list. Dietary needs, sleepovers and pending extra guests are shown
// only to the organizer and the guest themselves; the server enforces the same rule.
import {useState} from 'react';
import {Check,Clock,X,Plus,Minus,Trash2,Moon,Utensils,UserPlus,LoaderCircle} from 'lucide-react';
import type {Act,Detail,Guest} from '@/lib/types';
import {Face} from './art';

const ORDER:Record<string,number>={in:1,maybe:2,invited:3,out:4};
const STATUS:Record<string,string>={in:'Going',maybe:'Checking',invited:'No reply yet',out:'Can’t go'};
const plusLine=(g:Guest)=>g.extra_count?`+${g.extra_count}${g.extra_names?' · '+g.extra_names:''}`:'';
function storedName(){try{return localStorage.getItem('mo-name')||''}catch{return ''}}
function remember(n:string){try{localStorage.setItem('mo-name',n)}catch{}}

export function PeopleTab({detail,act,busy,notify}:{detail:Detail;act:Act;busy:boolean;notify:(t:string)=>void}){
 const host=detail.host,guests=detail.guests,me=guests.find(g=>g.isMe),answered=!!me&&me.status!=='invited';
 const [editing,setEditing]=useState(false),[notListed,setNotListed]=useState(false),[otherPhone,setOtherPhone]=useState(false);
 const [f,setF]=useState(()=>({name:me?.name||storedName(),status:me&&me.status!=='invited'?me.status:'',extra:me?.extra_count||0,extraNames:me?.extra_names||'',dietary:me?.dietary||'',staying:!!me?.staying,note:me?.note||''}));
 const [adding,setAdding]=useState(''),[addOpen,setAddOpen]=useState(false);
 const sorted=[...guests].sort((a,b)=>(a.isHost?0:ORDER[a.status]||5)-(b.isHost?0:ORDER[b.status]||5));
 const unanswered=guests.filter(g=>g.status==='invited'&&!g.isMe),others=guests.filter(g=>!g.isHost&&!g.isMe&&g.status!=='invited');
 const going=guests.filter(g=>g.status==='in').reduce((n,g)=>n+1+(g.extra_status==='approved'?g.extra_count||0:0),0);
 const showForm=host?editing:(!answered&&(!!me||notListed||unanswered.length===0))||editing;

 async function pick(g:Guest){
  if(g.status!=='invited'&&!confirm(`${g.name} already answered from another phone or browser. Continue as ${g.name} here?`))return;
  const ok=await act(`guests/${g.id}/pick`,'POST',{},d=>{for(const x of d.guests)x.isMe=x.id===g.id},`Hi ${g.name}.`);
  if(ok){setF(x=>({...x,name:g.name,status:g.status==='invited'?'':g.status,extra:g.extra_count||0,extraNames:g.extra_names||'',dietary:g.dietary||'',staying:!!g.staying,note:g.note||''}));setOtherPhone(false);if(g.status!=='invited')setEditing(false)}
 }
 async function send(e:React.FormEvent){e.preventDefault();
  if(!f.name.trim()){notify('Add your name first.');return}
  if(!f.status){notify('Choose going, checking, or can’t make it.');return}
  const out=f.status==='out',extra=out?0:f.extra,mineItems=detail.tasks.filter(t=>t.isMine).map(t=>t.title);
  const body={name:f.name.trim(),status:f.status,note:f.note,extraCount:extra,extraNames:extra?f.extraNames:'',dietary:f.dietary,staying:!out&&f.staying};
  const msg=out?(mineItems.length?`Got it. ${mineItems.join(', ')} ${mineItems.length===1?'is':'are'} open again for someone else.`:`Got it. Thanks for letting ${detail.organizer||'the host'} know.`)
   :f.status==='in'?(extra&&!host?'You’re in. Your extra guest request went to '+(detail.organizer||'the host')+'.':'You’re in. See you there.'):'Saved. Update it when you know.';
  const ok=await act('rsvp','POST',body,d=>{const row:Guest={...(d.guests.find(g=>g.isMe)||{id:crypto.randomUUID(),isMe:true}),name:body.name,status:body.status,note:body.note,isMe:true,extra_count:extra,extra_names:body.extraNames,extra_status:extra?(host?'approved':'requested'):'',dietary:body.dietary,staying:body.staying};d.guests=[...d.guests.filter(g=>!g.isMe),row];if(out)d.tasks=d.tasks.map(t=>t.isMine?{...t,claimed_name:null,isMine:false,done:0}:t)},msg);
  if(ok){remember(body.name);setEditing(false);setNotListed(false)}
 }
 async function addNames(e:React.FormEvent){e.preventDefault();const names=adding.split(/\n|,/).map(x=>x.trim()).filter(Boolean);if(!names.length)return;
  const ok=await act('guests','POST',{names},d=>{const have=new Set(d.guests.map(g=>g.name.toLowerCase()));for(const n of names)if(!have.has(n.toLowerCase())){have.add(n.toLowerCase());d.guests.push({id:crypto.randomUUID(),name:n,status:'invited',note:'',isMe:false})}},'Added to the guest list.');
  if(ok){setAdding('');setAddOpen(false)}}
 const decide=(g:Guest,decision:'approved'|'declined')=>act(`guests/${g.id}/extra`,'POST',{decision},d=>{const x=d.guests.find(y=>y.id===g.id);if(x)x.extra_status=decision},decision==='approved'?`${g.name}’s extra guest is approved.`:'Request declined.');
 function remove(g:Guest){if(!confirm(`Remove ${g.name} from this plan? Anything they claimed opens up again.`))return;
  act(`guests/${g.id}`,'DELETE',null,d=>{d.guests=d.guests.filter(x=>x.id!==g.id);d.tasks=d.tasks.map(t=>t.claimed_name===g.name?{...t,claimed_name:null,isMine:false,done:0}:t)},`${g.name} was removed.`)}

 return <section className="stack">
  <div className="section-title"><h2>{host?'Your guests':'Can you make it?'}</h2><span className="soft-pill">{going} going · {guests.filter(g=>g.status==='maybe').length} checking{unanswered.length?` · ${guests.filter(g=>g.status==='invited').length} no reply`:''}</span></div>

  {/* Step 1 for a new guest: find your name on the host's list. */}
  {!host&&!me&&!notListed&&unanswered.length>0&&<div className="pick-card">
   <strong>Find your name</strong><span className="fine">{detail.organizer||'The host'} added these people. Tap yours.</span>
   <div className="name-chips">{unanswered.map(g=><button key={g.id} className="name-chip" disabled={busy} onClick={()=>pick(g)}><Face className="mini-avatar" seed={g.name}/>{g.name}</button>)}</div>
   <button className="text-button" onClick={()=>setNotListed(true)}>I’m not on the list</button>
  </div>}
  {!host&&!me&&others.length>0&&<div className="other-phone">{otherPhone?<><span className="fine">Already answered on another phone or browser? Tap your name to continue here.</span><div className="name-chips">{others.map(g=><button key={g.id} className="name-chip" disabled={busy} onClick={()=>pick(g)}><Face className="mini-avatar" seed={g.name}/>{g.name}</button>)}</div></>
   :<button className="text-button quiet" onClick={()=>setOtherPhone(true)}>Already answered on another phone?</button>}</div>}

  {/* Your RSVP, summarized once you've answered. */}
  {answered&&!editing&&<div className={'my-rsvp status-'+me!.status}>
   <div><span className="eyebrow">YOUR RSVP</span><strong>{me!.status==='in'?'You’re going':me!.status==='maybe'?'You’re still checking':'You can’t make it'}</strong>
    {!!me!.extra_count&&<span>+{me!.extra_count} {me!.extra_names&&`(${me!.extra_names})`} · {me!.extra_status==='approved'?'approved':me!.extra_status==='declined'?'not this time':'waiting for '+(detail.organizer||'the host')}</span>}
    {me!.dietary&&<span>Dietary: {me!.dietary}</span>}{me!.staying&&<span>Asked to stay over</span>}</div>
   <button className="outline-button" onClick={()=>{setF({name:me!.name,status:me!.status,extra:me!.extra_count||0,extraNames:me!.extra_names||'',dietary:me!.dietary||'',staying:!!me!.staying,note:me!.note||''});setEditing(true)}}>Change</button>
  </div>}
  {host&&!editing&&<button className="text-button" onClick={()=>{setF(x=>({...x,name:me?.name||x.name,status:me?.status||'in',extra:me?.extra_count||0,extraNames:me?.extra_names||''}));setEditing(true)}}>Update my own RSVP</button>}

  {showForm&&<form className="rsvp-form" onSubmit={send}>
   <label>Your name<input maxLength={60} value={f.name} onChange={e=>setF({...f,name:e.target.value})} placeholder="What should we call you?" autoComplete="given-name"/></label>
   <fieldset><legend>Are you coming?</legend><div className="rsvp-buttons">{([['in','I’m in',Check],['maybe','Still checking',Clock],['out','Can’t make it',X]] as const).map(([s,label,Icon])=><button type="button" key={s} aria-pressed={f.status===s} className={'rsvp-choice choice-'+s+(f.status===s?' chosen':'')} onClick={()=>setF({...f,status:s})}><Icon size={17}/>{label}</button>)}</div></fieldset>
   {f.status&&f.status!=='out'&&<>
    <fieldset><legend>Bringing anyone?</legend><div className="stepper"><button type="button" className="icon-button bordered" aria-label="One fewer" disabled={f.extra<=0} onClick={()=>setF({...f,extra:f.extra-1})}><Minus size={16}/></button><span aria-live="polite">{f.extra===0?'Just me':`+${f.extra}`}</span><button type="button" className="icon-button bordered" aria-label="One more" disabled={f.extra>=4} onClick={()=>setF({...f,extra:f.extra+1})}><Plus size={16}/></button></div>
     {f.extra>0&&<><input aria-label="Their names" maxLength={120} value={f.extraNames} onChange={e=>setF({...f,extraNames:e.target.value})} placeholder="Their names, e.g. Ben"/>{!host&&<small className="fine">{detail.organizer||'The host'} will approve extra guests.</small>}</>}</fieldset>
    <label>Dietary needs or allergies <small>(only {host?'you':detail.organizer||'the host'} sees this)</small><input maxLength={200} value={f.dietary} onChange={e=>setF({...f,dietary:e.target.value})} placeholder="e.g. vegetarian, nut allergy"/></label>
    {!host&&<label className="check-row"><input type="checkbox" checked={f.staying} onChange={e=>setF({...f,staying:e.target.checked})}/><span>I’d like to stay over <small>(only {detail.organizer||'the host'} sees this)</small></span></label>}
   </>}
   <label>Note for everyone <small>(optional)</small><input maxLength={300} value={f.note} onChange={e=>setF({...f,note:e.target.value})} placeholder="Running late, bringing a speaker…"/></label>
   <div className="form-bottom">{(answered||host)?<button type="button" className="text-button" onClick={()=>setEditing(false)}>Cancel</button>:<span/>}<button className="primary" disabled={busy}>{busy?<LoaderCircle className="spin" size={17}/>:null}Send RSVP</button></div>
  </form>}

  <div className="guest-list">{sorted.map(g=><div className="guest" key={g.id||g.name}>
   <Face className="avatar" seed={g.handle||g.name}/>
   <div className="guest-info"><strong>{g.name}{g.isMe&&g.name!=='You'?' (you)':''}{g.isHost?<em> · host</em>:null}</strong>
    {g.extra_status==='approved'&&!!g.extra_count&&<small>{plusLine(g)}</small>}
    {host&&g.extra_status==='requested'&&<span className="request">Asks to bring {plusLine(g)}<span><button className="text-button small" disabled={busy} onClick={()=>decide(g,'approved')}>Approve</button><button className="text-button small quiet" disabled={busy} onClick={()=>decide(g,'declined')}>Decline</button></span></span>}
    {host&&g.extra_status==='declined'&&<small>Extra guest declined</small>}
    {host&&g.dietary&&<small className="private"><Utensils size={12}/>{g.dietary}</small>}
    {host&&g.staying&&<small className="private"><Moon size={12}/>Wants to stay over</small>}
    {g.note&&<small>{g.note}</small>}
   </div>
   <span className={'status '+g.status}>{STATUS[g.status]||g.status}</span>
   {host&&!g.isHost&&<button className="icon-button" aria-label={'Remove '+g.name} disabled={busy} onClick={()=>remove(g)}><Trash2 size={15}/></button>}
  </div>)}</div>

  {host&&(addOpen?<form className="add-guests" onSubmit={addNames}>
   <label>Who did you invite? <small>One name per line. Guests tap their name when they open the link, so you can see who hasn’t replied.</small><textarea rows={4} maxLength={3000} value={adding} onChange={e=>setAdding(e.target.value)} placeholder={'Tess\nJordan\nSam'}/></label>
   <div className="form-bottom"><button type="button" className="text-button" onClick={()=>setAddOpen(false)}>Cancel</button><button className="primary" disabled={busy||!adding.trim()}>Add to guest list</button></div>
  </form>:<button className="outline-button" onClick={()=>setAddOpen(true)}><UserPlus size={16}/>Add names to the guest list</button>)}
 </section>
}
