export type Info={id:string;category:string;title:string;text:string;source:string;original:string;approved:boolean;audience:string[]};
export type Reminder={id:string;text:string;when:string;guestId:string;sent:boolean};
export type Concierge={items:Info[];reminders:Reminder[];code:string;codeGuests:string[];releaseCode:boolean};
export const blankConcierge=():Concierge=>({items:[],reminders:[],code:'',codeGuests:[],releaseCode:false});
export function extractInfo(text:string,source:string):Info[]{
 const patterns:[string,RegExp][]=[['Parking',/park|driveway|garage|vehicle/i],['Arrival',/entrance|enter|arrival|arrive|check.in|gate|stairs|accessible/i],['Property rules',/quiet|smok|pet|trash|checkout|check.out|hot tub|jacuzzi|visitor|noise|recycl/i],['Dress & packing',/dress|wear|jacket|swim|towel|bring.*coat/i]];
 return text.split(/\n+/).map(s=>s.trim()).filter(Boolean).filter(s=>!/code|password|pin\b|lockbox|passcode/i.test(s)).flatMap(line=>{const found=patterns.find(([,re])=>re.test(line));return found?[{id:crypto.randomUUID(),category:found[0],title:found[0],text:line,source,original:line,approved:false,audience:[]}]:[]}).slice(0,40);
}
export function forGuest(c:Concierge|undefined,id:string,eligible:boolean){
 if(!c)return {instructions:[],accessCode:''};
 return {instructions:c.items.filter(i=>i.approved&&i.text.trim()&&(!i.audience.length||i.audience.includes(id))).map(i=>({category:i.category,title:i.title,text:i.text,source:i.source,original:i.original})),accessCode:''};
}
