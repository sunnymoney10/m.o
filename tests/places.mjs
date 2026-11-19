// Address search and booking links.
import assert from 'node:assert/strict';
import {placeResults,isBookingLink,readQuery,eventTries,eventResults} from '../lib/places.ts';
const origin=process.env.SITE_TEST_URL||'http://127.0.0.1:4173';
const host=crypto.randomUUID(),friend=crypto.randomUUID(),stranger=crypto.randomUUID();
async function request(actor,path,method='GET',body){const r=await fetch(origin+'/api/'+path,{method,headers:{Origin:origin,Cookie:'mo_session='+actor,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json()}}

// OpenStreetMap results become a name plus a readable address; duplicates and empty rows drop out.
const rows=placeResults({features:[
 {properties:{name:'State Farm Arena',housenumber:'1',street:'State Farm Drive',city:'Atlanta',state:'Georgia',postcode:'30303'}},
 {properties:{name:'State Farm Arena',housenumber:'1',street:'State Farm Drive',city:'Atlanta',state:'Georgia',postcode:'30303'}},
 {properties:{housenumber:'1420',street:'Elm St',city:'Philadelphia',state:'Pennsylvania'}},{properties:{}}]});
assert.deepEqual(rows,[{name:'State Farm Arena',address:'1 State Farm Drive, Atlanta, Georgia, 30303'},{name:'1420 Elm St',address:'Philadelphia, Pennsylvania'}]);
assert.deepEqual(placeResults(null),[]);
assert.ok(isBookingLink('https://www.airbnb.com/trips/v1/abc')&&isBookingLink('https://abnb.me/x1')&&isBookingLink('https://www.vrbo.com/123'));
assert.ok(!isBookingLink('1420 Elm St')&&!isBookingLink('http://www.airbnb.com/x')&&!isBookingLink('https://airbnb.com.evil.example/x'));

// Event searches: "near me" is understood, a trailing city is tried, and events come back with venue and address.
assert.deepEqual(readQuery('UniverSoul Circus near me'),{text:'UniverSoul Circus',near:true});
assert.deepEqual(eventTries('UniverSoul Circus Raleigh'),[{keyword:'UniverSoul Circus Raleigh'},{keyword:'UniverSoul Circus',city:'Raleigh'},{keyword:'UniverSoul',city:'Circus Raleigh'}]);
assert.deepEqual(eventResults({_embedded:{events:[{name:'UniverSoul Circus',dates:{start:{dateTime:'2026-12-05T19:00:00Z'}},_embedded:{venues:[{name:'Dorton Arena',address:{line1:'1025 Blue Ridge Rd'},city:{name:'Raleigh'},state:{stateCode:'NC'},postalCode:'27607'}]}},{name:'',dates:{}}]}}),
 [{name:'UniverSoul Circus',address:'1025 Blue Ridge Rd, Raleigh, NC, 27607',date:'2026-12-05T19:00:00Z',venue:'Dorton Arena'}]);
assert.deepEqual(eventResults({}),[]);
// Short searches return nothing without calling out; searches are capped per person.
let r=await request(host,'places?q=ab');assert.deepEqual(r.body,{results:[],events:[]});
r=await request(host,'places?q=near%20me');assert.deepEqual(r.body,{results:[],events:[]},'near me alone is not a search');

// The booking link saves, is hidden from people who haven't said they're coming, and rejects non-HTTPS.
r=await request(host,'plans','POST',{title:'Atlanta weekend',name:'Ari',kind:'trip',bookingUrl:'http://www.airbnb.com/x'});assert.equal(r.status,400);
r=await request(host,'plans','POST',{title:'Atlanta weekend',name:'Ari',kind:'trip',bookingUrl:'https://www.airbnb.com/trips/v1/abc'});assert.equal(r.status,201);const id=r.body.id;
r=await request(host,'plan/'+id);assert.equal(r.body.plan.booking_url,'https://www.airbnb.com/trips/v1/abc');
r=await request(stranger,'plan/'+id);assert.equal(r.body.plan.booking_url,null);assert.equal(r.body.hidden,true);
r=await request(friend,`plan/${id}/rsvp`,'POST',{name:'Tess',status:'in'});r=await request(friend,'plan/'+id);assert.equal(r.body.plan.booking_url,'https://www.airbnb.com/trips/v1/abc');
r=await request(friend,'plan/'+id,'PATCH',{bookingUrl:'https://evil.example'});assert.equal(r.status,403);
r=await request(host,'plan/'+id,'PATCH',{bookingUrl:''});assert.equal(r.status,200);r=await request(host,'plan/'+id);assert.equal(r.body.plan.booking_url,null);
console.log('PASS: address search results, booking links kept private until someone RSVPs, and host-only changes.');
