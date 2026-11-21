// Where a plan is on its journey, and what is still left before it happens.
// Worked out only from what is saved: silence and guesses never count as an answer or a commitment.
// The server and the screens both use this file, so the stage names and rules change in one place.

export type Stage='chat'|'shape'|'locked'|'out';
export const STAGES:{key:Stage;label:string;line:string}[]=[
 {key:'chat',label:'In the chat',line:'An idea. No date yet.'},
 {key:'shape',label:'Taking shape',line:'A date is set. Some things are still open.'},
 {key:'locked',label:'Locked in',line:'Everyone knows when, where and what to bring.'},
 {key:'out',label:'Made it out',line:'It happened.'},
];
export function stageLabel(s:Stage){return STAGES.find(x=>x.key===s)!.label}

// The saved facts the rules need. Counts are of people on the guest list, not counting the host.
export type JourneyFacts={
 hasDate:boolean;hasPlace:boolean;madeIt:boolean;
 others:number;noReply:number;checking:number;
 openItems:number;openDateVotes:number;openPlaceVotes:number;openOtherVotes:number;requests:number;
};

// What is left, in the order a host would deal with it. Each key is one line on the host's list.
export type LeftKey='people'|'date'|'place'|'votes'|'requests'|'answers'|'items';
export function thingsLeft(f:JourneyFacts):LeftKey[]{
 if(f.madeIt)return [];
 const left:LeftKey[]=[];
 if(!f.others)left.push('people');
 if(!f.hasDate)left.push('date');
 if(!f.hasPlace)left.push('place');
 if(otherVotes(f))left.push('votes');
 if(f.requests)left.push('requests');
 if(f.others&&f.noReply+f.checking)left.push('answers');
 if(f.openItems)left.push('items');
 return left;
}
// Open votes not already covered by a missing date or place line.
export function otherVotes(f:JourneyFacts){return f.openOtherVotes+(f.hasDate?f.openDateVotes:0)+(f.hasPlace?f.openPlaceVotes:0)}

// No date: still in the chat. A date and nothing left: locked in. Made it out only when the host says so.
export function stageOf(f:JourneyFacts):Stage{
 if(f.madeIt)return 'out';
 if(!f.hasDate)return 'chat';
 return thingsLeft(f).length?'shape':'locked';
}

export function leftHeadline(n:number){return n===0?'Nothing left to make it out':n===1?'1 thing left to make it out':`${n} things left to make it out`}

// Facts from a full plan as the host sees it (guest rows, tasks, votes, requests).
type GuestLike={status:string;isHost?:boolean};
export function factsFrom(d:{plan:{date?:string;place?:string;made_it?:number};guests:GuestLike[];tasks:{claimed_name:string|null}[];polls:{kind:string;decided_option:string|null}[];plusOneRequests?:unknown[]}):JourneyFacts{
 const others=d.guests.filter(g=>!g.isHost&&['in','maybe','invited','out'].includes(g.status));
 const open=d.polls.filter(v=>!v.decided_option);
 return {hasDate:!!d.plan.date,hasPlace:!!d.plan.place,madeIt:!!d.plan.made_it,
  others:others.length,noReply:others.filter(g=>g.status==='invited').length,checking:others.filter(g=>g.status==='maybe').length,
  openItems:d.tasks.filter(t=>!t.claimed_name).length,
  openDateVotes:open.filter(v=>v.kind==='date').length,openPlaceVotes:open.filter(v=>v.kind==='place').length,openOtherVotes:open.filter(v=>v.kind!=='date'&&v.kind!=='place').length,
  requests:(d.plusOneRequests||[]).length};
}

// Seats at the table, in reading order: coming, checking, no reply, can't make it.
export type Seat='in'|'maybe'|'wait'|'cant';
export function seatOf(status:string):Seat{return status==='in'?'in':status==='maybe'?'maybe':status==='out'?'cant':'wait'}
export function seatSummary(c:{in:number;maybe:number;wait:number;cant:number}){
 return [c.in&&`${c.in} coming`,c.maybe&&`${c.maybe} checking`,c.wait&&`${c.wait} no reply`,c.cant&&`${c.cant} can’t make it`].filter(Boolean).join(', ')||'Nobody on the list yet';
}
