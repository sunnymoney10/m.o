import {env} from 'cloudflare:workers';
import {draftSchema,briefing} from '../../../lib/setter';
import {z} from 'zod';
// Snapshot inside SQL is also checked by the first statement of the atomic apply batch.
const snapshotSQL=`SELECT json_object('plan',json((SELECT json_object('title',title,'date',date,'place',place,'budget',budget,'note',note,'invite',invite_url) FROM plans WHERE id=?)), 'guests',json((SELECT json_group_array(json_object('actor',actor,'name',name,'status',status,'note',note)) FROM (SELECT * FROM guests WHERE plan_id=? ORDER BY actor))), 'tasks',json((SELECT json_group_array(json_object('id',id,'title',title,'category',category,'owner',claimed_by,'done',done)) FROM (SELECT * FROM tasks WHERE plan_id=? ORDER BY id)))) AS snapshot`;
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
  if(req.headers.get('content-length') && Number(req.headers.get('content-length'))>32000)return json({error:'That request is too large.'},413);
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
    const drafts=host?await db.prepare('SELECT id,content,status,revision,created FROM setter_drafts WHERE plan_id=? ORDER BY created DESC LIMIT 20').bind(id).all<any>():{results:[]};
    return json({plan:safe,host,briefing:briefing(plan,gs.results,ts.results),drafts:drafts.results.map(d=>({...d,content:JSON.parse(d.content)})),guests:gs.results.map(({actor:a,...g}:any)=>({...g,isMe:a===actor})),tasks:ts.results.map(({claimed_by,...t}:any)=>({...t,isMine:claimed_by===actor}))});
   }
   let b:any={};
   if(req.method!=='GET'){const raw=await req.text();if(new TextEncoder().encode(raw).length>32000)return json({error:'That request is too large. Use a shorter excerpt.'},413);try{b=JSON.parse(raw)}catch{return json({error:'Use valid JSON.'},400)}}
   if(seg[2]==='drafts'){
    if(!host)return json({error:'Only the organizer can review preparation drafts.'},403);
    const validate=(content:unknown)=>{const d=draftSchema.parse(content);if(d.fields.date&&Number.isNaN(Date.parse(d.fields.date)))throw new z.ZodError([{code:'custom',path:['fields','date'],message:'Choose a valid date in the draft.'}]);return d};
    if(seg.length===3&&req.method==='POST'){
     const content=validate(b);const draftId=crypto.randomUUID();
     const base=await db.prepare(snapshotSQL).bind(id,id,id).first<any>();
     await db.prepare('INSERT INTO setter_drafts (id,plan_id,content,base,status,revision,created) VALUES (?,?,?,?,?,1,?)').bind(draftId,id,JSON.stringify(content),base.snapshot,'pending',new Date().toISOString()).run();
     return json({id:draftId,status:'pending',revision:1,reviewUrl:url.origin+'/?plan='+id,message:'Review and edit this draft before applying it. No plan details or commitments changed.'},201);
    }
    if(req.method!=='PATCH'||seg.length!==4)return json({error:'Not found'},404);
    b=z.object({action:z.enum(['edit','reject','apply']),revision:z.number().int().min(1),content:draftSchema.optional()}).strict().parse(b);
    const draft=await db.prepare('SELECT * FROM setter_drafts WHERE id=? AND plan_id=?').bind(seg[3]||'',id).first<any>();
    if(!draft)return json({error:'Draft not found.'},404);
    if(!Number.isInteger(b.revision)||b.revision!==draft.revision)return json({error:'Draft changed. Reload and review the latest revision.'},409);
    if(draft.status==='applied'&&b.action==='apply')return json({ok:true,alreadyApplied:true});
    if(draft.status!=='pending')return json({error:'This draft is already resolved.'},409);
    if(req.method!=='PATCH'||seg.length!==4)return json({error:'Not found'},404);
    if(b.action==='edit'){
     const content=validate(b.content);
     const r=await db.prepare("UPDATE setter_drafts SET content=?,revision=revision+1 WHERE id=? AND status='pending' AND revision=?").bind(JSON.stringify(content),draft.id,b.revision).run();
     return r.meta.changes?json({ok:true,revision:b.revision+1}):json({error:'Draft changed. Reload and review again.'},409);
    }
    if(b.action==='reject'){
     const r=await db.prepare("UPDATE setter_drafts SET status='rejected' WHERE id=? AND status='pending' AND revision=?").bind(draft.id,b.revision).run();
     return r.meta.changes?json({ok:true}):json({error:'Draft changed. Reload and review again.'},409);
    }
    if(b.action!=='apply')return json({error:'Choose edit, reject or apply.'},400);
    const content=validate(JSON.parse(draft.content));
    const gate="EXISTS (SELECT 1 FROM setter_drafts WHERE id=? AND status='applying' AND revision=?)";
    const statements=[db.prepare(`UPDATE setter_drafts SET status='applying' WHERE id=? AND revision=? AND status='pending' AND base=(${snapshotSQL.replace(' AS snapshot','')})`).bind(draft.id,b.revision,id,id,id)];
    const keys=Object.keys(content.fields) as (keyof typeof content.fields)[];
    if(keys.length)statements.push(db.prepare(`UPDATE plans SET ${keys.map(k=>k+'=?').join(',')} WHERE id=? AND ${gate}`).bind(...keys.map(k=>content.fields[k]!),id,draft.id,b.revision));
    content.items.forEach(item=>statements.push(db.prepare(`INSERT INTO tasks (id,plan_id,title,category,done) SELECT ?,?,?,?,0 WHERE ${gate}`).bind(crypto.randomUUID(),id,item.title,item.category,draft.id,b.revision)));
    statements.push(db.prepare("UPDATE setter_drafts SET status='applied' WHERE id=? AND status='applying' AND revision=?").bind(draft.id,b.revision));
    const results=await db.batch(statements);
    if(!results[0].meta.changes)return json({error:'Plan, attendance, or draft changed. Read the current plan and create a fresh draft before applying.'},409);
    return json({ok:true});
   }
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
 }catch(e){if(e instanceof z.ZodError)return json({error:'Invalid draft: '+e.issues.map(i=>i.path.join('.')+': '+i.message).join('; ')},400);console.error('mo API request failed',e);return json({error:'We could not save that. Please try again.'},500)}
}
export const GET=handler;export const POST=handler;export const PATCH=handler;
