import {env} from 'cloudflare:workers';
export const dynamic='force-dynamic';
function https(v:unknown){const s=str(v,1000);if(!s)return null;try{const u=new URL(s);return u.protocol==='https:'?u.href:null}catch{return null}}
const invitation=https;
function str(v:unknown,max=300){return typeof v==='string'?v.trim().slice(0,max):''}
const STYLES=['setter','details','down','wildcard','snacks'];
const HANDLE=/^[a-z0-9_]{2,24}$/;
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

  // ---- Your mo. profile ----
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
   if(req.method==='GET'){const {results}=await db.prepare('SELECT p.id,p.title,p.kind,p.date,p.place,p.budget,p.note,p.invite_url,p.created,p.made_it,(SELECT count(*) FROM guests g WHERE g.plan_id=p.id AND g.status=?) AS going,(SELECT count(*) FROM guests g WHERE g.plan_id=p.id AND g.status=?) AS maybe,(SELECT count(*) FROM tasks t WHERE t.plan_id=p.id AND t.claimed_by IS NULL) AS open_items,(SELECT t.title FROM tasks t WHERE t.plan_id=p.id AND t.claimed_by IS NULL ORDER BY t.rowid LIMIT 1) AS open_item,(SELECT count(*) FROM polls v WHERE v.plan_id=p.id AND v.decided_option IS NULL) AS open_votes FROM plans p WHERE p.owner=? OR p.id IN (SELECT plan_id FROM guests WHERE actor=?) ORDER BY p.created DESC').bind('in','maybe',actor,actor).all();return json({plans:results});}
   if(req.method==='POST'){
    const b=await body();const title=str(b.title,100),name=str(b.name,60);if(!title||!name)return json({error:'Give the plan a title and tell us your name.'},400);
    if(b.date&&Number.isNaN(Date.parse(b.date)))return json({error:'Choose a valid date.'},400);
    if(b.inviteUrl&&!invitation(b.inviteUrl))return json({error:'Use a valid HTTPS invitation link.'},400);
    const recent=await db.prepare('SELECT count(*) AS n FROM plans WHERE owner=? AND created>?').bind(actor,new Date(Date.now()-86400000).toISOString()).first<any>();if((recent?.n||0)>=20)return json({error:'You’ve started a lot of plans today. Try again tomorrow.'},429);
    const id=crypto.randomUUID();const kind=b.kind==='trip'?'trip':'gathering';const taskList=Array.isArray(b.tasks)?b.tasks.slice(0,30):[];
    const statements=[db.prepare('INSERT INTO plans (id,owner,title,kind,date,place,budget,note,invite_url,created) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(id,actor,title,kind,str(b.date,40),str(b.place,160),str(b.budget,60),str(b.note,2000),invitation(b.inviteUrl),new Date().toISOString()),db.prepare('INSERT INTO guests (plan_id,actor,name,status,note) VALUES (?,?,?,?,?)').bind(id,actor,name,'in','')];
    for(const t of taskList){if(str(t?.title,160))statements.push(db.prepare('INSERT INTO tasks (id,plan_id,title,category,done) VALUES (?,?,?,?,0)').bind(crypto.randomUUID(),id,str(t.title,160),t.category==='bring'?'bring':'todo'));}
    await db.batch(statements);return json({id},201);
   }
  }

  if(seg[0]==='plan'&&seg[1]){
   const id=seg[1];const plan=await db.prepare('SELECT * FROM plans WHERE id=?').bind(id).first<any>();if(!plan)return json({error:'This plan could not be found. Check your invitation link.'},404);const host=plan.owner===actor;
   const guest=async()=>await db.prepare('SELECT name,status FROM guests WHERE plan_id=? AND actor=?').bind(id,actor).first<any>();

   if(seg.length===2 && req.method==='GET'){
    const gs=await db.prepare('SELECT g.name,g.status,g.note,g.actor,pr.handle,pr.mo,pr.interests FROM guests g LEFT JOIN profiles pr ON pr.actor=g.actor WHERE g.plan_id=? ORDER BY g.rowid').bind(id).all<any>();
    const ts=await db.prepare('SELECT * FROM tasks WHERE plan_id=? ORDER BY rowid').bind(id).all<any>();
    const ps=await db.prepare('SELECT * FROM polls WHERE plan_id=? ORDER BY created').bind(id).all<any>();
    const os=await db.prepare('SELECT o.id,o.poll_id,o.label FROM poll_options o JOIN polls p ON p.id=o.poll_id WHERE p.plan_id=? ORDER BY o.rowid').bind(id).all<any>();
    const vs=await db.prepare('SELECT v.option_id,v.actor,g.name FROM poll_votes v JOIN polls p ON p.id=v.poll_id LEFT JOIN guests g ON g.plan_id=p.plan_id AND g.actor=v.actor WHERE p.plan_id=?').bind(id).all<any>();
    const ss=await db.prepare("SELECT id,at,title,detail,url FROM stops WHERE plan_id=? ORDER BY CASE WHEN at='' THEN 1 ELSE 0 END,at,rowid").bind(id).all<any>();
    const ms=await db.prepare('SELECT id,actor,name,kind,body,photo_url,created FROM memories WHERE plan_id=? ORDER BY created DESC').bind(id).all<any>();
    const {owner,...safe}=plan;
    const polls=ps.results.map((p:any)=>({id:p.id,question:p.question,kind:p.kind,decided_option:p.decided_option,options:os.results.filter((o:any)=>o.poll_id===p.id).map((o:any)=>{const votes=vs.results.filter((v:any)=>v.option_id===o.id);return {id:o.id,label:o.label,votes:votes.length,voters:votes.map((v:any)=>v.name||'Someone'),mine:votes.some((v:any)=>v.actor===actor)}})}));
    return json({plan:safe,host,
     guests:gs.results.map(({actor:a,interests,...g}:any)=>({...g,interests:interests?parseInterests(interests):[],isMe:a===actor})),
     tasks:ts.results.map(({claimed_by,...t}:any)=>({...t,isMine:claimed_by===actor})),
     polls,stops:ss.results,
     memories:ms.results.map(({actor:a,...m}:any)=>({...m,isMine:a===actor}))});
   }
   const b=await body();

   if(seg.length===2&&req.method==='PATCH'){
    if(!host)return json({error:'Only the organizer can change the plan details.'},403);
    const m={...plan,inviteUrl:plan.invite_url,madeIt:!!plan.made_it,...b};
    if(m.date&&Number.isNaN(Date.parse(m.date)))return json({error:'Choose a valid date.'},400);
    if(m.inviteUrl&&!invitation(m.inviteUrl))return json({error:'Use a valid HTTPS invitation link.'},400);
    const title=str(m.title,100);if(!title)return json({error:'The plan needs a title.'},400);
    await db.prepare('UPDATE plans SET title=?,date=?,place=?,budget=?,note=?,invite_url=?,made_it=? WHERE id=?').bind(title,str(m.date,40),str(m.place,160),str(m.budget,60),str(m.note,2000),invitation(m.inviteUrl),m.madeIt===true?1:0,id).run();return json({ok:true});
   }
   if(seg[2]==='rsvp'&&req.method==='POST'){
    const name=str(b.name,60);if(!name||!['in','maybe','out'].includes(b.status))return json({error:'Add your name and choose a response.'},400);
    if(!await guest()){const n=await db.prepare('SELECT count(*) AS n FROM guests WHERE plan_id=?').bind(id).first<any>();if((n?.n||0)>=150)return json({error:'This plan is full. Ask the organizer.'},400)}
    await db.batch([...(b.status==='out'?[db.prepare('UPDATE tasks SET claimed_by=NULL,claimed_name=NULL,done=0 WHERE plan_id=? AND claimed_by=?').bind(id,actor)]:[]),db.prepare('INSERT INTO guests (plan_id,actor,name,status,note) VALUES (?,?,?,?,?) ON CONFLICT(plan_id,actor) DO UPDATE SET name=excluded.name,status=excluded.status,note=excluded.note').bind(id,actor,name,b.status,str(b.note,300)),db.prepare('UPDATE tasks SET claimed_name=? WHERE plan_id=? AND claimed_by=?').bind(name,id,actor)]);return json({ok:true});
   }
   if(seg[2]==='tasks'&&seg.length===3&&req.method==='POST'){
    const title=str(b.title,160);if(!title)return json({error:'Add something to coordinate.'},400);
    if(!host&&!await guest())return json({error:'RSVP before adding to the plan.'},403);
    const n=await db.prepare('SELECT count(*) AS n FROM tasks WHERE plan_id=?').bind(id).first<any>();if((n?.n||0)>=100)return json({error:'This plan has plenty to do already.'},400);
    await db.prepare('INSERT INTO tasks (id,plan_id,title,category,done) VALUES (?,?,?,?,0)').bind(crypto.randomUUID(),id,title,b.category==='bring'?'bring':'todo').run();return json({ok:true});
   }
   if(seg[2]==='tasks'&&seg[3]&&req.method==='PATCH'){
    const task=await db.prepare('SELECT * FROM tasks WHERE id=? AND plan_id=?').bind(seg[3],id).first<any>();if(!task)return json({error:'That item no longer exists.'},404);
    if(b.action==='claim'){
     const g=await guest();if(!g||g.status==='out')return json({error:'RSVP as in or maybe before claiming an item.'},400);
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
