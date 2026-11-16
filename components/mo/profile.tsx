'use client';
import {useEffect,useState} from 'react';
import {Check,MapPin,Pencil,Plus,ArrowUpRight,LoaderCircle,Lock} from 'lucide-react';
import type {Me,Profile} from '@/lib/types';
import {INTERESTS,STYLES,photoFor} from '@/lib/types';
import {Marks} from './brand';

const empty:Profile={name:'',handle:'',mo:'',interests:[],style:'down'};

export function ProfileView({me,loading,save,openPlan,start}:{me:Me|null;loading:boolean;save:(p:Profile)=>Promise<boolean>;openPlan:(id:string)=>void;start:()=>void}){
 const p=me?.profile,[editing,setEditing]=useState(false),[f,setF]=useState<Profile>(empty),[custom,setCustom]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{if(!loading&&me&&!me.profile){setF({...empty,name:localStorage.getItem('mo-name')||''});setEditing(true)}},[loading,me]);
 function edit(){setF(p?{...p}:{...empty,name:localStorage.getItem('mo-name')||''});setEditing(true)}
 function toggle(tag:string){setF(x=>({...x,interests:x.interests.includes(tag)?x.interests.filter(t=>t!==tag):x.interests.length>=8?x.interests:[...x.interests,tag]}))}
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);const ok=await save(f);setBusy(false);if(ok)setEditing(false)}
 if(loading)return <div className="loading"><LoaderCircle className="spin"/>Finding your mo…</div>;
 const style=STYLES.find(s=>s[0]===(editing?f:p)?.style);
 return <div className="profile-page">
  <section className="profile-hero">
   <div className="profile-copy">
    <span className="say-it">say it: em-oh</span>
    <h1>What’s your mo?</h1>
    <p>Not your followers. Not your feed. What you’re actually down to do — and the plans you’ve made real.</p>
   </div>
   <div className="profile-card">
    <Marks className="marks-tr"/>
    <div className="profile-blob" aria-hidden="true"><span>{((editing?f.name:p?.name)||'?').slice(0,1).toUpperCase()}</span></div>
    <h2>{(editing?f.name:p?.name)||'Your name'}</h2>
    <span className="handle">@{(editing?f.handle:p?.handle)||'yourhandle'}</span>
    <p className="mo-line">{(editing?f.mo:p?.mo)||'One more song.'}</p>
    <div className="chips">{((editing?f.interests:p?.interests)||[]).map(t=><span className="chip" key={t}>{t}</span>)}</div>
    {style&&<span className="style-tag">{style[1]}</span>}
    {!editing&&p&&<button className="outline-button" onClick={edit}><Pencil size={15}/>Edit your mo.</button>}
   </div>
  </section>

  {editing&&<form className="panel profile-form" onSubmit={submit}>
   <h2>{p?'Edit your mo.':'Make your mo.'}</h2>
   <div className="form-row"><label>Name<input required maxLength={60} value={f.name} onChange={e=>setF({...f,name:e.target.value})} placeholder="What friends call you"/></label>
    <label>Handle<div className="handle-input"><span>@</span><input required maxLength={24} pattern="@?[A-Za-z0-9_]{2,24}" value={f.handle} onChange={e=>setF({...f,handle:e.target.value.replace(/\s/g,'')})} placeholder="jules"/></div></label></div>
   <label>Your mo, in a line<input maxLength={80} value={f.mo} onChange={e=>setF({...f,mo:e.target.value})} placeholder="One more song. / Always down for a food run."/></label>
   <fieldset><legend>What you’re down for <small>(up to 8)</small></legend><div className="chips pick">{[...new Set([...INTERESTS,...f.interests])].map(t=><button type="button" key={t} aria-pressed={f.interests.includes(t)} className={'chip'+(f.interests.includes(t)?' on':'')} onClick={()=>toggle(t)}>{f.interests.includes(t)&&<Check size={12}/>}{t}</button>)}</div>
    <div className="suggest"><input aria-label="Add your own" maxLength={24} value={custom} onChange={e=>setCustom(e.target.value)} placeholder="Add your own"/><button type="button" className="icon-button" aria-label="Add interest" disabled={!custom.trim()} onClick={()=>{toggle(custom.trim());setCustom('')}}><Plus size={16}/></button></div></fieldset>
   <fieldset><legend>Your planning style</legend><div className="style-grid">{STYLES.map(([k,label,line])=><button type="button" key={k} className={'style-option'+(f.style===k?' on':'')} aria-pressed={f.style===k} onClick={()=>setF({...f,style:k})}><strong>{label}</strong><small>{line}</small></button>)}</div></fieldset>
   <p className="hint"><Lock size={12}/> Your name, handle, line and interests show to people in plans you join. No scores, no rankings.</p>
   <div className="form-bottom">{p?<button type="button" className="text-button" onClick={()=>setEditing(false)}>Cancel</button>:<span/>}<button className="primary" disabled={busy}>{busy?<LoaderCircle className="spin" size={16}/>:<ArrowUpRight size={16}/>}Save my mo.</button></div>
  </form>}

  <section className="made-section">
   <div className="section-title"><h2>Made it out</h2><span className="soft-pill">{me?.history.length||0} {me?.history.length===1?'plan':'plans'}</span></div>
   {me?.history.length?<div className="history-grid">{me.history.map((h,i)=><button key={h.id} className="history-card" onClick={()=>openPlan(h.id)}>
    <img className={'blob-photo '+(i%2?'coral':'purple')} src={photoFor(h.kind,h.id)} alt=""/>
    <strong>{h.title}</strong><small>{h.date?new Date(h.date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):''}{h.place?' · '+h.place:''}</small></button>)}</div>
   :<div className="empty-state"><div><h3>Your history starts with one plan.</h3><p>When a plan you’re in gets marked “we made it out,” it lands here.</p></div><button className="outline-button" onClick={start}>Start a plan <ArrowUpRight size={15}/></button></div>}
  </section>

  {!!me?.cities.length&&<section className="cities"><span className="eyebrow">PLACES CONQUERED</span><div className="chips">{me.cities.map(c=><span key={c} className="chip city"><MapPin size={12}/>{c}</span>)}</div></section>}

  <section className="your-part">
   <div><span className="big">{me?.hosted||0}</span><span>plans you set that happened</span></div>
   <div><span className="big">{me?.contributed||0}</span><span>things you took care of</span></div>
   <p className="hint">Only you see these. Nobody gets ranked.</p>
  </section>
 </div>
}
