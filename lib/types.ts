export type Plan={id:string;title:string;kind:string;date:string;place:string;budget:string;note:string;going?:number;maybe?:number;open_items?:number;open_item?:string|null;open_votes?:number;invited?:number;invite_url?:string|null;booking_url?:string|null;end_date?:string;made_it?:number};
export type Task={id:string;title:string;category:string;claimed_name:string|null;done:number;isMine:boolean;claim_source?:string};
import type {Avatar} from './avatar';
export type Guest={avatar?:Avatar|null;photo?:string|null;id?:string;name:string;status:string;note:string;isMe:boolean;isHost?:boolean;extra_count?:number;extra_names?:string;extra_status?:string;dietary?:string;staying?:boolean;source?:string;updated?:string;handle?:string|null;mo?:string|null;interests?:string[]};
export type PollOption={id:string;label:string;votes:number;voters:string[];mine:boolean};
export type Poll={id:string;question:string;kind:'date'|'place'|'choice';decided_option:string|null;options:PollOption[]};
export type Stop={id:string;at:string;title:string;detail:string;url:string|null};
export type Memory={id:string;name:string;kind:'memory'|'shoutout';body:string;photo_url:string|null;created:string;isMine:boolean};
export type Activity={at:string;text:string;byHost:boolean};
export type Detail={plan:Plan;host:boolean;hasHostKey?:boolean;activity?:Activity[];organizer?:string|null;details?:string;hidden?:boolean;guests:Guest[];tasks:Task[];polls:Poll[];stops:Stop[];memories:Memory[]};
export type Act=(path:string,method:string,body:unknown,demo:(d:Detail)=>void,message?:string)=>Promise<boolean>;
export type Profile={name:string;handle:string;mo:string;interests:string[];style:string;avatar?:Avatar|null;photo?:string|null};
export type Me={profile:Profile|null;history:{id:string;title:string;kind:string;date:string;place:string}[];cities:string[];contributed:number;hosted:number};
export const INTERESTS=['Live music','Food runs','Day trips','Game nights','Brunch','Road trips','Hikes','Beach days','Karaoke','Museums','Sports','Dinner parties','Creative projects','Late nights'];
export const STYLES:[string,string,string][]=[['setter','The setter','I make it happen'],['details','Needs the details','Send me the plan'],['down','Down for whatever','Just tell me when'],['wildcard','The wildcard','Bringing the story'],['snacks','Brings the snacks','Never shows up empty-handed']];

// "5 min ago" style times for the host's tracking views.
export function ago(iso?:string){if(!iso)return '';const m=Math.round((Date.now()-new Date(iso).getTime())/60000);if(Number.isNaN(m))return '';if(m<1)return 'just now';if(m<60)return m+' min ago';const h=Math.round(m/60);if(h<24)return h+' h ago';const d=Math.round(h/24);return d===1?'yesterday':d+' days ago'}
