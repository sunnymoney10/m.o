'use client';
// The plan journey on screen: the stage bar, "the table" of seats, and the host's "things left to make it out".
// Rules and wording come from lib/journey.ts. Everything is worked out from saved data; nothing is guessed.
import {ChevronRight} from 'lucide-react';
import type {Detail,Plan} from '@/lib/types';
import {nudgeMaybes} from '@/lib/group-update';
import {smsHref} from '@/lib/invite';
import {planGroup} from '@/lib/plan-order';
import {STAGES,stageOf,stageLabel,factsFrom,thingsLeft,otherVotes,leftHeadline,seatOf,seatSummary,type Stage,type Seat,type LeftKey} from '@/lib/journey';

// One seat: a round head over a table line, like the dot in the logo.
// Filled brick = coming, butter = still checking, dashed = no reply, crossed = can't make it.
// A dashed ring marks an answer the host noted that the person hasn't confirmed.
export function SeatIcon({seat,noted=false,className=''}:{seat:Seat;noted?:boolean;className?:string}){
 return <svg className={`seat seat-${seat}${noted?' seat-noted':''} ${className}`} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
  {noted&&<circle className="seat-ring" cx="32" cy="25" r="19"/>}
  <circle className="seat-head" cx="32" cy="25" r={seat==='in'?13:seat==='maybe'?12:11}/>
  {seat==='cant'&&<path className="seat-cross" d="M24 17l16 16M40 17L24 33"/>}
  <rect className="seat-line" x="13" y="43" width="38" height="8" rx="4"/>
 </svg>
}

export function StageChip({stage}:{stage:Stage}){return <span className={'stage-chip stage-chip-'+stage}>{stageLabel(stage)}</span>}

// The four stages as a line, with the current one named.
export function JourneyBar({stage}:{stage:Stage}){
 const at=STAGES.findIndex(s=>s.key===stage);
 return <div className="journey-bar" role="img" aria-label={`Where this plan is: ${STAGES[at].label}. ${STAGES[at].line}`}>
  <div className="journey-track">{STAGES.map((s,i)=><span key={s.key} className={i<=at?'on':''}/>)}</div>
  <div className="journey-labels">{STAGES.map((s,i)=><span key={s.key} className={i===at?'here':''}>{s.label}</span>)}</div>
 </div>
}

// Seats on a plan card, from the counts the plan list carries. Up to 8 seats, then "+N".
export function CardSeats({plan}:{plan:Plan}){
 const c={in:plan.going||0,maybe:plan.maybe||0,wait:plan.invited||0,cant:plan.cant||0};
 const seats:Seat[]=[...Array(c.in).fill('in'),...Array(c.maybe).fill('maybe'),...Array(c.wait).fill('wait'),...Array(c.cant).fill('cant')];
 const shown=seats.slice(0,8),more=seats.length-shown.length;
 return <span className="card-seats" role="img" aria-label={seatSummary(c)}>
  {shown.map((s,i)=><SeatIcon key={i} seat={s}/>)}{more>0&&<span className="card-seats-more" aria-hidden="true">+{more}</span>}
  <span className="card-seats-text" aria-hidden="true">{c.in} coming</span>
 </span>
}

// Short words for each thing left, for plan cards (the host's own plans only).
const CARD_WORDS:Record<LeftKey,string>={people:'Add who’s coming',date:'Pick a date',place:'Add the place',votes:'Close a vote',requests:'Answer a request',answers:'Hear back from people',items:'Cover the list'};
export function leftPreview(left:LeftKey[]){return left.slice(0,2).map(k=>CARD_WORDS[k]).join(' · ')}

