'use client';
import {useState} from 'react';
import {Check,Lock,LockOpen,Plus,Trash2,Vote,Route,ExternalLink,Camera,PartyPopper,MessageCircle,Copy,X,Send} from 'lucide-react';
import type {Act,Detail,Poll,Stop,Memory} from '@/lib/types';
import {groupUpdate,nudgeMaybes,nextStep,optionLabel} from '@/lib/group-update';
import {smsHref} from '@/lib/invite';

const uid=()=>crypto.randomUUID();
const isoOrBlank=(local:string)=>local?new Date(local).toISOString():'';

/* ---------------- The setter's view: next step + copyable group-chat drafts ---------------- */
export function SetterPanel({detail,link,notify}:{detail:Detail;link:string;notify:(t:string)=>void}){
 const p=detail.plan,[which,setWhich]=useState<'update'|'nudge'>('update');
 const update=groupUpdate(detail,link),nudge=nudgeMaybes(detail,link),text=which==='nudge'&&nudge?nudge:update;
 const checks:[boolean,string,string][]=[[!!p.date,'Date set','No date yet'],[!!p.place,'Place set','No place yet'],...(p.kind==='trip'?[[!!p.budget,'Cost set','No cost yet'] as [boolean,string,string]]:[])];
 async function copy(){try{await navigator.clipboard.writeText(text);notify('Copied. Paste it in your group chat.')}catch{notify('Select the message and copy it.')}}
 return <section className="setter-panel">
  <span className="eyebrow">GROUP MESSAGES</span>
  <h2>Keep the group updated</h2>
  <div className="setter-checks">{checks.map(([ok,yes,no])=><span key={yes} className={ok?'settled':''}><Check size={14}/>{ok?yes:no}</span>)}</div>
  <div className="next-nudge"><span>NEXT STEP</span><p>{nextStep(detail)}</p></div>
  {detail.host&&<div className="chat-draft">
   {nudge?<div className="draft-tabs" role="tablist" aria-label="Which message">
    <button role="tab" aria-selected={which==='update'} className={which==='update'?'on':''} onClick={()=>setWhich('update')}>Plan update</button>
    <button role="tab" aria-selected={which==='nudge'} className={which==='nudge'?'on':''} onClick={()=>setWhich('nudge')}>Reminder to reply</button>
   </div>:<h3 className="draft-title">Message for your group chat</h3>}
   <div className="bubble" aria-live="polite">{text}</div>
   <div className="draft-actions"><a className="primary" href={smsHref('',text)}><Send size={16}/>Open in Messages</a><button className="outline-button" onClick={copy}><Copy size={16}/>Copy</button></div>
  </div>}
  <p className="setter-caption">Open in Messages, then pick your group chat and tap Send. m.o never sends anything for you.</p>
 </section>
}

