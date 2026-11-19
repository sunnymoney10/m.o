'use client';
// "Where" with address search. Type a venue or address and pick a suggestion to fill in the full address.
// Suggestions come from OpenStreetMap through m.o's server (free, no account). Typing your own text always works.
// Pasting an Airbnb or hotel link here moves it to the booking link instead.
import {useEffect,useId,useRef,useState} from 'react';
import {MapPin,Search} from 'lucide-react';
import {isBookingLink} from '@/lib/places';

type Hit={name:string;address:string};
export function PlaceSearch({value,onChange,onBookingLink}:{value:string;onChange:(v:string)=>void;onBookingLink:(url:string)=>void}){
 const [hits,setHits]=useState<Hit[]>([]),[state,setState]=useState<'idle'|'loading'|'none'|'error'>('idle'),[open,setOpen]=useState(false),[q,setQ]=useState('');
 const list=useId(),timer=useRef<ReturnType<typeof setTimeout>|null>(null),seq=useRef(0);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current)},[]);
 function type(v:string){
  if(isBookingLink(v)){onBookingLink(v.trim());onChange('');setOpen(false);return}
  onChange(v);setQ(v);if(timer.current)clearTimeout(timer.current);
  if(v.trim().length<3||/^https?:/i.test(v.trim())){setHits([]);setOpen(false);setState('idle');return}
  timer.current=setTimeout(async()=>{const n=++seq.current;setState('loading');setOpen(true);
   try{const r=await fetch('/api/places?q='+encodeURIComponent(v.trim()));const d:any=await r.json();if(n!==seq.current)return;
    if(!r.ok){setHits([]);setState('error');return}setHits(d.results||[]);setState(d.results?.length?'idle':'none')}
   catch{if(n===seq.current){setHits([]);setState('error')}}},350);
 }
 function pick(h:Hit){onChange(h.address?`${h.name}, ${h.address}`.slice(0,160):h.name);setOpen(false);setHits([])}
 return <div className="place-search">
  <label>Where<span className="place-input"><Search size={17} aria-hidden="true"/><input role="combobox" aria-expanded={open} aria-controls={list} aria-autocomplete="list" autoComplete="off" maxLength={160} value={value}
   onChange={e=>type(e.target.value)} onKeyDown={e=>{if(e.key==='Escape')setOpen(false)}} placeholder="Search a venue or address"/></span></label>
  {open&&<div className="place-results" id={list} role="listbox" aria-label="Address suggestions">
   {state==='loading'&&!hits.length?<p className="fine" role="status">Searching…</p>
    :state==='error'?<p className="fine" role="status">Search isn’t working right now. Type the full address instead.</p>
    :state==='none'?<p className="fine" role="status">No match for “{q}”. Try the venue name and city, or type the full address.</p>
    :hits.map((h,i)=><button type="button" role="option" aria-selected={false} key={i} className="place-hit" onClick={()=>pick(h)}><MapPin size={17}/><span><strong>{h.name}</strong>{h.address&&<small>{h.address}</small>}</span></button>)}
   <button type="button" className="text-button small" onClick={()=>setOpen(false)}>Use what I typed</button>
  </div>}
 </div>
}
