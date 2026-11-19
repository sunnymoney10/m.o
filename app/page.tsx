'use client';
import {whenRange,endFor} from '@/lib/when';
import {keyFor,setPersonalKey} from '@/lib/invite';
import {PlaceSearch} from '@/components/mo/place-search';
import {HostLink} from '@/components/mo/host-link';
import {DeclinedCard,CheckBackCard,TryMo} from '@/components/mo/answer-cards';
import {stayLinks} from '@/lib/places';
import {planLink} from '@/lib/short-link';
import {useEffect,useRef,useState} from 'react';
import {Trash2,Clock,Send,ArrowUpRight,ArrowLeft,Plus,CalendarDays,MapPin,Check,Link as LinkIcon,CheckCircle2,X,ChevronRight,LoaderCircle,HelpCircle,Pencil,House,UsersRound,Box,Soup,CakeSlice,CupSoda,Snowflake,Music,Car,BedDouble,Wallet,Utensils,ClipboardCheck,Salad,Wine,Ticket,Copy,Lock} from 'lucide-react';
import type {Plan,Task,Guest,Detail,Me,Profile} from '@/lib/types';
import {ago} from '@/lib/types';
import {Scene,Face,sceneFor} from '@/components/mo/art';
import {SetterPanel,Decisions,LivePlan,Replay} from '@/components/mo/plan-sections';
import {PeopleTab,NotedBanner} from '@/components/mo/people';
import {GetItReady} from '@/components/mo/ready';
import {ProfileView} from '@/components/mo/profile';
import {Wordmark} from '@/components/mo/brand';

const DEMOS:Detail[]=[
 {organizer:'You',plan:{id:'demo-dinner',title:'Friendsgiving, with the usuals',kind:'gathering',date:'2026-11-26T18:00',place:'Your place',budget:'Everyone brings a dish',note:'Good food, questionable stories, and one very full table. Claim what you’re bringing so we have everything covered.'},host:true,
  guests:[{name:'You',status:'in',note:'',isMe:true,isHost:true},{name:'Ari',status:'in',note:'Bringing the folding chairs',isMe:false,handle:'ari',mo:'Feeding everyone, always.',interests:['Dinner parties','Game nights']},{name:'Sam',status:'in',note:'',isMe:false,handle:'samwise',mo:'Bringing the playlist.',interests:['Live music']},{name:'Jordan',status:'maybe',note:'Checking my shift',isMe:false}],
  tasks:[{id:'d1',title:'Something sweet',category:'bring',claimed_name:null,done:0,isMine:false},{id:'d2',title:'The main dish',category:'bring',claimed_name:'Ari',done:0,isMine:false},{id:'d3',title:'A really good side',category:'bring',claimed_name:null,done:0,isMine:false},{id:'d4',title:'Drinks & ice',category:'bring',claimed_name:'Sam',done:1,isMine:false},{id:'d5',title:'Confirm the final headcount',category:'todo',claimed_name:null,done:0,isMine:false}],
  polls:[{id:'dp1',question:'After-dinner plans?',kind:'choice',decided_option:null,options:[{id:'dpo1',label:'Board games',votes:2,voters:['Ari','Sam'],mine:false},{id:'dpo2',label:'Movie marathon',votes:1,voters:['Jordan'],mine:false}]}],
  stops:[{id:'ds1',at:'2026-11-26T23:00:00.000Z',title:'Doors open',detail:'Park on the street, not the driveway',url:null},{id:'ds2',at:'2026-11-27T00:00:00.000Z',title:'We eat',detail:'Bring your dish warm or ready to heat',url:null}],memories:[]},
 {organizer:'You',plan:{id:'demo-trip',title:'Atlanta birthday weekend',kind:'trip',date:'',place:'',budget:'',note:'Eight of us, one birthday, zero decisions so far. Let’s settle the dates, the stay, and who’s driving.'},host:true,
  guests:[{name:'You',status:'in',note:'',isMe:true,isHost:true},{name:'Dev',status:'in',note:'Looking at places',isMe:false,handle:'dev',mo:'Always finds the spot.',interests:['Road trips','Food runs']},{name:'Alex',status:'maybe',note:'',isMe:false},{name:'Dee',status:'in',note:'Can drive 4',isMe:false},{name:'Rio',status:'maybe',note:'Depends on the date',isMe:false}],
  tasks:[{id:'t1',title:'Share the stay shortlist',category:'todo',claimed_name:'Dev',done:1,isMine:false},{id:'t2',title:'Book the cabin by Nov 20',category:'todo',claimed_name:null,done:0,isMine:false},{id:'t3',title:'Drive from Atlanta, Fri 5 PM (4 seats)',category:'todo',claimed_name:'Dee',done:0,isMine:false},{id:'t4',title:'Birthday cake',category:'bring',claimed_name:null,done:0,isMine:false},{id:'t5',title:'Speaker & playlist',category:'bring',claimed_name:null,done:0,isMine:false}],
  polls:[{id:'tp1',question:'Which weekend works?',kind:'date',decided_option:null,options:[{id:'tpo1',label:'2026-12-04T22:00:00.000Z',votes:3,voters:['Dev','Dee','Rio'],mine:false},{id:'tpo2',label:'2026-12-11T22:00:00.000Z',votes:2,voters:['Dev','Alex'],mine:false}]},{id:'tp2',question:'Where are we staying?',kind:'place',decided_option:null,options:[{id:'tpo3',label:'Midtown Airbnb',votes:2,voters:['Dev','Dee'],mine:false},{id:'tpo4',label:'Old Fourth Ward loft',votes:1,voters:['Alex'],mine:false}]}],
  stops:[],memories:[]},
 {organizer:'You',plan:{id:'demo-diner',title:'Late-night diner run',kind:'gathering',date:'2026-11-07T23:30',place:'The Starlite Diner',budget:'~$15 each',note:'Post-show fries and milkshakes. Somehow eleven of us made it.',made_it:1},host:true,
  guests:[{name:'You',status:'in',note:'',isMe:true,isHost:true},{name:'Jules',status:'in',note:'',isMe:false,handle:'jules',mo:'One more song.',interests:['Live music','Late nights']},{name:'Mika',status:'in',note:'',isMe:false,handle:'mika',mo:'Down for whatever.',interests:['Food runs','Karaoke']}],
  tasks:[{id:'r1',title:'Grab a big booth',category:'todo',claimed_name:'Mika',done:1,isMine:false},{id:'r2',title:'Split the check',category:'todo',claimed_name:'Jules',done:1,isMine:false}],
  polls:[],stops:[],
  memories:[{id:'m1',name:'Jules',kind:'shoutout',body:'Mika called the diner at 11:40 and somehow got us the big booth. Legend.',photo_url:null,created:'2026-11-08T05:00:00.000Z',isMine:false},{id:'m2',name:'Mika',kind:'memory',body:'Three milkshakes, one straw fight, zero regrets.',photo_url:null,created:'2026-11-08T04:00:00.000Z',isMine:false},{id:'m3',name:'Jules',kind:'memory',body:'The booth photo. Frame it.',photo_url:null,created:'2026-11-08T03:00:00.000Z',isMine:false}]}
];
const DEMO_COPY=[['THE FRIENDSGIVING','Who’s bringing dessert?','A potluck where nobody has to ask twice.'],['THE WEEKEND AWAY','Which weekend? Where are we staying?','Eight people, two votes, one link.'],['THE REPLAY','We made it out.','Shout-outs and photos after the night.']];
const initial={title:'',kind:'gathering',date:'',place:'',budget:'',note:'',details:'',inviteUrl:'',bookingUrl:'',endDate:'',name:'',items:''};
function local(iso?:string){if(!iso)return '';const d=new Date(iso);return Number.isNaN(+d)?'':new Date(+d-d.getTimezoneOffset()*60000).toISOString().slice(0,16)}
function pretty(date:string){if(!date)return 'Date to decide';const d=new Date(date);return Number.isNaN(+d)?'Date to decide':d.toLocaleDateString('en-US',{month:'short',day:'numeric',weekday:'short'})}
function time(date:string){if(!date)return '';return new Date(date).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}
function when(date:string,end?:string){return date&&!Number.isNaN(+new Date(date))?whenRange(date,end):pretty(date)}
// Picks the plan that matters most right now: the next dated one that hasn't happened, else the newest undated one.
function nextUp(plans:Plan[]){const now=Date.now()-6*3600e3;const live=plans.filter(p=>!p.made_it);const dated=live.filter(p=>p.date&&+new Date(p.date)>=now).sort((a,b)=>+new Date(a.date)-+new Date(b.date));return dated[0]||live.find(p=>!p.date)||live[0]||null}
// The one thing to sort out, from saved plan data only. Never a guess about who will do it.
function bookingLabel(u:string){try{const h=new URL(u).hostname;return /airbnb|abnb/.test(h)?'Open the Airbnb booking':/vrbo/.test(h)?'Open the Vrbo booking':'Open the booking'}catch{return 'Open the booking'}}
function sortOut(p:Plan):[string,string]|null{const n=p.open_items||0;if(n&&p.open_item)return [n===1?'One thing to sort out':n+' things to sort out',n===1?`${p.open_item} still needs a volunteer`:`${p.open_item} and ${n-1} more need a volunteer`];if(p.open_votes)return [p.open_votes===1?'One vote is still open':p.open_votes+' votes are still open','Lock it in when the group has weighed in'];if(!p.date)return ['One thing to sort out','The date still needs deciding'];if(!p.place)return ['One thing to sort out','The place still needs deciding'];return null}
function itemIcon(title:string,category:string){const t=title.toLowerCase(),has=(re:string)=>new RegExp('\\b(?:'+re+')\\b').test(t);const I=has('ice|ice bags?')?Snowflake:has('drinks?|sodas?|juice|water|coffee|tea|lemonade|seltzer')?CupSoda:has('wine|beers?|champagne|cocktails?|prosecco')?Wine:has('sweets?|something sweet|desserts?|cakes?|pies?|cookies?|brownies?|cupcakes?')?CakeSlice:has('salads?|veggies|vegetables|greens')?Salad:has('main|main dish|mac|mac and cheese|sides?|dish|turkey|ham|soup|stew|rice|bread|rolls?|stuffing|casserole|chicken')?Soup:has('music|playlist|speakers?|dj')?Music:has('rides?|cars?|drive|driving|carpool|pick ?up')?Car:has('stay|accommodation|airbnb|hotel|rooms?|beds?|lodging')?BedDouble:has('budget|money|pay|split|split the check|venmo')?Wallet:has('tickets?|reservations?|reserve|book|booking')?Ticket:has('plates?|cups?|napkins?|forks?|utensils?|chairs?|folding chairs|tables?|cutlery')?Utensils:category==='bring'?Box:ClipboardCheck;return <I size={22} strokeWidth={1.7}/>}

