export type Plan={id:string;title:string;kind:string;date:string;place:string;budget:string;note:string;going?:number;maybe?:number;open_items?:number;open_item?:string|null;open_votes?:number;invite_url?:string|null;made_it?:number};
export type Task={id:string;title:string;category:string;claimed_name:string|null;done:number;isMine:boolean};
export type Guest={name:string;status:string;note:string;isMe:boolean;handle?:string|null;mo?:string|null;interests?:string[]};
export type PollOption={id:string;label:string;votes:number;voters:string[];mine:boolean};
export type Poll={id:string;question:string;kind:'date'|'place'|'choice';decided_option:string|null;options:PollOption[]};
export type Stop={id:string;at:string;title:string;detail:string;url:string|null};
export type Memory={id:string;name:string;kind:'memory'|'shoutout';body:string;photo_url:string|null;created:string;isMine:boolean};
export type Detail={plan:Plan;host:boolean;organizer?:string|null;guests:Guest[];tasks:Task[];polls:Poll[];stops:Stop[];memories:Memory[]};
export type Act=(path:string,method:string,body:unknown,demo:(d:Detail)=>void,message?:string)=>Promise<boolean>;
export type Profile={name:string;handle:string;mo:string;interests:string[];style:string};
export type Me={profile:Profile|null;history:{id:string;title:string;kind:string;date:string;place:string}[];cities:string[];contributed:number;hosted:number};
export const PHOTOS={trip:['/photos/picnic.jpg','/photos/concert.jpg'],gathering:['/photos/diner-crew.jpg','/photos/diner-table.jpg']} as const;
export function photoFor(kind:string,id=''){const set=kind==='trip'?PHOTOS.trip:PHOTOS.gathering;let h=0;for(const c of id)h=(h*31+c.charCodeAt(0))>>>0;return set[h%set.length]}
export const INTERESTS=['Live music','Food runs','Day trips','Game nights','Brunch','Road trips','Hikes','Beach days','Karaoke','Museums','Sports','Dinner parties','Creative projects','Late nights'];
export const STYLES:[string,string,string][]=[['setter','The setter','I make it happen'],['details','Needs the details','Send me the plan'],['down','Down for whatever','Just tell me when'],['wildcard','The wildcard','Bringing the story'],['snacks','Brings the snacks','Never shows up empty-handed']];
