'use client';
import {useEffect,useState} from 'react';
import {LayoutDashboard,Users,Utensils,MessageSquare,Network,ClipboardList,Wrench,BookOpen,Megaphone,Settings2,LockKeyhole,MoreHorizontal,ChevronDown,type LucideIcon} from 'lucide-react';
type NavItem=[string,string,LucideIcon];
const planning:NavItem[]=[
 ['Overview','Overview',LayoutDashboard],['Guests','Guests',Users],['Food & backups','Food & backups',Utensils],['Messages','Messages',MessageSquare],
];
const coordination:NavItem[]=[['Group coordination','Group planning',Network],['Event essentials','Essentials',ClipboardList],['Host tools','Host tools',Wrench]];
const tools:NavItem[]=[['Guest concierge','Guest guide',BookOpen],['Social posts','Social posts',Megaphone]];
const settings:NavItem[]=[['Event details','Event details',Settings2]];
const mobileGroups=[{label:'Your event',items:planning},{label:'Coordination',items:coordination},{label:'More tools',items:tools},{label:'Settings',items:settings}];
export const sectionLabels=Object.fromEntries([...planning,...coordination,...tools,...settings].map(([id,label])=>[id,label])) as Record<string,string>;
export default function HostNavigation({active,onChange}:{active:string;onChange:(tab:string)=>void}){
 const [expanded,setExpanded]=useState(false);
 useEffect(()=>{if(tools.some(([id])=>id===active))setExpanded(true)},[active]);
 const buttons=(items:typeof planning)=>items.map(([id,label,Icon])=><button key={id} className={active===id?'active':''} aria-current={active===id?'page':undefined} onClick={()=>onChange(id)}><Icon size={18} aria-hidden="true"/><span>{label}</span></button>);
 return <aside className="host-nav"><div className="host-nav-brand"><a className="mo" href="/" aria-label="m.o home">m<span>.</span>o</a><span className="host-brand-caption">GOOD COMPANY</span></div>
  <nav className="host-desktop-nav" aria-label="Host desk sections">
   <div className="host-nav-group"><p className="host-nav-label">YOUR EVENT</p>{buttons(planning)}</div>
   <div className="host-nav-group"><p className="host-nav-label">GET IT TOGETHER</p>{buttons(coordination)}</div>
   <div className="host-nav-group"><button className="host-more-toggle" aria-expanded={expanded} aria-controls="host-extra-tools" onClick={()=>setExpanded(!expanded)}><MoreHorizontal size={18} aria-hidden="true"/><span>More tools</span><ChevronDown className={expanded?'rotated':''} size={14} aria-hidden="true"/></button><div id="host-extra-tools" hidden={!expanded}>{buttons(tools)}</div></div>
  </nav>
  <div className="host-mobile-nav"><label htmlFor="host-section">Workspace</label><select id="host-section" value={active} onChange={e=>onChange(e.target.value)}>{mobileGroups.map(group=><optgroup key={group.label} label={group.label}>{group.items.map(([id,label])=><option key={id} value={id}>{label}</option>)}</optgroup>)}</select></div>
  <nav className="host-quick-nav" aria-label="Quick event navigation">{buttons([planning[0],planning[1],planning[2]])}</nav>
  <div className="nav-bottom"><button className={active==='Event details'?'active':''} aria-current={active==='Event details'?'page':undefined} onClick={()=>onChange('Event details')}><Settings2 size={18} aria-hidden="true"/><span>Event details</span></button><p><LockKeyhole size={13} aria-hidden="true"/>Private host workspace</p></div>
 </aside>;
}
