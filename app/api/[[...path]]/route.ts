import {env} from 'cloudflare:workers';
import {themeError} from '../../../lib/invite-theme';
import {verifiedIdentity} from '../../../lib/request-identity';
import {INVITE_SECRET,newInviteSecret,inviteHash,inviteExpiry} from '../../../lib/guest-access';
import {cleanName} from '../../../lib/names';
import {orderPlans} from '../../../lib/plan-order';
import {stageOf,thingsLeft,type JourneyFacts} from '../../../lib/journey';
import {newHostKey,hashHostKey,hostLink,HOST_KEY} from '../../../lib/host-key';
import {placeResults,eventResults,eventTries,readQuery,withHouseNumber,censusResults} from '../../../lib/places';
import {cleanAvatar,parseAvatar,parsePhoto} from '../../../lib/avatar';
export const dynamic='force-dynamic';
function https(v:unknown){const s=str(v,1000);if(!s)return null;try{const u=new URL(s);return u.protocol==='https:'?u.href:null}catch{return null}}
const invitation=https;
// An end date is optional; when given it needs a start, must come after it, and the plan can't run past 60 days.
function endError(start:string,end:string){if(!end)return '';if(Number.isNaN(Date.parse(end)))return 'Choose a valid end date.';if(!start)return 'Add a start date before an end date.';const a=Date.parse(start),b=Date.parse(end);if(b<=a)return 'The end needs to be after the start.';if(b-a>60*86400000)return 'Plans can last up to 60 days.';return ''}
// A plan's journey stage for everyone who can see the plan, and the count of things left for its host only.
// Worked out from the real saved data, so a guest who can't see the address still sees the right stage.
function withJourney({j_host,j_place,j_others,j_noreply,j_checking,j_requests,j_date_votes,j_place_votes,...p}:any){
 const f:JourneyFacts={hasDate:!!p.date,hasPlace:!!j_place,madeIt:!!p.made_it,others:j_others||0,noReply:j_noreply||0,checking:j_checking||0,openItems:p.open_items||0,openDateVotes:j_date_votes||0,openPlaceVotes:j_place_votes||0,openOtherVotes:Math.max(0,(p.open_votes||0)-(j_date_votes||0)-(j_place_votes||0)),requests:j_requests||0};
 return {...p,stage:stageOf(f),...(j_host?{left:thingsLeft(f)}:{})};
}
function str(v:unknown,max=300){return typeof v==='string'?v.trim().slice(0,max):''}
const STYLES=['setter','details','down','wildcard','snacks'];
const HANDLE=/^[a-z0-9_]{2,24}$/;
// Optional DAILY_NEW_PLANS environment variable overrides the site-wide daily ceiling on new plans.
const dailyNewPlans=()=>Number((env as {DAILY_NEW_PLANS?:string})?.DAILY_NEW_PLANS)||500;
// Habits people choose for themselves ("Always early"). Up to 5, short, no contact details. Never scored or counted.
function habitsOf(v:unknown){return Array.isArray(v)?[...new Set(v.map(x=>cleanName(str(x,40)).slice(0,32)).filter(x=>x&&/\p{L}/u.test(x)))].slice(0,5):[]}
function interestsOf(v:unknown){return Array.isArray(v)?[...new Set(v.map(x=>str(x,24)).filter(Boolean))].slice(0,8):[]}
function parseInterests(s:string){try{const v=JSON.parse(s);return Array.isArray(v)?v:[]}catch{return []}}
const placeHits=new Map<string,number[]>(),hostTries=new Map<string,number[]>();
// Writes down that a request failed, and where (method and route shape only, never IDs or what was sent).
function areaOf(req:Request){const seg=new URL(req.url).pathname.split('/').filter(Boolean).slice(1);
 const shape=seg[0]==='plan'?['plan',...seg.slice(2).filter((_,i)=>i%2===0)]:seg.slice(0,2);
 return (req.method+' '+shape.map(x=>/^[a-z-]{1,20}$/.test(x)?x:'?').join('/')).slice(0,60)}
async function recordError(req:Request){try{const db=env.DB;if(!db)return;const area=areaOf(req);
 await db.batch([db.prepare('INSERT INTO errors (id,at,area) VALUES (?,?,?)').bind(crypto.randomUUID(),new Date().toISOString(),area),db.prepare('DELETE FROM errors WHERE id NOT IN (SELECT id FROM errors ORDER BY at DESC LIMIT 500)')]);
}catch{}}
// Adds one to today's count for this kind of action (method and route shape only, e.g. "POST plan/rsvp").
async function countUse(req:Request){try{const db=env.DB;if(!db)return;
 await db.prepare('INSERT INTO usage_counts (day,area,n) VALUES (?,?,1) ON CONFLICT(day,area) DO UPDATE SET n=n+1').bind(new Date().toISOString().slice(0,10),areaOf(req)).run()}catch{}}
