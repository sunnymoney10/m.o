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
