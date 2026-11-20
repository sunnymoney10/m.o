'use client';
// What a guest sees after answering "Can't make it" or "Still checking".
// Can't make it: a thank-you, nothing else to do, and a way to change the answer.
// Still checking: they pick when to decide. The host sees that day; the guest can add a phone reminder.
// m.o never sends messages or notifications itself.
import {useEffect,useRef,useState} from 'react';
import {Check,Clock,CalendarPlus,Heart,Plus,UserRound} from 'lucide-react';
import type {Detail,Guest} from '@/lib/types';

const ymd=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
// Brings the card into view right after the guest answers (instant when reduced motion is on).
function useShow(){const r=useRef<HTMLElement>(null);useEffect(()=>{const smooth=!matchMedia('(prefers-reduced-motion: reduce)').matches;r.current?.scrollIntoView({block:'center',behavior:smooth?'smooth':'auto'})},[]);return r}
const nice=(day:string)=>new Date(day+'T12:00').toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'});

export function DeclinedCard({detail,host,onChange}:{detail:Detail;host:string;onChange:(s:'in'|'maybe')=>void}){
 const r=useShow();
 return <section ref={r} className="answer-card declined" aria-labelledby="declined-title">
  <Heart size={26} strokeWidth={1.8} aria-hidden="true"/>
  <h2 id="declined-title">Thanks for letting {host||'them'} know</h2>
  <p className="next-time">Make it out next time!</p>
  <span className="eyebrow">CHANGED YOUR MIND?</span>
  <div className="quick-answers"><button className="primary" onClick={()=>onChange('in')}><Check size={17}/>I can make it</button><button className="outline-button" onClick={()=>onChange('maybe')}><Clock size={17}/>Still checking</button></div>
 </section>
}

// A calendar file with a reminder at 10 AM on that day. Opening it on a phone offers to add it to the calendar.
function reminderFile(detail:Detail,day:string,link:string){
 const d=day.replace(/-/g,''),esc=(s:string)=>s.replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\;');
 const ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//mo//Make it out//EN','BEGIN:VEVENT','UID:checkback-'+detail.plan.id+'@mo','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''),
  'DTSTART:'+d+'T100000','DTEND:'+d+'T101500','SUMMARY:'+esc('Decide: '+detail.plan.title),'DESCRIPTION:'+esc('Say if you can make it: '+link),
  'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+esc('Decide: '+detail.plan.title),'TRIGGER:PT0M','END:VALARM','END:VEVENT','END:VCALENDAR'].join('\r\n');
 const u=URL.createObjectURL(new Blob([ics],{type:'text/calendar;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download='mo-reminder.ics';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
}

export function CheckBackCard({detail,me,host,busy,link,save,onChange}:{detail:Detail;me:Guest;host:string;busy:boolean;link:string;save:(day:string)=>void;onChange:(s:'in'|'out')=>void}){
 const today=new Date(),add=(n:number)=>{const d=new Date(today);d.setDate(d.getDate()+n);return ymd(d)};
 const planDay=detail.plan.date?ymd(new Date(detail.plan.date)):'';
 const options:[string,string][]=[['Tomorrow',add(1)],['In 3 days',add(3)],['In a week',add(7)]].filter(([,d])=>!planDay||d<planDay) as [string,string][];
 const day=me.check_back||'';
 const r=useShow();
 return <section ref={r} className="answer-card checking" aria-labelledby="checkback-title">
  <Clock size={26} strokeWidth={1.8} aria-hidden="true"/>
  {day?<>
   <h2 id="checkback-title">You’ll decide by {nice(day)}</h2>
   <p>{host||'The host'} can see that. Want a reminder on your phone?</p>
   <button className="primary" onClick={()=>reminderFile(detail,day,link)}><CalendarPlus size={17}/>Add a reminder to my calendar</button>
   <button className="text-button" onClick={()=>save('')}>Pick a different day</button>
  </>:<>
   <h2 id="checkback-title">When should {host||'the host'} check back with you?</h2>
   <p>Pick a day. {host||'The host'} will see it, and you can add a reminder to your phone.</p>
   <div className="chips">{options.map(([label,d])=><button key={d} className="chip" disabled={busy} onClick={()=>save(d)}>{label}</button>)}</div>
   <label className="check-day">Or pick a day<input type="date" min={add(0)} max={planDay||add(90)} onChange={e=>{if(e.target.value)save(e.target.value)}}/></label>
  </>}
  <span className="eyebrow">ALREADY KNOW?</span>
  <div className="quick-answers"><button className="outline-button" onClick={()=>onChange('in')}><Check size={17}/>I’m in</button><button className="outline-button" onClick={()=>onChange('out')}>Can’t make it</button></div>
 </section>
}

// For guests (never hosts): a light invitation to use m.o for their own plans. "Not now" hides it on this phone.
export function TryMo({host,start,profile}:{host:string;start:()=>void;profile:()=>void}){
 const [hidden,setHidden]=useState(()=>{try{return localStorage.getItem('mo-try-hidden')==='1'}catch{return false}});
 if(hidden)return null;
 return <section className="try-mo" aria-labelledby="try-title">
  <span className="eyebrow">FREE FOR EVERYONE</span>
  <h3 id="try-title">Planning something yourself?</h3>
  <p>This is how {host?host+'’s':'your host’s'} plans actually make it out the group chat. Yours can too: one link, everyone answers, nobody asks twice.</p>
  <div className="draft-actions"><button className="primary" onClick={start}><Plus size={16}/>Start your own plan</button><button className="outline-button" onClick={profile}><UserRound size={16}/>Set up my profile</button></div>
  <button className="text-button quiet" onClick={()=>{setHidden(true);try{localStorage.setItem('mo-try-hidden','1')}catch{}}}>Not now</button>
 </section>
}