async function handler(req:Request){const res=await answer(req);if(req.method!=='GET'&&res.status<400)await countUse(req);return res}
async function answer(req:Request){
 const cookies=req.headers.get('cookie')||''; let session=cookies.match(/(?:^|; )mo_session=([a-f0-9-]{36})(?:;|$)/)?.[1]; const fresh=!session;session ||=crypto.randomUUID();
 const visitor=await verifiedIdentity(req,(env as {MO_IDENTITY_SECRET?:string}).MO_IDENTITY_SECRET)||session;let actor=visitor;
 const json=(obj:unknown,status=200)=>new Response(JSON.stringify(obj),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Referrer-Policy':'no-referrer',...(fresh?{'Set-Cookie':`mo_session=${session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`}:{})}});
 // Serves a stored data-URL photo as an image. Cached by the browser; the URL changes when the photo changes.
 const image=(dataUrl:string|undefined)=>{const p=parsePhoto(dataUrl);if(!p)return new Response('Not found',{status:404,headers:{'Cache-Control':'no-store'}});return new Response(p.bytes.buffer as ArrayBuffer,{headers:{'Content-Type':p.type,'Cache-Control':'private, max-age=31536000, immutable','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'"}})};
 try{
  const url=new URL(req.url); const seg=url.pathname.split('/').filter(Boolean).slice(1);const db=env.DB;
  if(req.method!=='GET' && req.headers.get('origin')!==url.origin)return json({error:'Please submit from this site.'},403);
  if(!db)return json({error:'The shared database is not connected yet.'},503);
  const maxBody=seg.join('/')==='me/photo'?72000:((seg[0]==='plans'&&seg.length===1&&req.method==='POST')||(seg[0]==='plan'&&seg.length===2&&req.method==='PATCH'))?160000:16000;
  if(req.headers.get('content-length') && Number(req.headers.get('content-length'))>maxBody)return json({error:'That request is too large.'},413);
  const body=async()=>{if(req.method==='GET'||req.method==='DELETE')return {} as any;try{return await req.json() as any}catch{return {} as any}};

  // ---- Health check for the owner's alert (GitHub checks it every 30 minutes). Counts only; nothing private. ----
  if(seg[0]==='health'&&seg.length===1&&req.method==='GET'){
   const since=new Date(Date.now()-Math.min(1440,Math.max(5,Math.floor(Number(url.searchParams.get('minutes'))||35)))*60000).toISOString();
   const r=await db.prepare('SELECT count(*) AS n FROM errors WHERE at>?').bind(since).first<any>();
   const {results:areas}=await db.prepare('SELECT area,count(*) AS n FROM errors WHERE at>? GROUP BY area ORDER BY n DESC LIMIT 5').bind(since).all<any>();
   return json({ok:true,database:true,recentErrors:r?.n||0,areas:areas.map((a:any)=>`${a.area} (${a.n})`)});
  }
  // ---- Address search: free OpenStreetMap results (Photon). No key, no cost. Search text only; never who is searching. ----
  // ---- Host link: open a plan as its host on this device. The key is checked against a stored hash. ----
  if(seg[0]==='host-link'&&seg.length===1&&req.method==='POST'){
   const t=Date.now(),tries=(hostTries.get(actor)||[]).filter(x=>x>t-600000);if(tries.length>=10)return json({error:'Too many tries. Wait a few minutes and try again.'},429);
   tries.push(t);hostTries.set(actor,tries);if(hostTries.size>5000)hostTries.clear();
   const b=await body();const key=typeof b.key==='string'?b.key:'';if(!HOST_KEY.test(key))return json({error:'That host link isn’t complete. Copy the whole link and try again.'},400);
   const plan=await db.prepare("SELECT id,owner,host_key_hash FROM plans WHERE host_key_hash=? AND host_key_hash<>''").bind(await hashHostKey(key)).first<any>();
   if(!plan)return json({error:'This host link doesn’t work anymore. A newer one may have been made. Ask the host for the latest link.'},404);
   // Keep this browser identity and grant only the requested plan. Rotation revokes grants.
   if(plan.owner!==visitor)await db.prepare('INSERT INTO host_access (plan_id,visitor,key_hash) VALUES (?,?,?) ON CONFLICT(plan_id,visitor) DO UPDATE SET key_hash=excluded.key_hash').bind(plan.id,visitor,plan.host_key_hash).run();
   return json({ok:true,plan:plan.id});
  }
  if(seg[0]==='places'&&seg.length===1&&req.method==='GET'){
   const {text,near}=readQuery(str(url.searchParams.get('q'),100));if(text.length<3)return json({results:[],events:[]});
   const t=Date.now(),hits=(placeHits.get(actor)||[]).filter(x=>x>t-60000);if(hits.length>=30)return json({error:'Too many searches. Wait a minute and try again.'},429);
   hits.push(t);placeHits.set(actor,hits);if(placeHits.size>5000)placeHits.clear();
   // "Near me": the phone's rough location (about 1 km), used for this search only and never stored.
   const lat=Number(url.searchParams.get('lat')),lon=Number(url.searchParams.get('lon'));const here=Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180&&url.searchParams.has('lat')?{lat:lat.toFixed(2),lon:lon.toFixed(2)}:null;
   const places=(async()=>{const r=await fetch('https://photon.komoot.io/api/?limit=6&lang=en&q='+encodeURIComponent(text)+(here?`&lat=${here.lat}&lon=${here.lon}`:''),{headers:{'User-Agent':'m.o-planner/1.0 (+https://mo.mymoapp.workers.dev)',Accept:'application/json'},signal:AbortSignal.timeout(5000)});if(!r.ok)throw new Error('places '+r.status);return withHouseNumber(text,placeResults(await r.json()))})();
   // A typed house address (starts with a number and has a comma or 3+ words) is also checked with the US Census address finder.
   const census=(async()=>{if(!/^\d+[a-z]?\s/i.test(text)||text.split(/\s+/).length<3)return [];const r=await fetch('https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?benchmark=Public_AR_Current&format=json&address='+encodeURIComponent(text),{headers:{Accept:'application/json'},signal:AbortSignal.timeout(5000)});if(!r.ok)return [];return censusResults(await r.json())})().catch(()=>[]);
   const key=(env as {TICKETMASTER_KEY?:string}).TICKETMASTER_KEY;
   const events=(async()=>{if(!key)return [];for(const tr of eventTries(text)){const u=new URL('https://app.ticketmaster.com/discovery/v2/events.json');u.searchParams.set('apikey',key);u.searchParams.set('keyword',tr.keyword);u.searchParams.set('size','10');u.searchParams.set('sort','date,asc');
     if(tr.city)u.searchParams.set('city',tr.city);if(here&&!tr.city){u.searchParams.set('latlong',here.lat+','+here.lon);u.searchParams.set('radius','75');u.searchParams.set('unit','miles')}
     const r=await fetch(u,{signal:AbortSignal.timeout(5000)});if(!r.ok)throw new Error('events '+r.status);const found=eventResults(await r.json());if(found.length)return found}return []})();
   const [p,e,c]=await Promise.allSettled([places,events,census]);
   if(p.status==='rejected'&&e.status==='rejected'&&!(c.status==='fulfilled'&&c.value.length))return json({error:'Search isn’t working right now. Type the address instead.'},502);
   const exact=c.status==="fulfilled"?c.value:[],mapped=p.status==='fulfilled'?p.value:[];
   return json({results:[...exact,...mapped.filter(x=>!exact.some(y=>y.name.toLowerCase()===x.name.toLowerCase()))].slice(0,6),events:e.status==='fulfilled'?e.value:[],eventsOn:!!key});
  }
  // ---- Your m.o profile ----
  // ---- Profile photo: a small image resized on the phone, stored in the database (no file storage service) ----
  if(seg[0]==='me'&&seg[1]==='photo'&&seg.length===2){
   if(req.method==='GET'){const r=await db.prepare('SELECT photo FROM profiles WHERE actor=?').bind(actor).first<any>();return image(r?.photo)}
   if(req.method==='PUT'){
    const b=await body();const photo=parsePhoto(b.photo);if(!photo)return json({error:'Choose a JPEG, PNG or WebP photo under 48 KB. m.o shrinks it for you before upload.'},400);
    const has=await db.prepare('SELECT actor FROM profiles WHERE actor=?').bind(actor).first();if(!has)return json({error:'Save your name and handle first, then add a photo.'},400);
    await db.prepare('UPDATE profiles SET photo=?,photo_updated=? WHERE actor=?').bind(b.photo,new Date().toISOString(),actor).run();return json({ok:true});
   }
   if(req.method==='DELETE'){await db.prepare("UPDATE profiles SET photo='',photo_updated='' WHERE actor=?").bind(actor).run();return json({ok:true})}
  }
  if(seg[0]==='me'&&seg.length===1){
   if(req.method==='GET'){
    const p=await db.prepare('SELECT name,handle,mo,interests,habits,style,avatar,photo_updated FROM profiles WHERE actor=?').bind(actor).first<any>();
    const {results:history}=await db.prepare("SELECT p.id,p.title,p.kind,p.date,p.place FROM plans p WHERE p.made_it=1 AND (p.owner=?1 OR EXISTS(SELECT 1 FROM host_access h WHERE h.plan_id=p.id AND h.visitor=?1 AND h.key_hash=p.host_key_hash AND h.key_hash<>'') OR EXISTS(SELECT 1 FROM guests g WHERE g.plan_id=p.id AND g.status='in' AND g.details_approved=1 AND ((g.actor=?1 AND g.invite_required=0) OR EXISTS(SELECT 1 FROM guest_access a WHERE a.guest_id=g.id AND a.visitor=?1 AND a.invite_hash=g.invite_hash AND g.invite_expires>strftime('%Y-%m-%dT%H:%M:%fZ','now'))))) ORDER BY p.date DESC").bind(actor).all<any>();
    const done=await db.prepare("SELECT count(*) AS n FROM tasks t JOIN plans p ON p.id=t.plan_id WHERE t.done=1 AND ((t.claimed_by=?1 AND (p.owner=?1 OR EXISTS(SELECT 1 FROM guests g WHERE g.plan_id=p.id AND g.actor=?1 AND g.invite_required=0))) OR (t.claimed_by=p.owner AND EXISTS(SELECT 1 FROM host_access h WHERE h.plan_id=p.id AND h.visitor=?1 AND h.key_hash=p.host_key_hash AND h.key_hash<>'')) OR EXISTS(SELECT 1 FROM guests g JOIN guest_access a ON a.guest_id=g.id WHERE g.plan_id=p.id AND g.actor=t.claimed_by AND a.visitor=?1 AND a.invite_hash=g.invite_hash AND g.invite_expires>strftime('%Y-%m-%dT%H:%M:%fZ','now')))").bind(actor).first<any>();
    const hosted=await db.prepare("SELECT count(*) AS n FROM plans p WHERE p.made_it=1 AND (p.owner=?1 OR EXISTS(SELECT 1 FROM host_access h WHERE h.plan_id=p.id AND h.visitor=?1 AND h.key_hash=p.host_key_hash AND h.key_hash<>''))").bind(actor).first<any>();
    const recovered=await db.prepare("SELECT count(*) AS n FROM guest_access a JOIN guests g ON g.id=a.guest_id WHERE a.visitor=? AND g.actor<>? AND a.invite_hash=g.invite_hash AND g.invite_expires>?").bind(actor,actor,new Date().toISOString()).first<any>();
    const cities=[...new Set(history.map((h:any)=>String(h.place||'').trim()).filter(Boolean))];
    return json({recoveredPlans:recovered?.n||0,profile:p?{name:p.name,handle:p.handle,mo:p.mo,style:p.style,interests:parseInterests(p.interests),habits:parseInterests(p.habits||'[]'),avatar:parseAvatar(p.avatar),photo:p.photo_updated?'/api/me/photo?v='+encodeURIComponent(p.photo_updated):null}:null,history,cities,contributed:done?.n||0,hosted:hosted?.n||0});
   }
   if(req.method==='PUT'){
    const b=await body();const name=str(b.name,60),handle=str(b.handle,24).toLowerCase().replace(/^@/,''),mo=str(b.mo,80),style=STYLES.includes(b.style)?b.style:'down';
    if(!name)return json({error:'Tell people what to call you.'},400);
    if(!HANDLE.test(handle))return json({error:'Handles use 2–24 lowercase letters, numbers or underscores.'},400);
    // Keep the saved avatar unless a new, valid one is sent; null clears it.
    const kept=await db.prepare('SELECT avatar FROM profiles WHERE actor=?').bind(actor).first<any>();const chosen=b.avatar===undefined?undefined:cleanAvatar(b.avatar);
    const avatarJson=chosen===undefined?(kept?.avatar||''):chosen?JSON.stringify(chosen):'';
    const taken=await db.prepare('SELECT actor FROM profiles WHERE handle=? AND actor<>?').bind(handle,actor).first();if(taken)return json({error:'That handle is taken. Try another.'},409);
    await db.batch([db.prepare('INSERT INTO profiles (actor,name,handle,mo,interests,style,updated,avatar,habits) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(actor) DO UPDATE SET name=excluded.name,handle=excluded.handle,mo=excluded.mo,interests=excluded.interests,style=excluded.style,updated=excluded.updated,avatar=excluded.avatar,habits=excluded.habits').bind(actor,name,handle,mo,JSON.stringify(interestsOf(b.interests)),style,new Date().toISOString(),avatarJson,JSON.stringify(habitsOf(b.habits))),db.prepare('UPDATE guests SET name=? WHERE actor=?').bind(name,actor),db.prepare('UPDATE tasks SET claimed_name=? WHERE claimed_by=?').bind(name,actor),db.prepare('UPDATE memories SET name=? WHERE actor=?').bind(name,actor)]);
    return json({ok:true});
   }
  }

  if(seg[0]==='plans'&&seg.length===1){
   if(req.method==='GET'){
    // Address is shared only with the organizer and people who said in or maybe.
    const {results}=await db.prepare(`SELECT p.id,p.title,p.kind,p.date,p.end_date,CASE WHEN p.owner=?1 OR EXISTS(SELECT 1 FROM host_access h WHERE h.plan_id=p.id AND h.visitor=?1 AND h.key_hash=p.host_key_hash AND h.key_hash<>'') OR EXISTS(SELECT 1 FROM guests m WHERE m.plan_id=p.id AND (m.actor=?1 OR m.id IN (SELECT a.guest_id FROM guest_access a WHERE a.visitor=?1 AND a.invite_hash=m.invite_hash AND m.invite_expires>strftime('%Y-%m-%dT%H:%M:%fZ','now'))) AND m.status IN ('in','maybe') AND m.details_approved=1) THEN p.place ELSE '' END AS place,p.budget,p.note,p.invite_url,p.created,p.made_it,p.theme,p.accent,p.emoji,CASE WHEN p.cover_updated<>'' THEN '/api/plan/'||p.id||'/cover?v='||p.cover_updated ELSE '' END AS cover_url,
     (SELECT coalesce(sum(1+CASE WHEN g.extra_status='approved' THEN g.extra_count ELSE 0 END),0) FROM guests g WHERE g.plan_id=p.id AND g.status='in') AS going,
     (SELECT count(*) FROM guests g WHERE g.plan_id=p.id AND g.status='maybe') AS maybe,
     (SELECT count(*) FROM guests g WHERE g.plan_id=p.id AND g.status='invited') AS invited,
     (SELECT count(*) FROM tasks t WHERE t.plan_id=p.id AND t.claimed_by IS NULL) AS open_items,
     (SELECT t.title FROM tasks t WHERE t.plan_id=p.id AND t.claimed_by IS NULL ORDER BY t.rowid LIMIT 1) AS open_item,
     (SELECT count(*) FROM polls v WHERE v.plan_id=p.id AND v.decided_option IS NULL) AS open_votes,
     CASE WHEN p.owner=?1 OR EXISTS(SELECT 1 FROM host_access h WHERE h.plan_id=p.id AND h.visitor=?1 AND h.key_hash=p.host_key_hash AND h.key_hash<>'') THEN (SELECT count(*) FROM guests g WHERE g.plan_id=p.id AND g.status='requested') ELSE 0 END AS requests
     ,(SELECT count(*) FROM guests g WHERE g.plan_id=p.id AND g.status='out') AS cant,
     CASE WHEN p.owner=?1 OR EXISTS(SELECT 1 FROM host_access h WHERE h.plan_id=p.id AND h.visitor=?1 AND h.key_hash=p.host_key_hash AND h.key_hash<>'') THEN 1 ELSE 0 END AS j_host,
     p.place<>'' AS j_place,
     (SELECT count(*) FROM guests g WHERE g.plan_id=p.id AND g.actor<>p.owner AND g.status IN ('in','maybe','invited','out')) AS j_others,
     (SELECT count(*) FROM guests g WHERE g.plan_id=p.id AND g.actor<>p.owner AND g.status='invited') AS j_noreply,
     (SELECT count(*) FROM guests g WHERE g.plan_id=p.id AND g.actor<>p.owner AND g.status='maybe') AS j_checking,
     (SELECT count(*) FROM guests g WHERE g.plan_id=p.id AND g.status='requested') AS j_requests,
     (SELECT count(*) FROM polls v WHERE v.plan_id=p.id AND v.decided_option IS NULL AND v.kind='date') AS j_date_votes,
     (SELECT count(*) FROM polls v WHERE v.plan_id=p.id AND v.decided_option IS NULL AND v.kind='place') AS j_place_votes
     FROM plans p WHERE p.owner=?1 OR EXISTS(SELECT 1 FROM host_access h WHERE h.plan_id=p.id AND h.visitor=?1 AND h.key_hash=p.host_key_hash AND h.key_hash<>'') OR p.id IN (SELECT g.plan_id FROM guests g WHERE (g.actor=?1 AND g.invite_required=0) OR g.id IN (SELECT a.guest_id FROM guest_access a WHERE a.visitor=?1 AND a.invite_hash=g.invite_hash AND g.invite_expires>strftime('%Y-%m-%dT%H:%M:%fZ','now'))) ORDER BY p.created DESC`).bind(actor).all();return json({plans:orderPlans((results as any[]).map(withJourney))});}

   if(req.method==='POST'){
    const b=await body();const title=str(b.title,100),name=str(b.name,60);if(!title||!name)return json({error:'Give the plan a title and tell us your name.'},400);
    {const e=themeError(b);if(e)return json({error:e},400)}
    if(b.coverImage!==undefined&&b.coverImage!==''&&!parsePhoto(b.coverImage,96000))return json({error:'Choose a JPEG, PNG or WebP cover. m.o shrinks it before upload.'},400);
    if(b.date&&Number.isNaN(Date.parse(b.date)))return json({error:'Choose a valid date.'},400);
    {const e=endError(str(b.date,40),str(b.endDate,40));if(e)return json({error:e},400)}
    if(b.inviteUrl&&!invitation(b.inviteUrl))return json({error:'Use a valid HTTPS invitation link.'},400);
    if(b.bookingUrl&&!https(b.bookingUrl))return json({error:'Use a valid HTTPS booking link.'},400);
    // Site-wide ceiling so scripted abuse can't run usage past the free tier; never limits RSVPs or existing plans.
    const today=await db.prepare('SELECT count(*) AS n FROM plans WHERE created>?').bind(new Date(Date.now()-86400000).toISOString()).first<any>();if((today?.n||0)>=dailyNewPlans())return json({error:'m.o has reached today’s limit for new plans. Please try again tomorrow.'},429);
    const recent=await db.prepare('SELECT count(*) AS n FROM plans WHERE owner=? AND created>?').bind(actor,new Date(Date.now()-86400000).toISOString()).first<any>();if((recent?.n||0)>=20)return json({error:'You’ve started a lot of plans today. Try again tomorrow.'},429);
    const id=crypto.randomUUID();const kind=b.kind==='trip'?'trip':'gathering';const taskList=Array.isArray(b.tasks)?b.tasks.slice(0,30):[];
    const statements=[db.prepare('INSERT INTO plans (id,owner,title,kind,date,place,budget,note,invite_url,created,details,booking_url,end_date,door_code,theme,accent,emoji,cover_image,cover_updated) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,actor,title,kind,str(b.date,40),str(b.place,160),str(b.budget,60),str(b.note,2000),invitation(b.inviteUrl),new Date().toISOString(),str(b.details,1000),https(b.bookingUrl),str(b.endDate,40),str(b.doorCode,200),b.theme||'company',b.accent||'butter',str(b.emoji,32),b.coverImage||'',b.coverImage?new Date().toISOString():''),db.prepare('INSERT INTO guests (plan_id,actor,name,status,note,id,invite_required) VALUES (?,?,?,?,?,?,1)').bind(id,actor,name,'in','',crypto.randomUUID())];
    for(const t of taskList){if(str(t?.title,160))statements.push(db.prepare('INSERT INTO tasks (id,plan_id,title,category,done) VALUES (?,?,?,?,0)').bind(crypto.randomUUID(),id,str(t.title,160),t.category==='bring'?'bring':'todo'));}
    await db.batch(statements);return json({id},201);
   }
  }

  if(seg[0]==='plan'&&seg[1]){
   const id=seg[1];const plan=await db.prepare('SELECT * FROM plans WHERE id=?').bind(id).first<any>();if(!plan)return json({error:'This plan could not be found. Check your invitation link.'},404);const host=plan.owner===visitor||!!await db.prepare("SELECT plan_id FROM host_access WHERE plan_id=? AND visitor=? AND key_hash=? AND key_hash<>''").bind(id,visitor,plan.host_key_hash).first();if(host)actor=plan.owner;
   if(!host){
    const grant=await db.prepare('SELECT g.actor FROM guest_access a JOIN guests g ON g.id=a.guest_id WHERE g.plan_id=? AND a.visitor=? AND a.invite_hash=g.invite_hash AND g.invite_hash<>? AND g.invite_expires>?').bind(id,visitor,'',new Date().toISOString()).first<any>();
    if(grant)actor=grant.actor;
    else{const existing=await db.prepare('SELECT invite_required FROM guests WHERE plan_id=? AND (actor=? OR id IN (SELECT guest_id FROM guest_access WHERE visitor=?))').bind(id,visitor,visitor).first<any>();if(existing?.invite_required){actor='unverified:'+visitor;if(req.method!=='GET'&&seg[4]!=='pick')return json({error:'Your access has expired or was revoked. Ask your host for a new personal link.'},403)}}
   }
   if(seg[2]==='cover'&&seg.length===3&&req.method==='GET'){const photo=parsePhoto(plan.cover_image,96000);return photo?new Response(photo.bytes.buffer as ArrayBuffer,{headers:{'Content-Type':photo.type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'"}}):new Response('Not found',{status:404})}
   const guest=async()=>await db.prepare("SELECT name,status FROM guests WHERE plan_id=? AND actor=? AND status<>'invited'").bind(id,actor).first<any>();
   // Host-only activity log: what changed, and whether the host noted it or the person confirmed it. Keeps the newest 200.
   const now=new Date().toISOString();
   const log=(text:string,byHost=host)=>[db.prepare('INSERT INTO activity (id,plan_id,at,text,by_host) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(),id,now,text.slice(0,300),byHost?1:0),db.prepare('DELETE FROM activity WHERE plan_id=? AND id NOT IN (SELECT id FROM activity WHERE plan_id=? ORDER BY at DESC LIMIT 200)').bind(id,id)];
   const answer=(status:string,count:number,names:string)=>(status==='in'?'going':status==='maybe'?'still checking':status==='out'?'can’t make it':'no reply yet')+(count?` (+${count}${names?' '+names:''})`:'');

   if(seg.length===2 && req.method==='GET'){
    const gs=await db.prepare('SELECT g.id,g.name,g.status,g.note,g.actor,g.extra_count,g.extra_names,g.extra_status,g.dietary,g.staying,g.source,g.updated,g.check_back,g.invite_required,g.details_approved,g.with_guest,length(g.invite_hash)>0 AS has_link,pr.handle,pr.mo,pr.interests,pr.habits,pr.avatar,pr.photo_updated FROM guests g LEFT JOIN profiles pr ON pr.actor=g.actor WHERE g.plan_id=? ORDER BY g.rowid').bind(id).all<any>();
    const ts=await db.prepare('SELECT * FROM tasks WHERE plan_id=? ORDER BY rowid').bind(id).all<any>();
    const ps=await db.prepare('SELECT * FROM polls WHERE plan_id=? ORDER BY created').bind(id).all<any>();
    const os=await db.prepare('SELECT o.id,o.poll_id,o.label FROM poll_options o JOIN polls p ON p.id=o.poll_id WHERE p.plan_id=? ORDER BY o.rowid').bind(id).all<any>();
    const vs=await db.prepare('SELECT v.option_id,v.actor,g.name FROM poll_votes v JOIN polls p ON p.id=v.poll_id LEFT JOIN guests g ON g.plan_id=p.plan_id AND g.actor=v.actor WHERE p.plan_id=?').bind(id).all<any>();
    const ss=await db.prepare("SELECT id,at,title,detail,url FROM stops WHERE plan_id=? ORDER BY CASE WHEN at='' THEN 1 ELSE 0 END,at,rowid").bind(id).all<any>();
    const acts=host?(await db.prepare('SELECT at,text,by_host FROM activity WHERE plan_id=? ORDER BY at DESC LIMIT 30').bind(id).all<any>()).results.map((a:any)=>({at:a.at,text:a.text,byHost:!!a.by_host})):[];
    const ms=await db.prepare('SELECT id,actor,name,kind,body,photo_url,created FROM memories WHERE plan_id=? ORDER BY created DESC').bind(id).all<any>();
    const {owner,details,door_code,host_key_hash,open_plus_ones,cover_image,cover_updated,...safe}=plan;
    safe.cover_url=cover_updated?`/api/plan/${id}/cover?v=${cover_updated}`:'';
    // Plus-ones: someone a guest asked to bring. Pending or declined ones stay off the guest list; only the host
    // and the guest who asked see them. Approved ones are regular guests shown "with <name>".
    const all=gs.results,nameOf=new Map(all.map((g:any)=>[g.id,g.name])),me0=all.find((g:any)=>g.actor===actor);
    const listed=all.filter((g:any)=>g.status!=='requested'&&g.status!=='declined');
    const plusOneRequests=host?all.filter((g:any)=>g.status==='requested').map((g:any)=>({id:g.id,name:g.name,withName:nameOf.get(g.with_guest)||'A guest'})):[];
    const myPlusOnes=me0&&!host?all.filter((g:any)=>g.with_guest&&g.with_guest===me0.id).map((g:any)=>({id:g.id,name:g.name,status:g.status,hasLink:!!g.has_link})):[];
    const plusOnesLeft=me0&&!host?Math.max(0,4-(me0.extra_count||0)-myPlusOnes.filter((x:any)=>x.status!=='declined').length):0;
    // Private details (address, arrival notes, itinerary) reach the organizer and people who said in or maybe.
    const mine=gs.results.find((g:any)=>g.actor===actor),insider=host||(!!mine&&['in','maybe'].includes(mine.status)&&!!mine.details_approved);
    const hidden=!insider&&!!(safe.place||safe.booking_url||details||ss.results.length);if(!insider){safe.place='';safe.booking_url=null}
    {const others=listed.filter((g:any)=>g.actor!==owner&&['in','maybe','invited','out'].includes(g.status)),open=ps.results.filter((v:any)=>!v.decided_option);
     safe.stage=stageOf({hasDate:!!plan.date,hasPlace:!!plan.place,madeIt:!!plan.made_it,others:others.length,noReply:others.filter((g:any)=>g.status==='invited').length,checking:others.filter((g:any)=>g.status==='maybe').length,openItems:ts.results.filter((t:any)=>!t.claimed_by).length,openDateVotes:open.filter((v:any)=>v.kind==='date').length,openPlaceVotes:open.filter((v:any)=>v.kind==='place').length,openOtherVotes:open.filter((v:any)=>v.kind!=='date'&&v.kind!=='place').length,requests:all.filter((g:any)=>g.status==='requested').length})}
    const polls=ps.results.map((p:any)=>({id:p.id,question:p.question,kind:p.kind,decided_option:p.decided_option,options:os.results.filter((o:any)=>o.poll_id===p.id).map((o:any)=>{const votes=vs.results.filter((v:any)=>v.option_id===o.id);return {id:o.id,label:o.label,votes:votes.length,voters:votes.map((v:any)=>v.name||'Someone'),mine:votes.some((v:any)=>v.actor===actor)}})}));
    return json({plan:safe,host,hasHostKey:host&&!!host_key_hash,activity:acts,organizer:gs.results.find((g:any)=>g.actor===owner)?.name||null,
     details:insider?details:'',...(host?{doorCode:door_code}:{}),hidden,
     // Dietary needs, sleepover requests and pending plus-ones are visible only to the organizer and the guest.
     openPlusOnes:!!open_plus_ones,plusOneRequests,myPlusOnes,plusOnesLeft,
     guests:listed.map(({actor:a,interests,habits,dietary,staying,check_back,extra_count,extra_names,extra_status,avatar,photo_updated,invite_required,details_approved,with_guest,has_link,...g}:any)=>{const own=a===actor,see=host||own,extra=see||extra_status==='approved';return {...g,withName:with_guest?nameOf.get(with_guest)||null:null,needsPersonalLink:!!invite_required,...(host?{inviteRequired:!!invite_required,detailsApproved:!!details_approved,hasLink:!!has_link}:{}),note:see?g.note:'',avatar:parseAvatar(avatar),photo:photo_updated?`/api/plan/${id}/guests/${g.id}/photo?v=${encodeURIComponent(photo_updated)}`:null,isHost:a===owner,interests:interests?parseInterests(interests):[],habits:habits?parseInterests(habits):[],isMe:own,extra_count:extra?extra_count:0,extra_names:extra?extra_names:'',extra_status:extra?extra_status:'',...(see?{dietary,staying:!!staying,check_back:check_back||''}:{})}}),
     tasks:ts.results.map(({claimed_by,...t}:any)=>({...t,isMine:claimed_by===actor})),
     polls,stops:insider?ss.results:[],
     memories:ms.results.map(({actor:a,...m}:any)=>({...m,isMine:a===actor}))});
   }
   const b=await body();

   if(seg[2]==='host-link'&&seg.length===3&&req.method==='POST'){
    if(!host)return json({error:'Only the host can make a host link.'},403);
    const key=newHostKey(),hash=await hashHostKey(key);await db.batch([db.prepare('UPDATE plans SET host_key_hash=? WHERE id=?').bind(hash,id),...(visitor!==plan.owner?[db.prepare('UPDATE host_access SET key_hash=? WHERE plan_id=? AND visitor=?').bind(hash,id,visitor)]:[]),...log(plan.host_key_hash?'You made a new host link. Other recovered devices stopped working.':'You made a host link.')]);
    return json({link:hostLink(url.origin,key),replaced:!!plan.host_key_hash});
   }
   if(seg.length===2&&req.method==='DELETE'){
    // Only the host can delete a plan. Everything in it goes: guests, items, votes, schedule, memories, updates.
    if(!host)return json({error:'Only the host can delete this plan.'},403);
    await db.batch([
     db.prepare('DELETE FROM poll_votes WHERE poll_id IN (SELECT id FROM polls WHERE plan_id=?)').bind(id),
     db.prepare('DELETE FROM poll_options WHERE poll_id IN (SELECT id FROM polls WHERE plan_id=?)').bind(id),
     db.prepare('DELETE FROM host_access WHERE plan_id=?').bind(id),
     db.prepare('DELETE FROM guest_access WHERE guest_id IN (SELECT id FROM guests WHERE plan_id=?)').bind(id),
     ...['polls','tasks','stops','memories','activity','guests'].map(t=>db.prepare(`DELETE FROM ${t} WHERE plan_id=?`).bind(id)),
     db.prepare('DELETE FROM plans WHERE id=?').bind(id)]);
    return json({ok:true});
   }
   if(seg.length===2&&req.method==='PATCH'){
    if(!host)return json({error:'Only the organizer can change the plan details.'},403);
    const m={...plan,inviteUrl:plan.invite_url,bookingUrl:plan.booking_url,endDate:plan.end_date,madeIt:!!plan.made_it,...b};if(typeof m.details!=='string')m.details=plan.details;
    {const e=themeError(b);if(e)return json({error:e},400)}
    if(b.coverImage!==undefined&&b.coverImage!==''&&!parsePhoto(b.coverImage,96000))return json({error:'Choose a JPEG, PNG or WebP cover. m.o shrinks it before upload.'},400);
    if(m.date&&Number.isNaN(Date.parse(m.date)))return json({error:'Choose a valid date.'},400);
    {const e=endError(str(m.date,40),str(m.endDate,40));if(e)return json({error:e},400)}
    if(m.inviteUrl&&!invitation(m.inviteUrl))return json({error:'Use a valid HTTPS invitation link.'},400);
    if(m.bookingUrl&&!https(m.bookingUrl))return json({error:'Use a valid HTTPS booking link.'},400);
    const title=str(m.title,100);if(!title)return json({error:'The plan needs a title.'},400);
    const next={cover_image:b.coverImage===undefined?plan.cover_image:b.coverImage,open_plus_ones:(b.openPlusOnes===undefined?!!plan.open_plus_ones:b.openPlusOnes===true)?1:0,theme:m.theme,accent:m.accent,emoji:str(m.emoji,32),kind:m.kind==='trip'?'trip':'gathering',booking_url:https(m.bookingUrl)||'',end_date:str(m.endDate,40),title,date:str(m.date,40),place:str(m.place,160),budget:str(m.budget,60),note:str(m.note,2000),details:str(m.details,1000)};
    const changed=([['cover_image','invite image'],['open_plus_ones','who can bring someone'],['kind','plan type'],['theme','invite theme'],['accent','background color'],['emoji','invite emoji'],['end_date','end date'],['booking_url','booking link'],['title','name'],['date','date and time'],['place','address'],['details','arrival notes'],['note','description'],['budget','budget']] as const).filter(([k])=>(plan[k]||'')!==(next[k]||'')).map(([,l])=>l);
    await db.batch([db.prepare('UPDATE plans SET open_plus_ones=?,kind=?,end_date=?,booking_url=?,title=?,date=?,place=?,budget=?,note=?,invite_url=?,made_it=?,details=?,door_code=?,theme=?,accent=?,emoji=?,cover_image=?,cover_updated=? WHERE id=?').bind(next.open_plus_ones,next.kind,next.end_date,next.booking_url||null,title,next.date,next.place,next.budget,next.note,invitation(m.inviteUrl),m.madeIt===true?1:0,next.details,b.doorCode===undefined?plan.door_code:str(b.doorCode,200),m.theme,m.accent,str(m.emoji,32),next.cover_image,b.coverImage===undefined?plan.cover_updated:next.cover_image?now:'',id),

     ...(changed.length?log('You changed the '+changed.join(', ')):[]),...(m.madeIt===true&&!plan.made_it?log('You marked the plan as made it out'):[])]);return json({ok:true});
   }
   // "Still checking": the guest says when to check back. Saved on their answer; the host sees it. m.o never messages anyone.
   if(seg[2]==='check-back'&&seg.length===3&&req.method==='POST'){
    const me=await db.prepare('SELECT name,status FROM guests WHERE plan_id=? AND actor=?').bind(id,actor).first<any>();
    if(!me||me.status!=='maybe')return json({error:'Choose “Still checking” first.'},400);
    const day=typeof b.date==='string'?b.date:'';
    if(day){if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||Number.isNaN(Date.parse(day+'T12:00:00Z')))return json({error:'Choose a valid day.'},400);
     const t=Date.parse(day+'T12:00:00Z');if(t<Date.now()-86400000||t>Date.now()+90*86400000)return json({error:'Choose a day in the next 3 months.'},400)}
    await db.batch([db.prepare('UPDATE guests SET check_back=? WHERE plan_id=? AND actor=?').bind(day,id,actor),...(day?log(`${me.name} will decide by ${new Date(day+'T12:00:00Z').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'})}`,false):[])]);
    return json({ok:true});
   }
   if(seg[2]==='rsvp'&&req.method==='POST'){
    const name=str(b.name,60);if(!name||!['in','maybe','out'].includes(b.status))return json({error:'Add your name and choose a response.'},400);
    const prev=await db.prepare('SELECT * FROM guests WHERE plan_id=? AND actor=?').bind(id,actor).first<any>();
    if(!prev){const n=await db.prepare('SELECT count(*) AS n FROM guests WHERE plan_id=?').bind(id).first<any>();if((n?.n||0)>=150)return json({error:'This plan is full. Ask the organizer.'},400)}
    // A status-only reply preserves private fields. Explicit fields in the full form may clear them.
    const saved={...prev,...b};
    const out=b.status==='out';const freed=out?(await db.prepare('SELECT title FROM tasks WHERE plan_id=? AND claimed_by=?').bind(id,actor).all<any>()).results.map((t:any)=>t.title):[];
    const brought=prev?(await db.prepare("SELECT count(*) AS n FROM guests WHERE plan_id=? AND with_guest=(SELECT id FROM guests WHERE plan_id=? AND actor=?) AND status<>'declined'").bind(id,id,actor).first<any>())?.n||0:0;
    const count=out?0:Math.max(0,Math.min(4-brought,Math.floor(Number(b.extraCount===undefined?prev?.extra_count:b.extraCount)||0))),names=count?str(b.extraNames===undefined?prev?.extra_names:b.extraNames,120):'';

    // Extra guests are a request until the organizer approves; changing the request asks again.
    const same=prev&&prev.extra_count===count&&prev.extra_names===names;
    const extraStatus=!count?'':host?'approved':same&&prev.extra_status?prev.extra_status:'requested';
    await db.batch([...(out?[db.prepare('UPDATE tasks SET claimed_by=NULL,claimed_name=NULL,done=0,claim_source=\'\' WHERE plan_id=? AND claimed_by=?').bind(id,actor)]:[]),
     db.prepare('INSERT INTO guests (plan_id,actor,name,status,note,id,extra_count,extra_names,extra_status,dietary,staying,source,updated) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(plan_id,actor) DO UPDATE SET name=excluded.name,status=excluded.status,note=excluded.note,extra_count=excluded.extra_count,extra_names=excluded.extra_names,extra_status=excluded.extra_status,dietary=excluded.dietary,staying=excluded.staying,source=excluded.source,updated=excluded.updated')
      .bind(id,actor,name,b.status,str(saved.note,300),crypto.randomUUID(),count,names,extraStatus,str(saved.dietary,200),!out&&(saved.staying===true||saved.staying===1)?1:0,'guest',now),
     db.prepare('UPDATE tasks SET claimed_name=? WHERE plan_id=? AND claimed_by=?').bind(name,id,actor),
     db.prepare("UPDATE guests SET check_back='' WHERE plan_id=? AND actor=? AND status<>'maybe'").bind(id,actor),
     ...(host?[]:log(`${name} confirmed: ${answer(b.status,count,names)}${freed.length?` · ${freed.join(', ')} open again`:''}`,false))]);
    return json({ok:true,freed});
   }

   if(seg[2]==='confirm'&&req.method==='POST'){
    // A guest confirms what the host noted for them: their answer and any items assigned to them.
    const me=await db.prepare('SELECT name,status,extra_count,extra_names FROM guests WHERE plan_id=? AND actor=?').bind(id,actor).first<any>();if(!me||me.status==='invited')return json({error:'Choose your answer first.'},400);
    const items=(await db.prepare("SELECT title FROM tasks WHERE plan_id=? AND claimed_by=? AND claim_source='host'").bind(id,actor).all<any>()).results.map((t:any)=>t.title);
    await db.batch([db.prepare("UPDATE guests SET source='guest',updated=? WHERE plan_id=? AND actor=?").bind(now,id,actor),db.prepare("UPDATE tasks SET claim_source='' WHERE plan_id=? AND claimed_by=?").bind(id,actor),
     ...log(`${me.name} confirmed: ${answer(me.status,me.extra_count,me.extra_names)}${items.length?` · bringing ${items.join(', ')}`:''}`,false)]);
    return json({ok:true});
   }

   // ---- Guest list: the organizer's invitees, picking your name, plus-one decisions, removal ----
   // ---- Plus-ones: a guest who answered asks to bring someone (counts toward their 4 extra spots). ----
   if(seg[2]==='plus-ones'){
    const me=await db.prepare("SELECT id,name,status,extra_count FROM guests WHERE plan_id=? AND actor=? AND status IN ('in','maybe')").bind(id,actor).first<any>();
    if(host)return json({error:'You’re the host: add them to your guest list instead.'},400);
    if(!me)return json({error:'Answer that you’re coming or checking first.'},403);
    if(seg.length===3&&req.method==='POST'){
     const name=cleanName(str(b.name,80));if(!name||!/\p{L}/u.test(name))return json({error:'Type their name.'},400);
     const mine=await db.prepare("SELECT count(*) AS n FROM guests WHERE plan_id=? AND with_guest=? AND status<>'declined'").bind(id,me.id).first<any>();
     if((me.extra_count||0)+(mine?.n||0)>=4)return json({error:'You can bring up to 4 people.'},400);
     const total=await db.prepare('SELECT count(*) AS n FROM guests WHERE plan_id=?').bind(id).first<any>();if((total?.n||0)>=150)return json({error:'This plan is full. Ask the host.'},400);
     if(await db.prepare('SELECT 1 FROM guests WHERE plan_id=? AND lower(name)=lower(?)').bind(id,name).first())return json({error:`${name} is already on the list. Use a last name or initial to tell them apart.`},409);
     const open=!!plan.open_plus_ones,gid=crypto.randomUUID();
     await db.batch([db.prepare("INSERT INTO guests (plan_id,actor,name,status,note,id,invite_required,details_approved,with_guest) VALUES (?,?,?,?,'',?,1,?,?)").bind(id,'invite:'+crypto.randomUUID(),name,open?'invited':'requested',gid,open?1:0,me.id),
      ...log(open?`${me.name} added ${name} (bringing them)`:`${me.name} asked to bring ${name}`,false)]);
     return json({ok:true,id:gid,status:open?'invited':'requested'},201);
    }
    if(seg.length===4&&req.method==='DELETE'){
     const row=await db.prepare("SELECT name,status FROM guests WHERE plan_id=? AND id=? AND with_guest=?").bind(id,str(seg[3],40),me.id).first<any>();
     if(!row)return json({error:'That request is no longer there.'},404);
     if(row.status!=='requested'&&row.status!=='declined')return json({error:'They’re already on the guest list. Ask the host to remove them.'},400);
     await db.batch([db.prepare('DELETE FROM guests WHERE plan_id=? AND id=?').bind(id,str(seg[3],40)),...(row.status==='requested'?log(`${me.name} withdrew the request to bring ${row.name}`,false):[])]);return json({ok:true});
    }
    return json({error:'Not found.'},404);
   }
   if(seg[2]==='guests'&&seg.length===3&&req.method==='POST'){
    if(!host)return json({error:'Only the organizer can add to the guest list.'},403);
    // Names only: phone numbers, emails and emoji are stripped before anything is stored.
    const names=[...new Set((Array.isArray(b.names)?b.names:[]).map((x:unknown)=>cleanName(str(x,200))).filter((n:string)=>/\p{L}/u.test(n)))].slice(0,50) as string[];
    if(!names.length)return json({error:'Add at least one name.'},400);
    const {results:existing}=await db.prepare('SELECT lower(name) AS n FROM guests WHERE plan_id=?').bind(id).all<any>();const have=new Set(existing.map((x:any)=>x.n));
    const fresh=names.filter(n=>{const k=n.toLowerCase();if(have.has(k))return false;have.add(k);return true});if(existing.length+fresh.length>150)return json({error:'A plan can have up to 150 people.'},400);
    // People the host adds by name are trusted with the address once they answer (the host can still hide it).
    if(fresh.length)await db.batch(fresh.map(n=>db.prepare('INSERT INTO guests (plan_id,actor,name,status,note,id,invite_required,details_approved) VALUES (?,?,?,?,?,?,1,1)').bind(id,'invite:'+crypto.randomUUID(),n,'invited','',crypto.randomUUID())));
    return json({ok:true,added:fresh.length,skipped:names.length-fresh.length});
   }
   if(seg[2]==='guests'&&seg[3]){
    const row=await db.prepare('SELECT * FROM guests WHERE plan_id=? AND id=?').bind(id,str(seg[3],40)).first<any>();if(!row)return json({error:'That person is no longer on the list.'},404);
    if(seg[4]==='photo'&&req.method==='GET'){
     // Anyone with the plan link can see guests' profile photos, like their names.
     const r=await db.prepare('SELECT photo FROM profiles WHERE actor=?').bind(row.actor).first<any>();return image(r?.photo);
    }
    if(seg[4]==='plus-one'&&req.method==='POST'){
     if(!host)return json({error:'Only the host can approve who comes.'},403);
     if(row.status!=='requested')return json({error:'That request was already answered.'},400);
     const ok=b.decision==='approved';if(!ok&&b.decision!=='declined')return json({error:'Approve or decline the request.'},400);
     const by=await db.prepare('SELECT name FROM guests WHERE plan_id=? AND id=?').bind(id,row.with_guest).first<any>();
     // Approving also shares arrival details with them once they say they're coming (the owner's choice).
     await db.batch([db.prepare('UPDATE guests SET status=?,details_approved=? WHERE plan_id=? AND id=?').bind(ok?'invited':'declined',ok?1:0,id,row.id),...log(`You ${ok?'approved':'declined'} ${by?.name||'a guest'} bringing ${row.name}`)]);
     return json({ok:true});
    }
    if(seg[4]==='invite'&&req.method==='POST'){
     // The guest who brought them may make their first personal link (never replace or revoke it: that stays with the host).
     const bringer=!host&&!!row.with_guest&&!b.revoke&&!row.invite_hash&&row.status==='invited'&&!!await db.prepare("SELECT 1 FROM guests WHERE plan_id=? AND id=? AND actor=? AND status IN ('in','maybe')").bind(id,row.with_guest,actor).first();
     if(row.status==='requested'||row.status==='declined')return json({error:'Approve the request first.'},400);
     if(!host&&!bringer)return json({error:row.with_guest&&row.invite_hash?'Their link is already made. Ask the host to send it again.':'Only the host can manage a guest’s personal link.'},403);
     if(row.actor===plan.owner)return json({error:'Only the host can manage a guest’s personal link.'},403);
     if(b.revoke){await db.batch([db.prepare("UPDATE guests SET invite_hash='',invite_expires='',invite_required=1,details_approved=0 WHERE plan_id=? AND id=?").bind(id,row.id),...log(`You revoked ${row.name}’s personal link`)]);return json({ok:true})}
     const secret=newInviteSecret(),hash=await inviteHash(secret),expires=inviteExpiry();
     // A replaced link keeps the host's choice about arrival details. A first link (or one after a revoke) for someone
     // the host added by name shares them once they answer; a plus-one keeps the approval they came with.
     const approved=row.invite_hash||row.with_guest?row.details_approved:1;
     await db.batch([db.prepare('UPDATE guests SET invite_hash=?,invite_expires=?,invite_required=1,details_approved=? WHERE plan_id=? AND id=?').bind(hash,expires,approved,id,row.id),...log(host?`You made a new personal link for ${row.name}`:`Personal link made for ${row.name}`,host)]);
     return json({link:`${url.origin}/i/${secret}`,expires});
    }
    if(seg[4]==='access'&&req.method==='POST'){
     if(!host||row.actor===plan.owner)return json({error:'Only the host can share arrival details.'},403);
     if(typeof b.approved!=='boolean')return json({error:'Choose whether to share arrival details.'},400);
     await db.batch([db.prepare('UPDATE guests SET details_approved=? WHERE plan_id=? AND id=?').bind(b.approved?1:0,id,row.id),...log(`You ${b.approved?'shared':'hid'} arrival details for ${row.name}`)]);return json({ok:true});
    }
    if(seg[4]==='pick'&&req.method==='POST'){
     if(row.actor===plan.owner)return json({error:'That’s the organizer. Use your own personal link.'},403);
     if(row.actor===actor&&(!row.invite_required||await db.prepare('SELECT guest_id FROM guest_access WHERE guest_id=? AND visitor=? AND invite_hash=?').bind(row.id,visitor,row.invite_hash).first()))return json({ok:true});
     const mine=await db.prepare('SELECT name FROM guests WHERE plan_id=? AND actor=?').bind(id,actor).first<any>();if(mine&&row.actor!==actor)return json({error:`This phone already answered as ${mine.name}. Use a separate browser for another person.`},409);
     if(INVITE_SECRET.test(b.token||'')&&row.invite_hash&&await inviteHash(b.token)===row.invite_hash&&row.invite_expires>now){
      const devices=await db.prepare('SELECT count(*) AS n FROM guest_access WHERE guest_id=? AND invite_hash=?').bind(row.id,row.invite_hash).first<any>();if((devices?.n||0)>=20)return json({error:'This link has been opened on many devices. Ask your host to replace it.'},429);
      // The first opening adopts an unclaimed invitation; later devices receive scoped grants.
      if(row.actor.startsWith('invite:'))await db.batch([
       db.prepare('UPDATE guests SET actor=? WHERE id=? AND actor=? AND invite_hash=?').bind(visitor,row.id,row.actor,row.invite_hash),
       db.prepare('UPDATE tasks SET claimed_by=? WHERE plan_id=? AND claimed_by=? AND EXISTS(SELECT 1 FROM guests WHERE id=? AND actor=?)').bind(visitor,id,row.actor,row.id,visitor),
       ...log(`${row.name} opened the invite`,false)]);
      const r=await db.prepare('INSERT INTO guest_access (guest_id,visitor,invite_hash) SELECT id,?,invite_hash FROM guests WHERE id=? AND invite_hash=? AND invite_expires>? ON CONFLICT(guest_id,visitor) DO UPDATE SET invite_hash=excluded.invite_hash').bind(visitor,row.id,row.invite_hash,now).run();
      if(!r.meta.changes)return json({error:'This personal link no longer works. Ask your host for a new one.'},403);
      return json({ok:true});
     }
     if(row.invite_required||row.status!=='invited')return json({error:'Use your personal invite link, or ask the host for a new one. Names alone cannot recover an answered spot.'},403);
     const r=await db.prepare("UPDATE guests SET actor=? WHERE plan_id=? AND id=? AND actor=? AND status='invited' AND invite_required=0").bind(actor,id,row.id,row.actor).run();
     if(!r.meta.changes)return json({error:'That invitation was already opened. Ask the host for a personal link.'},409);
     return json({ok:true});
    }
    if(seg[4]==='response'&&req.method==='POST'){
     // The host records what someone told them (by text, in person). Shown as "noted by host" until that person confirms.
     if(!host)return json({error:'Only the organizer can record someone’s answer.'},403);
     if(row.actor===plan.owner)return json({error:'Update your own RSVP from your answer card.'},400);
     if(!['in','maybe','out','invited'].includes(b.status))return json({error:'Choose going, checking, can’t make it, or no reply yet.'},400);
     const out=b.status==='out'||b.status==='invited',count=out?0:Math.max(0,Math.min(4,Math.floor(Number(b.extraCount)||0))),names=count?str(b.extraNames,120):'';
     const freed=b.status==='out'?(await db.prepare('SELECT title FROM tasks WHERE plan_id=? AND claimed_by=?').bind(id,row.actor).all<any>()).results.map((t:any)=>t.title):[];
     await db.batch([...(b.status==='out'?[db.prepare("UPDATE tasks SET claimed_by=NULL,claimed_name=NULL,done=0,claim_source='' WHERE plan_id=? AND claimed_by=?").bind(id,row.actor)]:[]),
      db.prepare("UPDATE guests SET status=?,extra_count=?,extra_names=?,extra_status=?,dietary=?,staying=?,note=?,source=?,updated=? WHERE plan_id=? AND id=?").bind(b.status,count,names,count?'approved':'',str(b.dietary,200),!out&&b.staying===true?1:0,str(b.note,300),b.status==='invited'?'':'host',now,id,row.id),
      ...log(`You noted ${row.name}: ${answer(b.status,count,names)}${freed.length?` · ${freed.join(', ')} open again`:''}`)]);
     return json({ok:true,freed});
    }
    if(seg[4]==='extra'&&req.method==='POST'){
     if(!host)return json({error:'Only the organizer can approve extra guests.'},403);
     if(!row.extra_count)return json({error:'There’s no request to answer.'},400);
     const decision=b.decision==='approved'?'approved':b.decision==='declined'?'declined':'';if(!decision)return json({error:'Approve or decline the request.'},400);
     await db.batch([db.prepare('UPDATE guests SET extra_status=? WHERE plan_id=? AND id=?').bind(decision,id,row.id),...log(`You ${decision} ${row.name}’s extra guest request`)]);return json({ok:true});
    }
    if(seg.length===4&&req.method==='DELETE'){
     if(!host)return json({error:'Only the organizer can remove someone.'},403);
     if(row.actor===plan.owner)return json({error:'You can’t remove the organizer.'},400);
     await db.batch([db.prepare('UPDATE tasks SET claimed_by=NULL,claimed_name=NULL,done=0,claim_source=\'\' WHERE plan_id=? AND claimed_by=?').bind(id,row.actor),db.prepare('DELETE FROM poll_votes WHERE actor=? AND poll_id IN (SELECT id FROM polls WHERE plan_id=?)').bind(row.actor,id),db.prepare('DELETE FROM guest_access WHERE guest_id=?').bind(row.id),db.prepare('DELETE FROM guests WHERE plan_id=? AND id=?').bind(id,row.id),...log(`You removed ${row.name}`)]);
     return json({ok:true});
    }
   }
   if(seg[2]==='tasks'&&seg.length===3&&req.method==='POST'){
    const title=str(b.title,160);if(!title)return json({error:'Add something to coordinate.'},400);
    if(!host&&!await guest())return json({error:'RSVP before adding to the plan.'},403);
    const n=await db.prepare('SELECT count(*) AS n FROM tasks WHERE plan_id=?').bind(id).first<any>();if((n?.n||0)>=100)return json({error:'This plan has plenty to do already.'},400);
    await db.prepare('INSERT INTO tasks (id,plan_id,title,category,done) VALUES (?,?,?,?,0)').bind(crypto.randomUUID(),id,title,b.category==='bring'?'bring':'todo').run();return json({ok:true});
   }
   if(seg[2]==='tasks'&&seg[3]&&seg.length===4&&req.method==='DELETE'){
    // Only the host removes an item (added by mistake, or not needed any more).
    if(!host)return json({error:'Only the organizer can remove items.'},403);
    const task=await db.prepare('SELECT title,claimed_name FROM tasks WHERE id=? AND plan_id=?').bind(seg[3],id).first<any>();if(!task)return json({error:'That item no longer exists.'},404);
    await db.batch([db.prepare('DELETE FROM tasks WHERE id=? AND plan_id=?').bind(seg[3],id),...log(`You removed ${task.title}${task.claimed_name?` (${task.claimed_name} had it)`:''}`)]);
    return json({ok:true});
   }
   if(seg[2]==='tasks'&&seg[3]&&req.method==='PATCH'){
    const task=await db.prepare('SELECT * FROM tasks WHERE id=? AND plan_id=?').bind(seg[3],id).first<any>();if(!task)return json({error:'That item no longer exists.'},404);
    const g=await guest(),who=g?.name||'Someone';
    if(b.action==='claim'){
     if(!g||!['in','maybe'].includes(g.status))return json({error:'RSVP as in or maybe before claiming an item.'},400);
     const r=await db.prepare("UPDATE tasks SET claimed_by=?,claimed_name=?,claim_source='' WHERE id=? AND claimed_by IS NULL").bind(actor,g.name,task.id).run();if(!r.meta.changes)return json({error:'Someone just claimed that item. Refresh and choose another.'},409);
     if(!host)await db.batch(log(`${g.name} is bringing ${task.title}`,false));
    }else if(b.action==='assign'){
     // The host notes that someone told them they'll bring this. Labelled "noted by host" until that person confirms.
     if(!host)return json({error:'Only the organizer can note who’s bringing something.'},403);
     const row=await db.prepare('SELECT actor,name,status FROM guests WHERE plan_id=? AND id=?').bind(id,str(b.guestId,40)).first<any>();if(!row)return json({error:'Choose someone on the guest list.'},400);
     if(row.status==='out')return json({error:`${row.name} can’t make it. Update their answer first.`},400);
     const self=row.actor===actor;
     const r=await db.prepare('UPDATE tasks SET claimed_by=?,claimed_name=?,claim_source=? WHERE id=? AND claimed_by IS NULL').bind(row.actor,row.name,self?'':'host',task.id).run();if(!r.meta.changes)return json({error:'Someone already has that item. Release it first.'},409);
     await db.batch(log(self?`You’re bringing ${task.title}`:`You noted ${row.name} is bringing ${task.title}`));
    }else if(b.action==='confirm'){
     if(task.claimed_by!==actor)return json({error:'Only the person bringing this can confirm it.'},403);
     await db.batch([db.prepare("UPDATE tasks SET claim_source='' WHERE id=?").bind(task.id),...log(`${who} confirmed they’re bringing ${task.title}`,false)]);
    }else if(b.action==='release'){
     if(task.claimed_by!==actor&&!host)return json({error:'Only the person responsible or organizer can release this item.'},403);
     await db.batch([db.prepare("UPDATE tasks SET claimed_by=NULL,claimed_name=NULL,done=0,claim_source='' WHERE id=?").bind(task.id),...log(task.claimed_by===actor?`${host?'You':who} let go of ${task.title}`:`You released ${task.title} from ${task.claimed_name||'someone'}`,task.claimed_by!==actor||host)]);
    }else if(b.action==='rename'){
     // Only the host fixes an item's wording (a typo, or the wrong thing). Whoever is bringing it keeps it.
     if(!host)return json({error:'Only the organizer can change items.'},403);
     const title=str(b.title,160);if(!title)return json({error:'Type what the item should say.'},400);
     if(title!==task.title)await db.batch([db.prepare('UPDATE tasks SET title=? WHERE id=?').bind(title,task.id),...log(`You changed ${task.title} to ${title}`)]);
    }else if(b.action==='done'){
     if(task.claimed_by!==actor&&!host)return json({error:'Only the person responsible or organizer can update this item.'},403);
     await db.batch([db.prepare('UPDATE tasks SET done=? WHERE id=?').bind(task.done?0:1,task.id),...log(`${task.title} marked ${task.done?'not done':'done'}${host?'':' by '+who}`)]);
    }else return json({error:'Unknown action.'},400);
    return json({ok:true});
   }

   // ---- Group decisions ----
   if(seg[2]==='polls'&&seg.length===3&&req.method==='POST'){
    if(!host)return json({error:'Only the organizer can start a group decision.'},403);
    const question=str(b.question,120),kind=['date','place','choice'].includes(b.kind)?b.kind:'choice';
    const options=[...new Set((Array.isArray(b.options)?b.options:[]).map((o:unknown)=>str(o,120)).filter(Boolean))].slice(0,8) as string[];
    if(!question||options.length<2)return json({error:'Ask a question and give at least two options.'},400);
    if(kind==='date'&&options.some(o=>Number.isNaN(Date.parse(o))))return json({error:'Each date option needs a valid date.'},400);
    const count=await db.prepare('SELECT count(*) AS n FROM polls WHERE plan_id=?').bind(id).first<any>();if((count?.n||0)>=10)return json({error:'This plan already has ten decisions. Lock some in first.'},400);
    const pid=crypto.randomUUID();
    await db.batch([db.prepare('INSERT INTO polls (id,plan_id,question,kind,decided_option,created) VALUES (?,?,?,?,NULL,?)').bind(pid,id,question,kind,new Date().toISOString()),...options.map(o=>db.prepare('INSERT INTO poll_options (id,poll_id,label,added_by) VALUES (?,?,?,?)').bind(crypto.randomUUID(),pid,o,actor))]);
    return json({id:pid},201);
   }
   if(seg[2]==='polls'&&seg[3]){
    const poll=await db.prepare('SELECT * FROM polls WHERE id=? AND plan_id=?').bind(seg[3],id).first<any>();if(!poll)return json({error:'That decision no longer exists.'},404);
    if(seg.length===4&&req.method==='DELETE'){
     if(!host)return json({error:'Only the organizer can remove a decision.'},403);
     await db.batch([db.prepare('DELETE FROM poll_votes WHERE poll_id=?').bind(poll.id),db.prepare('DELETE FROM poll_options WHERE poll_id=?').bind(poll.id),db.prepare('DELETE FROM polls WHERE id=?').bind(poll.id)]);return json({ok:true});
    }
    if(seg[4]==='options'&&req.method==='POST'){
     if(!host&&!await guest())return json({error:'RSVP before suggesting an option.'},403);
     if(poll.decided_option)return json({error:'This decision is locked in.'},400);
     const label=str(b.label,120);if(!label)return json({error:'Add a suggestion.'},400);
     if(poll.kind==='date'&&Number.isNaN(Date.parse(label)))return json({error:'Suggest a valid date.'},400);
     const n=await db.prepare('SELECT count(*) AS n FROM poll_options WHERE poll_id=?').bind(poll.id).first<any>();if((n?.n||0)>=12)return json({error:'That decision has plenty of options already.'},400);
     const dupe=await db.prepare('SELECT id FROM poll_options WHERE poll_id=? AND lower(label)=lower(?)').bind(poll.id,label).first();if(dupe)return json({error:'That option is already on the list.'},409);
     await db.prepare('INSERT INTO poll_options (id,poll_id,label,added_by) VALUES (?,?,?,?)').bind(crypto.randomUUID(),poll.id,label,actor).run();return json({ok:true});
    }
    if(seg[4]==='vote'&&req.method==='POST'){
     if(!host&&!await guest())return json({error:'RSVP before voting.'},403);
     if(poll.decided_option)return json({error:'This decision is locked in.'},400);
     const option=await db.prepare('SELECT id FROM poll_options WHERE id=? AND poll_id=?').bind(str(b.optionId,40),poll.id).first<any>();if(!option)return json({error:'Choose one of the options.'},400);
     const had=await db.prepare('SELECT actor FROM poll_votes WHERE option_id=? AND actor=?').bind(option.id,actor).first();
     await (had?db.prepare('DELETE FROM poll_votes WHERE option_id=? AND actor=?').bind(option.id,actor):db.prepare('INSERT INTO poll_votes (option_id,poll_id,actor) VALUES (?,?,?)').bind(option.id,poll.id,actor)).run();
     return json({ok:true,voted:!had});
    }
    if(seg[4]==='decide'&&req.method==='POST'){
     if(!host)return json({error:'Only the organizer can lock in a decision.'},403);
     if(b.optionId===null){await db.prepare('UPDATE polls SET decided_option=NULL WHERE id=?').bind(poll.id).run();return json({ok:true})}
     const option=await db.prepare('SELECT id,label FROM poll_options WHERE id=? AND poll_id=?').bind(str(b.optionId,40),poll.id).first<any>();if(!option)return json({error:'Choose one of the options.'},400);
     const statements=[db.prepare('UPDATE polls SET decided_option=? WHERE id=?').bind(option.id,poll.id)];
     if(poll.kind==='date'){const start=new Date(option.label).toISOString(),error=endError(start,plan.end_date);if(error)return json({error:error+' Edit the trip’s end date before choosing this start.'},400);statements.push(db.prepare('UPDATE plans SET date=? WHERE id=?').bind(start,id))}
     if(poll.kind==='place')statements.push(db.prepare('UPDATE plans SET place=? WHERE id=?').bind(str(option.label,160),id));
     await db.batch(statements);return json({ok:true});
    }
   }

   // ---- Live plan: itinerary & key links ----
   if(seg[2]==='stops'&&seg.length===3&&req.method==='POST'){
    if(!host)return json({error:'Only the organizer can change the itinerary.'},403);
    const title=str(b.title,120);if(!title)return json({error:'Give this stop a name.'},400);
    if(b.at&&Number.isNaN(Date.parse(b.at)))return json({error:'Choose a valid time.'},400);
    if(b.url&&!https(b.url))return json({error:'Links need to start with https://'},400);
    const n=await db.prepare('SELECT count(*) AS n FROM stops WHERE plan_id=?').bind(id).first<any>();if((n?.n||0)>=40)return json({error:'The itinerary is full.'},400);
    await db.prepare('INSERT INTO stops (id,plan_id,at,title,detail,url) VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(),id,b.at?new Date(b.at).toISOString():'',title,str(b.detail,300),https(b.url)).run();return json({ok:true},201);
   }
   if(seg[2]==='stops'&&seg[3]&&req.method==='DELETE'){
    if(!host)return json({error:'Only the organizer can change the itinerary.'},403);
    await db.prepare('DELETE FROM stops WHERE id=? AND plan_id=?').bind(seg[3],id).run();return json({ok:true});
   }

   // ---- Replay: memories & shout-outs ----
   if(seg[2]==='memories'&&seg.length===3&&req.method==='POST'){
    const g=await guest();if(!host&&(!g||g.status!=='in'))return json({error:'Only people who made it out can add to the replay.'},403);
    const text=str(b.body,500);if(!text)return json({error:'Write something worth remembering.'},400);
    if(b.photoUrl&&!https(b.photoUrl))return json({error:'Photo links need to start with https://'},400);
    const n=await db.prepare('SELECT count(*) AS n FROM memories WHERE plan_id=?').bind(id).first<any>();if((n?.n||0)>=200)return json({error:'This replay is full.'},400);
    await db.prepare('INSERT INTO memories (id,plan_id,actor,name,kind,body,photo_url,created) VALUES (?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),id,actor,g?.name||'The organizer',b.kind==='shoutout'?'shoutout':'memory',text,https(b.photoUrl),new Date().toISOString()).run();return json({ok:true},201);
   }
   if(seg[2]==='memories'&&seg[3]&&req.method==='DELETE'){
    const m=await db.prepare('SELECT actor FROM memories WHERE id=? AND plan_id=?').bind(seg[3],id).first<any>();if(!m)return json({error:'That memory no longer exists.'},404);
    if(m.actor!==actor&&!host)return json({error:'Only the author or organizer can remove this.'},403);
    await db.prepare('DELETE FROM memories WHERE id=?').bind(seg[3]).run();return json({ok:true});
   }
  }
  return json({error:'Not found'},404);
 }catch(e){console.error('mo API request failed',e);await recordError(req);return json({error:'We could not save that. Please try again.'},500)}
}
export const GET=handler;export const POST=handler;export const PATCH=handler;export const PUT=handler;export const DELETE=handler;
