import {env} from 'cloudflare:workers';
export const dynamic='force-dynamic';
function invitation(v:unknown){const s=str(v,1000);if(!s)return null;try{const u=new URL(s);return u.protocol==='https:'?u.href:null}catch{return null}}
function str(v:unknown,max=300){return typeof v==='string'?v.trim().slice(0,max):''}
async function handler(req:Request){
 const cookies=req.headers.get('cookie')||''; let session=cookies.match(/(?:^|; )mo_session=([a-f0-9-]{36})(?:;|$)/)?.[1]; const fresh=!session;session ||=crypto.randomUUID();
 const actor=req.headers.get('oai-authenticated-user-id')||session;
 const json=(obj:unknown,status=200)=>new Response(JSON.stringify(obj),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...(fresh?{'Set-Cookie':`mo_session=${session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`}:{})}});
 try{
  const url=new URL(req.url); const seg=url.pathname.split('/').filter(Boolean).slice(1);const db=env.DB;
  if(req.method!=='GET' && req.headers.get('origin')!==url.origin)return json({error:'Please submit from this site.'},403);
  if(!db)return json({error:'The shared database is not connected yet.'},503);
  if(req.headers.get('content-length') && Number(req.headers.get('content-length'))>16000)return json({error:'That request is too large.'},413);
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
   if(seg.length===2 && req.method==='GET'){
    const gs=await db.prepare('SELECT name,status,note,actor FROM guests WHERE plan_id=? ORDER BY rowid').bind(id).all<any>();const ts=await db.prepare('SELECT * FROM tasks WHERE plan_id=? ORDER BY rowid').bind(id).all<any>();
    const {owner,...safe}=plan;
    return json({plan:safe,host,guests:gs.results.map(({actor:a,...g}:any)=>({...g,isMe:a===actor})),tasks:ts.results.map(({claimed_by,...t}:any)=>({...t,isMine:claimed_by===actor}))});
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