// The table on a plan page: everyone on the guest list as a seat with their name.
export function TheTable({detail,go}:{detail:Detail;go:()=>void}){
 const order:Record<Seat,number>={in:0,maybe:1,wait:2,cant:3};
 const people=detail.guests.filter(g=>['in','maybe','invited','out'].includes(g.status));
 const sorted=[...people].sort((a,b)=>(b.isHost?1:0)-(a.isHost?1:0)||order[seatOf(a.status)]-order[seatOf(b.status)]);
 const others=people.filter(g=>!g.isHost),answered=others.filter(g=>g.status!=='invited').length;
 const c={in:0,maybe:0,wait:0,cant:0};for(const g of people)c[seatOf(g.status)]++;
 const shown=sorted.slice(0,16),more=sorted.length-shown.length;
 return <section className="the-table" aria-labelledby="table-title">
  <div className="the-table-head"><h2 id="table-title">The table</h2><span>{others.length?`${answered} of ${others.length} answered`:'Nobody invited yet'}</span></div>
  <p className="sr-only">{seatSummary(c)}</p>
  <ul className="table-seats">{shown.map((g,i)=>{const s=seatOf(g.status),noted=g.source==='host'&&!g.isHost&&s!=='wait';
   return <li key={g.id||i} className={'table-seat table-seat-'+s}><SeatIcon seat={s} noted={noted}/><span className="table-seat-name">{g.isMe?'You':g.name.split(' ')[0]}</span>
    <span className="sr-only">: {s==='in'?'coming':s==='maybe'?'still checking':s==='cant'?'can’t make it':'no reply yet'}{noted?', noted by the host, not confirmed':''}{g.isHost?', host':''}</span></li>})}</ul>
  {more>0&&<button className="text-button small" onClick={go}>See all {sorted.length} people<ChevronRight size={14}/></button>}
  <p className="table-key">Filled: coming · Yellow: still checking · Dashed: no reply · Crossed: can’t make it</p>
 </section>
}

function names(list:string[]){return list.length<=2?list.join(' and '):list.slice(0,-1).join(', ')+' and '+list[list.length-1]}

type Line={key:LeftKey;title:string;detail:string;action?:{label:string;run:()=>void}};

// The host's list of what is still left before the plan happens, each with one action.
export function ThingsLeft({detail,link,shared,go,edit,openVotes,notify,markMade,busy}:{detail:Detail;link:string;shared:boolean;go:(tab:'people'|'list',opts?:{add?:boolean;send?:boolean})=>void;edit:()=>void;openVotes:()=>void;notify:(t:string)=>void;markMade:()=>void;busy:boolean}){
 const p=detail.plan,f=factsFrom(detail),left=thingsLeft(f),trip=p.kind==='trip';
 const others=detail.guests.filter(g=>!g.isHost&&['in','maybe','invited','out'].includes(g.status));
 const waiting=others.filter(g=>g.status==='invited'||g.status==='maybe');
 const noted=others.filter(g=>g.source==='host'&&g.status!=='invited').length;
 const open=detail.tasks.filter(t=>!t.claimed_name);
 const votes=detail.polls.filter(v=>!v.decided_option&&!(v.kind==='date'&&!p.date)&&!(v.kind==='place'&&!p.place));
 const reqs=detail.plusOneRequests||[];
 const reached=shared||others.some(g=>g.source==='guest'&&g.status!=='invited');
 async function copyNudge(){const text=nudgeMaybes(detail,link);if(!text){go('people');return}try{await navigator.clipboard.writeText(text);notify('Nudge copied. Paste it in the group chat.')}catch{notify(text)}}
 const toRequests=()=>document.querySelector('.plus-one-asks')?.scrollIntoView({behavior:'smooth',block:'start'});
 const dateVote=f.openDateVotes>0,placeVote=f.openPlaceVotes>0;
 const lines:Record<LeftKey,()=>Line>={
  people:()=>({key:'people',title:'Add who’s coming',detail:'So you can see who hasn’t answered',action:{label:'Add names',run:()=>go('people',{add:true})}}),
  date:()=>({key:'date',title:trip?'Pick the dates':'Pick a date',detail:dateVote?'A date vote is open. Pick the final date once people have voted.':'Set it, or start a vote on one',action:dateVote?{label:'See the vote',run:openVotes}:{label:'Add the date',run:edit}}),
  place:()=>({key:'place',title:trip?'Choose where you’re staying':'Add the place',detail:placeVote?'A place vote is open. Pick the final place once people have voted.':'Set it, or start a vote on one',action:placeVote?{label:'See the vote',run:openVotes}:{label:'Add the place',run:edit}}),
  votes:()=>({key:'votes',title:otherVotes(f)===1?'Close the open vote':`Close ${otherVotes(f)} open votes`,detail:votes.length?votes[0].question+(votes.length>1?` and ${votes.length-1} more`:''):'Pick the final choice',action:{label:'See votes',run:openVotes}}),
  requests:()=>({key:'requests',title:reqs.length===1?'Answer 1 request to bring someone':`Answer ${reqs.length} requests to bring someone`,detail:reqs.length===1?`${reqs[0].withName} asked to bring ${reqs[0].name}`:'Each one is waiting for your yes or no',action:{label:'Review',run:toRequests}}),
  answers:()=>{const first=waiting.slice(0,3).map(g=>g.name.split(' ')[0]),extra=waiting.length-first.length;
   const parts=[f.noReply&&`${f.noReply} no reply`,f.checking&&`${f.checking} still checking`,noted&&`${noted} noted by you, not confirmed`].filter(Boolean).join(' · ');
   return {key:'answers',title:`Hear back from ${names(extra>0?[...first,`${extra} more`]:first)}`,detail:reached?parts:'Invites not sent yet',action:reached?{label:'Copy a nudge',run:copyNudge}:{label:'Send invites',run:()=>go('people',{send:true})}}},
  items:()=>({key:'items',title:open.length===1?`${open[0].title} still needs someone`:`${open.length} ${trip?'tasks':'items'} still need someone`,detail:open.length===1?`${detail.tasks.length-1} of ${detail.tasks.length} covered`:open.slice(0,3).map(t=>t.title).join(', ')+(open.length>3?` +${open.length-3} more`:''),action:{label:'Open the list',run:()=>go('list')}}),
 };
 const shown=left.map(k=>lines[k]());
 const done=[p.date&&'date',p.place&&'place',others.length>0&&!waiting.length&&'everyone answered',detail.tasks.length>0&&!open.length&&(trip?'every task has a person':'bring list covered')].filter(Boolean) as string[];
 const over=planGroup(p)===2;
 return <section className="next-steps things-left" aria-labelledby="left-title">
  {over&&<div className="left-happened"><p><strong>Did it happen?</strong><span>The date has passed. Mark it so it’s saved to everyone’s history.</span></p><button className="primary" disabled={busy} onClick={markMade}>We made it out</button></div>}
  <h2 id="left-title">{over?'Still open':leftHeadline(shown.length)}</h2>
  {shown.length?<ol>{shown.map(s=><li key={s.key}>
   <span className="left-dot" aria-hidden="true"/>
   <div><strong>{s.title}</strong>{s.detail&&<span>{s.detail}</span>}</div>
   {s.action&&<button className="left-action" onClick={s.action.run}>{s.action.label}</button>}
  </li>)}</ol>:<p className="left-done-all">Everyone knows when, where and what to bring.</p>}
  {done.length>0&&<p className="left-done">Done: {done.join(', ')}</p>}
 </section>
}