/* ---------------- Group decisions ---------------- */
export function Decisions({detail,act,busy,member}:{detail:Detail;act:Act;busy:boolean;member:boolean}){
 const [open,setOpen]=useState(false),[q,setQ]=useState(''),[kind,setKind]=useState<'date'|'place'|'choice'>('date'),[opts,setOpts]=useState(['','']);
 const hostName=detail.guests[0]?.name||'the organizer';
 function reset(){setOpen(false);setQ('');setKind('date');setOpts(['',''])}
 async function start(e:React.FormEvent){e.preventDefault();const options=opts.map(o=>kind==='date'?isoOrBlank(o):o.trim()).filter(Boolean);
  const ok=await act('polls','POST',{question:q,kind,options},d=>{d.polls.push({id:uid(),question:q.trim(),kind,decided_option:null,options:options.map(label=>({id:uid(),label,votes:0,voters:[],mine:false}))})},'Vote started. Share the link so people can vote.');
  if(ok)reset()}
 function presets(k:'date'|'place'|'choice'){setKind(k);setOpts(['','']);if(!q||['Which date works?','Where should we go?','What are we doing?'].includes(q))setQ(k==='date'?'Which date works?':k==='place'?'Where should we go?':'What are we doing?')}
 return <section className="panel decisions-panel">
  <div className="section-title"><h2>Votes</h2><Vote size={20}/></div>
  <p className="muted">Votes are just opinions. Nothing is final until {detail.host?'you pick the final choice':hostName+' picks the final choice'}.</p>
  {detail.polls.length===0&&!open&&<p className="inline-empty">{detail.host?'No votes yet. Start one to decide a date or place.':'No votes yet. Only the host can start one.'}</p>}
  {detail.polls.map(p=><PollCard key={p.id} poll={p} host={detail.host} busy={busy} member={member} act={act}/>)}
  {detail.host&&(open?<form className="poll-form" onSubmit={start}>
   <div className="type-selector small">{([['date','Date'],['place','Place'],['choice','Anything']] as const).map(([k,l])=><button type="button" key={k} className={kind===k?'chosen':''} onClick={()=>presets(k)}>{l}</button>)}</div>
   <label>The question<input required maxLength={120} value={q} onChange={e=>setQ(e.target.value)} placeholder={kind==='date'?'Which date works?':kind==='place'?'Where should we stay?':'What are we doing?'}/></label>
   {opts.map((o,i)=><div className="option-input" key={i}><input aria-label={'Option '+(i+1)} type={kind==='date'?'datetime-local':'text'} required={i<2} maxLength={120} value={o} onChange={e=>setOpts(opts.map((x,j)=>j===i?e.target.value:x))} placeholder={kind==='place'?'A place or link':'Option '+(i+1)}/>{i>1&&<button type="button" className="icon-button" aria-label="Remove option" onClick={()=>setOpts(opts.filter((_,j)=>j!==i))}><X size={15}/></button>}</div>)}
   <div className="form-bottom">{opts.length<8?<button type="button" className="text-button" onClick={()=>setOpts([...opts,''])}><Plus size={14}/>Another option</button>:<span/>}<span className="row-gap"><button type="button" className="text-button" onClick={reset}>Cancel</button><button className="primary" disabled={busy}>Start the vote</button></span></div>
  </form>:<button className="outline-button" onClick={()=>{setOpen(true);presets('date')}}><Plus size={16}/>Start a vote</button>)}
 </section>
}
function PollCard({poll:p,host,busy,member,act}:{poll:Poll;host:boolean;busy:boolean;member:boolean;act:Act}){
 const [suggest,setSuggest]=useState('');const max=Math.max(1,...p.options.map(o=>o.votes));const decided=p.options.find(o=>o.id===p.decided_option);const locked=!!decided;
 const vote=(id:string)=>act(`polls/${p.id}/vote`,'POST',{optionId:id},d=>{const o=d.polls.find(x=>x.id===p.id)!.options.find(x=>x.id===id)!;o.mine=!o.mine;o.votes+=o.mine?1:-1;o.voters=o.mine?[...o.voters,'You']:o.voters.filter(v=>v!=='You')});
 const decide=(id:string|null)=>act(`polls/${p.id}/decide`,'POST',{optionId:id},d=>{const x=d.polls.find(y=>y.id===p.id)!;x.decided_option=id;const o=x.options.find(y=>y.id===id);if(o&&x.kind==='date')d.plan.date=o.label;if(o&&x.kind==='place')d.plan.place=o.label},id?'Picked. The plan now shows it.':'The vote is open again.');
 async function add(e:React.FormEvent){e.preventDefault();const label=p.kind==='date'?isoOrBlank(suggest):suggest.trim();if(!label)return;if(await act(`polls/${p.id}/options`,'POST',{label},d=>{d.polls.find(x=>x.id===p.id)!.options.push({id:uid(),label,votes:0,voters:[],mine:false})},'Suggestion added.'))setSuggest('')}
 return <div className={'poll'+(locked?' locked':'')}>
  <div className="poll-head"><div><span className={'kind-chip kind-'+p.kind}>{p.kind==='date'?'DATE':p.kind==='place'?'PLACE':'VOTE'}</span><h3>{p.question}</h3></div>
   {locked?<span className="lock-pill"><Lock size={12}/>Final</span>:<span className="open-pill">Open</span>}</div>
  {p.options.map(o=><div key={o.id} className={'poll-option'+(o.id===p.decided_option?' winner':'')+(o.mine?' mine':'')}>
   <button className="vote-button" disabled={busy||locked||!member} onClick={()=>vote(o.id)} aria-pressed={o.mine} aria-label={(o.mine?'Remove your vote for ':'Vote for ')+optionLabel(p.kind,o.label)}>{o.mine?<Check size={14}/>:null}</button>
   <div className="option-body"><div className="option-line"><strong>{optionLabel(p.kind,o.label)}</strong><span>{o.votes} {o.votes===1?'vote':'votes'}</span></div>
    <div className="vote-bar"><span style={{width:(o.votes/max*100)+'%'}}/></div>
    {o.voters.length>0&&<small>{o.voters.join(', ')}</small>}</div>
   {host&&!locked&&<button className="lock-button" disabled={busy} onClick={()=>decide(o.id)}><Lock size={12}/>Pick this</button>}
  </div>)}
  {!member&&!locked&&<p className="hint">RSVP to vote.</p>}
  {member&&!locked&&p.options.length<12&&<form className="suggest" onSubmit={add}><input aria-label="Suggest an option" type={p.kind==='date'?'datetime-local':'text'} maxLength={120} value={suggest} onChange={e=>setSuggest(e.target.value)} placeholder="Suggest another option"/><button className="icon-button" aria-label="Add suggestion" disabled={busy||!suggest.trim()}><Plus size={16}/></button></form>}
  {host&&<div className="poll-tools">{locked&&<button className="text-button" disabled={busy} onClick={()=>decide(null)}><LockOpen size={13}/>Reopen</button>}<button className="text-button danger" disabled={busy} onClick={()=>act(`polls/${p.id}`,'DELETE',null,d=>{d.polls=d.polls.filter(x=>x.id!==p.id)},'Vote removed.')}><Trash2 size={13}/>Remove</button></div>}
 </div>
}

