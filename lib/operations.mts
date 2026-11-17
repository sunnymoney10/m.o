import {conflicts} from './host-tools.mts';
export type Supply={id:string;title:string;need:number;have:number;guestId:string;confirmed:boolean};
export type Expense={id:string;title:string;cents:number;category:string;split:string[]};
export type Contingency={id:string;trigger:string;action:string;person:string;ready:boolean};
export type CloseItem={id:string;title:string;kind:string;person:string;done:boolean};
export type Venue={id:string;name:string;url:string;cents:number;attendees:number;sleepers:number;permission:string;kitchen:string;indoor:string;outdoor:string;parking:string;notes:string};
export type Operations={supplies:Supply[];expenses:Expense[];payments:Record<string,number>;overnight:string[];contingencies:Contingency[];closeout:CloseItem[];venues:Venue[];chosenVenue:string;dietChecks:Record<string,boolean>;menu:Record<string,{category:string;ingredients:string;diet:string}>;eventStart:string;eventEnd:string;learning:string};
export const blankOps=():Operations=>({supplies:[],expenses:[],payments:{},overnight:[],contingencies:[],closeout:[],venues:[],chosenVenue:'',dietChecks:{},menu:{},eventStart:'2026-11-22T17:00:00-05:00',eventEnd:'2026-11-22T22:00:00-05:00',learning:''});
export function cents(s:string){if(!/^\d{1,7}(\.\d{1,2})?$/.test(s.trim()))return null;const [whole,fraction='']=s.trim().split('.');return Number(whole)*100+Number(fraction.padEnd(2,'0'))}
export function splitCents(amount:number,ids:string[]){const unique=[...new Set(ids)];if(!unique.length)return {};const base=Math.floor(amount/unique.length),left=amount%unique.length;return Object.fromEntries(unique.map((id,i)=>[id,base+(i<left?1:0)]))}
export function balances(ops:Operations){const due:Record<string,number>={};let unallocated=0;for(const e of ops.expenses){if(!e.split.length){unallocated+=e.cents;continue}for(const [id,n] of Object.entries(splitCents(e.cents,e.split)))due[id]=(due[id]||0)+n}return {due,unallocated,total:ops.expenses.reduce((a,e)=>a+e.cents,0)}}
export function briefing(d:any){const out:{title:string;where:string}[]=[];const gs=d.guests||[];const ops:Operations={...blankOps(),...d.ops};
 const pending=gs.filter((g:any)=>['Awaiting reply','Maybe'].includes(g.rsvp));if(pending.length)out.push({title:`${pending.length} guests need an attendance answer`,where:'Guests'});
 const plus=gs.filter((g:any)=>g.plus==='Requested');if(plus.length)out.push({title:`${plus.length} plus-one requests need review`,where:'Guests'});
 const dishes=gs.filter((g:any)=>g.rsvp!=='Declined'&&g.dish&&g.food!=='Reconfirmed');if(dishes.length)out.push({title:`${dishes.length} contributions need reconfirmation`,where:'Food & backups'});
 const diets=gs.filter((g:any)=>g.rsvp!=='Declined'&&g.diet&&!ops.dietChecks[g.id]);if(diets.length)out.push({title:`${diets.length} dietary requirements need a menu check`,where:'Event essentials'});
 const missing=ops.supplies.filter(s=>s.have<s.need&&!(s.guestId&&s.confirmed));if(missing.length)out.push({title:`${missing.length} supplies have an uncovered gap`,where:'Event essentials'});
 const errands=(d.board?.errands||[]).filter((e:any)=>!e.done&&!e.confirmed);if(errands.length)out.push({title:`${errands.length} errands need an agreed helper`,where:'Group coordination'});
 const rides=(d.board?.rides||[]).filter((r:any)=>!r.confirmed);if(rides.length)out.push({title:`${rides.length} carpools need agreement`,where:'Group coordination'});
 const collisions=conflicts(d.tools?.blocks||[],'person').length+conflicts(d.tools?.blocks||[],'resource').length;if(collisions)out.push({title:`${collisions} schedule overlaps need attention`,where:'Host tools'});
 const roles=(d.tools?.roles||[]).filter((r:any)=>!r.confirmed);if(roles.length)out.push({title:`${roles.length} helper roles are not confirmed`,where:'Host tools'});
 const reminders=(d.concierge?.reminders||[]).filter((r:any)=>!r.sent);if(reminders.length)out.push({title:`${reminders.length} reminders remain in your queue`,where:'Guest concierge'});
 if(!d.address)out.push({title:'Event address has not been recorded',where:'Event details'});
 const selected=ops.venues.find(v=>v.id===ops.chosenVenue);if(selected&&selected.permission!=='Written confirmation')out.push({title:'Selected venue still needs written gathering permission',where:'Event essentials'});
 const finance=balances(ops);if(finance.unallocated)out.push({title:'Some expenses have no agreed split',where:'Event essentials'});
 const declined=new Set(gs.filter((g:any)=>g.rsvp==='Declined').map((g:any)=>g.id));
 if(ops.expenses.some(e=>e.split.some(id=>declined.has(id))))out.push({title:'A declined guest remains on an expense split; review the agreement',where:'Event essentials'});
 return out;
}
export function reusableTemplate(d:any){const o:Operations={...blankOps(),...d.ops};return {format:'m.o-template-v1',needs:(d.tools?.needs||[]).map((n:any)=>({title:n.title,effort:n.effort,budget:n.budget})),roles:(d.tools?.roles||[]).map((r:any)=>({title:r.title})),supplies:o.supplies.map(s=>({title:s.title,need:s.need})),closeout:o.closeout.map(c=>({title:c.title,kind:c.kind})),contingencies:o.contingencies.map(c=>({trigger:c.trigger,action:c.action}))}}
export function calendar(start:string,end:string,title:string){const a=new Date(start),b=new Date(end);if(!Number.isFinite(+a)||!Number.isFinite(+b)||+b<=+a)throw Error('Choose an end after the start.');const stamp=(d:Date)=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');const escape=(s:string)=>s.replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//m.o//Host desk//EN','BEGIN:VEVENT','UID:'+crypto.randomUUID()+'@mo','DTSTAMP:'+stamp(new Date()),'DTSTART:'+stamp(a),'DTEND:'+stamp(b),'SUMMARY:'+escape(title),'END:VEVENT','END:VCALENDAR'].join('\r\n')+'\r\n'}
