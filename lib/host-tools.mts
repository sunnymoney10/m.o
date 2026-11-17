export type Role={id:string;title:string;guestId:string;confirmed:boolean};
export type Block={id:string;title:string;person:string;resource:string;start:string;end:string};
export type Need={id:string;title:string;effort:string;budget:string};
export type Tools={needs:Need[];roles:Role[];blocks:Block[]};
export const emptyTools=():Tools=>({needs:[],roles:[],blocks:[]});
export function minutes(t:string){if(!/^\d{2}:\d{2}$/.test(t))return NaN;const [h,m]=t.split(':').map(Number);return h<24&&m<60?h*60+m:NaN}
export function conflicts(blocks:Block[],field:'person'|'resource'){
 const found:{a:Block;b:Block}[]=[];
 for(let i=0;i<blocks.length;i++)for(let j=i+1;j<blocks.length;j++){
 const a=blocks[i],b=blocks[j];if(!a[field]||a[field]!==b[field])continue;
 const as=minutes(a.start),ae=minutes(a.end),bs=minutes(b.start),be=minutes(b.end);
 if(ae>as&&be>bs&&as<be&&bs<ae)found.push({a,b});
 }return found;
}
export function suggestions(needs:Need[],guests:{dish?:string;rsvp?:string}[],effort='',budget=''){
 return needs.filter(n=>(!effort||n.effort===effort)&&(!budget||n.budget===budget)&&!guests.some(g=>g.rsvp!=='Declined'&&g.dish?.trim().toLowerCase()===n.title.trim().toLowerCase()));
}
