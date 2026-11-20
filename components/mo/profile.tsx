'use client';
import {useEffect,useState} from 'react';
import {Check,MapPin,Pencil,Plus,ArrowUpRight,LoaderCircle,Lock,UsersRound} from 'lucide-react';
import type {Me,Profile} from '@/lib/types';
import {INTERESTS,STYLES} from '@/lib/types';
import {Scene,Face} from './art';
import {AvatarPicker} from './avatar-picker';

const empty:Profile={name:'',handle:'',mo:'',interests:[],style:'down'};

export function ProfileView({me,loading,save,openPlan,start,uploadPhoto,removePhoto}:{me:Me|null;loading:boolean;save:(p:Profile)=>Promise<boolean>;openPlan:(id:string)=>void;start:()=>void;uploadPhoto:(dataUrl:string)=>Promise<boolean>;removePhoto:()=>Promise<boolean>}){
 const p=me?.profile,[editing,setEditing]=useState(false),[f,setF]=useState<Profile>(empty),[custom,setCustom]=useState(''),[busy,setBusy]=useState(false),[customizing,setCustomizing]=useState(false);
 useEffect(()=>{if(!loading&&me&&!me.profile){setF({...empty,name:localStorage.getItem('mo-name')||''});setEditing(true)}},[loading,me]);
 function edit(){setCustomizing(false);setF(p?{...p}:{...empty,name:localStorage.getItem('mo-name')||''});setEditing(true)}
 function toggle(tag:string){setF(x=>({...x,interests:x.interests.includes(tag)?x.interests.filter(t=>t!==tag):x.interests.length>=8?x.interests:[...x.interests,tag]}))}
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);const ok=await save(f);setBusy(false);if(ok)setEditing(false)}
 if(loading)return <div className="loading"><LoaderCircle className="spin"/>Loading your profile…</div>;
 const style=STYLES.find(s=>s[0]===(editing?f:p)?.style);
 const shown=editing?f:p;
 return <div className="profile-page">
  <section className="profile-top">
   <div className="profile-cover"><Scene kind="portrait" seed={shown?.handle||shown?.name||'you'} avatar={shown?.avatar}/>{p?.photo&&<Face className="cover-photo" seed={p.handle} photo={p.photo}/>}<span className="cover-note">What’s your m.o?</span></div>
   <h1 className={shown?.name?'':'empty'}>{shown?.name||'Your name'}</h1>
   <span className="handle">@{shown?.handle||'yourhandle'}</span>
   <p className={'mo-line'+(shown?.mo?'':' empty')}>{shown?.mo||'Add a line about what you’re down for.'}</p>
   {!!shown?.interests.length&&<div className="chips">{shown.interests.map(t=><span className="chip" key={t}>{t}</span>)}</div>}
   {style&&(p||editing)&&<span className="style-tag">{style[1]} · {style[2]}</span>}
   {!editing&&<div className="profile-actions"><button className="primary plum" onClick={edit}><Pencil size={16}/>{p?'Edit my m.o':'Make my m.o'}</button><button className="outline-button" onClick={start}><Plus size={16}/>Start your own plan</button></div>}
  </section>

  {editing&&<form className="panel profile-form" onSubmit={submit}>
   <p className="hint">Your profile belongs to this browser. A personal invite restores access to one plan; it does not transfer a profile.</p>{!!me?.recoveredPlans&&<p className="hint">Your recovered plan contributions are included below. You can set up this browser’s own profile here.</p>}<h2>{p?'Edit your m.o':'Make your m.o'}</h2>
   <div className="form-row"><label>Name<input required maxLength={60} value={f.name} onChange={e=>setF({...f,name:e.target.value})} placeholder="What friends call you"/></label>
    <label>Handle<div className="handle-input"><span>@</span><input required maxLength={24} pattern="@?[A-Za-z0-9_]{2,24}" value={f.handle} onChange={e=>setF({...f,handle:e.target.value.replace(/\s/g,'')})} placeholder="jules"/></div></label></div>
   <details className="profile-extras" open={customizing} onToggle={e=>setCustomizing(e.currentTarget.open)}><summary>Customize picture and profile (optional)</summary><AvatarPicker seed={f.handle||f.name||'you'} avatar={f.avatar} photo={p?.photo} canUpload={!!p} onAvatar={a=>setF(x=>({...x,avatar:a}))} upload={uploadPhoto} remove={removePhoto}/>
   <label>About you, in one line<input maxLength={80} value={f.mo} onChange={e=>setF({...f,mo:e.target.value})} placeholder="One more song. / Always down for a food run."/></label>
   <fieldset><legend>Things you like doing <small>(up to 8)</small></legend><div className="chips pick">{[...new Set([...INTERESTS,...f.interests])].map(t=><button type="button" key={t} aria-pressed={f.interests.includes(t)} className={'chip'+(f.interests.includes(t)?' on':'')} onClick={()=>toggle(t)}>{f.interests.includes(t)&&<Check size={12}/>}{t}</button>)}</div>
    <div className="suggest"><input aria-label="Add your own" maxLength={24} value={custom} onChange={e=>setCustom(e.target.value)} placeholder="Add your own"/><button type="button" className="icon-button" aria-label="Add interest" disabled={!custom.trim()} onClick={()=>{toggle(custom.trim());setCustom('')}}><Plus size={16}/></button></div></fieldset>
   <fieldset><legend>How you like to plan</legend><div className="style-grid">{STYLES.map(([k,label,line])=><button type="button" key={k} className={'style-option'+(f.style===k?' on':'')} aria-pressed={f.style===k} onClick={()=>setF({...f,style:k})}><strong>{label}</strong><small>{line}</small></button>)}</div></fieldset>
   </details><p className="hint"><Lock size={12}/> Your name, handle, picture, line and interests show to people in plans you join. No scores, no rankings.</p>
   <div className="form-bottom">{p?<button type="button" className="text-button" onClick={()=>setEditing(false)}>Cancel</button>:<span/>}<button className="primary" disabled={busy}>{busy?<LoaderCircle className="spin" size={16}/>:<ArrowUpRight size={16}/>}Save my m.o</button></div>
  </form>}

  <section className="made-section">
   <div className="section-title"><h2>Made it out</h2><span className="soft-pill">{me?.history.length||0} {me?.history.length===1?'plan':'plans'}</span></div>
   {me?.history.length?<div className="history-grid">{me.history.map(h=><button key={h.id} className="history-card" onClick={()=>openPlan(h.id)}>
    <Scene kind="night" seed={h.id}/>
    <strong>{h.title}</strong><small>{h.date?new Date(h.date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):''}{h.place?' · '+h.place:''}</small></button>)}</div>
   :<div className="empty-state"><div><h3>No past plans yet.</h3><p>Plans you went to show up here once the host marks them done.</p></div><button className="outline-button" onClick={start}>Start your own plan <ArrowUpRight size={15}/></button></div>}
   <p className="shared-note"><UsersRound size={18} strokeWidth={1.8}/>Shared with people in your plans</p>
  </section>

  {!!me?.cities.length&&<section className="cities"><span className="eyebrow">PLACES CONQUERED</span><div className="chips">{me.cities.map(c=><span key={c} className="chip city"><MapPin size={12}/>{c}</span>)}</div></section>}

  <section className="your-part">
   <div><span className="big">{me?.hosted||0}</span><span>plans you set that happened</span></div>
   <div><span className="big">{me?.contributed||0}</span><span>things you took care of</span></div>
   <p className="hint">Only you see these numbers.</p>
  </section>
 </div>
}
