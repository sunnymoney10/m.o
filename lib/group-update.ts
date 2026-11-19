import {whenRange} from './when';
// Deterministic group-chat drafts built only from what is saved in the plan.
// Nothing here guesses commitments or sends anything; the organizer copies and edits the text.
export type UpdateInput={
 plan:{title:string;date:string;end_date?:string;place:string;budget?:string;kind?:string};
 guests:{name:string;status:string}[];
 tasks:{title:string;claimed_name:string|null;done:number}[];
 polls?:{question:string;decided_option:string|null;kind?:string;options:{id:string;label:string;votes:number}[]}[];
};
export function when(date:string){if(!date)return '';const d=new Date(date);if(Number.isNaN(+d))return '';return d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})+' · '+d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}
export function optionLabel(kind:string|undefined,label:string){return kind==='date'?when(label)||label:label}
function names(list:string[]){return list.length<=2?list.join(' & '):list.slice(0,-1).join(', ')+' & '+list[list.length-1]}

export function groupUpdate(d:UpdateInput,link:string){
 const p=d.plan,lines:string[]=[];
 const going=d.guests.filter(g=>g.status==='in').map(g=>g.name),maybe=d.guests.filter(g=>g.status==='maybe').map(g=>g.name);
 const open=d.tasks.filter(t=>!t.claimed_name).map(t=>t.title);
 const polls=(d.polls||[]).filter(x=>!x.decided_option);
 lines.push(p.title);
 lines.push(whenRange(p.date,p.end_date,' at ')||'Date still to decide');
 lines.push(p.place||'Place still to decide');
 lines.push('');
 lines.push(going.length?`Going (${going.length}): ${names(going)}`:'Nobody has said they’re going yet.');
 if(maybe.length)lines.push(`Still checking: ${names(maybe)}`);
 for(const x of polls){const lead=[...x.options].sort((a,b)=>b.votes-a.votes)[0];lines.push(`Vote: ${x.question}${lead&&lead.votes?` (leaning ${optionLabel(x.kind,lead.label)})`:''}`)}
 if(open.length)lines.push(`Still needed: ${open.slice(0,6).join(', ')}${open.length>6?` +${open.length-6} more`:''}`);
 lines.push('');
 lines.push(open.length||polls.length?`Pick something or vote here: ${link}`:`Everything is covered. Details here: ${link}`);
 return lines.join('\n');
}

export function nudgeMaybes(d:UpdateInput,link:string){
 // People still checking and people on the host's list who haven't answered yet.
 const maybe=d.guests.filter(g=>g.status==='maybe'||g.status==='invited').map(g=>g.name);
 if(!maybe.length)return '';
 return `Hey ${names(maybe)} — no pressure, just locking in numbers for ${d.plan.title}${when(d.plan.date)?` (${whenRange(d.plan.date,d.plan.end_date)})`:''}. Can you let us know if you’re in? ${link}`;
}

export function nextStep(d:UpdateInput){
 const p=d.plan,open=d.tasks.filter(t=>!t.claimed_name),pending=(d.polls||[]).filter(x=>!x.decided_option);
 if(!p.date)return pending.some(x=>x.kind==='date')?'A date vote is open. Pick the final date once people have voted.':'Set a date, or start a vote on one.';
 if(!p.place)return pending.some(x=>x.kind==='place')?'A place vote is open. Pick the final place once people have voted.':'Set a place, or start a vote on one.';
 if(pending.length)return `${pending.length} ${pending.length===1?'decision is':'decisions are'} still open. Remind people to vote, then pick the final choice.`;
 if(!p.budget&&p.kind==='trip')return 'Agree on a cost per person.';
 if(open.length)return `${open.length} ${open.length===1?'item still needs':'items still need'} someone. Ask the group to pick what they can.`;
 if(d.guests.some(g=>g.status==='maybe'||g.status==='invited'))return 'Some people haven’t answered. Send a reminder.';
 return 'Everything is covered. Check nothing is left before the day.';
}