/* ---------------- Live plan: itinerary & key links ---------------- */
export function LivePlan({detail,act,busy}:{detail:Detail;act:Act;busy:boolean}){
 const [open,setOpen]=useState(false),[f,setF]=useState({at:'',title:'',detail:'',url:''});
 const days=new Map<string,Stop[]>();for(const s of detail.stops){const k=s.at?new Date(s.at).toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'}):'Anytime';days.set(k,[...(days.get(k)||[]),s])}
 async function add(e:React.FormEvent){e.preventDefault();const at=isoOrBlank(f.at);const ok=await act('stops','POST',{...f,at},d=>{d.stops.push({id:uid(),at,title:f.title.trim(),detail:f.detail.trim(),url:f.url.trim()||null});d.stops.sort((a,b)=>(a.at?0:1)-(b.at?0:1)||a.at.localeCompare(b.at))},'Added to the schedule.');if(ok){setF({at:'',title:'',detail:'',url:''});setOpen(false)}}
 if(!detail.host&&detail.stops.length===0)return null;
 return <section className="panel live-panel">
  <div className="section-title"><h2>Schedule</h2><Route size={20}/></div>
  <p className="muted">Times, places and links for the day.</p>
  {detail.stops.length===0&&<p className="inline-empty">Add times, reservations or links people will need.</p>}
  {[...days].map(([day,stops])=><div className="day" key={day}><span className="day-label">{day}</span>{stops.map(s=><div className="stop" key={s.id}>
   <span className="stop-time">{s.at?new Date(s.at).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}):'—'}</span>
   <div className="stop-body"><strong>{s.title}</strong>{s.detail&&<small>{s.detail}</small>}{s.url&&<a href={s.url} target="_blank" rel="noopener noreferrer">{new URL(s.url).hostname.replace(/^www\./,'')}<ExternalLink size={12}/></a>}</div>
   {detail.host&&<button className="icon-button" aria-label={'Remove '+s.title} disabled={busy} onClick={()=>act('stops/'+s.id,'DELETE',null,d=>{d.stops=d.stops.filter(x=>x.id!==s.id)})}><Trash2 size={15}/></button>}
  </div>)}</div>)}
  {detail.host&&(open?<form className="stop-form" onSubmit={add}>
   <div className="form-row"><label>What<input required maxLength={120} value={f.title} onChange={e=>setF({...f,title:e.target.value})} placeholder="Dinner, check-in, the show…"/></label><label>When <small>(optional)</small><input type="datetime-local" value={f.at} onChange={e=>setF({...f,at:e.target.value})}/></label></div>
   <label>Details <small>(optional)</small><input maxLength={300} value={f.detail} onChange={e=>setF({...f,detail:e.target.value})} placeholder="Address, door code, reservation name"/></label>
   <label>Link <small>(optional)</small><input type="url" maxLength={1000} value={f.url} onChange={e=>setF({...f,url:e.target.value})} placeholder="https://maps…, tickets, the Airbnb"/></label>
   <div className="form-bottom"><button type="button" className="text-button" onClick={()=>setOpen(false)}>Cancel</button><button className="primary" disabled={busy}>Add to the plan</button></div>
  </form>:<button className="outline-button" onClick={()=>setOpen(true)}><Plus size={16}/>Add to the schedule</button>)}
 </section>
}

