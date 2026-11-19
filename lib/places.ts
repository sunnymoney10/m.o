// Address search results from OpenStreetMap (Photon), used by the server and tested directly.
// Turns OpenStreetMap results into "Name" + "street, city, state" lines, without duplicates.
export function placeResults(d:any){const out:{name:string;address:string}[]=[];
 for(const f of Array.isArray(d?.features)?d.features.slice(0,8):[]){const p=f?.properties||{};const street=[p.housenumber,p.street].filter(Boolean).join(' ');
  const area=[p.city||p.town||p.village||p.district,p.state,p.postcode].filter(Boolean).join(', ');const name=(typeof p.name==='string'?p.name.trim().slice(0,120):'');
  const address=[street,area].filter(Boolean).join(', ').slice(0,160);if(!name&&!street)continue;
  const r={name:name||street,address:name?address:area};if(!out.some(o=>o.name===r.name&&o.address===r.address))out.push(r)}
 return out.slice(0,6)}

// A booking link pasted into "Where" (Airbnb, Vrbo, Booking.com, hotels) belongs in the booking field instead.
export function isBookingLink(v:string){try{const u=new URL(v.trim());return u.protocol==='https:'&&/(^|\.)(airbnb\.(?:com|ca|co\.uk|com\.au|[a-z]{2})|abnb\.me|vrbo\.com|booking\.com|hotels\.com|expedia\.com|marriott\.com|hilton\.com)$/.test(u.hostname)}catch{return false}}

// "UniverSoul Circus near me" → {text:'UniverSoul Circus', near:true}.
export function readQuery(q:string){const near=/\b(near me|nearby|close to me|around me)\b/i.test(q);return {text:q.replace(/\b(near me|nearby|close to me|around me)\b/ig,' ').replace(/\s+/g,' ').trim(),near}}
// Ways to read "UniverSoul Circus Raleigh": the whole thing as the event name, then the last word or two as the city.
export function eventTries(text:string){const w=text.split(' ').filter(Boolean),out:{keyword:string;city?:string}[]=[{keyword:text}];
 for(const n of [1,2])if(w.length>n)out.push({keyword:w.slice(0,-n).join(' '),city:w.slice(-n).join(' ')});return out}
export type EventHit={name:string;address:string;date:string;venue:string};
// Ticketmaster Discovery results → event name, start time, venue and full address.
export function eventResults(d:any):EventHit[]{const out:EventHit[]=[];
 for(const e of Array.isArray(d?._embedded?.events)?d._embedded.events.slice(0,10):[]){const v=e?._embedded?.venues?.[0]||{};
  const name=typeof e?.name==='string'?e.name.trim().slice(0,120):'';if(!name)continue;
  const venue=typeof v.name==='string'?v.name.trim().slice(0,120):'';
  const address=[v.address?.line1,v.city?.name,v.state?.stateCode||v.state?.name,v.postalCode].filter((x:any)=>typeof x==='string'&&x).join(', ').slice(0,160);
  const st=e?.dates?.start||{};const date=typeof st.dateTime==='string'?st.dateTime:typeof st.localDate==='string'?st.localDate+'T'+(typeof st.localTime==='string'?st.localTime:'19:00:00'):'';
  if(!out.some(o=>o.name===name&&o.date===date&&o.venue===venue))out.push({name,address,date,venue})}
 return out.slice(0,5)}

// "Find a place" links: open Airbnb or a hotel search for the plan's area and dates. m.o doesn't book or read anything there.
export function stayLinks(where:string,start?:string,end?:string){
 const q=where.trim();if(!q)return null;
 const day=(s?:string)=>{if(!s)return '';const d=new Date(s);return Number.isNaN(+d)?'':`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
 const a=day(start),b0=day(end),b=b0&&b0>a?b0:a?day(new Date(new Date(start!).getTime()+86400000).toISOString()):'';
 const air=new URL('https://www.airbnb.com/s/'+encodeURIComponent(q)+'/homes');if(a){air.searchParams.set('checkin',a);air.searchParams.set('checkout',b)}
 const hotel=new URL('https://www.booking.com/searchresults.html');hotel.searchParams.set('ss',q);if(a){hotel.searchParams.set('checkin',a);hotel.searchParams.set('checkout',b)}
 return {airbnb:air.href,hotels:hotel.href};
}