export default function Home(){
 const [plans,setPlans]=useState<Plan[]>([]),[detail,setDetail]=useState<Detail|null>(null),[view,setView]=useState<'home'|'plans'|'me'>('home'),[me,setMe]=useState<Me|null>(null),[meLoading,setMeLoading]=useState(false),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[toast,setToast]=useState(''),[error,setError]=useState(''),[modal,setModal]=useState<'create'|'edit'|'help'|null>(null),[form,setForm]=useState(initial),[tab,setTab]=useState('all'),[addType,setAddType]=useState('bring'),[newItem,setNewItem]=useState(''),[name,setName]=useState(''),[ptab,setPtab]=useState<'overview'|'people'|'list'>('overview'),[hello,setHello]=useState('Hey'),[askName,setAskName]=useState(true),[openAdd,setOpenAdd]=useState(false),[replyMode,setReplyMode]=useState<'new'|'other'|null>(null),[personalG,setPersonalG]=useState<string|null>(null),[sendOpen,setSendOpen]=useState(false),[sharedTick,setSharedTick]=useState(0);
 const [showEnd,setShowEnd]=useState(false),[hostKey,setHostKey]=useState<string|null>(null),[claiming,setClaiming]=useState(false);
 const demo=!!detail?.plan.id.startsWith('demo-');
 async function api(path:string,method='GET',data?:unknown){const r=await fetch('/api/'+path,{method,headers:{'Content-Type':'application/json'},...(data!=null?{body:JSON.stringify(data)}:{})});let j:any;try{j=await r.json()}catch{throw Error('Couldn’t reach m.o. Check your connection and try again.')}if(!r.ok)throw Error(j.error||'Something went wrong.');return j}
 function notify(t:string){setToast(t);setTimeout(()=>setToast(''),4000)}
 // Fast taps can start several loads; only the newest one may update the screen.
 const listSeq=useRef(0),meSeq=useRef(0);
 async function list(){const n=++listSeq.current;try{const d=await api('plans');if(n===listSeq.current)setPlans(d.plans)}catch(e:any){if(n===listSeq.current)setError(e.message)}finally{if(n===listSeq.current)setLoading(false)}}
 async function loadMe(){const n=++meSeq.current;setMeLoading(true);try{const m=await api('me');if(n===meSeq.current)setMe(m)}catch(e:any){if(n===meSeq.current)setError(e.message)}finally{if(n===meSeq.current)setMeLoading(false)}}
 async function open(id:string,history=true){setError('');setView('home');if(history||id!==detail?.plan.id)setPtab('overview');if(id.startsWith('demo-')){setDetail(structuredClone(DEMOS.find(d=>d.plan.id===id)!));setName('You')}else{setBusy(true);try{const d=await api('plan/'+id);setDetail(d);const mine=d.guests.find((g:Guest)=>g.isMe);setName(mine?.name||localStorage.getItem('mo-name')||'')}catch(e:any){setError(e.message)}finally{setBusy(false)}}if(history)window.history.pushState({},'','/?plan='+id);window.scrollTo(0,0)}
 useEffect(()=>{list();if(new URLSearchParams(location.search).get('view')!=='me')api('me').then(setMe).catch(()=>{});const h=new Date().getHours();setHello(h<12?'Good morning':h<17?'Good afternoon':'Good evening');const read=()=>{const q=new URLSearchParams(location.search),id=q.get('plan');setPersonalG(q.get('g'));setPersonalKey(q.get('g'),q.get('k'));setHostKey(q.get('hostkey'));if(id)open(id,false);else if(q.get('view')==='me'){setDetail(null);setView('me');loadMe()}else if(q.get('view')==='plans'){setDetail(null);setView('plans')}else{setDetail(null);setView('home')}};read();window.addEventListener('popstate',read);return()=>window.removeEventListener('popstate',read)},[]);
 // Keeps an open plan current without running up requests: every 30s while visible, pausing after 10 minutes
 // without interaction, and refreshing once when the person comes back.
 useEffect(()=>{if(!detail||demo)return;const id=detail.plan.id;let last=Date.now(),idle=false;const refresh=()=>api('plan/'+id).then(setDetail).catch(()=>{});
  const active=()=>{const was=idle;last=Date.now();idle=false;if(was)refresh()};const seen=()=>{if(document.visibilityState==='visible')active()};
  const interval=setInterval(()=>{if(document.visibilityState!=='visible'||idle)return;if(Date.now()-last>600000){idle=true;return}refresh()},30000);
  for(const e of ['pointerdown','keydown','focus'])window.addEventListener(e,active);document.addEventListener('visibilitychange',seen);
  return()=>{clearInterval(interval);for(const e of ['pointerdown','keydown','focus'])window.removeEventListener(e,active);document.removeEventListener('visibilitychange',seen)}},[detail?.plan.id]);
 // Trips add jobs by default; get-togethers add things to bring.
 useEffect(()=>{setAddType(detail?.plan.kind==='trip'?'todo':'bring')},[detail?.plan.id,detail?.plan.kind]);
 useEffect(()=>{if(!modal)return;const old=document.body.style.overflow;document.body.style.overflow='hidden';const previous=document.activeElement as HTMLElement|null;const esc=(e:KeyboardEvent)=>{if(e.key==='Escape')setModal(null);if(e.key==='Tab'){const nodes=Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"] button:not(:disabled),[role="dialog"] input,[role="dialog"] textarea,[role="dialog"] select'));const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}};window.addEventListener('keydown',esc);const timer=setTimeout(()=>document.querySelector<HTMLElement>('[role="dialog"] input, [role="dialog"] button')?.focus(),60);return()=>{document.body.style.overflow=old;clearTimeout(timer);window.removeEventListener('keydown',esc);previous?.focus()}},[modal]);
 async function deletePlan(){if(!detail)return;if(!confirm(`Delete “${detail.plan.title}”? Everyone’s answers and the bring list will be removed. This can’t be undone.`))return;
  if(demo){setModal(null);home();notify('Demo closed. Demos aren’t saved.');return}
  setBusy(true);try{await api('plan/'+detail.plan.id,'DELETE');try{localStorage.removeItem('mo-shared-'+detail.plan.id)}catch{}setModal(null);home();notify('Plan deleted.')}catch(e:any){notify(e.message)}finally{setBusy(false)}}
 // Switching between Home, Plans and You replaces the address instead of piling up history, and does nothing if you're already there.
 const go=(path:string)=>{const here=location.pathname+location.search;if(here===path)return;const top=!detail&&['/','/?view=plans','/?view=me'].includes(here);top?window.history.replaceState({},'',path):window.history.pushState({},'',path)};
 function home(){if(!detail&&view==='home'){window.scrollTo(0,0);return}setDetail(null);setView('home');setError('');go('/');list();window.scrollTo(0,0)}
 function openEdit(){const p=detail!.plan;setShowEnd(false);setForm({...initial,title:p.title,kind:p.kind,place:p.place,budget:p.budget,note:p.note,details:detail!.details||'',date:local(p.date),name,inviteUrl:p.invite_url||'',bookingUrl:p.booking_url||'',endDate:local(p.end_date)});setModal('edit')}
 // Opens the reply form for a guest and brings it into view (the tabs stay above it).
 function startReply(mode:'new'|'other'|null){setReplyMode(mode);setPtab('people');setTimeout(()=>document.querySelector('.rsvp-form,.pick-card,.other-phone')?.scrollIntoView({behavior:'smooth',block:'start'}),120)}
 async function pickName(g:Guest){const ok=await act(`guests/${g.id}/pick`,'POST',{key:keyFor(g.id)},d=>{for(const x of d.guests)x.isMe=x.id===g.id},`Hi ${g.name}.`);if(ok)startReply(null)}
 // One tap from a personal invite: claim that name on this phone, then save the answer.
 async function quickAnswer(g:Guest,status:'in'|'maybe'|'out'){
  if(!g.isMe&&!(await act(`guests/${g.id}/pick`,'POST',{key:keyFor(g.id)},d=>{for(const x of d.guests)x.isMe=x.id===g.id})))return;
  const body={name:g.name,status,note:g.note||'',extraCount:g.extra_count||0,extraNames:g.extra_names||'',dietary:g.dietary||'',staying:!!g.staying};
  const ok=await act('rsvp','POST',body,d=>{const x=d.guests.find(y=>y.id===g.id);if(x)Object.assign(x,{status,source:'guest',isMe:true})},status==='in'?(detail!.plan.kind==='trip'?'You’re in. Now pick something to handle.':'You’re in. Now pick something to bring.'):status==='maybe'?'Saved. Change it when you know.':`Got it. Thanks for letting ${hostName||'the host'} know.`);
  if(ok){setPersonalG(null);try{const u=new URL(location.href);u.searchParams.delete('g');u.searchParams.delete('k');history.replaceState({},'',u)}catch{}if(status!=='out'&&unclaimed.length){setPtab('list');window.scrollTo(0,0)}}
 }
 function goTab(tab:'people'|'list',opts:{add?:boolean;send?:boolean}={}){setOpenAdd(!!opts.add);setSendOpen(!!opts.send);setPtab(tab);window.scrollTo(0,0)}
 function plansView(){if(!detail&&view==='plans'){window.scrollTo(0,0);return}setDetail(null);setView('plans');setError('');go('/?view=plans');list();window.scrollTo(0,0)}
 function profile(){if(!detail&&view==='me'){window.scrollTo(0,0);return}setDetail(null);setView('me');setError('');go('/?view=me');loadMe();window.scrollTo(0,0)}
 function create(kind='gathering'){setShowEnd(false);setForm({...initial,kind,name:me?.profile?.name||localStorage.getItem('mo-name')||'',items:kind==='trip'?'':'The main dish\nSomething sweet\nDrinks & ice'});setAskName(!(me?.profile?.name||localStorage.getItem('mo-name')));setModal('create')}
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{if(modal==='edit'&&detail){if(demo)setDetail({...detail,details:form.details,plan:{...detail.plan,title:form.title,place:form.place,booking_url:form.bookingUrl||null,end_date:form.date&&form.endDate?new Date(form.endDate).toISOString():'',budget:form.budget,note:form.note,date:form.date?new Date(form.date).toISOString():''}});else{await api('plan/'+detail.plan.id,'PATCH',{title:form.title,place:form.place,budget:form.budget,note:form.note,details:form.details,inviteUrl:form.inviteUrl,bookingUrl:form.bookingUrl,endDate:form.date&&form.endDate?new Date(form.endDate).toISOString():'',date:form.date?new Date(form.date).toISOString():''});await open(detail.plan.id,false)}}else{const d=await api('plans','POST',{...form,date:form.date?new Date(form.date).toISOString():'',endDate:form.date&&form.endDate?new Date(form.endDate).toISOString():'',tasks:form.items.split('\n').filter(t=>t.trim()).map(title=>({title,category:form.kind==='trip'?'todo':'bring'}))});localStorage.setItem('mo-name',form.name);await open(d.id);list()}setModal(null);notify(modal==='edit'?'Saved. Everyone with the link sees the change.':'Plan created. Now invite people.')}catch(e:any){setError(e.message)}finally{setBusy(false)}}
 async function taskAction(t:Task,action:string,extra:Record<string,string>={}){if(busy)return;setBusy(true);const person=detail!.guests.find(g=>g.id===extra.guestId);
  try{if(demo){setDetail({...detail!,tasks:detail!.tasks.map(x=>x.id!==t.id?x:action==='claim'?{...x,claimed_name:name||'You',isMine:true,claim_source:''}:action==='assign'?{...x,claimed_name:person?.name||'Someone',isMine:!!person?.isMe,claim_source:person?.isMe?'':'host'}:action==='confirm'?{...x,claim_source:''}:action==='release'?{...x,claimed_name:null,isMine:false,done:0,claim_source:''}:{...x,done:x.done?0:1})})}
  else{await api(`plan/${detail!.plan.id}/tasks/${t.id}`,'PATCH',{action,...extra});await open(detail!.plan.id,false)}
  notify(action==='claim'?`You’re bringing ${t.title}. Thank you.`:action==='assign'?(person?.isMe?`You’re bringing ${t.title}.`:`Noted: ${person?.name||'They'} said they’d bring ${t.title}.`):action==='confirm'?`Confirmed. You’re bringing ${t.title}.`:action==='release'?`${t.title} is open again.`:t.done?`${t.title} marked not done.`:`${t.title} is done.`)}catch(e:any){notify(e.message)}finally{setBusy(false)}}
 async function addItem(e:React.FormEvent){e.preventDefault();if(!newItem.trim())return;setBusy(true);try{if(demo)setDetail({...detail!,tasks:[...detail!.tasks,{id:crypto.randomUUID(),title:newItem.trim(),category:addType,claimed_name:null,isMine:false,done:0}]});else{await api(`plan/${detail!.plan.id}/tasks`,'POST',{title:newItem,category:addType});await open(detail!.plan.id,false)}setNewItem('');notify('Added to the plan.')}catch(e:any){notify(e.message)}finally{setBusy(false)}}
 async function act(path:string,method:string,body:unknown,demoFn:(d:Detail)=>void,message?:string){if(!detail||busy)return false;setBusy(true);try{if(demo){const d=structuredClone(detail);demoFn(d);setDetail(d)}else{await api(`plan/${detail.plan.id}${path?'/'+path:''}`,method,body);await open(detail.plan.id,false)}if(message)notify(message);return true}catch(e:any){notify(e.message);return false}finally{setBusy(false)}}
 async function saveProfile(p:Profile){try{await api('me','PUT',p);localStorage.setItem('mo-name',p.name);await loadMe();notify('That’s your m.o.');return true}catch(e:any){notify(e.message);return false}}
 async function share(){if(demo){notify('This is a demo. Start a real plan to invite friends.');return}try{await navigator.clipboard.writeText(planLink(location.origin,detail!.plan.id));try{localStorage.setItem('mo-shared-'+detail!.plan.id,'1')}catch{}setSharedTick(x=>x+1);notify('Link copied. Paste it in your group chat.')}catch{notify('Couldn’t copy. Copy the address from your browser instead.')}}
 function calendar(){const p=detail!.plan;if(!p.date){notify('Add a date first.');return}const d=new Date(p.date);const fmt=(d:Date)=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');const esc=(s:string)=>s.replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');const txt=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//mo//Make it out//EN','BEGIN:VEVENT','UID:'+p.id+'@mo','DTSTAMP:'+fmt(new Date()),'DTSTART:'+fmt(d),'DTEND:'+fmt(endFor(p.date,p.end_date)),'SUMMARY:'+esc(p.title),'LOCATION:'+esc(p.place),'DESCRIPTION:'+esc([p.note,detail!.details,location.href].filter(Boolean).join('\n\n')),'END:VEVENT','END:VCALENDAR'].join('\r\n');const u=URL.createObjectURL(new Blob([txt],{type:'text/calendar;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download='mo-plan.ics';a.click();URL.revokeObjectURL(u)}
 const p=detail?.plan,guests=detail?.guests||[],tasks=detail?.tasks||[],mine_=guests.find(g=>g.isMe),answered=!!mine_&&mine_.status!=='invited',declined=!!detail&&!detail.host&&!detail.plan.id.startsWith('demo-')&&mine_?.status==='out',stillChecking=!!detail&&!detail.host&&!detail.plan.id.startsWith('demo-')&&mine_?.status==='maybe',going=guests.filter(g=>g.status==='in').reduce((n,g)=>n+1+(g.extra_status==='approved'?g.extra_count||0:0),0),covered=tasks.filter(t=>t.claimed_name).length,noReply=guests.filter(g=>g.status==='invited').length,checking=guests.filter(g=>g.status==='maybe').length,unclaimed=tasks.filter(t=>!t.claimed_name),mine=tasks.filter(t=>t.isMine);
 const member=!!detail&&(detail.host||answered);
 const link=typeof location!=='undefined'&&p?planLink(location.origin,p.id):'';
 const filtered=plans.filter(x=>tab==='all'||x.kind===tab);
 const where=detail?'plan':view;
 const myName=me?.profile?.name||'';
 const featured=nextUp(plans),others=plans.filter(x=>x.id!==featured?.id);
 const hostGuest=guests.find(g=>g.isHost)||guests[0],hostName=detail?.organizer||hostGuest?.name||'',hostIsMe=!!detail?.host,bringItems=tasks.filter(t=>t.category==='bring'),todoItems=tasks.filter(t=>t.category==='todo');
 const listLabel=p?.kind==='trip'&&todoItems.length>=bringItems.length?'To-do list':'Bring list';
 const navItems=[['home','Home',House,home],['plans','Plans',CalendarDays,plansView],['me','You',UsersRound,profile]] as const;
 const navOn=(k:string)=>k==='plans'?where==='plans'||where==='plan':where===k;

 const planRow=(x:Plan)=><button className="row-link" key={x.id} onClick={()=>open(x.id)}><Scene className="row-thumb" kind={sceneFor(x.kind,x.made_it)} seed={x.id}/><span className="row-text"><strong>{x.title}</strong><span>{pretty(x.date)} · {x.going||0} going{x.made_it?' · made it out':''}</span></span><ChevronRight size={20}/></button>;
 const demoCards=<section className="demos" aria-labelledby="demos-title">
  <div className="section-title"><h2 id="demos-title">Take m.o for a spin</h2><span className="fine">Fictional people · nothing saved</span></div>
  <div className="demo-scroll">{DEMOS.map((d,i)=><button className="demo-card" key={d.plan.id} onClick={()=>open(d.plan.id)}><Scene kind={sceneFor(d.plan.kind,d.plan.made_it)} seed={d.plan.id}/><span className="eyebrow">{DEMO_COPY[i][0]}</span><strong>{DEMO_COPY[i][1]}</strong><span className="fine">{DEMO_COPY[i][2]}</span></button>)}</div>
 </section>;

 return <div className="app">
  <nav className="tabbar" aria-label="Main">
   <button className="rail-mark" onClick={home} aria-label="m.o home"><Wordmark/></button>
   {navItems.map(([k,label,Icon,go])=><button key={k} className={'tab'+(navOn(k)?' on':'')} aria-current={navOn(k)?'page':undefined} onClick={go}><Icon size={22} strokeWidth={1.8}/><span>{label}</span></button>)}
   <div className="rail-foot"><p>Make it out<br/>the groupchat.</p><button className="text-button" onClick={()=>setModal('help')}>How it works</button></div>
  </nav>
  <div className="frame">
   <header className={'appbar'+(where==='plan'?' centered':'')}>
    {where==='plan'?<button className="icon-button" aria-label="Back to plans" onClick={plansView}><ArrowLeft size={22}/></button>:null}
    <button className="appbar-mark" onClick={home} aria-label="m.o home"><Wordmark/></button>
    {where==='plan'&&detail!.host?<button className="icon-button" aria-label="Edit plan details" onClick={openEdit}><Pencil size={20}/></button>
    :where==='plan'?<span className="icon-button" aria-hidden="true"/>
    :<button className="me-dot" aria-label="Your m.o profile" onClick={profile}>{myName?<Face seed={me?.profile?.handle||myName} avatar={me?.profile?.avatar} photo={me?.profile?.photo}/>:<HelpCircle size={20}/>}</button>}
   </header>
   <main className="screen">
   {hostKey&&<section className="host-claim" aria-labelledby="claim-title"><span className="eyebrow">HOST LINK</span><h2 id="claim-title">Manage this plan on this device?</h2>
    <p>This is a private host link. Tap below to open the plan as its host here. Your other phone stays signed in too.</p>
    <p className="fine">Heads up: if you made or answered other plans on this browser before, they won’t show here after this. Use a different browser for those, or skip this.</p>
    <span className="row-gap"><button className="primary" disabled={claiming} onClick={async()=>{setClaiming(true);try{const r=await fetch('/api/host-link',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:hostKey})});const d:any=await r.json();if(!r.ok)throw new Error(d.error);location.replace('/?plan='+d.plan)}catch(e:any){notify(e.message||'That didn’t work. Try again.');setClaiming(false)}}}>{claiming?'Opening…':'Open as host'}</button>
    <button className="text-button" onClick={()=>{setHostKey(null);history.replaceState({},'','/')}}>Cancel</button></span></section>}
   {error&&<div className="error" role="alert">{error}<button onClick={()=>{setError('');list()}}>Try again</button></div>}

   {where==='me'?<ProfileView me={me} loading={meLoading} save={saveProfile} openPlan={id=>open(id)} start={()=>create()} uploadPhoto={async url=>{try{await api('me/photo','PUT',{photo:url});await loadMe();notify('Photo saved. It shows next to your name in plans.');return true}catch(e:any){notify(e.message);return false}}} removePhoto={async()=>{try{await api('me/photo','DELETE');await loadMe();notify('Photo removed.');return true}catch(e:any){notify(e.message);return false}}}/>

   :where==='home'?<>
    <section className="greeting"><h1>{hello}{myName?', '+myName:''}.</h1><p>{featured?'Here’s what’s coming up.':plans.length?'All your plans have happened. Start a new one?':'Make it out the groupchat.'}</p></section>
    {loading?<div className="loading"><LoaderCircle className="spin"/>Getting your plans…</div>
    :featured?<article className="feature-card">
     <button className="feature-open" onClick={()=>open(featured.id)} aria-label={'Open '+featured.title}><Scene kind={sceneFor(featured.kind,featured.made_it)} seed={featured.id}/></button>
     <div className="feature-body"><h2>{featured.title}</h2><p className="meta">{when(featured.date)}</p><p className="meta">{featured.going||0} going{featured.maybe?` · ${featured.maybe} still checking`:''}</p></div>
     {(()=>{const s=sortOut(featured);return s?<div className="sort-out"><Box size={22} strokeWidth={1.7}/><div><strong>{s[0]}</strong><span>{s[1]}</span></div><button onClick={async()=>{await open(featured.id);if(featured.open_items)setPtab('list')}}>Review plan</button></div>
      :<div className="sort-out settled"><CheckCircle2 size={22} strokeWidth={1.7}/><div><strong>Everything has a person</strong><span>Date, place and every item are covered</span></div><button onClick={()=>open(featured.id)}>View plan</button></div>})()}
    </article>
    :<article className="feature-card empty"><Scene kind="table" seed="welcome"/><div className="feature-body"><h2>Start your first plan.</h2><p className="meta">Make a plan, send one link, and see who’s coming and what they’re bringing.</p></div><span className="note-card">Saved you a seat.</span></article>}
    {others.length>0&&<section className="row-list"><h2>Also on your list</h2>{others.slice(0,4).map(planRow)}{others.length>4&&<button className="text-button" onClick={plansView}>See all plans <ArrowUpRight size={15}/></button>}</section>}
    <button className="primary block" onClick={()=>create()}>Start a plan</button>
    {demoCards}
   </>

   :where==='plans'?<>
    <section className="greeting"><h1>Plans</h1><p>Plans you’re hosting or going to.</p></section>
    {plans.length>0&&<div className="seg" role="group" aria-label="Filter plans">{[['all','All'],['gathering','Get-togethers'],['trip','Trips']].map(([key,label])=><button className={tab===key?'on':''} aria-pressed={tab===key} key={key} onClick={()=>setTab(key)}>{label}</button>)}</div>}
    {loading?<div className="loading"><LoaderCircle className="spin"/>Getting your plans…</div>
    :filtered.length?<div className="card-grid">{filtered.map(x=><button className="plan-card" key={x.id} onClick={()=>open(x.id)}><Scene kind={sceneFor(x.kind,x.made_it)} seed={x.id}/><span className="card-body"><strong>{x.title}</strong><span className="meta">{when(x.date,x.end_date)}</span><span className="meta">{x.place||'Place to decide'}</span><span className="card-foot"><span>{x.going||0} going</span>{x.made_it?<span className="chip-made">Made it out</span>:(x.open_items||0)>0?<span className="chip-open">{x.open_items} open</span>:null}</span></span></button>)}</div>
    :<div className="empty-state"><h3>{plans.length?'Nothing here yet.':'No plans yet.'}</h3><p>Start one and paste the link in your group chat. Friends don’t need the app.</p></div>}
    <button className="primary block" onClick={()=>create()}>Start a plan</button>
    {demoCards}
   </>

   :<>
    <div className={'plan-photo'+(!answered&&!detail!.host&&!demo?' compact':'')}><Scene kind={sceneFor(p!.kind,p!.made_it)} seed={p!.id}/>{demo?<span className="demo-badge">Demo · changes aren’t saved</span>:p!.made_it?<span className="demo-badge made">Made it out</span>:null}</div>
    <section className="plan-head">
     <h1>{p!.title}</h1>
     <p className="host-line"><Face className="mini-avatar" seed={hostName||'?'} avatar={hostGuest?.avatar} photo={hostGuest?.photo}/>Hosted by {hostIsMe?'you':hostName||'the organizer'}</p>
     <p className="meta-line"><CalendarDays size={20} strokeWidth={1.7}/>{when(p!.date,p!.end_date)}</p>
     <p className="meta-line"><MapPin size={20} strokeWidth={1.7}/>{p!.place||(detail!.hidden?<span className="locked-note"><Lock size={14}/>Address shared after you RSVP</span>:'Place to decide')}</p>
     {(detail!.host||demo)&&<div className="plan-actions"><button className="outline-button brick" onClick={demo?()=>create(p!.kind):share}>{demo?<Plus size={16}/>:<LinkIcon size={16}/>}{demo?'Make a real plan':'Copy invite link'}</button><button className="outline-button" onClick={calendar}><CalendarDays size={16}/>Add to calendar</button></div>}
    </section>
    {/* A guest arriving from an invite link: the invite is the first thing, with their name one tap away. */}
    {!answered&&!detail!.host&&!demo&&!(mine_&&ptab==='people')&&(()=>{const names=guests.filter(g=>!g.isMe&&!g.isHost&&(g.status==='invited'||g.source==='host')),others=guests.filter(g=>!g.isMe&&!g.isHost&&g.status!=='invited'&&g.source!=='host');
     // A personal invite link (?g=) names the guest, so they can answer in one tap.
     const target=mine_||(personalG?guests.find(g=>g.id===personalG&&!g.isHost&&(g.status==='invited'||g.source==='host'||!!keyFor(g.id))):undefined),first=target?.name.split(' ')[0];
     return <section className="invite-card" aria-labelledby="invite-title">
      <h2 id="invite-title">{target?`Hi ${first}! ${mine_?'Can you make it?':`${hostName||'Your friend'} invited you`}`:`${hostName||'Your friend'} invited you`}</h2>
      <p>{detail!.hidden?'Reply to see the address and arrival details, then '+(detail!.plan.kind==='trip'?'pick something to handle.':'pick something to bring.'):'Say if you’re coming, then pick something to bring.'}</p>
      {target?<>
       <div className="quick-answers">{([['in','I’m in',Check],['maybe','Still checking',Clock],['out','Can’t make it',X]] as const).map(([k,label,Icon])=><button key={k} className={k==='in'?'primary':'outline-button'} disabled={busy} onClick={()=>quickAnswer(target,k)}><Icon size={17}/>{label}</button>)}</div>
       <div className="invite-more"><button className="text-button quiet" onClick={()=>mine_?startReply(null):pickName(target)}>Add details: extra guests, dietary needs</button>{!mine_&&<button className="text-button quiet" onClick={()=>setPersonalG(null)}>Not {first}?</button>}</div>
      </>:!mine_&&names.length>0?<>
       <span className="eyebrow">TAP YOUR NAME</span>
       <div className="name-chips">{names.map(g=><button key={g.id} className="name-chip" disabled={busy} onClick={()=>pickName(g)}><Face className="mini-avatar" seed={g.name} avatar={g.avatar} photo={g.photo}/>{g.name}</button>)}</div>
       <div className="invite-more"><button className="text-button" onClick={()=>startReply('new')}>I’m not on the list</button>{others.length>0&&<button className="text-button quiet" onClick={()=>startReply('other')}>Answered on another phone?</button>}</div>
      </>:<button className="primary" onClick={()=>startReply(mine_?null:'new')}>Reply</button>}
     </section>})()}
    <NotedBanner detail={detail!} act={act} busy={busy} onChange={()=>{setPtab('people');window.scrollTo(0,0)}}/>
    {declined&&<DeclinedCard detail={detail!} host={hostName} onChange={st=>quickAnswer(mine_!,st)}/>}
    {declined&&<TryMo host={hostName} start={()=>create()} profile={profile}/>}
    {stillChecking&&<CheckBackCard detail={detail!} me={mine_!} host={hostName} busy={busy} link={link} save={day=>act('check-back','POST',{date:day},d=>{const x=d.guests.find(g=>g.isMe);if(x)x.check_back=day},day?'Saved. '+(hostName||'The host')+' can see it.':undefined)} onChange={st=>quickAnswer(mine_!,st)}/>}
    {!declined&&<div className="seg plan-tabs" role="tablist" aria-label="Plan sections">{([['overview','Overview'],['people','People'],['list',listLabel]] as const).map(([k,label])=><button key={k} role="tab" aria-selected={ptab===k} className={ptab===k?'on':''} onClick={()=>setPtab(k)}>{label}{k==='list'&&unclaimed.length>0?<span className="tab-count">{unclaimed.length}</span>:null}</button>)}</div>}

    {!declined&&ptab==='overview'&&<div className="stack">
     {detail!.host&&<GetItReady detail={detail!} link={link} shared={sharedTick>=0&&(()=>{try{return !!localStorage.getItem('mo-shared-'+p!.id)}catch{return false}})()} go={goTab} edit={openEdit} share={share} notify={notify}/>}
     {!detail!.host&&answered&&<section className="you-set"><span className="eyebrow">{mine_!.status==='out'?'YOUR ANSWER':'YOU’RE SET'}</span>
      <strong>{mine_!.status==='in'?'You’re going':mine_!.status==='maybe'?'You’re still checking':'You can’t make it'}{mine_!.extra_status==='approved'&&mine_!.extra_count?` with +${mine_!.extra_count}`:''}</strong>
      {mine_!.status!=='out'&&<>{mine.length?<p>You’re bringing: <b>{mine.map(t=>t.title).join(', ')}</b></p>:unclaimed.length?<button className="primary" onClick={()=>goTab('list')}>{detail!.plan.kind==='trip'?'Pick something to handle':'Pick something to bring'}</button>:<p>Everything on the list is covered.</p>}
       <p>{when(p!.date,p!.end_date)}{p!.place?` · ${p!.place}`:''}</p><div className="you-set-actions"><button className="outline-button" onClick={calendar}><CalendarDays size={16}/>Add to calendar</button>{p!.place&&<a className="outline-button" href={'https://maps.apple.com/?q='+encodeURIComponent(p!.place)} target="_blank" rel="noopener noreferrer"><MapPin size={16}/>Directions</a>}</div></>}
     </section>}
     {detail!.host?<>
     {detail!.host&&(()=>{const requests=guests.filter(g=>g.extra_status==='requested'),unconfirmed=guests.filter(g=>!g.isHost&&g.source==='host'),notedItems=tasks.filter(t=>t.claim_source==='host'),diets=guests.filter(g=>g.dietary&&g.status!=='out'),staying=guests.filter(g=>g.staying&&g.status!=='out');
      return (requests.length||diets.length||staying.length||unconfirmed.length||notedItems.length)?<section className="soft-card host-notes"><span className="eyebrow">ONLY YOU SEE THIS</span>
       {requests.length>0&&<button className="host-line-item" onClick={()=>setPtab('people')}><strong>{requests.length} extra-guest {requests.length===1?'request':'requests'}</strong><span>{requests.map(g=>`${g.name} +${g.extra_count}`).join(', ')} · Review</span></button>}
       {(unconfirmed.length>0||notedItems.length>0)&&<button className="host-line-item" onClick={()=>setPtab('people')}><strong>{unconfirmed.length+notedItems.length} noted by you, not confirmed yet</strong><span>{[...unconfirmed.map(g=>`${g.name}: ${g.status==='in'?'going':g.status==='maybe'?'checking':'can’t make it'}`),...notedItems.map(t=>`${t.claimed_name}: ${t.title}`)].join(' · ')} · Copy check-ins from People</span></button>}
       {diets.length>0&&<div className="host-line-item"><strong>Dietary needs</strong><span>{diets.map(g=>`${g.name}: ${g.dietary}`).join(' · ')}</span></div>}
       {staying.length>0&&<div className="host-line-item"><strong>Staying over ({staying.length})</strong><span>{staying.map(g=>g.name).join(', ')}</span></div>}
      </section>:null})()}
     <section className="status-card"><span className="eyebrow">HEADCOUNT</span><div className="status-number">{going}<span> going</span></div>
      <div className="status-grid"><button onClick={()=>setPtab('people')}><strong>{checking}</strong><span>checking</span></button><button onClick={()=>setPtab('people')}><strong>{noReply}</strong><span>no reply yet</span></button><button onClick={()=>setPtab('people')}><strong>{guests.filter(g=>g.status==='out').length}</strong><span>can’t go</span></button></div>
      <button className="status-items" onClick={()=>setPtab('list')}><span><strong>{covered} of {tasks.length}</strong> {listLabel.toLowerCase()} items covered</span><span className="progress-track"><span style={{width:(tasks.length?covered/tasks.length*100:0)+'%'}}/></span>{unclaimed.length>0&&<small>Still needed: {unclaimed.slice(0,4).map(t=>t.title).join(', ')}{unclaimed.length>4?` +${unclaimed.length-4} more`:''}</small>}</button>
      {p!.budget&&<div className="budget"><span className="eyebrow">COST</span><strong>{p!.budget}</strong><small>For info only. m.o doesn’t collect money.</small></div>}</section>
     {(p!.place||detail!.details||p!.booking_url)&&<section className="soft-card getting-there"><span className="eyebrow">GETTING THERE</span>{p!.place&&<h3>{p!.place}</h3>}{detail!.details&&<p className="arrival">{detail!.details}</p>}<span className="row-gap">{p!.place&&<a className="text-button" href={'https://maps.apple.com/?q='+encodeURIComponent(p!.place)} target="_blank" rel="noopener noreferrer">Open in Maps <ArrowUpRight size={14}/></a>}{p!.booking_url&&<a className="text-button" href={p!.booking_url} target="_blank" rel="noopener noreferrer">{bookingLabel(p!.booking_url)} <ArrowUpRight size={14}/></a>}</span></section>}
     {p!.note&&<p className="plan-note">{p!.note}</p>}
     {detail!.host&&!!detail!.activity?.length&&<section className="soft-card activity"><span className="eyebrow">RECENT UPDATES</span><ul>{detail!.activity.slice(0,5).map((a,i)=><li key={i}><span className={'who-dot '+(a.byHost?'noted':'confirmed')} aria-hidden="true"/><span>{a.text}</span><time dateTime={a.at}>{ago(a.at)}</time></li>)}</ul><small>Filled dot: the person did it. Outlined dot: you did it for them.</small></section>}
     </>:<>
     {p!.note&&<p className="plan-note">{p!.note}</p>}
     {(p!.place||detail!.details||p!.booking_url)&&<section className="soft-card getting-there"><span className="eyebrow">GETTING THERE</span>{p!.place&&<h3>{p!.place}</h3>}{detail!.details&&<p className="arrival">{detail!.details}</p>}<span className="row-gap">{p!.place&&<a className="text-button" href={'https://maps.apple.com/?q='+encodeURIComponent(p!.place)} target="_blank" rel="noopener noreferrer">Open in Maps <ArrowUpRight size={14}/></a>}{p!.booking_url&&<a className="text-button" href={p!.booking_url} target="_blank" rel="noopener noreferrer">{bookingLabel(p!.booking_url)} <ArrowUpRight size={14}/></a>}</span></section>}
     <section className="status-card"><span className="eyebrow">HEADCOUNT</span><div className="status-number">{going}<span> going</span></div>
      <div className="status-grid"><button onClick={()=>setPtab('people')}><strong>{checking}</strong><span>checking</span></button><button onClick={()=>setPtab('people')}><strong>{noReply}</strong><span>no reply yet</span></button><button onClick={()=>setPtab('people')}><strong>{guests.filter(g=>g.status==='out').length}</strong><span>can’t go</span></button></div>
      <button className="status-items" onClick={()=>setPtab('list')}><span><strong>{covered} of {tasks.length}</strong> {listLabel.toLowerCase()} items covered</span><span className="progress-track"><span style={{width:(tasks.length?covered/tasks.length*100:0)+'%'}}/></span>{unclaimed.length>0&&<small>Still needed: {unclaimed.slice(0,4).map(t=>t.title).join(', ')}{unclaimed.length>4?` +${unclaimed.length-4} more`:''}</small>}</button>
      {p!.budget&&<div className="budget"><span className="eyebrow">COST</span><strong>{p!.budget}</strong><small>For info only. m.o doesn’t collect money.</small></div>}</section>
     </>}
     {(()=>{const S={setter:detail!.host?<SetterPanel key="setter" detail={detail!} link={link} notify={notify}/>:null,decisions:detail!.host||detail!.polls.length?<Decisions key="decisions" detail={detail!} act={act} busy={busy} member={member}/>:null,live:<LivePlan key="live" detail={detail!} act={act} busy={busy}/>,replay:!detail!.host&&!p!.made_it&&!detail!.memories.length?null:<Replay key="replay" detail={detail!} act={act} busy={busy} canPost={detail!.host||mine_?.status==='in'}/>};
      if(!detail!.host)return (p!.made_it?['replay','live','decisions']:['decisions','live','replay']).map(k=>S[k as keyof typeof S]);
      // Hosts get the outcomes up top; drafting tools, votes, itinerary and the replay live one tap away.
      const hl=!demo&&<HostLink key="host-link" planId={p!.id} hasKey={!!detail!.hasHostKey} notify={notify} onMade={()=>{}}/>;
      return <>{!detail!.hasHostKey&&hl}<details key="more" className="more-tools" open={!!p!.made_it}><summary>More tools<small>Group messages, votes, schedule, photos{detail!.plan.invite_url?'':', Apple Invites'}</small></summary><div className="stack">{(p!.made_it?['replay','setter','live','decisions']:['setter','decisions','live','replay']).map(k=>S[k as keyof typeof S])}{detail!.hasHostKey&&hl}
      {<section className="soft-card"><span className="eyebrow">OTHER INVITES</span><h3>Using Apple Invites or another invite?</h3><p>Add this plan’s link to it so guests can see the bring list.</p>{p!.invite_url&&<a className="text-button" href={p!.invite_url} target="_blank" rel="noopener noreferrer">Open original invitation <ArrowUpRight size={14}/></a>}<button className="text-button" onClick={share}>Copy plan link <Copy size={14}/></button><small>RSVPs there don’t show up here.</small></section>}
      </div></details></>})()}
     <p className="access-note"><Lock size={12}/>Anyone with the link can see this plan and RSVP. Only people who RSVP see the address. Don’t post the link publicly.</p>
    </div>}

    {!declined&&answered&&!detail!.host&&!demo&&ptab==='overview'&&<TryMo host={hostName} start={()=>create()} profile={profile}/>}
    {!declined&&ptab==='people'&&<PeopleTab key={detail!.plan.id+(mine_?.id||'')+(openAdd?':add':'')+(sendOpen?':send':'')+(replyMode||'')} detail={detail!} act={act} busy={busy} notify={notify} startAdding={openAdd} startMode={replyMode} startSending={sendOpen} onInviteSent={()=>{try{localStorage.setItem('mo-shared-'+detail!.plan.id,'1')}catch{}setSharedTick(x=>x+1)}} onRsvp={status=>{if(status!=='out'&&!mine.length&&unclaimed.length){setPtab('list');window.scrollTo(0,0)}}}/>}

    {!declined&&ptab==='list'&&<section className="stack">
     <p className="list-lead">{bringItems.length?'Pick something you can bring.':p!.kind==='trip'?'Jobs that need one person. Tap one you’ll take care of.':'Give each task a person.'}</p>
     {tasks.length===0&&<p className="inline-empty">{p!.kind==='trip'?'No jobs yet. Add specific ones, like “Drive from Wilson, Fri 5 PM”. Deciding something, like the budget or where to stay? Start a vote under More tools.':'Nothing on the list yet. Add what the group needs below.'}</p>}
     {bringItems.length>0&&<div className="item-list">{bringItems.map(t=><TaskRow key={t.id} task={t} host={detail!.host} busy={busy} act={taskAction} guests={guests} organizer={hostName||'The host'}/>)}</div>}
     {todoItems.length>0&&<><h3 className="list-sub">{bringItems.length?'Other tasks':'Tasks'}</h3><div className="item-list">{todoItems.map(t=><TaskRow key={t.id} task={t} host={detail!.host} busy={busy} act={taskAction} guests={guests} organizer={hostName||'The host'}/>)}</div></>}
     <form className="add-item" onSubmit={addItem}><label className="sr-only" htmlFor="item-kind">Item type</label><select id="item-kind" value={addType} onChange={e=>setAddType(e.target.value)}><option value="bring">To bring</option><option value="todo">To do</option></select><label className="sr-only" htmlFor="item-title">New item</label><input id="item-title" value={newItem} onChange={e=>setNewItem(e.target.value)} placeholder={addType==='todo'?'What needs doing?':'What else do we need?'} maxLength={160} required/><button className="icon-button filled" aria-label="Add item" disabled={busy||!newItem.trim()}><Plus size={19}/></button></form>
     <p className="fine center">{p!.kind==='trip'?'You can change what you’re taking care of anytime.':'You can change what you’re bringing anytime.'}</p>
     {mine.length>0&&<p className="fine center">You’ve got: {mine.map(t=>t.title).join(', ')}</p>}
     <button className="outline-button brick block" onClick={()=>{setPtab('people');window.scrollTo(0,0)}}>{answered?'View my RSVP':'RSVP to this plan'}</button>
    </section>}
   </>}
   <footer className="foot"><Wordmark/><span>Make it out the groupchat.</span><button onClick={()=>setModal('help')}>Free · What’s included?</button></footer>
   </main>
  </div>
  {toast&&<div className="toast" role="status"><CheckCircle2 size={18}/>{toast}</div>}
  {modal&&<div className="modal-backdrop" onClick={e=>{if(e.target===e.currentTarget)setModal(null)}}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close icon-button" aria-label="Close dialog" onClick={()=>setModal(null)}><X size={21}/></button>
   {modal==='help'?<><span className="say-it">say it: em-oh</span><h2 id="modal-title">Plan it in one place.<br/>Skip the endless group chat.</h2><p>One link holds the date, the address, who’s coming and who’s bringing what.</p>
    <ol className="help-steps"><li><b>Start with the idea.</b><span>A dinner, a trip, anything.</span></li><li><b>Bring your people.</b><span>Paste the link in your group chat. People say if they’re coming.</span></li><li><b>Vote on what’s undecided.</b><span>Vote on a date or place. The host picks the final choice.</span></li><li><b>Split up the list.</b><span>Everyone picks what they’ll bring or do.</span></li><li><b>Afterwards, share memories.</b><span>Post photos and thank-yous.</span></li></ol>
    <div className="help-note">m.o is free. Your plans are saved; demos are not. m.o never sends messages for you: you copy them and send them yourself. It doesn’t send reminders, take payments or make bookings. Anyone with a plan’s link can open it, so only share it with people you invited.</div>
    <button className="primary block" onClick={()=>create()}>Start a plan</button></>
   :<><span className="eyebrow">{modal==='edit'?'EDIT':'NEW PLAN'}</span><h2 id="modal-title">{modal==='edit'?'Edit plan':'What are we doing?'}</h2><p className="muted">{modal==='edit'?'Changes show up for everyone with the link.':'Just the basics to send the invite. Add the rest now or later.'}</p>
    <form onSubmit={submit} className="plan-form">{modal==='create'&&<div className="type-selector"><button type="button" className={form.kind==='gathering'?'chosen':''} onClick={()=>setForm({...form,kind:'gathering',items:'The main dish\nSomething sweet\nDrinks & ice'})}><Soup size={18}/>Get-together</button><button type="button" className={form.kind==='trip'?'chosen':''} onClick={()=>setForm({...form,kind:'trip',items:''})}><MapPin size={18}/>Trip</button></div>}
     <label>Give it a name<input autoComplete="off" required maxLength={100} value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Friendsgiving, Atlanta weekend, you name it…"/></label>
     {modal==='create'&&(askName?<label>Your name<input required maxLength={60} autoComplete="given-name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="So guests know who’s hosting"/></label>
      :<p className="hosting-as">Hosting as <strong>{form.name}</strong><button type="button" className="text-button small" onClick={()=>setAskName(true)}>Change</button></p>)}
     <PlaceSearch value={form.place} onChange={v=>setForm(f=>({...f,place:v}))} onBookingLink={u=>{setForm(f=>({...f,bookingUrl:u}));notify('Saved as your booking link. Add the address when you have it.')}} onEvent={e=>{setForm(f=>({...f,title:f.title||e.name.slice(0,100),date:e.date?(/Z$|[+-]\d\d:\d\d$/.test(e.date)?local(e.date):e.date.slice(0,16)):f.date}));notify(e.date?'Added the venue and the event’s date and time. Change them if you’re going another day.':'Added the venue.')}}/>
     <div className="form-row"><label>{form.endDate||showEnd?'Starts':'When'} <small>(optional)</small><input type="datetime-local" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label>
      {form.endDate||showEnd?<label>Ends <small>(the last day)</small><input type="datetime-local" min={form.date||undefined} value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})}/></label>:null}</div>
     {form.endDate||showEnd?<button type="button" className="text-button small" onClick={()=>{setShowEnd(false);setForm({...form,endDate:''})}}>It’s just one day</button>
      :<button type="button" className="text-button small" onClick={()=>{setShowEnd(true);if(form.date&&!form.endDate){const d=new Date(form.date);d.setDate(d.getDate()+2);setForm({...form,endDate:local(d.toISOString())})}}}>More than one day? Add an end date</button>}
     {(form.kind==='trip'||form.bookingUrl)&&<label>Booking link <small>(Airbnb, hotel… shared once someone RSVPs)</small><input type="url" maxLength={1000} value={form.bookingUrl} onChange={e=>setForm({...form,bookingUrl:e.target.value})} placeholder="https://www.airbnb.com/trips/…"/></label>}
     {form.kind==='trip'&&!form.bookingUrl&&(()=>{const l=stayLinks(form.place,form.date,form.endDate);return <div className="find-stay"><span>Need a place to stay?</span><a className="outline-button" href={l.airbnb} target="_blank" rel="noopener noreferrer">Search Airbnb <ArrowUpRight size={14}/></a><a className="outline-button" href={l.hotels} target="_blank" rel="noopener noreferrer">Search hotels <ArrowUpRight size={14}/></a><small>Opens in a new tab{form.date?' with your dates':''}. When you book, copy the booking link and paste it above.</small>{!form.place.trim()&&<small>Tip: fill in Where first and these open already searching that area.</small>}</div>})()}
     <details className="more-details" open={modal==='edit'}><summary>Add more details <small>arrival notes, description, {form.kind==='trip'?'things to sort':'bring list'}, budget</small></summary><div className="more-body">
     <label>Arrival and house notes <small>(parking, buzzer, shoes off… shared once someone RSVPs)</small><textarea rows={3} maxLength={1000} value={form.details} onChange={e=>setForm({...form,details:e.target.value})} placeholder="Park on Elm, not in the lot. Buzz 3B. Shoes off inside."/></label>
     <label>Cost per person<input maxLength={60} value={form.budget} onChange={e=>setForm({...form,budget:e.target.value})} placeholder="e.g. $40 each"/></label>
     {form.kind!=='trip'&&!form.bookingUrl&&<label>Booking link <small>(Airbnb, hotel… shared once someone RSVPs)</small><input type="url" maxLength={1000} value={form.bookingUrl} onChange={e=>setForm({...form,bookingUrl:e.target.value})} placeholder="https://www.airbnb.com/trips/…"/></label>}
     {form.kind!=='trip'&&!form.bookingUrl&&(()=>{const l=stayLinks(form.place,form.date,form.endDate);return <div className="find-stay"><span>Need a place to stay?</span><a className="outline-button" href={l.airbnb} target="_blank" rel="noopener noreferrer">Search Airbnb <ArrowUpRight size={14}/></a><a className="outline-button" href={l.hotels} target="_blank" rel="noopener noreferrer">Search hotels <ArrowUpRight size={14}/></a><small>Opens in a new tab{form.date?' with your dates':''}. When you book, copy the booking link and paste it above.</small>{!form.place.trim()&&<small>Tip: fill in Where first and these open already searching that area.</small>}</div>})()}
     <label>Link to another invite <small>(optional)</small><input type="url" maxLength={1000} value={form.inviteUrl} onChange={e=>setForm({...form,inviteUrl:e.target.value})} placeholder="https://www.icloud.com/invites/…"/></label>
     <label>What’s the plan? <small>(everyone with the link sees this)</small><textarea rows={3} maxLength={2000} value={form.note} onChange={e=>setForm({...form,note:e.target.value})} placeholder="What are you doing? Anything people should know?"/></label>
     {modal==='create'&&<label>{form.kind==='trip'?'Jobs to hand out':'Things to bring'} <small>(one per line{form.kind==='trip'?'; deciding something like the budget? use a vote later':''})</small><textarea rows={3} maxLength={4000} value={form.items} onChange={e=>setForm({...form,items:e.target.value})} placeholder={form.kind==='trip'?'Specific jobs one person can take, like:\nBook the Airbnb by Nov 1\nDrive from Wilson, Fri 5 PM (4 seats)':'The main dish\nSomething sweet'}/></label>}
     </div></details>
     {error&&<p className="form-error" role="alert">{error}</p>}
     {modal==='edit'&&<div className="danger-zone"><button type="button" className="text-button danger" disabled={busy} onClick={deletePlan}><Trash2 size={15}/>Delete this plan</button><small>Removes the plan and everyone’s answers for good.</small></div>}
     <div className="form-bottom"><span>Free to use.</span><button className="primary" disabled={busy}>{busy?<LoaderCircle className="spin" size={18}/>:<ArrowUpRight size={18}/>} {modal==='edit'?'Save changes':'Create plan'}</button></div>
    </form></>}
  </section></div>}
 </div>
}
// One row of the bring list. Claiming records only the current person; everyone else sees who has it.
// One row of the bring list. A guest's own claim records only their responsibility. When the host notes that
// someone told them they'll bring something, the row says "noted by" until that person confirms it.
function TaskRow({task:t,host,busy,act,guests,organizer}:{task:Task;host:boolean;busy:boolean;act:(t:Task,a:string,extra?:Record<string,string>)=>void;guests:Guest[];organizer:string}){
 const bring=t.category==='bring',who=t.isMine?'You':t.claimed_name,noted=t.claim_source==='host';
 const verb=t.done?(bring?'brought this':'handled this'):(bring?(t.isMine?'are bringing this':'is bringing this'):(t.isMine?'are on it':'is on it'));
 const options=guests.filter(g=>g.status!=='out'&&g.id),claimer=guests.find(g=>g.name===t.claimed_name);
 return <div className={'item-row'+(t.done?' done':'')}>
  <span className="item-icon">{itemIcon(t.title,t.category)}</span>
  <div className="item-info"><strong>{t.title}</strong>
   {t.claimed_name?<span className="by"><Face className="mini-avatar" seed={t.claimed_name} avatar={claimer?.avatar} photo={claimer?.photo}/>{t.isMine&&!t.done?(bring?'You’re bringing this':'You’re on it'):`${who} ${verb}`}</span>:<span>{t.done?'Handled':'Still available'}</span>}
   {t.claimed_name&&noted&&<span className="noted-tag">{t.isMine?`${organizer} noted this for you`:`Noted by ${host?'you':organizer} · not confirmed yet`}</span>}
   {!t.claimed_name&&host&&<span className="item-tools">
    {!t.done&&options.length>0&&<label className="assign"><span className="sr-only">Who said they’d bring {t.title}?</span><select disabled={busy} value="" onChange={e=>e.target.value&&act(t,'assign',{guestId:e.target.value})}><option value="">Who’s bringing it?</option>{options.map(g=><option key={g.id} value={g.id}>{g.isHost?'Me':g.name}</option>)}</select></label>}
    <button className="text-button small quiet" disabled={busy} onClick={()=>act(t,'done')}>{t.done?'Not done yet':'Already handled'}</button></span>}
   {t.claimed_name&&(t.isMine||host)&&<span className="item-tools">{t.isMine&&noted&&<button className="text-button small" disabled={busy} onClick={()=>act(t,'confirm')}>Yes, I’m bringing it</button>}<button className="text-button small" disabled={busy} onClick={()=>act(t,'done')}>{t.done?'Not done yet':t.isMine?(bring?'I brought it':'I did it'):(bring?'Mark brought':'Mark done')}</button><button className="text-button small quiet" disabled={busy} onClick={()=>act(t,'release')}>{t.isMine?(bring?'I can’t bring it anymore':'I can’t do it anymore'):'Open it up again'}</button></span>}
  </div>
  {!t.claimed_name&&t.done?<span className="check-badge done" role="img" aria-label="Done"><Check size={16} strokeWidth={3}/></span>:!t.claimed_name?<button className="claim-button" disabled={busy} onClick={()=>act(t,'claim')}>{bring?'I can bring this':'I’ll handle this'}</button>
  :<span className={'check-badge'+(t.done?' done':'')+(noted&&!t.done?' noted':'')} role="img" aria-label={t.done?'Done':noted?'Noted, not final':'Covered'}><Check size={16} strokeWidth={3}/></span>}
 </div>
}