/* ---------------- Replay: made it out ---------------- */
export function Replay({detail,act,busy,canPost}:{detail:Detail;act:Act;busy:boolean;canPost:boolean}){
 const p=detail.plan,past=!!p.date&&new Date(p.date).getTime()<Date.now(),made=!!p.made_it;
 const [kind,setKind]=useState<'memory'|'shoutout'>('memory'),[text,setText]=useState(''),[photo,setPhoto]=useState('');
 async function post(e:React.FormEvent){e.preventDefault();const me=detail.guests.find(g=>g.isMe)?.name||'You';const ok=await act('memories','POST',{kind,body:text,photoUrl:photo},d=>{d.memories.unshift({id:uid(),name:me,kind,body:text.trim(),photo_url:photo.trim()||null,created:new Date().toISOString(),isMine:true})},kind==='shoutout'?'Thank-you posted.':'Added to the replay.');if(ok){setText('');setPhoto('')}}
 if(!made&&!past&&!detail.memories.length)return <section className="panel replay-panel quiet"><div className="section-title"><h2>Photos and thank-yous</h2><PartyPopper size={20}/></div><p className="muted">After the plan happens, people who went can share photos and thank-yous here.</p></section>;
 return <section className={'panel replay-panel'+(made?' made':'')}>
  <div className="section-title"><h2>{made?'It happened!':'How was it?'}</h2><PartyPopper size={20}/></div>
  {detail.host&&<div className="made-row"><p className="muted">{made?'Saved to everyone’s history.':'Did it happen? Mark it done to save it to everyone’s history.'}</p><button className={made?'text-button':'primary'} disabled={busy} onClick={()=>act('','PATCH',{madeIt:!made},d=>{d.plan.made_it=made?0:1},made?'Unmarked.':'Made it out. 🎉')}>{made?'Undo':'We made it out'}</button></div>}
  {canPost&&<form className="memory-form" onSubmit={post}>
   <div className="type-selector small"><button type="button" className={kind==='memory'?'chosen':''} onClick={()=>setKind('memory')}><Camera size={15}/>A memory</button><button type="button" className={kind==='shoutout'?'chosen':''} onClick={()=>setKind('shoutout')}><PartyPopper size={15}/>A thank-you</button></div>
   <textarea rows={2} required maxLength={500} value={text} onChange={e=>setText(e.target.value)} placeholder={kind==='shoutout'?'Who made it happen? Say thanks.':'What do you want to remember?'}/>
   {kind==='memory'&&<input type="url" maxLength={1000} value={photo} onChange={e=>setPhoto(e.target.value)} placeholder="Photo or shared album link (https://…) — optional"/>}
   <div className="form-bottom"><small className="hint">Anyone with the plan link can see this.</small><button className="primary" disabled={busy||!text.trim()}>Post</button></div>
  </form>}
  <div className="memory-grid">{detail.memories.map((m:Memory,i)=><article key={m.id} className={'memory '+m.kind+' tone-'+(i%3)}>
   {m.photo_url&&/\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(m.photo_url)?<img className="memory-photo" src={m.photo_url} alt={'Photo from '+m.name} loading="lazy" referrerPolicy="no-referrer"/>:m.photo_url?<a className="album-link" href={m.photo_url} target="_blank" rel="noopener noreferrer"><Camera size={15}/>Open the photos<ExternalLink size={12}/></a>:null}
   {m.kind==='shoutout'&&<span className="shout-tag">THANK-YOU</span>}
   <p>{m.body}</p>
   <footer><span>{m.name}{m.isMine?' (you)':''}</span>{(m.isMine||detail.host)&&<button className="icon-button" aria-label="Remove" disabled={busy} onClick={()=>act('memories/'+m.id,'DELETE',null,d=>{d.memories=d.memories.filter(x=>x.id!==m.id)})}><Trash2 size={13}/></button>}</footer>
  </article>)}</div>
  {!canPost&&!detail.memories.length&&<p className="inline-empty">Nothing here yet. People who went can add photos and thank-yous.</p>}
 </section>
}

