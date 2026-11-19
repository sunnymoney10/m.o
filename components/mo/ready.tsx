'use client';
// The host's "Get it ready" checklist: the outcomes a gathering needs, each with how far along it is and one action.
// Everything is worked out from saved plan data; nothing is guessed.
import {Check,ChevronRight} from 'lucide-react';
import type {Detail} from '@/lib/types';
import {nudgeMaybes} from '@/lib/group-update';

type Step={key:string;done:boolean;title:string;detail:string;action?:{label:string;run:()=>void}};

export function GetItReady({detail,link,shared,go,edit,share,notify}:{detail:Detail;link:string;shared:boolean;go:(tab:'people'|'list',opts?:{add?:boolean;send?:boolean})=>void;edit:()=>void;share:()=>void;notify:(t:string)=>void}){
 const p=detail.plan,others=detail.guests.filter(g=>!g.isHost),tasks=detail.tasks;
 const answered=others.filter(g=>g.status!=='invited').length,waiting=others.filter(g=>g.status==='invited'||g.status==='maybe');
 const covered=tasks.filter(t=>t.claimed_name).length,unconfirmed=others.filter(g=>g.source==='host').length+tasks.filter(t=>t.claim_source==='host').length;
 const reached=shared||others.some(g=>g.source==='guest');
 async function copyNudge(){const text=nudgeMaybes(detail,link);if(!text){go('people');return}try{await navigator.clipboard.writeText(text);notify('Nudge copied. Paste it in the group chat.')}catch{notify(text)}}
 const steps:Step[]=[
  {key:'list',done:others.length>0,title:'Add who you invited',detail:others.length?`${others.length} ${others.length===1?'person':'people'} on the list`:'So you can see who hasn’t replied',action:{label:others.length?'Add more':'Add names',run:()=>go('people',{add:true})}},
  {key:'invite',done:reached,title:'Send the invites',detail:reached?'Invites sent':others.length?'Text each person their own invite, or paste the link in your group chat':'Add your guest list first',action:others.length?{label:'Send invites',run:()=>go('people',{send:true})}:{label:'Copy invite link',run:share}},
  {key:'answers',done:others.length>0&&waiting.length===0,title:'Hear back from everyone',detail:others.length?`${answered} of ${others.length} answered${waiting.length?` · waiting on ${waiting.slice(0,3).map(g=>g.name).join(', ')}${waiting.length>3?` +${waiting.length-3}`:''}`:''}${unconfirmed?` · ${unconfirmed} noted by you, not confirmed`:''}`:'Add your guest list first',action:waiting.length?{label:'Copy a nudge',run:copyNudge}:undefined},
  {key:'items',done:tasks.length>0&&covered===tasks.length,title:p.kind==='trip'?'Give every task a person':'Cover the bring list',detail:tasks.length?`${covered} of ${tasks.length} covered`:'Nothing on the list yet',action:{label:covered===tasks.length&&tasks.length?'View list':'Open the list',run:()=>go('list')}},
  {key:'details',done:!!p.date&&!!p.place&&!!detail.details,title:'Add the date, address and arrival notes',detail:[!p.date&&'date',!p.place&&'address',!detail.details&&'arrival notes'].filter(Boolean).join(', ').replace(/^./,c=>c.toUpperCase())+(p.date&&p.place&&detail.details?'All set':' still missing'),action:{label:'Edit details',run:edit}},
 ];
 const done=steps.filter(s=>s.done).length;
 return <section className="next-steps" aria-labelledby="ready-title">
  <div className="ready-head"><h2 id="ready-title">{done===steps.length?'Everything’s ready':'Get it ready'}</h2><span className="ready-count">{done} of {steps.length}</span></div>
  <div className="ready-track" aria-hidden="true"><span style={{width:done/steps.length*100+'%'}}/></div>
  <ol>{steps.map(s=><li key={s.key} className={s.done?'done':''}>
   <span className="ready-check" aria-label={s.done?'Done':'To do'}>{s.done?<Check size={14} strokeWidth={3}/>:null}</span>
   <div><strong>{s.title}</strong><span>{s.detail}</span></div>
   {s.action&&(!s.done||s.key==='list'||s.key==='items')&&<button className={s.done?'text-button small quiet':'text-button small'} onClick={s.action.run}>{s.action.label}<ChevronRight size={14}/></button>}
  </li>)}</ol>
 </section>
}
