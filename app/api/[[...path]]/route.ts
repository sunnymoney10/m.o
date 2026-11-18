import {env} from 'cloudflare:workers';
import {cleanName} from '../../../lib/names';
export const dynamic='force-dynamic';
function https(v:unknown){const s=str(v,1000);if(!s)return null;try{const u=new URL(s);return u.protocol==='https:'?u.href:null}catch{return null}}
const invitation=https;
function str(v:unknown,max=300){return typeof v==='string'?v.trim().slice(0,max):''}
const STYLES=['setter','details','down','wildcard','snacks'];
const HANDLE=/^[a-z0-9_]{2,24}$/;
// Optional DAILY_NEW_PLANS environment variable overrides the site-wide daily ceiling on new plans.
const dailyNewPlans=()=>Number((env as {DAILY_NEW_PLANS?:string})?.DAILY_NEW_PLANS)||500;
function interestsOf(v:unknown){return Array.isArray(v)?[...new Set(v.map(x=>str(x,24)).filter(Boolean))].slice(0,8):[]}
function parseInterests(s:string){try{const v=JSON.parse(s);return Array.isArray(v)?v:[]}catch{return []}}
async function handler(req:Request){
 const cookies=req.headers.get('cookie')||''; let session=cookies.match(/(?:^|; )mo_session=([a-f0-9-]{36})(?:;|$)/)?.[1]; const fresh=!session;session ||=crypto.randomUUID();
 const actor=req.headers.get('oai-authenticated-user-id')||session;
 const json=(obj:unknown,status=200)=>new Response(JSON.stringify(obj),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...(fresh?{'Set-Cookie':`mo_session=${session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`}:{})}});
 try{
  const url=new URL(req.url); const seg=url.pathname.split('/').filter(Boolean).slice(1);const db=env.DB;
  if(req.method!=='GET' && req.headers.get('origin')!==url.origin)return json({error:'Please submit from this site.'},403);
  if(!db)return json({error:'The shared database is not connected yet.'},503);
  if(req.headers.get('content-length') && Number(req.headers.get('content-length'))>16000)return json({error:'That request is too large.'},413);
  const body=async()=>{if(req.method==='GET'||req.method==='DELETE')return {} as any;try{return await req.json() as any}catch{return {} as any}};

  // ---- Your m.o profile ----
  if(seg[0]==='me'&&seg.length===1){
   if(req.method==='GET'){
    const p=await db.prepare('SELECT name,handle,mo,interests,style FROM profiles WHERE actor=?').bind(actor).first<any>();
    const {results:history}=await db.prepare("SELECT p.id,p.title,p.kind,p.date,p.place FROM plans p JOIN guests g ON g.plan_id=p.id AND g.actor=? WHERE p.made_it=1 AND g.status='in' ORDER BY p.date DESC").bind(actor).all<any>();
    const done=await db.prepare('SELECT count(*) AS n FROM tasks WHERE claimed_by=? AND done=1').bind(actor).first<any>();
    const hosted=await db.prepare('SELECT count(*) AS n FROM plans WHERE owner=? AND made_it=1').bind(actor).first<any>();
    const cities=[...new Set(history.map((h:any)=>String(h.place||'').trim()).filter(Boolean))];
    return json({profile:p?{...p,interests:parseInterests(p.interests)}:null,history,cities,contributed:done?.n||0,hosted:hosted?.n||0});
   }
   if(req.method==='PUT'){
    const b=await body();const name=str(b.name,60),handle=str(b.handle,24).toLowerCase().replace(/^@/,''),mo=str(b.mo,80),style=STYLES.includes(b.style)?b.style:'down';
    if(!name)return json({error:'Tell people what to call you.'},400);
    if(!HANDLE.test(handle))return json({error:'Handles use 2–24 lowercase letters, numbers or underscores.'},400);
    const taken=await db.prepare('SELECT actor FROM profiles WHERE handle=? AND actor<>?').bind(handle,actor).first();if(taken)return json({error:'That handle is taken. Try another.'},409);
    await db.batch([db.prepare('INSERT INTO profiles (actor,name,handle,mo,interests,style,updated) VALUES (?,?,?,?,?,?,?) ON CONFLICT(actor) DO UPDATE SET name=excluded.name,handle=excluded.handle,mo=excluded.mo,interests=excluded.interests,style=excluded.style,updated=excluded.updated').bind(actor,name,handle,mo,JSON.stringify(interestsOf(b.interests)),style,new Date().toISOString()),db.prepare('UPDATE guests SET name=? WHERE actor=?').bind(name,actor),db.prepare('UPDATE tasks SET claimed_name=? WHERE claimed_by=?').bind(name,actor),db.prepare('UPDATE memories SET name=? WHERE actor=?').bind(name,actor)]);
    return json({ok:true});
   }
  }

  if(seg[0]==='plans'&&seg.length===1){
   if(req.method==='GET'){
    // Address is shared only with the organizer and people who said in or maybe.
    const {results}=await db.prepare(`SELECT p.id,p.title,p.kind,p.date,CASE WHEN p.owner=?1 OR EXISTS(SELECT 1 FROM guests m WHERE m.plan_id=p.id AND m.actor=?1 AND m.status IN ('in','maybe')) THEN p.place ELSE '' END AS place,p.budget,p.note,p.invite_url,p.created,p.made_it,
     (SELECT coalesce(sum(1+CASE WHEN g.extra_status='approved' THEN g.extra_count ELSE 0 END),0) FROM guests g WHERE g.plan_id=p.id AND g.status='in') AS going,
     (SELECT count(*) FROM guests g WHERE g.plan_id=p.id AND g.status='maybe') AS maybe,
     (SELECT count(*) FROM guests g WHERE g.plan_id=p.id AND g.status='invited') AS invited,
     (SELECT count(*) FROM tasks t WHERE t.plan_id=p.id AND t.claimed_by IS NULL) AS open_items,
     (SELECT t.title FROM tasks t WHERE t.plan_id=p.id AND t.claimed_by IS NULL ORDER BY t.rowid LIMIT 1) AS open_item,
     (SELECT count(*) FROM polls v WHERE v.plan_id=p.id AND v.decided_option IS NULL) AS open_votes
     FROM plans p WHERE p.owner=?1 OR p.id IN (SELECT plan_id FROM guests WHERE actor=?1) ORDER BY p.created DESC`).bind(actor).all();return json({plans:results});}
   if(req.method==='POST'){
    const b=await body();const title=str(b.title,100),name=str(b.name,60);if(!title||!name)return json({error:'Give the plan a title and tell us your name.'},400);
    if(b.date&&Number.isNaN(Date.parse(b.date)))return json({error:'Choose a valid date.'},400);
    if(b.inviteUrl&&!invitation(b.inviteUrl))return json({error:'Use a valid HTTPS invitation link.'},400);
    // Site-wide ceiling so scripted abuse can't run usage past the free tier; never limits RSVPs or existing plans.
    const today=await db.prepare('SELECT count(*) AS n FROM plans WHERE created>?').bind(new Date(Date.now()-86400000).toISOString()).first<any>();if((today?.n||0)>=dailyNewPlans())return json({error:'m.o has reached today’s limit for new plans. Please try again tomorrow.'},429);
    const recent=await db.prepare('SELECT count(*) AS n FROM plans WHERE owner=? AND created>?').bind(actor,new Date(Date.now()-86400000).toISOString()).first<any>();if((recent?.n||0)>=20)return json({error:'You’ve started a lot of plans today. Try again tomorrow.'},429);
    const id=crypto.randomUUID();const kind=b.kind==='trip'?'trip':'gathering';const taskList=Array.isArray(b.tasks)?b.tasks.slice(0,30):[];
    const statements=[db.prepare('INSERT INTO plans (id,owner,title,kind,date,place,budget,note,invite_url,created,details) VALUES (?,?,?,?,?,?,?,?,?,?,?)').bind(id,actor,title,kind,str(b.date,40),str(b.place,160),str(b.budget,60),str(b.note,2000),invitation(b.inviteUrl),new Date().toISOString(),str(b.details,1000)),db.prepare('INSERT INTO guests (plan_id,actor,name,status,note,id) VALUES (?,?,?,?,?,?)').bind(id,actor,name,'in','',crypto.randomUUID())];
    for(const t of taskList){if(str(t?.title,160))statements.push(db.prepare('INSERT INTO tasks (id,plan_id,title,category,done) VALUES (?,?,?,?,0)').bind(crypto.randomUUID(),id,str(t.title,160),t.category==='bring'?'bring':'todo'));}
    await db.batch(statements);return json({id},201);
   }
  }

  if(seg[0]==='plan'&&seg[1]){
   const id=seg[1];const plan=await db.prepare('SELECT * FROM plans WHERE id=?').bind(id).first<any>();if(!plan)return json({error:'This plan could not be found. Check your invitation link.'},404);const host=plan.owner===actor;
   const guest=async()=>await db.prepare("SELECT name,status FROM guests WHERE plan_id=? AND actor=? AND status<>'invited'").bind(id,actor).first<any>();
   // Host-only activity log: what changed, and whether the host noted it or the person confirmed it. Keeps the newest 200.
   const now=new Date().toISOString();
   const log=(text:string,byHost=host)=>[db.prepare('INSERT INTO activity (id,plan_id,at,text,by_host) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(),id,now,text.slice(0,300),byHost?1:0),db.prepare('DELETE FROM activity WHERE plan_id=? AND id NOT IN (SELECT id FROM activity WHERE plan_id=? ORDER BY at DESC LIMIT 200)').bind(id,id)];
   const answer=(status:string,count:number,names:string)=>(status==='in'?'going':status==='maybe'?'still checking':status==='out'?'can’t make it':'no reply yet')+(count?` (+${count}${names?' '+names:''})`:'');

   if(seg.length===2 && req.method==='GET'){
    const gs=await db.prepare('SELECT g.id,g.name,g.status,g.note,g.actor,g.extra_count,g.extra_names,g.extra_status,g.dietary,g.staying,g.source,g.updated,pr.handle,pr.mo,pr.interests FROM guests g LEFT JOIN profiles pr ON pr.actor=g.actor WHERE g.plan_id=? ORDER BY g.rowid').bind(id).all<any>();
    const ts=await db.prepare('SELECT * FROM tasks WHERE plan_id=? ORDER BY rowid').bind(id).all<any>();
    const ps=await db.prepare('SELECT * FROM polls WHERE plan_id=? ORDER BY created').bind(id).all<any>();
    const os=await db.prepare('SELECT o.id,o.poll_id,o.label FROM poll_options o JOIN polls p ON p.id=o.poll_id WHERE p.plan_id=? ORDER BY o.rowid').bind(id).all<any>();
    const vs=await db.prepare('SELECT v.option_id,v.actor,g.name FROM poll_votes v JOIN polls p ON p.id=v.poll_id LEFT JOIN guests g ON g.plan_id=p.plan_id AND g.actor=v.actor WHERE p.plan_id=?').bind(id).all<any>();
    const ss=await db.prepare("SELECT id,at,title,detail,url FROM stops WHERE plan_id=? ORDER BY CASE WHEN at='' THEN 1 ELSE 0 END,at,rowid").bind(id).all<any>();
    const acts=host?(await db.prepare('SELECT at,text,by_host FROM activity WHERE plan_id=? ORDER BY at DESC LIMIT 30').bind(id).all<any>()).results.map((a:any)=>({at:a.at,text:a.text,byHost:!!a.by_host})):[];
    const ms=await db.prepare('SELECT id,actor,name,kind,body,photo_url,created FROM memories WHERE plan_id=? ORDER BY created DESC').bind(id).all<any>();
    const {owner,details,...safe}=plan;
    // Private details (address, arrival notes, itinerary) reach the organizer and people who said in or maybe.
    const mine=gs.results.find((g:any)=>g.actor===actor),insider=host||(!!mine&&['in','maybe'].includes(mine.status));
    const hidden=!insider&&!!(safe.place||details||ss.results.length);if(!insider)safe.place='';
    const polls=ps.results.map((p:any)=>({id:p.id,question:p.question,kind:p.kind,decided_option:p.decided_option,options:os.results.filter((o:any)=>o.poll_id===p.id).map((o:any)=>{const votes=vs.results.filter((v:any)=>v.option_id===o.id);return {id:o.id,label:o.label,votes:votes.length,voters:votes.map((v:any)=>v.name||'Someone'),mine:votes.some((v:any)=>v.actor===actor)}})}));
    return json({plan:safe,host,activity:acts,organizer:gs.results.find((g:any)=>g.actor===owner)?.name||null,
     details:insider?details:'',hidden,
     // Dietary needs, sleepover requests and pending plus-ones are visible only to the organizer and the guest.
     guests:gs.results.map(({actor:a,interests,dietary,staying,extra_count,extra_names,extra_status,...g}:any)=>{const own=a===actor,see=host||own,extra=see||extra_status==='approved';return {...g,isHost:a===owner,interests:interests?parseInterests(interests):[],isMe:own,extra_count:extra?extra_count:0,extra_names:extra?extra_names:'',extra_status:extra?extra_status:'',...(see?{dietary,staying:!!staying}:{})}}),
     tasks:ts.results.map(({claimed_by,...t}:any)=>({...t,isMine:claimed_by===actor})),
     polls,stops:insider?ss.results:[],
     memories:ms.results.map(({actor:a,...m}:any)=>({...m,isMine:a===actor}))});
   }
   const b=await body();

   if(seg.length===2&&req.method==='PATCH'){
    if(!host)return json({error:'Only the organizer can change the plan details.'},403);
    const m={...plan,inviteUrl:plan.invite_url,madeIt:!!plan.made_it,...b};if(typeof m.details!=='string')m.details=plan.details;
    if(m.date&&Number.isNaN(Date.parse(m.date)))return json({error:'Choose a valid date.'},400);
    if(m.inviteUrl&&!invitation(m.inviteUrl))return json({error:'Use a valid HTTPS invitation link.'},400);
    const title=str(m.title,100);if(!title)return json({error:'The plan needs a title.'},400);
    const next={title,date:str(m.date,40),place:str(m.place,160),budget:str(m.budget,60),note:str(m.note,2000),details:str(m.details,1000)};
    const changed=([['title','name'],['date','date and time'],['place','address'],['details','arrival notes'],['note','description'],['budget','budget']] as const).filter(([k])=>(plan[k]||'')!==next[k]).map(([,l])=>l);
    await db.batch([db.prepare('UPDATE plans SET title=?,date=?,place=?,budget=?,note=?,invite_url=?,made_it=?,details=? WHERE id=?').bind(title,next.date,next.place,next.budget,next.note,invitation(m.inviteUrl),m.madeIt===true?1:0,next.details,id),
     ...(changed.length?log('You changed the '+changed.join(', ')):[]),...(m.madeIt===true&&!plan.made_it?log('You marked the plan as made it out'):[])]);return json({ok:true});
   }
   if(seg[2]==='rsvp'&&req.method==='POST'){
    const name=str(b.name,60);if(!name||!['in','maybe','out'].includes(b.status))return json({error:'Add your name and choose a response.'},400);
    const prev=await db.prepare('SELECT extra_count,extra_names,extra_status FROM guests WHERE plan_id=? AND actor=?').bind(id,actor).first<any>();
    if(!prev){const n=await db.prepare('SELECT count(*) AS n FROM guests WHERE plan_id=?').bind(id).first<any>();if((n?.n||0)>=150)return json({error:'This plan is full. Ask the organizer.'},400)}
    const out=b.status==='out';const freed=out?(await db.prepare('SELECT title FROM tasks WHERE plan_id=? AND claimed_by=?').bind(id,actor).all<any>()).results.map((t:any)=>t.title):[];
    const count=out?0:Math.max(0,Math.min(4,Math.floor(Number(b.extraCount)||0))),names=count?str(b.extraNames,120):'';
    // Extra guests are a request until the organizer approves; changing the request asks again.
    const same=prev&&prev.extra_count===count&&prev.extra_names===names;
    const extraStatus=!count?'':host?'approved':same&&prev.extra_status?prev.extra_status:'requested';
    await db.batch([...(out?[db.prepare('UPDATE tasks SET claimed_by=NULL,claimed_name=NULL,done=0,claim_source=\'\' WHERE plan_id=? AND claimed_by=?').bind(id,actor)]:[]),
     db.prepare('INSERT INTO guests (plan_id,actor,name,status,note,id,extra_count,extra_names,extra_status,dietary,staying,source,updated) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(plan_id,actor) DO UPDATE SET name=excluded.name,status=excluded.status,note=excluded.note,extra_count=excluded.extra_count,extra_names=excluded.extra_names,extra_status=excluded.extra_status,dietary=excluded.dietary,staying=excluded.staying,source=excluded.source,updated=excluded.updated')
      .bind(id,actor,name,b.status,str(b.note,300),crypto.randomUUID(),count,names,extraStatus,str(b.dietary,200),!out&&b.staying===true?1:0,'guest',now),
     db.prepare('UPDATE tasks SET claimed_name=? WHERE plan_id=? AND claimed_by=?').bind(name,id,actor),
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
   if(seg[2]==='guests'&&seg.length===3&&req.method==='POST'){
    if(!host)return json({error:'Only the organizer can add to the guest list.'},403);
    // Names only: phone numbers, emails and emoji are stripped before anything is stored.
    const names=[...new Set((Array.isArray(b.names)?b.names:[]).map((x:unknown)=>cleanName(str(x,200))).filter((n:string)=>/\p{L}/u.test(n)))].slice(0,50) as string[];
    if(!names.length)return json({error:'Add at least one name.'},400);
    const {results:existing}=await db.prepare('SELECT lower(name) AS n FROM guests WHERE plan_id=?').bind(id).all<any>();const have=new Set(existing.map((x:any)=>x.n));
    const fresh=names.filter(n=>{const k=n.toLowerCase();if(have.has(k))return false;have.add(k);return true});if(existing.length+fresh.length>150)return json({error:'A plan can have up to 150 people.'},400);
    if(fresh.length)await db.batch(fresh.map(n=>db.prepare('INSERT INTO guests (plan_id,actor,name,status,note,id) VALUES (?,?,?,?,?,?)').bind(id,'invite:'+crypto.randomUUID(),n,'invited','',crypto.randomUUID())));
    return json({ok:true,added:fresh.length,skipped:names.length-fresh.length});
   }
   if(seg[2]==='guests'&&seg[3]){
    const row=await db.prepare('SELECT * FROM guests WHERE plan_id=? AND id=?').bind(id,str(seg[3],40)).first<any>();if(!row)return json({error:'That person is no longer on the list.'},404);
    if(seg[4]==='pick'&&req.method==='POST'){
     // Picking a name on the organizer's list moves that spot (and any claims) to this phone.
     if(row.actor===plan.owner)return json({error:'That’s the organizer. Pick your own name.'},403);
     if(row.actor===actor)return json({ok:true});
     const mine=await db.prepare('SELECT name FROM guests WHERE plan_id=? AND actor=?').bind(id,actor).first<any>();if(mine)return json({error:`This phone already answered as ${mine.name}. Update that response instead.`},409);
     await db.batch([db.prepare('UPDATE guests SET actor=? WHERE plan_id=? AND id=?').bind(actor,id,row.id),db.prepare('UPDATE tasks SET claimed_by=? WHERE plan_id=? AND claimed_by=?').bind(actor,id,row.actor),db.prepare('UPDATE poll_votes SET actor=? WHERE actor=? AND poll_id IN (SELECT id FROM polls WHERE plan_id=?)').bind(actor,row.actor,id),db.prepare('UPDATE memories SET actor=? WHERE plan_id=? AND actor=?').bind(actor,id,row.actor),...log(`${row.name} opened the invite`,false)]);
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
     await db.batch([db.prepare('UPDATE tasks SET claimed_by=NULL,claimed_name=NULL,done=0,claim_source=\'\' WHERE plan_id=? AND claimed_by=?').bind(id,row.actor),db.prepare('DELETE FROM poll_votes WHERE actor=? AND poll_id IN (SELECT id FROM polls WHERE plan_id=?)').bind(row.actor,id),db.prepare('DELETE FROM guests WHERE plan_id=? AND id=?').bind(id,row.id),...log(`You removed ${row.name}`)]);
     return json({ok:true});
    }
   }
   if(seg[2]==='tasks'&&seg.length===3&&req.method==='POST'){
    const title=str(b.title,160);if(!title)return json({error:'Add something to coordinate.'},400);
    if(!host&&!await guest())return json({error:'RSVP before adding to the plan.'},403);
    const n=await db.prepare('SELECT count(*) AS n FROM tasks WHERE plan_id=?').bind(id).first<any>();if((n?.n||0)>=100)return json({error:'This plan has plenty to do already.'},400);
    await db.prepare('INSERT INTO tasks (id,plan_id,title,category,done) VALUES (?,?,?,?,0)').bind(crypto.randomUUID(),id,title,b.category==='bring'?'bring':'todo').run();return json({ok:true});
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
     if(poll.kind==='date')statements.push(db.prepare('UPDATE plans SET date=? WHERE id=?').bind(new Date(option.label).toISOString(),id));
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
 }catch(e){console.error('mo API request failed',e);return json({error:'We could not save that. Please try again.'},500)}
}
export const GET=handler;export const POST=handler;export const PATCH=handler;export const PUT=handler;export const DELETE=handler;
