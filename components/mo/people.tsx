'use client';
import {whenRange} from '@/lib/when';
import {planLink} from '@/lib/short-link';
// The People tab: a guest finds their name, RSVPs (with extra guests, dietary needs and a sleepover request),
// and the organizer manages the guest list. Dietary needs, sleepovers and pending extra guests are shown
// only to the organizer and the guest themselves; the server enforces the same rule.
import {useEffect,useState} from 'react';
import {Check,Clock,X,Plus,Minus,Trash2,Moon,Utensils,UserPlus,LoaderCircle,Contact,Send,Pencil,Copy,CircleHelp} from 'lucide-react';
import type {Act,Detail,Guest} from '@/lib/types';
import {ago} from '@/lib/types';
import {Face} from './art';
import {splitNames,cleanName} from '@/lib/names';
import {loadInvites,saveInvites,phonesFromText} from '@/lib/invite';
import {SendInvites} from './send-invites';

// The browser contact picker (Chrome on Android). Not available in Safari on iPhone by default, so the button only
// appears where it works. Names go to m.o; phone numbers stay on this phone (see lib/invite.ts). Emails are never asked for.
type ContactsManager={select:(props:string[],opts:{multiple:boolean})=>Promise<{name?:string[];tel?:string[]}[]>;getProperties?:()=>Promise<string[]>};
const contactsApi=()=>typeof navigator!=='undefined'&&'contacts' in navigator&&typeof window!=='undefined'&&'ContactsManager' in window?(navigator as unknown as {contacts:ContactsManager}).contacts:null;

const ORDER:Record<string,number>={in:1,maybe:2,invited:3,out:4};
const STATUS:Record<string,string>={in:'Going',maybe:'Checking',invited:'No reply yet',out:'Can’t go'};
const ANSWER:Record<string,string>={in:'going',maybe:'still checking',out:'can’t make it',invited:'no reply yet'};
const answerLine=(g:{status:string;extra_count?:number;extra_names?:string})=>ANSWER[g.status]+(g.extra_count?` (+${g.extra_count}${g.extra_names?' '+g.extra_names:''})`:'');
function whenText(date:string,end?:string){return whenRange(date,end,' at ')}
// A personal message the host sends themselves (text, DM). m.o never sends it.
export function checkInMessage(d:Detail,g:Guest){
 const link=planLink(typeof location!=='undefined'?location.origin:'',d.plan.id),when=whenText(d.plan.date,d.plan.end_date),items=d.tasks.filter(t=>t.claimed_name===g.name&&!t.done).map(t=>t.title);
 const what=`${d.plan.title}${when?` on ${when}`:''}`,first=g.name.split(' ')[0];
 if(g.status==='invited')return `Hi ${first}! Are you coming to ${what}? Just reply here, or answer at ${link}`;
 const parts=[`as ${answerLine(g)}`];if(items.length)parts.push(`bringing ${items.join(', ')}`);if(g.dietary)parts.push(`dietary: ${g.dietary}`);if(g.staying)parts.push('staying over');
 return `Hi ${first}! For ${what} I’ve got you down ${parts.join(', ')}. Is that still right? Reply here, or check and change it at ${link}`;
}
// Shown to a guest when the host noted their answer or an item for them, so one tap confirms it.
export function NotedBanner({detail,act,busy,onChange}:{detail:Detail;act:Act;busy:boolean;onChange:()=>void}){
 const me=detail.guests.find(g=>g.isMe),items=detail.tasks.filter(t=>t.isMine&&t.claim_source==='host').map(t=>t.title);
 if(detail.host||!me||me.status==='invited'||(me.source!=='host'&&!items.length))return null;
 const by=detail.organizer||'The host';
 return <section className="noted-banner" aria-live="polite"><div><strong>{by} noted {me.source==='host'?`you’re ${answerLine(me)}`:'something for you'}{items.length?`${me.source==='host'?' and':':'} bringing ${items.join(', ')}`:''}.</strong><span>Is that right?</span></div>
  <div className="noted-actions"><button className="primary" disabled={busy} onClick={()=>act('confirm','POST',{},d=>{for(const g of d.guests)if(g.isMe)g.source='guest';for(const t of d.tasks)if(t.isMine)t.claim_source=''},'Confirmed. Thanks for letting '+by+' know.')}>Yes, that’s right</button><button className="outline-button" onClick={onChange}>Change it</button></div></section>
}
const plusLine=(g:Guest)=>g.extra_count?`+${g.extra_count}${g.extra_names?' · '+g.extra_names:''}`:'';
function storedName(){try{return localStorage.getItem('mo-name')||''}catch{return ''}}
function remember(n:string){try{localStorage.setItem('mo-name',n)}catch{}}

