// The order plans are listed in: coming up (soonest first), then plans with no date yet (newest first), then past
// plans (most recent first). A plan is past once it has ended: its end time, or 6 hours after it starts if it has
// none. A plan marked "made it out" counts as past.
type Orderable={date?:string|null;end_date?:string|null;created?:string|null;made_it?:number|boolean|null};
const time=(s?:string|null)=>{if(!s)return NaN;const t=Date.parse(s);return Number.isNaN(t)?NaN:t};
export function planGroup(p:Orderable,now=Date.now()):0|1|2{
 const start=time(p.date);if(Number.isNaN(start))return p.made_it?2:1;
 const end=time(p.end_date);const over=(Number.isNaN(end)||end<start?start+6*3600e3:end)<now;
 return over||p.made_it?2:0;
}
export function orderPlans<T extends Orderable>(plans:T[],now=Date.now()):T[]{
 return plans.map((p,i)=>({p,i,g:planGroup(p,now),t:time(p.date),c:time(p.created)})).sort((a,b)=>
  a.g-b.g||(a.g===0?a.t-b.t:a.g===2?b.t-a.t:(b.c||0)-(a.c||0))||a.i-b.i).map(x=>x.p);
}
