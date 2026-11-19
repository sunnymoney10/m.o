// Personal invites. Phone numbers never leave the host's phone: they live in this browser's storage only,
// keyed by plan and guest name. m.o never sends texts; it opens the phone's Messages app with a
// personal message filled in, and the host taps Send.
const PHONE=/\+?\d[\d\s().-]{5,}\d/;

// Personal links are issued by the authenticated host endpoint, never derived from public IDs.

export const TRIP_MESSAGE="Hi {first}! I'm planning {plan}{when} and I'd love for you to come. Tap to say if you're in and see what still needs doing: {link}";
export const DEFAULT_MESSAGE="Hi {first}! I'm hosting {plan}{when} and I'd love for you to come. Tap to say if you can make it and pick something to bring: {link}";
export function fillMessage(template:string,v:{first:string;plan:string;when:string;link:string}){
 return template.replace(/\{first\}/g,v.first).replace(/\{plan\}/g,v.plan).replace(/\{when\}/g,v.when?` on ${v.when}`:'').replace(/\{link\}/g,v.link);
}
// Opens Messages with the number (if any) and the message filled in. iPhone uses "&body=", others "?body=".
export function smsHref(phone:string,body:string){
 const ios=typeof navigator!=='undefined'&&/iPhone|iPad|iPod/.test(navigator.userAgent);
 const to=phone.replace(/[^\d+]/g,'');
 return `sms:${to}${ios?'&':'?'}body=${encodeURIComponent(body)}`;
}

// Per-plan device storage. Every access is guarded: private mode or blocked storage must not break the page.
export type InviteStore={links?:Record<string,{url:string;expires:string}>;phones:Record<string,string>;sent:Record<string,string>;template?:string};
const key=(planId:string)=>'mo-invites-'+planId;
export function loadInvites(planId:string):InviteStore{try{const v=JSON.parse(localStorage.getItem(key(planId))||'{}');return {phones:v.phones||{},sent:v.sent||{},template:v.template,links:v.links||{}}}catch{return {phones:{},sent:{}}}}
export function saveInvites(planId:string,s:InviteStore){try{localStorage.setItem(key(planId),JSON.stringify(s))}catch{}}
export const nameKey=(n:string)=>n.trim().toLowerCase();

// "Tess 215-555-0134" or "Sam Lee, +1 (215) 555 0199" on one line → {name → number}. Only lines with exactly one name count.
export function phonesFromText(text:string,clean:(s:string)=>string){
 const out:Record<string,string>={};
 for(const line of text.split(/\n/)){const m=line.match(PHONE);if(!m)continue;
  const names=line.replace(PHONE,' ').split(/,|;/).map(clean).filter(n=>/\p{L}/u.test(n));
  if(names.length===1)out[nameKey(names[0])]=m[0].trim();}
 return out;
}
