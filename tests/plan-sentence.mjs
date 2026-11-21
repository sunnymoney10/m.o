// The one-sentence new plan: fixed rules that suggest a day, time and kind. Nothing is used until the host taps.
import assert from 'node:assert/strict';
import {readSentence,bringIdeas} from '../lib/plan-sentence.ts';
const now=new Date(2026,10,21,10,0); // Saturday, Nov 21 2026, 10 AM (local)
const r=(t)=>readSentence(t,now);
assert.deepEqual(r('Friendsgiving at my place Thursday at 4'),{date:'2026-11-26T16:00',timeGiven:true,title:'Friendsgiving at my place',kind:'gathering'},'"at 4" reads as 4 PM; "at my place" stays in the name');
assert.equal(r('Skate night Friday 7:30pm').date,'2026-11-27T19:30');
assert.equal(r('Dinner Nov 26 at 6 PM').date,'2026-11-26T18:00');
assert.equal(r('Brunch tomorrow at 11am').date,'2026-11-22T11:00');
assert.equal(r('Drinks on Saturday at noon').date,'2026-11-28T12:00','a weekday named on that same day means next week');
assert.deepEqual(r('Beach trip 12/4'),{date:'2026-12-04T18:00',timeGiven:false,title:'Beach trip',kind:'trip'},'no time: 6 PM, and the host is told');
assert.equal(r('Lake house weekend Jan 16th').date,'2027-01-16T18:00','a date already past this year means next year');
assert.equal(r('Game night tonight').timeGiven,false);
assert.equal(r('Karaoke at Joe’s').date,'','no day, nothing suggested');
assert.equal(r('Party on 2/30').date,'','an impossible date is ignored');
assert.equal(r('Karaoke at 9').date,'','a time alone is not a day');
assert.equal(r('').kind,null);
assert.ok(bringIdeas('Friendsgiving','gathering').includes('Dessert'));
assert.ok(bringIdeas('Atlanta','trip').includes('Book the stay'));
assert.deepEqual(bringIdeas('Skating','gathering'),['Snacks','Drinks & ice']);
console.log('PASS: one-sentence plan: day, time and kind read by fixed rules (suggestions only); impossible or missing days suggest nothing.');
