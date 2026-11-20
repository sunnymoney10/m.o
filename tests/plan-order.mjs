// Plan lists are in date order: coming up (soonest first), no date yet, then past (most recent first).
import assert from 'node:assert/strict';
import {orderPlans,planGroup} from '../lib/plan-order.ts';
const now=Date.parse('2026-11-20T15:00:00Z'),h=3600e3,at=ms=>new Date(now+ms).toISOString();
const plans=[
 {id:'mom',date:'2026-11-21T19:00:00Z',created:'2026-11-19'},          // tomorrow
 {id:'skate',date:'2026-12-05T22:30:00Z',created:'2026-11-20'},        // in two weeks (newest made)
 {id:'circus',date:'2026-11-26T00:00:00Z',created:'2026-11-10'},       // Wed evening
 {id:'idea',date:'',created:'2026-11-18'},                              // no date yet
 {id:'tonight',date:at(-2*h),created:'2026-11-01'},                    // started 2 hours ago: still on
 {id:'weekend',date:at(-30*h),end_date:at(10*h),created:'2026-11-02'}, // multi-day, ends tonight: still on
 {id:'last-week',date:'2026-11-13T23:00:00Z',created:'2026-11-03'},    // over
 {id:'yesterday',date:at(-20*h),created:'2026-11-04'},                 // over (no end time: 6 hours)
 {id:'done-early',date:'2026-11-22T19:00:00Z',made_it:1,created:'2026-11-05'}]; // marked made it out
assert.deepEqual(orderPlans(plans,now).map(p=>p.id),['weekend','tonight','mom','circus','skate','idea','done-early','yesterday','last-week']);
assert.equal(planGroup({date:'not a date'},now),1,'a broken date counts as no date');
assert.equal(planGroup({date:at(-h),end_date:at(-3*h)},now),0,'an end before the start is ignored (6-hour rule)');
// The real plan list, for a host and for a guest of the same plans.
const origin='http://127.0.0.1:4173',host=crypto.randomUUID(),guest=crypto.randomUUID();
async function req(actor,path,method='GET',body){const r=await fetch(origin+'/api/'+path,{method,headers:{Origin:origin,Cookie:'mo_session='+actor,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()}}
const soon=new Date(Date.now()+86400e3).toISOString(),later=new Date(Date.now()+20*86400e3).toISOString(),past=new Date(Date.now()-7*86400e3).toISOString();
const ids={};for(const [k,date] of [['later',later],['none',''],['past',past],['soon',soon]]){ids[k]=(await req(host,'plans','POST',{title:'Order '+k,name:'Ari',date})).body.id;await req(guest,`plan/${ids[k]}/rsvp`,'POST',{name:'Tess',status:'in'})}
for(const who of [host,guest]){const list=(await req(who,'plans')).body.plans.filter(p=>Object.values(ids).includes(p.id)).map(p=>p.title);assert.deepEqual(list,['Order soon','Order later','Order none','Order past'],(who===host?'host':'guest')+' list in date order')}
console.log('PASS: plan lists in date order: coming up soonest first (including plans still on today), no date, then past; same for host and guest.');
