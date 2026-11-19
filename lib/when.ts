// How a plan's date reads everywhere (plan page, invites, group messages).
// One day: "Thu, Nov 26 · 6:00 PM". More than one day: "Fri, Dec 4, 6:00 PM – Sun, Dec 6".
const day=(d:Date)=>d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
const clock=(d:Date)=>d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
const valid=(s?:string|null)=>{if(!s)return null;const d=new Date(s);return Number.isNaN(+d)?null:d};
export function multiDay(start?:string|null,end?:string|null){const a=valid(start),b=valid(end);return !!a&&!!b&&b>a&&day(a)!==day(b)}
export function whenRange(start?:string|null,end?:string|null,sep=' · '){
 const a=valid(start);if(!a)return '';
 if(!multiDay(start,end))return day(a)+sep+clock(a);
 return `${day(a)}, ${clock(a)} – ${day(valid(end)!)}`;
}
// End of the event for calendars: the end date if there is one, otherwise two hours after the start.
export function endFor(start:string,end?:string|null){const a=new Date(start),b=valid(end);return b&&b>a?b:new Date(+a+7200000)}