export function PeopleTab({detail,act,busy,notify,startAdding=false,startMode=null,startSending=false,onRsvp,onInviteSent}:{detail:Detail;act:Act;busy:boolean;notify:(t:string)=>void;startAdding?:boolean;startMode?:'new'|'other'|null;startSending?:boolean;onRsvp?:(status:string)=>void;onInviteSent?:()=>void}){
 const host=detail.host,guests=detail.guests,me=guests.find(g=>g.isMe),answered=!!me&&me.status!=='invited';
 const [editing,setEditing]=useState(false),[notListed,setNotListed]=useState(startMode==='new'),[otherPhone,setOtherPhone]=useState(startMode==='other');
 const [f,setF]=useState(()=>({name:me?.name||storedName(),status:me&&me.status!=='invited'?me.status:'',extra:me?.extra_count||0,extraNames:me?.extra_names||'',dietary:me?.dietary||'',staying:!!me?.staying,note:me?.note||''}));
 const [sending,setSending]=useState(startSending),[noting,setNoting]=useState<string|null>(null),[nf,setNf]=useState({status:'',extra:0,extraNames:'',dietary:'',staying:false,note:''});
 const [one,setOne]=useState({name:'',tel:''}),[adding,setAdding]=useState(''),[addOpen,setAddOpen]=useState(startAdding),[canPick,setCanPick]=useState(false);
 useEffect(()=>{setCanPick(!!contactsApi())},[]);
 const listed=new Set(guests.map(g=>g.name.toLowerCase())),toAdd=splitNames(adding),newNames=toAdd.filter(n=>!listed.has(n.toLowerCase()));
 async function fromContacts(){const api=contactsApi();if(!api)return;try{const props=await api.getProperties?.().catch(()=>['name'])||['name'];const picked=await api.select(props.includes('tel')?['name','tel']:['name'],{multiple:true});const lines=picked.map(c=>[c.name?.[0]||'',c.tel?.[0]||''].join(' ').trim()).filter(l=>/\p{L}/u.test(l));if(lines.length)setAdding(a=>[a.trim(),...lines].filter(Boolean).join('\n'))}catch{notify('Couldn’t open your contacts. Type or paste names instead.')}}
 const sorted=[...guests].sort((a,b)=>(a.isHost?0:ORDER[a.status]||5)-(b.isHost?0:ORDER[b.status]||5));
 // People the host listed or noted (but who haven't answered themselves) find their name in the main list.
 const unanswered=guests.filter(g=>!g.isMe&&!g.isHost&&!g.needsPersonalLink&&(g.status==='invited'||g.source==='host')),others=guests.filter(g=>!g.isHost&&!g.isMe&&g.status!=='invited'&&g.source!=='host');
 const going=guests.filter(g=>g.status==='in').reduce((n,g)=>n+1+(g.extra_status==='approved'?g.extra_count||0:0),0);
 const showForm=host?editing:(!answered&&(!!me||notListed||unanswered.length===0))||editing;

 async function pick(g:Guest){
  if(g.status!=='invited'&&g.source!=='host'&&!confirm(`${g.name} already answered from another phone or browser. Continue as ${g.name} here?`))return;
  const ok=await act(`guests/${g.id}/pick`,'POST',{},d=>{for(const x of d.guests)x.isMe=x.id===g.id},`Hi ${g.name}.`);
  if(ok){setF(x=>({...x,name:g.name,status:g.status==='invited'?'':g.status,extra:g.extra_count||0,extraNames:g.extra_names||'',dietary:g.dietary||'',staying:!!g.staying,note:g.note||''}));setOtherPhone(false);if(g.status!=='invited'&&g.source!=='host')setEditing(false)}
 }
 async function send(e:React.FormEvent){e.preventDefault();
  if(!f.name.trim()){notify('Add your name first.');return}
  if(!f.status){notify('Choose going, checking, or can’t make it.');return}
  const out=f.status==='out',extra=out?0:f.extra,mineItems=detail.tasks.filter(t=>t.isMine).map(t=>t.title);
  const body={name:f.name.trim(),status:f.status,note:f.note,extraCount:extra,extraNames:extra?f.extraNames:'',dietary:f.dietary,staying:!out&&f.staying};
  const msg=out?(mineItems.length?`Got it. ${mineItems.join(', ')} ${mineItems.length===1?'is':'are'} open again for someone else.`:`Got it. Thanks for letting ${detail.organizer||'the host'} know.`)
   :(()=>{const next=!mineItems.length&&detail.tasks.some(t=>!t.claimed_name)?(detail.plan.kind==='trip'?' Now pick something to handle.':' Now pick something to bring.'):'';
    return f.status==='in'?(extra&&!host?'You’re in. Your extra guest request went to '+(detail.organizer||'the host')+'.':'You’re in.')+(next||' See you there.'):'Saved. Change it when you know.'+next})();
  const ok=await act('rsvp','POST',body,d=>{const row:Guest={...(d.guests.find(g=>g.isMe)||{id:crypto.randomUUID(),isMe:true}),name:body.name,status:body.status,note:body.note,isMe:true,extra_count:extra,extra_names:body.extraNames,extra_status:extra?(host?'approved':'requested'):'',dietary:body.dietary,staying:body.staying};d.guests=[...d.guests.filter(g=>!g.isMe),row];if(out)d.tasks=d.tasks.map(t=>t.isMine?{...t,claimed_name:null,isMine:false,done:0}:t)},msg);
  if(ok){remember(body.name);setEditing(false);setNotListed(false);onRsvp?.(body.status)}
 }
 function startNote(g:Guest){setNoting(g.id||null);setNf({status:g.status==='invited'?'':g.status,extra:g.extra_count||0,extraNames:g.extra_names||'',dietary:g.dietary||'',staying:!!g.staying,note:g.note||''})}
 async function saveNote(e:React.FormEvent,g:Guest){e.preventDefault();if(!nf.status){notify('Choose what they told you.');return}
  const off=nf.status==='out'||nf.status==='invited',extra=off?0:nf.extra,body={status:nf.status,extraCount:extra,extraNames:extra?nf.extraNames:'',dietary:nf.dietary,staying:!off&&nf.staying,note:nf.note};
  const ok=await act(`guests/${g.id}/response`,'POST',body,d=>{const x=d.guests.find(y=>y.id===g.id);if(!x)return;Object.assign(x,{status:nf.status,extra_count:extra,extra_names:body.extraNames,extra_status:extra?'approved':'',dietary:nf.dietary,staying:body.staying,note:nf.note,source:nf.status==='invited'?'':'host',updated:new Date().toISOString()});if(nf.status==='out')d.tasks=d.tasks.map(t=>t.claimed_name===g.name?{...t,claimed_name:null,isMine:false,done:0,claim_source:''}:t)},nf.status==='invited'?`${g.name} is back to no reply yet.`:`Noted: ${g.name} ${nf.status==='in'?'is going':nf.status==='maybe'?'is still checking':'can’t make it'}${extra?` (+${extra}${body.extraNames?' '+body.extraNames:''})`:''}.`);
  if(ok)setNoting(null)}
 async function copyCheckIn(g:Guest){const text=checkInMessage(detail,g);try{await navigator.clipboard.writeText(text);notify(`Check-in for ${g.name} copied. Send it however you usually reach them.`)}catch{notify(text)}}
 // iPhone: Safari's AutoFill Contact fills these two boxes from any contact. Each one is added as a line below.
 function addOne(){const name=cleanName(one.name);if(!name){notify('Add a name first.');return}setAdding(a=>(a.trim()?a.trim()+'\n':'')+name+(one.tel.trim()?' '+one.tel.trim():''));setOne({name:'',tel:''});notify(`${name} is on the list below. Add the next one, or tap Add.`)}
 async function addNames(e:React.FormEvent){e.preventDefault();const names=newNames;if(!names.length){notify(toAdd.length?'They’re already on the list.':'Add at least one name.');return}
  const ok=await act('guests','POST',{names},d=>{const have=new Set(d.guests.map(g=>g.name.toLowerCase()));for(const n of names)if(!have.has(n.toLowerCase())){have.add(n.toLowerCase());d.guests.push({id:crypto.randomUUID(),name:n,status:'invited',note:'',isMe:false})}},'Added to the guest list.');
  if(ok){const found=phonesFromText(adding,cleanName);if(Object.keys(found).length){const st=loadInvites(detail.plan.id);saveInvites(detail.plan.id,{...st,phones:{...st.phones,...found}})}setAdding('');setAddOpen(false)}}
 const decide=(g:Guest,decision:'approved'|'declined')=>act(`guests/${g.id}/extra`,'POST',{decision},d=>{const x=d.guests.find(y=>y.id===g.id);if(x)x.extra_status=decision},decision==='approved'?`${g.name}’s extra guest is approved.`:'Request declined.');
 function remove(g:Guest){if(!confirm(`Remove ${g.name} from this plan? Anything they claimed opens up again.`))return;
  act(`guests/${g.id}`,'DELETE',null,d=>{d.guests=d.guests.filter(x=>x.id!==g.id);d.tasks=d.tasks.map(t=>t.claimed_name===g.name?{...t,claimed_name:null,isMine:false,done:0}:t)},`${g.name} was removed.`)}

 return <section className="stack">
  <div className="section-title"><h2>{host?'Your guests':'Can you make it?'}</h2><span className="soft-pill">{going} going · {guests.filter(g=>g.status==='maybe').length} checking{unanswered.length?` · ${guests.filter(g=>g.status==='invited').length} no reply`:''}</span></div>

  {/* Step 1 for a new guest: find your name on the host's list. */}
  {!host&&!me&&!notListed&&unanswered.length>0&&<div className="pick-card">
   <strong>Find your name</strong><span className="fine">{detail.organizer||'The host'} added these people. Tap yours.</span>
   <div className="name-chips">{unanswered.map(g=><button key={g.id} className="name-chip" disabled={busy} onClick={()=>pick(g)}><Face className="mini-avatar" seed={g.name} avatar={g.avatar} photo={g.photo}/>{g.name}</button>)}</div>
   <button className="text-button" onClick={()=>setNotListed(true)}>I’m not on the list</button>
  </div>}
  {!host&&!me&&others.length>0&&<div className="other-phone">{otherPhone?<><span className="fine">Answered on another phone? Open your personal link on this phone, or ask your host for a replacement.</span></>
   :<button className="text-button quiet" onClick={()=>setOtherPhone(true)}>Answered on another phone?</button>}</div>}

  {/* Your RSVP, summarized once you've answered. */}
  {answered&&!editing&&<div className={'my-rsvp status-'+me!.status}>
   <div><span className="eyebrow">YOUR RSVP</span><strong>{me!.status==='in'?'You’re going':me!.status==='maybe'?'You’re still checking':'You can’t make it'}</strong>
    {!!me!.extra_count&&<span>+{me!.extra_count} {me!.extra_names&&`(${me!.extra_names})`} · {me!.extra_status==='approved'?'approved':me!.extra_status==='declined'?'not this time':'waiting for '+(detail.organizer||'the host')}</span>}
    {me!.source==='host'&&<span className="noted-tag">Noted by {detail.organizer||'the host'} · not confirmed by you yet</span>}{me!.dietary&&<span>Dietary: {me!.dietary}</span>}{me!.staying&&<span>Asked to stay over</span>}</div>
   <button className="outline-button" onClick={()=>{setF({name:me!.name,status:me!.status,extra:me!.extra_count||0,extraNames:me!.extra_names||'',dietary:me!.dietary||'',staying:!!me!.staying,note:me!.note||''});setEditing(true)}}>Change</button>
  </div>}
  {host&&(sending?<SendInvites detail={detail} notify={notify} onClose={()=>setSending(false)} onSent={()=>onInviteSent?.()}/>:guests.some(g=>!g.isHost)&&<button className="primary block" onClick={()=>setSending(true)}><Send size={17}/>Send invites</button>)}
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

  <div className="guest-list">{sorted.map(g=><div className="guest-block" key={g.id||g.name}><div className="guest">
   <Face className="avatar" seed={g.handle||g.name} avatar={g.avatar} photo={g.photo}/>
   <div className="guest-info"><strong>{g.name}{g.isMe&&g.name!=='You'?' (you)':''}{g.isHost?<em> · host</em>:null}</strong>
    {g.extra_status==='approved'&&!!g.extra_count&&<small>{plusLine(g)}</small>}
    {host&&g.extra_status==='requested'&&<span className="request">Asks to bring {plusLine(g)}<span><button className="text-button small" disabled={busy} onClick={()=>decide(g,'approved')}>Approve</button><button className="text-button small quiet" disabled={busy} onClick={()=>decide(g,'declined')}>Decline</button></span></span>}
    {host&&g.extra_status==='declined'&&<small>Extra guest declined</small>}
    {host&&g.status==='maybe'&&g.check_back&&(()=>{const due=g.check_back<=new Date().toISOString().slice(0,10);return <small className={due?'check-due':'private'}><Clock size={12}/>{due?'Said to check back by now':'Will decide by '+new Date(g.check_back+'T12:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</small>})()}
    {host&&!g.isHost&&<button className="text-button small" disabled={busy} onClick={()=>act(`guests/${g.id}/access`,'POST',{approved:!g.detailsApproved},d=>{const x=d.guests.find(y=>y.id===g.id);if(x)x.detailsApproved=!g.detailsApproved},g.detailsApproved?'Arrival details hidden.':'Arrival details shared with this guest after they RSVP.')}>{g.detailsApproved?'Hide arrival details':'Approve arrival access'}</button>}
    {host&&g.dietary&&<small className="private"><Utensils size={12}/>{g.dietary}</small>}
    {host&&g.staying&&<small className="private"><Moon size={12}/>Wants to stay over</small>}
    {g.note&&<small>{g.note}</small>}
    {!g.isHost&&g.source==='host'&&<small className="noted-tag">Noted by {host?'you':detail.organizer||'the host'}{g.updated?' · '+ago(g.updated):''} · not confirmed</small>}
    {!g.isHost&&host&&g.source==='guest'&&g.updated&&<small className="confirmed-tag"><Check size={12}/>Confirmed by {g.name.split(' ')[0]} · {ago(g.updated)}</small>}
    {host&&!g.isHost&&<span className="row-tools"><button className="text-button small" onClick={()=>noting===g.id?setNoting(null):startNote(g)}><Pencil size={13}/>Update answer</button><button className="text-button small" onClick={()=>copyCheckIn(g)}><Copy size={13}/>Copy check-in</button></span>}
   </div>
   <span className={'status '+g.status+(g.source==='host'&&!g.isHost?' noted':'')}>{STATUS[g.status]||g.status}</span>
   {host&&!g.isHost&&<button className="icon-button" aria-label={'Remove '+g.name} disabled={busy} onClick={()=>remove(g)}><Trash2 size={15}/></button>}
  </div>
  {host&&noting===g.id&&<form className="note-form" onSubmit={e=>saveNote(e,g)}>
   <p className="fine">Record what {g.name.split(' ')[0]} told you by text or in person. It shows as noted by you until they confirm.</p>
   <fieldset><legend>Their answer</legend><div className="rsvp-buttons">{([['in','Going',Check],['maybe','Checking',Clock],['out','Can’t make it',X],['invited','No reply yet',CircleHelp]] as const).map(([k,label,Icon])=><button type="button" key={k} aria-pressed={nf.status===k} className={'rsvp-choice choice-'+k+(nf.status===k?' chosen':'')} onClick={()=>setNf({...nf,status:k})}><Icon size={16}/>{label}</button>)}</div></fieldset>
   {(nf.status==='in'||nf.status==='maybe')&&<>
    <fieldset><legend>Bringing anyone?</legend><div className="stepper"><button type="button" className="icon-button bordered" aria-label="One fewer" disabled={nf.extra<=0} onClick={()=>setNf({...nf,extra:nf.extra-1})}><Minus size={16}/></button><span>{nf.extra===0?'Just them':`+${nf.extra}`}</span><button type="button" className="icon-button bordered" aria-label="One more" disabled={nf.extra>=4} onClick={()=>setNf({...nf,extra:nf.extra+1})}><Plus size={16}/></button></div>
     {nf.extra>0&&<input aria-label="Their extra guests’ names" maxLength={120} value={nf.extraNames} onChange={e=>setNf({...nf,extraNames:e.target.value})} placeholder="Names, e.g. Ben"/>}</fieldset>
    <label>Dietary needs <small>(only you see this)</small><input maxLength={200} value={nf.dietary} onChange={e=>setNf({...nf,dietary:e.target.value})} placeholder="e.g. vegetarian"/></label>
    <label className="check-row"><input type="checkbox" checked={nf.staying} onChange={e=>setNf({...nf,staying:e.target.checked})}/><span>Staying over</span></label>
   </>}
   <div className="form-bottom"><button type="button" className="text-button" onClick={()=>setNoting(null)}>Cancel</button><button className="primary" disabled={busy}>Save what they told you</button></div>
  </form>}
  </div>)}</div>

  {host&&(addOpen?<form className="add-guests" onSubmit={addNames}>
   {canPick&&<button type="button" className="outline-button" onClick={fromContacts}><Contact size={16}/>Choose from contacts</button>}
   {!canPick&&<fieldset className="one-guest"><legend>Add one person</legend>
    <small>On iPhone, tap the name box, then <strong>AutoFill Contact</strong> above the keyboard to pick someone from your contacts. Their name and number fill in.</small>
    <label>Name<input name="name" autoComplete="name" maxLength={60} value={one.name} onChange={e=>setOne({...one,name:e.target.value})} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addOne()}}}/></label>
    <label>Phone <small>(optional, stays on this phone)</small><input name="tel" type="tel" inputMode="tel" autoComplete="tel" maxLength={24} value={one.tel} onChange={e=>setOne({...one,tel:e.target.value})} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addOne()}}}/></label>
    <button type="button" className="outline-button" onClick={addOne}><UserPlus size={16}/>Add to the list below</button>
   </fieldset>}
   <label>{canPick?'Who did you invite?':'Your list'} <small>{canPick?'Or type and paste names. ':''}One per line, or separated by commas. You can paste from your group chat; phone numbers and emails are removed. Guests tap their name when they open the link, so you can see who hasn’t replied.</small><textarea rows={4} maxLength={3000} value={adding} onChange={e=>setAdding(e.target.value)} placeholder={'Tess\nJordan\nSam'}/></label>
   {toAdd.length>0&&<p className="name-preview" aria-live="polite">{newNames.length?<>Will add {newNames.length}: <strong>{newNames.join(', ')}</strong></>:'Everyone here is already on the list.'}{toAdd.length>newNames.length&&newNames.length>0?` (${toAdd.length-newNames.length} already listed)`:''}</p>}
   <p className="fine">Names are saved to the plan. Phone numbers stay on this phone, for sending invites. m.o never texts anyone for you.</p>
   <div className="form-bottom"><button type="button" className="text-button" onClick={()=>{setAddOpen(false);setAdding('')}}>Cancel</button><button className="primary" disabled={busy||!newNames.length}>{newNames.length>1?`Add ${newNames.length} people`:'Add to guest list'}</button></div>
  </form>:<button className="outline-button" onClick={()=>setAddOpen(true)}><UserPlus size={16}/>Add names to the guest list</button>)}
 </section>
}
