import {planLink} from '../../lib/short-link';
import {z} from 'zod';
import {GET,POST as apiPost,PATCH} from '../api/[[...path]]/route';
import {groupUpdate,nudgeMaybes,nextStep} from '../../lib/group-update';
export const dynamic='force-dynamic';
const id=z.string().uuid();
const task=z.object({title:z.string().min(1).max(160),category:z.enum(['bring','todo'])});
const fields={title:z.string().min(1).max(100),date:z.string().max(40).default(''),place:z.string().max(160).default(''),budget:z.string().max(60).default(''),note:z.string().max(2000).default(''),inviteUrl:z.string().max(1000).default('')};
const definitions=[
 {name:'list_plans',description:'List the current user’s m.o plans. Read-only. Use to find an existing plan before creating another.',schema:z.object({}),read:true},
 {name:'read_plan',description:'Read a m.o plan, attendance, bring-list, responsibilities, open group decisions with vote counts, itinerary, replay memories, and outstanding items. Use for a setter briefing; distinguish confirmed facts from missing information. Accept an ID from an m.o invitation link.',schema:z.object({plan_id:id}),read:true},
 {name:'create_plan',description:'Create a free shared m.o plan from details the user supplies. Do not invent dates, budgets, venue availability, guest commitments, or bookings. Missing details may remain blank. This creates a plan and registers only the requesting user as attending; it sends no messages or invitations. Return the plan URL. Ask the user to confirm uncertain details before saving.',schema:z.object({...fields,name:z.string().min(1).max(60),kind:z.enum(['trip','gathering']),tasks:z.array(task).max(30).default([])}),read:false},
 {name:'update_plan',description:'Update the organizer’s plan details using confirmed information. Only the plan organizer can edit these fields. Supply only the fields the user wants changed; omitted fields remain unchanged. This does not book anything or send messages.',schema:z.object(fields).partial().extend({plan_id:id}),read:false},
 {name:'add_plan_item',description:'Add a contribution or responsibility to a m.o plan. Creates an unclaimed item; does not assign responsibility to someone without their confirmation. The caller must be a participant.',schema:z.object({plan_id:id,...task.shape}),read:false},
 {name:'respond_to_plan',description:'Save ONLY the current caller’s RSVP and optional note. Never record someone else’s commitment as the caller. Sends no messages. Declining releases the caller’s claimed items.',schema:z.object({plan_id:id,name:z.string().min(1).max(60),status:z.enum(['in','maybe','out']),note:z.string().max(300).default('')}),read:false},
 {name:'update_plan_item',description:'Claim, release, or toggle completion of an item. Claiming means the current user takes responsibility; never claim on behalf of another guest. Completion and release are permitted only for the item’s owner or the plan organizer.',schema:z.object({plan_id:id,task_id:id,action:z.enum(['claim','release','done'])}),read:false},
 {name:'start_decision',description:'Organizer only. Start a group vote on a plan (dates, places, or any choice) using options the user supplies. For kind "date", each option must be an ISO 8601 date-time. Votes are suggestions; nothing is confirmed until the organizer locks one in inside m.o. Sends no messages.',schema:z.object({plan_id:id,question:z.string().min(1).max(120),kind:z.enum(['date','place','choice']),options:z.array(z.string().min(1).max(120)).min(2).max(8)}),read:false},
 {name:'vote_on_decision',description:'Toggle ONLY the current caller’s vote on one option of an open group decision. Never vote on behalf of someone else. The caller must have responded to the plan.',schema:z.object({plan_id:id,poll_id:id,option_id:id}),read:false},
 {name:'add_itinerary_stop',description:'Organizer only. Add a stop or key link to the plan’s live itinerary using details the user confirmed. Time is optional ISO 8601; links must be HTTPS. Does not book anything.',schema:z.object({plan_id:id,title:z.string().min(1).max(120),at:z.string().max(40).default(''),detail:z.string().max(300).default(''),url:z.string().max(1000).default('')}),read:false},
 {name:'draft_group_update',description:'Read-only. Return a group-chat status update, a nudge for people still deciding, and the next useful step, built only from what is saved in the plan. The user copies and sends it themselves; m.o sends nothing.',schema:z.object({plan_id:id}),read:true}
];
function schemaFor(zod:any):any{return zod._def.typeName==='ZodObject'?{type:'object',properties:Object.fromEntries(Object.entries(zod.shape).map(([k,v]:any)=>[k,schemaFor(v)])),required:Object.entries(zod.shape).filter(([k,v]:any)=>!v.isOptional()).map(([k])=>k),additionalProperties:false}:zod._def.typeName==='ZodDefault'?schemaFor(zod._def.innerType):zod._def.typeName==='ZodArray'?{type:'array',items:schemaFor(zod._def.type),maxItems:30}:zod._def.typeName==='ZodEnum'?{type:'string',enum:zod._def.values}:{type:'string',...(zod._def.checks?.find((x:any)=>x.kind==='uuid')?{format:'uuid'}:{})}}
export async function POST(req:Request){let message:any;try{message=await req.json()}catch{return new Response('Invalid JSON',{status:400})}const reply=(result:any,error?:any)=>Response.json({jsonrpc:'2.0',id:message.id??null,...(error?{error}:{result})},{headers:{'Cache-Control':'no-store'}});
 if(message.method==='server/discover')return reply({supportedVersions:['2026-07-28'],capabilities:{tools:{}}});
 if(message.method==='initialize')return reply({protocolVersion:'2026-07-28',capabilities:{tools:{}},serverInfo:{name:'mo-setter',version:'0.1.0'}});
 if(message.method==='notifications/initialized')return new Response(null,{status:204});
 if(message.method==='tools/list')return reply({tools:definitions.map(d=>({name:d.name,description:d.description,inputSchema:schemaFor(d.schema),annotations:{readOnlyHint:d.read,destructiveHint:false,openWorldHint:false}}))});
 if(message.method!=='tools/call')return reply(null,{code:-32601,message:'Method not found'});
 const actor=req.headers.get('oai-authenticated-user-id');if(!actor)return reply({isError:true,content:[{type:'text',text:'Sign in to m.o through ChatGPT to use your plans.'}]});
 const tool=definitions.find(d=>d.name===message.params?.name);if(!tool)return reply(null,{code:-32602,message:'Unknown tool'});
 try{const a:any=tool.schema.parse(message.params.arguments||{});let path='plans',method='GET',body:any;
 if(tool.name==='read_plan')path='plan/'+a.plan_id;
 if(tool.name==='create_plan'){method='POST';body=a}
 if(tool.name==='update_plan'){path='plan/'+a.plan_id;method='PATCH';body=a}
 if(tool.name==='add_plan_item'){path=`plan/${a.plan_id}/tasks`;method='POST';body={title:a.title,category:a.category}}
 if(tool.name==='respond_to_plan'){path=`plan/${a.plan_id}/rsvp`;method='POST';body={name:a.name,status:a.status,note:a.note}}
 if(tool.name==='start_decision'){path=`plan/${a.plan_id}/polls`;method='POST';body={question:a.question,kind:a.kind,options:a.options}}
 if(tool.name==='vote_on_decision'){path=`plan/${a.plan_id}/polls/${a.poll_id}/vote`;method='POST';body={optionId:a.option_id}}
 if(tool.name==='add_itinerary_stop'){path=`plan/${a.plan_id}/stops`;method='POST';body={title:a.title,at:a.at,detail:a.detail,url:a.url}}
 if(tool.name==='draft_group_update')path='plan/'+a.plan_id;
 if(tool.name==='update_plan_item'){path=`plan/${a.plan_id}/tasks/${a.task_id}`;method='PATCH';body={action:a.action}}
 const u=new URL('/api/'+path,req.url);const request=new Request(u,{method,headers:{'Content-Type':'application/json',Origin:u.origin,'oai-authenticated-user-id':actor},...(body?{body:JSON.stringify(body)}:{})});
 const result=await (method==='GET'?GET:method==='PATCH'?PATCH:apiPost)(request);const data:any=await result.json();if(tool.name==='create_plan'&&data.id)data.url=planLink(u.origin,data.id);
 if(tool.name==='draft_group_update'&&result.ok){const link=planLink(u.origin,a.plan_id);return reply({isError:false,content:[{type:'text',text:JSON.stringify({group_update:groupUpdate(data,link),nudge_maybes:nudgeMaybes(data,link)||null,next_step:nextStep(data),note:'Drafts only. The user sends them; m.o does not.'})}]})}
 return reply({isError:!result.ok,content:[{type:'text',text:JSON.stringify(data)}]});
 }catch(e:any){return reply({isError:true,content:[{type:'text',text:e instanceof z.ZodError?'Invalid plan details: '+e.issues.map(i=>i.path.join('.')+': '+i.message).join('; '):'Could not complete this plan action. Please try again.'}]})}
}
