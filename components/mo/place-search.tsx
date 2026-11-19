'use client';
// "Where" with address search. Type a venue or address and pick a suggestion to fill in the full address.
// Suggestions come from OpenStreetMap through m.o's server (free, no account). Typing your own text always works.
// With an event search key, events show first ("UniverSoul Circus Raleigh"); picking one fills in Where and When.
// "near me" asks the phone for its rough location for that search only. Pasting an Airbnb or hotel link moves it to the booking link.
import {useEffect,useId,useRef,useState} from 'react';
import {MapPin,Search,Ticket} from 'lucide-react';
import {isBookingLink,readQuery} from '@/lib/places';
import type {EventHit} from '@/lib/places';

type Hit={name:string;address:string};
const eventWhen=(iso:string)=>{const d=new Date(iso);return Number.isNaN(+d)?'':d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})+' · '+d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})};
// The phone's rough location, asked only when the search says "near me". Resolves to null if declined or unavailable.
const whereAmI=()=>new Promise<{lat:number;lon:number}|null>(ok=>{if(typeof navigator==='undefined'||!navigator.geolocation)return ok(null);navigator.geolocation.getCurrentPosition(p=>ok({lat:p.coords.latitude,lon:p.coords.longitude}),()=>ok(null),{maximumAge:600000,timeout:8000})});
export function PlaceSearch({value,onChange,onBookingLink,onEvent}:{value:string;onChange:(v:string)=>void;onBookingLink:(url:string)=>void;onEvent?:(e:EventHit)=>void}){
 const [events,setEvents]=useState<EventHit[]>([]),[noLocation,setNoLocation]=useState(false),[hits,setHits]=useState<Hit[]>([]),[state,setState]=useState<'idle'|'loading'|'none'|'error'>('idle'),[open,setOpen]=useState(false),[q,setQ]=useState('');
 const list=useId(),box=useRef<HTMLDivElement>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null),seq=useRef(0);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current)},[]);
 function type(v:string){
  if(isBookingLink(v)){onBookingLink(v.trim());onChange('');setOpen(false);return}
  onChange(v);setQ(v);if(timer.current)clearTimeout(timer.current);
  if(v.trim().length<3||/^https?:/i.test(v.trim())){setHits([]);setEvents([]);setOpen(false);setState('idle');return}
  timer.current=setTimeout(async()=>{const n=++seq.current;setState('loading');setOpen(true);
   try{let at='';setNoLocation(false);if(readQuery(v).near){const p=await whereAmI();if(p)at=`&lat=${p.lat.toFixed(2)}&lon=${p.lon.toFixed(2)}`;else setNoLocation(true)}
    const r=await fetch('/api/places?q='+encodeURIComponent(v.trim())+at);const d:any=await r.json();if(n!==seq.current)return;
    if(!r.ok){setHits([]);setEvents([]);setState('error');return}setHits(d.results||[]);setEvents(d.events||[]);setState(d.results?.length||d.events?.length?'idle':'none')}
   catch{if(n===seq.current){setHits([]);setEvents([]);setState('error')}}},450);
 }
 function pick(h:Hit){onChange(h.address?`${h.name}, ${h.address}`.slice(0,160):h.name);setOpen(false);setHits([]);setEvents([])}
 function pickEvent(e:EventHit){onChange([e.venue,e.address].filter(Boolean).join(', ').slice(0,160));onEvent?.(e);setOpen(false);setHits([]);setEvents([])}
 useEffect(()=>{if(open)box.current?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})},[open]);
 return <div className="place-search" ref={box}>
  <label>Where<span className="place-input"><Search size={17} aria-hidden="true"/><input role="combobox" aria-expanded={open} aria-controls={list} aria-autocomplete="list" autoComplete="off" maxLength={160} value={value}
   onChange={e=>type(e.target.value)} onKeyDown={e=>{if(e.key==='Escape'&&open){e.preventDefault();e.stopPropagation();e.nativeEvent.stopImmediatePropagation();setOpen(false)}}} placeholder="Search an event, venue or address"/></span></label>
  {open&&<div className="place-results" id={list} role="listbox" aria-label="Address suggestions">
   {state==='loading'&&!hits.length?<p className="fine" role="status">Searching…</p>
    :state==='error'?<p className="fine" role="status">Search isn’t working right now. Type the full address instead.</p>
    :state==='none'?<p className="fine" role="status">No match for “{q}”. Try the venue name and city, or type the full address.</p>
    :<>{noLocation&&<p className="fine" role="status">Couldn’t get your location. Add a city to the search instead.</p>}
     {events.length>0&&<><span className="eyebrow">EVENTS</span>{events.map((e,i)=><button type="button" role="option" aria-selected={false} key={'e'+i} className="place-hit" onClick={()=>pickEvent(e)}><Ticket size={17}/><span><strong>{e.name}</strong><small>{[eventWhen(e.date),e.venue].filter(Boolean).join(' · ')}</small>{e.address&&<small>{e.address}</small>}</span></button>)}</>}
     {events.length>0&&hits.length>0&&<span className="eyebrow">PLACES</span>}
     {hits.map((h,i)=><button type="button" role="option" aria-selected={false} key={i} className="place-hit" onClick={()=>pick(h)}><MapPin size={17}/><span><strong>{h.name}</strong>{h.address&&<small>{h.address}</small>}</span></button>)}</>}
   <button type="button" className="text-button small" onClick={()=>setOpen(false)}>Use what I typed</button>
  </div>}
 </div>
}
