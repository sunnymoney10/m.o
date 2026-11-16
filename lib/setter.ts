import {z} from 'zod';
const line=z.string().trim().min(1).max(500);
export const draftSchema=z.object({
 source:z.string().trim().min(1).max(6000),
 fields:z.object({title:z.string().trim().min(1).max(100).optional(),date:z.string().max(40).optional(),place:z.string().max(160).optional(),budget:z.string().max(60).optional(),note:z.string().max(2000).optional()}).strict(),
 items:z.array(z.object({title:z.string().trim().min(1).max(160),category:z.enum(['bring','todo'])}).strict()).max(30),
 decisions:z.array(line).max(15),suggestions:z.array(line).max(15),questions:z.array(line).max(15)
}).strict();
export type SetterDraft=z.infer<typeof draftSchema>;
export function briefing(plan:any,guests:any[],tasks:any[]){
 const gaps:string[]=[];
 if(!plan.date)gaps.push('Which date and time work?');
 if(!plan.place)gaps.push('Where will we meet?');
 if(!plan.budget)gaps.push('What budget or contribution works for everyone?');
 const maybe=guests.filter(g=>g.status==='maybe').length;
 const declined=guests.filter(g=>g.status==='out').length;
 const open=tasks.filter(t=>!t.claimed_name&&!t.done);
 if(maybe)gaps.push(`${maybe} participant(s) still need to confirm attendance.`);
 if(open.length)gaps.push(`${open.length} unclaimed item(s): ${open.map(t=>t.title).join(', ')}.`);
 return {kind:'deterministic',going:guests.filter(g=>g.status==='in').length,maybe,declined,gaps,
 nextAction:gaps[0]||'Check outstanding preparation before the outing.',
 followUps:[...gaps.slice(0,3).map(g=>({gap:g,text:`For ${plan.title}: ${g} Please update the mo. plan when you know.`,sent:false})),...guests.filter(g=>g.status==='in'&&g.note).map(g=>({gap:`Clarify ${g.name}’s note`,text:`${g.name}, about your note “${g.note}”: is there anything we should plan for?`,sent:false}))]};
}
