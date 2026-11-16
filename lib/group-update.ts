// Deterministic group-chat drafts built only from what is saved in the plan.
// Nothing here guesses commitments or sends anything; the organizer copies and edits the text.
export type UpdateInput={
 plan:{title:string;date:string;place:string;budget?:string};
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
 lines.push(`📍 ${p.title}`);
 const facts=[when(p.date)||'Date still to decide',p.place||'Place still to decide'];
 lines.push(facts.join(' — '));
 lines.push('');
 lines.push(going.length?`✅ In (${going.length}): ${names(going)}`:'✅ Nobody has said they’re in yet.');
 if(maybe.length)lines.push(`🤔 Still checking: ${names(maybe)}`);
 for(const x of polls){const lead=[...x.options].sort((a,b)=>b.votes-a.votes)[0];lines.push(`🗳️ Vote: ${x.question}${lead&&lead.votes?` (leaning ${optionLabel(x.kind,lead.label)})`:''}`)}
 if(open.length)lines.push(`🙋 Up for grabs: ${open.slice(0,6).join(', ')}${open.length>6?` +${open.length-6} more`:''}`);
 lines.push('');
 lines.push(open.length||polls.length?`Claim something or vote here 👉 ${link}`:`Everything has an owner. Details here 👉 ${link}`);
 return lines.join('\n');
}

export function nudgeMaybes(d:UpdateInput,link:string){
 const maybe=d.guests.filter(g=>g.status==='maybe').map(g=>g.name);
 if(!maybe.length)return '';
 return `Hey ${names(maybe)} — no pressure, just locking in numbers for ${d.plan.title}${when(d.plan.date)?` (${when(d.plan.date)})`:''}. Can you let us know if you’re in? 👉 ${link}`;
}

export function nextStep(d:UpdateInput){
 const p=d.plan,open=d.tasks.filter(t=>!t.claimed_name),pending=(d.polls||[]).filter(x=>!x.decided_option);
 if(!p.date)return pending.some(x=>x.kind==='date')?'A date vote is open. Lock in the winner once enough people have voted.':'Get a date on the table. Start a date vote before anyone books.';
 if(!p.place)return pending.some(x=>x.kind==='place')?'A place vote is open. Lock it in when the group leans one way.':'Give the idea a place. Share a shortlist as a vote.';
 if(pending.length)return `${pending.length} ${pending.length===1?'decision is':'decisions are'} still open. Nudge people to vote, then lock it in.`;
 if(!p.budget)return 'Talk money early. Agree what everyone is comfortable spending.';
 if(open.length)return `${open.length} ${open.length===1?'item needs':'items need'} a person. Post an update and ask the group to claim what they can.`;
 if(d.guests.some(g=>g.status==='maybe'))return 'Someone is still checking. Send the maybes a quick nudge.';
 return 'The essentials have owners. Check what still needs completing before you go.';
}