// The stage a plan page shows: the host's own live data when they have it, otherwise what the server worked out.
export function stageFor(detail:Detail):Stage{return detail.host||!detail.plan.stage?stageOf(factsFrom(detail)):detail.plan.stage}

// The last stage: the plan happened. A stamp, who came, who brought what, and two host actions.
// "Send everyone a thank-you" opens Messages with words filled in; m.o never sends anything itself.
export function MadeItOut({detail,link,host,planNext}:{detail:Detail;link:string;host:boolean;planNext:()=>void}){
 const p=detail.plan,came=detail.guests.filter(g=>g.status==='in'),people=came.reduce((n,g)=>n+1+(g.extra_status==='approved'?g.extra_count||0:0),0);
 const brought=detail.tasks.filter(t=>t.claimed_name),day=p.date?new Date(p.date).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}):'';
 const thanks=`Thank you for coming to ${p.title}! We made it out of the group chat. Photos and thank-yous go here: ${link}`;
 return <section className="made-it-out" aria-labelledby="made-title">
  <div className="made-top">
   <span className="made-stamp"><SeatIcon seat="in"/>Made it out</span>
   <h2 id="made-title">{p.title} happened.</h2>
   <p>{[day,people?`${people} ${people===1?'person':'people'}`:'',brought.length?`${brought.length} ${brought.length===1?'thing':'things'} brought`:''].filter(Boolean).join(' · ')}</p>
  </div>
  <div className="made-body">
   {brought.length>0&&<div className="made-brought"><h3>Who brought what</h3><ul>{brought.map(t=><li key={t.id}><strong>{t.claimed_name}</strong> · {t.title}</li>)}</ul></div>}
   {host&&<div className="made-actions">
    <a className="primary block" href={smsHref('',thanks)}>Send everyone a thank-you</a>
    <button className="outline-button block" onClick={planNext}>Plan the next one with the same people</button>
    <p className="fine">Opens Messages with a thank-you filled in. You choose who gets it and tap Send.</p>
   </div>}
   <span className="made-note" aria-hidden="true">it made it out the group chat.</span>
  </div>
 </section>
}
