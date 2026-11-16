import assert from 'node:assert/strict';
const origin=process.env.SITE_TEST_URL||'http://127.0.0.1:4173';
const host=crypto.randomUUID(),guest=crypto.randomUUID(),stranger=crypto.randomUUID(),other=crypto.randomUUID();
async function request(actor,path,method='GET',body){const r=await fetch(origin+'/api/'+path,{method,headers:{Origin:origin,Cookie:'mo_session='+actor,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json()}}
let r=await request(host,'plans','POST',{title:'QA Atlanta weekend',name:'QA setter',kind:'trip'});assert.equal(r.status,201);const id=r.body.id;
assert.equal((await request(guest,`plan/${id}/rsvp`,'POST',{name:'QA friend',status:'in'})).status,200);

// Group decisions
assert.equal((await request(guest,`plan/${id}/polls`,'POST',{question:'Which weekend?',kind:'date',options:['2026-12-04T17:00:00Z','2026-12-11T17:00:00Z']})).status,403,'guests cannot start decisions');
assert.equal((await request(host,`plan/${id}/polls`,'POST',{question:'Which weekend?',kind:'date',options:['not a date','2026-12-11T17:00:00Z']})).status,400,'date options validated');
assert.equal((await request(host,`plan/${id}/polls`,'POST',{question:'Only one',kind:'choice',options:['A']})).status,400,'two options minimum');
r=await request(host,`plan/${id}/polls`,'POST',{question:'Which weekend?',kind:'date',options:['2026-12-04T17:00:00Z','2026-12-11T17:00:00Z']});assert.equal(r.status,201);const poll=r.body.id;
r=await request(host,`plan/${id}/polls`,'POST',{question:'Where do we stay?',kind:'place',options:['Cabin in Ellijay','Midtown Airbnb']});const placePoll=r.body.id;
r=await request(guest,'plan/'+id);let p=r.body.polls.find(x=>x.id===poll);assert.equal(p.options.length,2);const [o1,o2]=p.options;
assert.equal((await request(stranger,`plan/${id}/polls/${poll}/vote`,'POST',{optionId:o1.id})).status,403,'non-members cannot vote');
assert.equal((await request(guest,`plan/${id}/polls/${poll}/vote`,'POST',{optionId:o1.id})).body.voted,true);
assert.equal((await request(host,`plan/${id}/polls/${poll}/vote`,'POST',{optionId:o1.id})).status,200);
assert.equal((await request(guest,`plan/${id}/polls/${poll}/vote`,'POST',{optionId:o2.id})).status,200);
assert.equal((await request(guest,`plan/${id}/polls/${poll}/vote`,'POST',{optionId:o2.id})).body.voted,false,'votes toggle');
assert.equal((await request(guest,`plan/${id}/polls/${poll}/vote`,'POST',{optionId:'nope'})).status,400);
assert.equal((await request(guest,`plan/${id}/polls/${poll}/options`,'POST',{label:'2026-12-18T17:00:00Z'})).status,200,'members can suggest');
assert.equal((await request(guest,`plan/${id}/polls/${poll}/options`,'POST',{label:'someday'})).status,400);
r=await request(guest,'plan/'+id);p=r.body.polls.find(x=>x.id===poll);
assert.equal(p.options[0].votes,2);assert.equal(p.options[0].mine,true);assert.deepEqual(p.options[0].voters.sort(),['QA friend','QA setter']);assert.equal(p.options.length,3);
assert.equal((await request(guest,`plan/${id}/polls/${poll}/decide`,'POST',{optionId:o1.id})).status,403,'only host locks in');
assert.equal((await request(host,`plan/${id}/polls/${poll}/decide`,'POST',{optionId:o1.id})).status,200);
r=await request(guest,'plan/'+id);assert.equal(r.body.plan.date,'2026-12-04T17:00:00.000Z','locked date becomes the plan date');assert.equal(r.body.polls.find(x=>x.id===poll).decided_option,o1.id);
assert.equal((await request(guest,`plan/${id}/polls/${poll}/vote`,'POST',{optionId:o2.id})).status,400,'locked decisions are closed');
const placeOpt=r.body.polls.find(x=>x.id===placePoll).options[1].id;
assert.equal((await request(host,`plan/${id}/polls/${placePoll}/decide`,'POST',{optionId:placeOpt})).status,200);
r=await request(host,'plan/'+id);assert.equal(r.body.plan.place,'Midtown Airbnb');
assert.equal((await request(guest,`plan/${id}/polls/${placePoll}`,'DELETE')).status,403);
assert.equal((await request(host,`plan/${id}/polls/${placePoll}`,'DELETE')).status,200);
r=await request(host,'plan/'+id);assert.equal(r.body.polls.length,1);

// Live plan
assert.equal((await request(guest,`plan/${id}/stops`,'POST',{title:'Check in'})).status,403);
assert.equal((await request(host,`plan/${id}/stops`,'POST',{title:'Check in',url:'http://insecure.example'})).status,400);
assert.equal((await request(host,`plan/${id}/stops`,'POST',{title:'Dinner at Mary Mac’s',at:'2026-12-04T23:30:00Z',detail:'Reservation under QA'})).status,201);
assert.equal((await request(host,`plan/${id}/stops`,'POST',{title:'House rules',url:'https://example.com/rules'})).status,201);
assert.equal((await request(host,`plan/${id}/stops`,'POST',{title:'Check in',at:'2026-12-04T21:00:00Z'})).status,201);
r=await request(guest,'plan/'+id);assert.deepEqual(r.body.stops.map(s=>s.title),['Check in','Dinner at Mary Mac’s','House rules'],'timed stops first, in order');
assert.equal((await request(host,`plan/${id}/stops/${r.body.stops[2].id}`,'DELETE')).status,200);

// Replay
assert.equal((await request(stranger,`plan/${id}/memories`,'POST',{body:'I was there'})).status,403,'only people who were in');
assert.equal((await request(guest,`plan/${id}/memories`,'POST',{body:'Best wings of my life',photoUrl:'javascript:alert(1)'})).status,400);
assert.equal((await request(guest,`plan/${id}/memories`,'POST',{body:'Best wings of my life'})).status,201);
assert.equal((await request(guest,`plan/${id}/memories`,'POST',{body:'QA setter found the Airbnb',kind:'shoutout'})).status,201);
r=await request(host,'plan/'+id);assert.equal(r.body.memories.length,2);assert.equal(r.body.memories[0].isMine,false);assert.ok(!('actor' in r.body.memories[0]));
const mem=r.body.memories[0].id;
assert.equal((await request(stranger,`plan/${id}/memories/${mem}`,'DELETE')).status,403);
assert.equal((await request(host,`plan/${id}/memories/${mem}`,'DELETE')).status,200,'organizer can moderate');
assert.equal((await request(guest,'plan/'+id,'PATCH',{madeIt:true})).status,403);
assert.equal((await request(host,'plan/'+id,'PATCH',{madeIt:true})).status,200);
r=await request(host,'plan/'+id);assert.equal(r.body.plan.made_it,1);assert.equal(r.body.plan.title,'QA Atlanta weekend','partial update keeps details');

// What's your mo?
r=await request(guest,'me');assert.equal(r.body.profile,null);assert.equal(r.body.history.length,1);assert.deepEqual(r.body.cities,['Midtown Airbnb']);
assert.equal((await request(guest,'me','PUT',{name:'Jules',handle:'Bad Handle!'})).status,400);
assert.equal((await request(guest,'me','PUT',{name:'Jules',handle:'@Jules',mo:'One more song.',interests:['Live music','Food runs','Live music'],style:'snacks'})).status,200);
assert.equal((await request(other,'me','PUT',{name:'Copycat',handle:'jules'})).status,409,'handles are unique');
r=await request(guest,'me');assert.equal(r.body.profile.handle,'jules');assert.deepEqual(r.body.profile.interests,['Live music','Food runs']);
r=await request(host,'plan/'+id);const g=r.body.guests.find(x=>x.name==='Jules');assert.ok(g,'profile name flows to plans');assert.equal(g.handle,'jules');assert.equal(g.mo,'One more song.');
console.log('PASS: group decisions, lock-in to plan details, live itinerary, replay permissions, made-it-out history and profiles.');
