import {env} from 'cloudflare:workers';
import {blankBoard,pollOpen,counts} from '../../../lib/group-board.mts';
import {forGuest} from '../../../lib/concierge.mts';
export const dynamic='force-dynamic';
async function tokenHash(s:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(b=>b.toString(16).padStart(2,'0')).join('')}

function invitation(v:unknown){const s=str(v,1000);if(!s)return null;try{const u=new URL(s);return u.protocol==='https:'?u.href:null}catch{return null}}
function str(v:unknown,max=300){return typeof v==='string'?v.trim().slice(0,max):''}
async function handler(req:Request){
 const cookies=req.headers.get('cookie')||''; let session=cookies.match(/(?:^|; )mo_session=([a-f0-9-]{36})(?:;|$)/)?.[1]; const fresh=!session;session ||=crypto.randomUUID();
 const identity=req.headers.get('oai-authenticated-user-id');
 const actor=identity||session;
 const json=(obj:unknown,status=200)=>new Response(JSON.stringify(obj),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Referrer-Policy':'no-referrer',...(fresh?{'Set-Cookie':`mo_session=${session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`}:{})}});
 try{
  const url=new URL(req.url); const seg=url.pathname.split('/').filter(Boolean).slice(1);const db=env.DB;
  if(req.method!=='GET' && req.headers.get('origin')!==url.origin)return json({error:'Please submit from this site.'},403);
  if(!db)return json({error:'The shared database is not connected yet.'},503);
  if(req.headers.get('content-length') && Number(req.headers.get('content-length'))>110000)return json({error:'That request is too large.'},413);
  if(seg[0]==='reply-link'&&req.method==='POST'){
   const identity=req.headers.get('oai-authenticated-user-id');if(!identity)return json({error:'Sign in first.'},401);
   const b=await req.json() as any;const row=await db.prepare('SELECT data FROM host_desks WHERE owner=?').bind(identity).first<any>();
   if(!row||!JSON.parse(row.data).guests.some((g:any)=>g.id===b.guestId))return json({error:'Save this guest in your desk first.'},400);
   if(b.revoke){await db.prepare('DELETE FROM reply_links WHERE owner=? AND guest_id=?').bind(identity,b.guestId).run();return json({ok:true})}
   const token=crypto.randomUUID()+crypto.randomUUID();
   await db.batch([db.prepare('DELETE FROM reply_links WHERE owner=? AND guest_id=?').bind(identity,b.guestId),db.prepare('INSERT INTO reply_links (hash,owner,guest_id,created) VALUES (?,?,?,?)').bind(await tokenHash(token),identity,b.guestId,new Date().toISOString())]);
   return json({path:'/reply#'+token});
  }
  if(seg[0]==='guest-reply'&&req.method==='POST'){
   const b=await req.json() as any;const token=str(b.token,100);
   if(!/^[a-f0-9-]{72}$/.test(token))return json({error:'This reply link is invalid.'},404);
   const link=await db.prepare('SELECT owner,guest_id FROM reply_links WHERE hash=? AND created>?').bind(await tokenHash(token),new Date(Date.now()-30*86400000).toISOString()).first<any>();
   if(!link)return json({error:'This reply link has expired or was replaced.'},404);
   for(let attempt=0;attempt<3;attempt++){
    const row=await db.prepare('SELECT data,version FROM host_desks WHERE owner=?').bind(link.owner).first<any>();if(!row)return json({error:'Event not found.'},404);
    const data=JSON.parse(row.data);const g=data.guests.find((x:any)=>x.id===link.guest_id);if(!g)return json({error:'This invitation is no longer available.'},404);
    const board=data.board||blankBoard();
    if(b.action==='coordinate'){
     const poll=board.polls.find((p:any)=>p.id===b.pollId);
     if(b.pollId){if(!poll||!pollOpen(poll)||!Number.isInteger(b.option)||b.option<0||b.option>=poll.options.length)return json({error:'This poll is closed or the option is invalid.'},400);poll.votes[g.id]=b.option;}
     else if(b.errandId){const errand=board.errands.find((e:any)=>e.id===b.errandId);if(!errand||g.rsvp!=='Confirmed'||(errand.guestId&&errand.guestId!==g.id))return json({error:'This errand is unavailable. Confirm attendance and reload.'},409);if(b.release){errand.guestId='';errand.confirmed=false;errand.done=false}else{errand.guestId=g.id;errand.confirmed=true;}}
     else return json({error:'Choose a poll or errand.'},400);
     data.board=board;const result=await db.prepare('UPDATE host_desks SET data=?,version=version+1,updated=? WHERE owner=? AND version=? AND EXISTS (SELECT 1 FROM reply_links WHERE hash=? AND owner=? AND guest_id=?)').bind(JSON.stringify(data),new Date().toISOString(),link.owner,row.version,await tokenHash(token),link.owner,link.guest_id).run();if(result.meta.changes)return json({ok:true});continue;
    }
    const tools=data.tools||{needs:[],roles:[],blocks:[]};
    if(b.action==='read')return json({polls:board.polls.map((p:any)=>({id:p.id,question:p.question,options:p.options,counts:counts(p),open:pollOpen(p),mine:p.votes[g.id]??null,decision:p.decision})),errands:board.errands.filter((e:any)=>!e.done&&(!e.guestId||e.guestId===g.id)).map((e:any)=>({id:e.id,title:e.title,store:e.store,area:e.area,by:e.by,mine:e.guestId===g.id})),...forGuest(data.concierge,g.id,g.rsvp==='Confirmed'),title:data.title,when:data.when,place:data.place,guest:{name:g.name,rsvp:g.rsvp,dish:g.dish,serves:g.serves,food:g.food,diet:g.diet||'',arrival:g.arrival||'',kitchen:g.kitchen||'',plus:g.plus,plusNames:g.plusNames,transport:g.transport||'Own ride',pickupArea:g.pickupArea||'',rideTime:g.rideTime||'',rideSeats:g.rideSeats||0,suggestion:g.suggestion||'',music:g.music||''},needs:tools.needs.filter((n:any)=>!data.guests.some((x:any)=>x.id!==g.id&&x.rsvp!=='Declined'&&x.dish?.trim().toLowerCase()===n.title.trim().toLowerCase())),roles:tools.roles.filter((r:any)=>!r.guestId||r.guestId===g.id).map((r:any)=>({id:r.id,title:r.title,mine:r.guestId===g.id,confirmed:r.confirmed}))});
    if(b.action!=='save')return json({error:'Unknown reply action.'},400);
    if(!['Confirmed','Maybe','Declined'].includes(b.rsvp))return json({error:'Choose whether you can attend.'},400);
    const dish=str(b.dish,160);if(dish!==g.dish&&dish&&data.guests.some((x:any)=>x.id!==g.id&&x.rsvp!=='Declined'&&x.dish?.trim().toLowerCase()===dish.toLowerCase()))return json({error:'Someone has just chosen that contribution. Choose another or ask your host about bringing more.'},409);
    if(data.ops&&(g.dish!==dish||g.diet!==str(b.diet,500)))data.ops.dietChecks={};
    g.rsvp=b.rsvp;g.dish=dish;g.serves=str(b.serves,60);g.diet=str(b.diet,500);g.arrival=str(b.arrival,60);g.kitchen=str(b.kitchen,300);g.food=b.reconfirm&&dish&&b.rsvp==='Confirmed'?'Reconfirmed':'Offered';g.respondedAt=new Date().toISOString();if(typeof b.suggestion==='string')g.suggestion=str(b.suggestion,500);if(typeof b.music==='string')g.music=str(b.music,300);if(['Own ride','Need a ride','Can drive'].includes(b.transport)){g.transport=b.transport;g.pickupArea=str(b.pickupArea,100);g.rideTime=str(b.rideTime,100);g.rideSeats=Number.isInteger(b.rideSeats)&&b.rideSeats>=0&&b.rideSeats<=8?b.rideSeats:0;}if(b.rsvp==='Declined'){if(data.ops){for(const s of data.ops.supplies||[]){if(s.guestId===g.id)s.confirmed=false}for(const c of data.ops.contingencies||[]){if(c.person===g.id)c.ready=false}}for(const e of board.errands){if(e.guestId===g.id){e.guestId='';e.confirmed=false;e.done=false}}for(const r of board.rides){if(r.driver===g.id||r.passengers.includes(g.id))r.confirmed=false}data.board=board;}
    const plusNames=str(b.plusNames,100);if(g.plus!=='Approved'||plusNames!==g.plusNames)g.plus=plusNames?'Requested':'None';g.plusNames=plusNames;
    const ids=Array.isArray(b.roles)?b.roles.slice(0,20):[];
    if(b.rsvp==='Confirmed'&&ids.some((id:any)=>!tools.roles.some((r:any)=>r.id===id&&(!r.guestId||r.guestId===g.id))))return json({error:'A helper role is no longer available. Reload to see current openings.'},409);
    for(const role of tools.roles){if(ids.includes(role.id)&&(!role.guestId||role.guestId===g.id)&&b.rsvp==='Confirmed'){role.guestId=g.id;role.confirmed=true}else if(role.guestId===g.id){role.guestId='';role.confirmed=false}}
    const result=await db.prepare('UPDATE host_desks SET data=?,version=version+1,updated=? WHERE owner=? AND version=? AND EXISTS (SELECT 1 FROM reply_links WHERE hash=? AND owner=? AND guest_id=?)').bind(JSON.stringify(data),new Date().toISOString(),link.owner,row.version,await tokenHash(token),link.owner,link.guest_id).run();
    if(result.meta.changes)return json({ok:true});
   }return json({error:'The plan is busy. Please try saving again.'},409);
  }
  if(seg[0]==='host-desk'&&seg.length===1){
   const identity=req.headers.get('oai-authenticated-user-id');
   if(!identity)return json({error:'Sign in to use your private host desk.'},401);
   if(req.method==='GET'){
    const row=await db.prepare('SELECT data,version,updated FROM host_desks WHERE owner=?').bind(identity).first<any>();
    return json(row?{data:JSON.parse(row.data),version:row.version,updated:row.updated,draftKey:await tokenHash(identity)}:{data:null,version:0,draftKey:await tokenHash(identity)});
   }
   if(req.method==='POST'){
    const raw=await req.text();if(raw.length>100000)return json({error:'This desk is too large to save.'},413);
    const b=JSON.parse(raw);if(!b.data||typeof b.data!=='object'||!Array.isArray(b.data.guests)||b.data.guests.length>250||typeof b.data.title!=='string'||!Number.isInteger(b.version)||b.version<0)return json({error:'Invalid host desk.'},400);
    const data=JSON.stringify(b.data),updated=new Date().toISOString();
    const result=b.version===0?await db.prepare('INSERT INTO host_desks (owner,data,version,updated) VALUES (?,?,1,?) ON CONFLICT(owner) DO NOTHING').bind(identity,data,updated).run():await db.prepare('UPDATE host_desks SET data=?,version=version+1,updated=? WHERE owner=? AND version=?').bind(data,updated,identity,b.version).run();
    if(!result.meta.changes)return json({error:'This desk changed in another tab. Reload before editing to avoid overwriting it.'},409);
    return json({version:b.version+1,updated});
   }
  }
  if((seg[0]==='plans'||seg[0]==='plan')&&!identity)return json({error:'Sign in to access private plans.'},401);
  if(seg[0]==='plans'&&seg.length===1){
   if(req.method==='GET'){const {results}=await db.prepare('SELECT p.id,p.title,p.kind,p.date,p.place,p.budget,p.note,p.invite_url,p.created,(SELECT count(*) FROM guests g WHERE g.plan_id=p.id AND g.status=?) AS going FROM plans p WHERE p.owner=? OR p.id IN (SELECT plan_id FROM guests WHERE actor=?) ORDER BY p.created DESC').bind('in',actor,actor).all();return json({plans:results});}
   if(req.method==='POST'){
    const b=await req.json() as any;const title=str(b.title,100),name=str(b.name,60);if(!title||!name)return json({error:'Give the plan a title and tell us your name.'},400);
    if(b.date&&Number.isNaN(Date.parse(b.date)))return json({error:'Choose a valid date.'},400);
    if(b.inviteUrl&&!invitation(b.inviteUrl))return json({error:'Use a valid HTTPS invitation link.'},400);
    const id=crypto.randomUUID();const kind=b.kind==='trip'?'trip':'gathering';const taskList=Array.isArray(b.tasks)?b.tasks.slice(0,30):[];
    const statements=[db.prepare('INSERT INTO plans (id,owner,title,kind,date,place,budget,note,invite_url,created) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(id,actor,title,kind,str(b.date,40),str(b.place,160),str(b.budget,60),str(b.note,2000),invitation(b.inviteUrl),new Date().toISOString()),db.prepare('INSERT INTO guests (plan_id,actor,name,status,note) VALUES (?,?,?,?,?)').bind(id,actor,name,'in','')];
    for(const t of taskList){if(str(t.title,160))statements.push(db.prepare('INSERT INTO tasks (id,plan_id,title,category,done) VALUES (?,?,?,?,0)').bind(crypto.randomUUID(),id,str(t.title,160),t.category==='bring'?'bring':'todo'));}
    await db.batch(statements);return json({id},201);
   }
  }
  if(seg[0]==='plan'&&seg[1]){
   const id=seg[1];const plan=await db.prepare('SELECT * FROM plans WHERE id=?').bind(id).first<any>();if(!plan)return json({error:'This plan could not be found. Check your invitation link.'},404);const host=plan.owner===actor;
   if(!host&&!await db.prepare('SELECT actor FROM guests WHERE plan_id=? AND actor=?').bind(id,actor).first())return json({error:'This private plan is not available to you. Ask the host for your personal reply link.'},403);
   if(seg.length===2 && req.method==='GET'){
    const gs=await db.prepare('SELECT name,status,note,actor FROM guests WHERE plan_id=? ORDER BY rowid').bind(id).all<any>();const ts=await db.prepare('SELECT * FROM tasks WHERE plan_id=? ORDER BY rowid').bind(id).all<any>();
    const {owner,...safe}=plan;
    return json({plan:safe,host,guests:gs.results.map(({actor:a,...g}:any)=>({...g,note:host||a===actor?g.note:'',isMe:a===actor})),tasks:ts.results.map(({claimed_by,...t}:any)=>({...t,isMine:claimed_by===actor}))});
   }
   let b=req.method==='GET'?{}:await req.json() as any;
   if(seg.length===2&&req.method==='PATCH'){
    if(!host)return json({error:'Only the organizer can change the plan details.'},403);
    b={...plan,inviteUrl:plan.invite_url,...b};
    if(b.date&&Number.isNaN(Date.parse(b.date)))return json({error:'Choose a valid date.'},400);
    if(b.inviteUrl&&!invitation(b.inviteUrl))return json({error:'Use a valid HTTPS invitation link.'},400);
    const title=str(b.title,100);if(!title)return json({error:'The plan needs a title.'},400);
    await db.prepare('UPDATE plans SET title=?,date=?,place=?,budget=?,note=?,invite_url=? WHERE id=?').bind(title,str(b.date,40),str(b.place,160),str(b.budget,60),str(b.note,2000),invitation(b.inviteUrl),id).run();return json({ok:true});
   }
   if(seg[2]==='rsvp'&&req.method==='POST'){
    const name=str(b.name,60);if(!name||!['in','maybe','out'].includes(b.status))return json({error:'Add your name and choose a response.'},400);
    await db.batch([...(b.status==='out'?[db.prepare('UPDATE tasks SET claimed_by=NULL,claimed_name=NULL,done=0 WHERE plan_id=? AND claimed_by=?').bind(id,actor)]:[]),db.prepare('INSERT INTO guests (plan_id,actor,name,status,note) VALUES (?,?,?,?,?) ON CONFLICT(plan_id,actor) DO UPDATE SET name=excluded.name,status=excluded.status,note=excluded.note').bind(id,actor,name,b.status,str(b.note,300)),db.prepare('UPDATE tasks SET claimed_name=? WHERE plan_id=? AND claimed_by=?').bind(name,id,actor)]);return json({ok:true});
   }
   if(seg[2]==='tasks'&&seg.length===3&&req.method==='POST'){
    const title=str(b.title,160);if(!title)return json({error:'Add something to coordinate.'},400);
    const member=host||await db.prepare('SELECT actor FROM guests WHERE plan_id=? AND actor=?').bind(id,actor).first();if(!member)return json({error:'RSVP before adding to the plan.'},403);
    await db.prepare('INSERT INTO tasks (id,plan_id,title,category,done) VALUES (?,?,?,?,0)').bind(crypto.randomUUID(),id,title,b.category==='bring'?'bring':'todo').run();return json({ok:true});
   }
   if(seg[2]==='tasks'&&seg[3]&&req.method==='PATCH'){
    const task=await db.prepare('SELECT * FROM tasks WHERE id=? AND plan_id=?').bind(seg[3],id).first<any>();if(!task)return json({error:'That item no longer exists.'},404);
    if(b.action==='claim'){
     const g=await db.prepare('SELECT name,status FROM guests WHERE plan_id=? AND actor=?').bind(id,actor).first<any>();if(!g||g.status==='out')return json({error:'RSVP as in or maybe before claiming an item.'},400);
     const r=await db.prepare('UPDATE tasks SET claimed_by=?,claimed_name=? WHERE id=? AND claimed_by IS NULL').bind(actor,g.name,task.id).run();if(!r.meta.changes)return json({error:'Someone just claimed that item. Refresh and choose another.'},409);
    }else if(b.action==='release'){
     if(task.claimed_by!==actor&&!host)return json({error:'Only the person responsible or organizer can release this item.'},403);
     await db.prepare('UPDATE tasks SET claimed_by=NULL,claimed_name=NULL,done=0 WHERE id=?').bind(task.id).run();
    }else if(b.action==='done'){
     if(task.claimed_by!==actor&&!host)return json({error:'Only the person responsible or organizer can update this item.'},403);
     await db.prepare('UPDATE tasks SET done=? WHERE id=?').bind(task.done?0:1,task.id).run();
    }else return json({error:'Unknown action.'},400);
    return json({ok:true});
   }
  }
  return json({error:'Not found'},404);
 }catch(e){console.error('mo API request failed',e);return json({error:'We could not save that. Please try again.'},500)}
}
export const GET=handler;export const POST=handler;export const PATCH=handler;
