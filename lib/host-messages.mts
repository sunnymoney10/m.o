// Deterministic, editable drafts. This module never sends messages or infers commitments.
export const messageKinds=['Invitation','Follow-up','Dish confirmation','Plus-one','Address'] as const;
export type MessageKind=typeof messageKinds[number];
export type MessageDesk={title:string;when:string;place:string;address:string;invite:string};
export type MessageGuest={name:string;rsvp:string;dish:string;plus:string;plusNames:string;draft?:string;draftKind?:MessageKind;draftContext?:string;sent?:string};
export function messageContext(d:MessageDesk,g:MessageGuest,kind:MessageKind){
 return JSON.stringify({kind,title:d.title,when:d.when,place:d.place,
  ...(kind==='Invitation'?{invite:d.invite}:{}),
  ...(kind==='Address'?{address:d.address}:{}),
  name:g.name,rsvp:g.rsvp,dish:g.dish,plus:g.plus,plusNames:g.plusNames});
}
export function messageIssue(d:MessageDesk,g:MessageGuest,kind:MessageKind){
 if(!g.name.trim())return 'Add the guest’s name first.';
 if(kind==='Invitation'&&!d.invite.trim())return 'Add your invitation text in Event details first.';
 if(kind==='Address'&&!d.address.trim())return 'Add the address in Event details first.';
 if(kind==='Address'&&g.rsvp!=='Confirmed')return 'Confirm this guest’s attendance before preparing an address message.';
 if(g.rsvp==='Declined'&&(kind==='Follow-up'||kind==='Dish confirmation'))return 'This guest declined. Use an invitation draft if you intend to invite them again.';
 return '';
}
export function prepareMessage(d:MessageDesk,g:MessageGuest,kind:MessageKind){
 const issue=messageIssue(d,g,kind);if(issue)return {text:'',issue};
 const event=d.title.trim()||'our get-together';
 const timing=d.when.trim()?` on ${d.when.trim()}`:'';
 const hello=`Hey ${g.name.trim()} ❤️`;
 let text='';
 if(kind==='Invitation')text=`${hello} ${d.invite.trim()}`;
 else if(kind==='Address')text=`${hello} ${event}${timing}. Here’s the address: ${d.address.trim()}. Can’t wait to see you!`;
 else if(kind==='Dish confirmation')text=g.dish.trim()?`${hello} checking on ${g.dish.trim()} for ${event}${timing}. ${g.rsvp==='Confirmed'?'Are you still able to bring it?':'If you can make it, would you still like to bring it?'} About how many people would it serve?`:`${hello} what would you like to bring to ${event}${timing}${g.rsvp==='Confirmed'?'':' if you can make it'}? No contribution is recorded yet.`;
 else if(kind==='Plus-one')text=g.plus==='Approved'?`${hello} I have your plus-one approved for ${event}${g.plusNames.trim()?': '+g.plusNames.trim():''}. Please let me know if those details change.`:`${hello} can you send me the name of anyone you’d like to bring to ${event}? I’ll confirm before adding anyone to the headcount.`;
 else text=g.rsvp==='Confirmed'?`${hello} thanks for confirming ${event}${timing}! ${g.dish.trim()?`Are you still able to bring ${g.dish.trim()}?`:'Would you like to take on a contribution or help with preparation?'}`:`${hello} checking in about ${event}${timing}. Can you let me know if you’re able to come${g.dish.trim()?' and whether you’d still like to bring '+g.dish.trim():''}?${!d.when.trim()?' We still need to agree a date and time.':''}`;
 return {text,issue:''};
}
export function messageNeedsReview(d:MessageDesk,g:MessageGuest){
 if(!g.draft?.trim())return false;
 return !g.draftKind||!messageKinds.includes(g.draftKind)||g.draftContext!==messageContext(d,g,g.draftKind);
}
export function messageReady(d:MessageDesk,g:MessageGuest){
 return !!g.draft?.trim()&&!messageNeedsReview(d,g)&&!!g.draftKind&&!messageIssue(d,g,g.draftKind);
}
