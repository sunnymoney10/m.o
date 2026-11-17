export type Poll={id:string;question:string;options:string[];votes:Record<string,number>;closes:string;closed:boolean;decision:string};
export type Errand={id:string;title:string;store:string;area:string;by:string;guestId:string;confirmed:boolean;done:boolean};
export type Ride={id:string;driver:string;passengers:string[];seats:number;area:string;when:string;confirmed:boolean};
export type Board={polls:Poll[];errands:Errand[];rides:Ride[]};
export const blankBoard=():Board=>({polls:[],errands:[],rides:[]});
export function pollOpen(p:Poll,now=Date.now()){return !p.closed&&(!p.closes||Date.parse(p.closes)>now)}
export function counts(p:Poll){return p.options.map((_,i)=>Object.values(p.votes).filter(v=>v===i).length)}
export function rideIssues(rides:Ride[]){const issues:string[]=[];const seen=new Set<string>();for(const r of rides){if(r.passengers.length>r.seats)issues.push('A ride has more passengers than available seats.');for(const id of [r.driver,...r.passengers].filter(Boolean)){if(seen.has(id))issues.push('Someone is assigned to more than one ride, or listed twice.');seen.add(id)}}return [...new Set(issues)]}
