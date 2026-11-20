import {LegalPage} from '@/components/mo/legal';
export const metadata={title:'Privacy · m.o',description:'What m.o keeps, who can see it, and how to delete it.'};
export default function Privacy(){
 return <LegalPage title="Privacy" intro="m.o is free. It has no ads, no trackers, and doesn’t sell or share your information. It keeps only what a plan needs.">
  <section><h2>What m.o keeps</h2><ul>
   <li>Plans: the title, date, place, notes, bring list, votes, schedule, cover picture and photos the host or guests add.</li>
   <li>Guests: the names the host types, and each guest’s answer, number of extra people, food needs and note.</li>
   <li>Your profile, if you make one: your name, picture or chosen face, and what you’re into.</li>
   <li>A cookie called <code>mo_session</code>. It’s a random code that lets this browser keep managing your plans and answers. It isn’t used for ads or tracking.</li>
   <li>A short history of changes inside each plan (for example, “Tess claimed drinks”), shown to the people in that plan.</li>
   <li>Counts only, for the owner: how many plans were made or answers sent each day, and when a request failed. These hold no names, IDs or plan details.</li>
  </ul></section>
  <section><h2>What m.o doesn’t keep</h2><ul>
   <li>Phone numbers. When a host picks people from their contacts, the numbers stay on the host’s phone.</li>
   <li>Your messages. m.o never sends texts. It opens your Messages app with a message filled in, and you tap Send.</li>
   <li>Your contacts list, location history or anything from other apps.</li>
  </ul></section>
  <section><h2>Who can see what</h2><ul>
   <li>Anyone with a plan’s link can see its title, date, the host’s name, who’s invited, their answers and the bring list. Share the link only with people you’d invite.</li>
   <li>The address and booking link show only to the host, to guests the host invited by name once they say they’re coming or checking, and to other guests the host approves.</li>
   <li>A guest’s food needs and note show only to the host and that guest.</li>
   <li>Personal invite links work for one person. The host can turn one off at any time.</li>
  </ul></section>
  <section><h2>Other services m.o uses</h2><ul>
   <li>Cloudflare runs m.o and stores its data.</li>
   <li>Google Fonts supplies the lettering. Your browser asks Google for the font files.</li>
   <li>When you search for an address, what you type (and, if you allow it, your rough location, to show nearby places first) goes to OpenStreetMap’s Photon search and the US Census address search. When you search for an event, what you type goes to Ticketmaster. These requests come from m.o’s server, not with your name.</li>
   <li>If a host uses m.o from ChatGPT, the plan details they work on there also go through OpenAI, under OpenAI’s own terms.</li>
  </ul></section>
  <section><h2>Deleting your information</h2><ul>
   <li>A host can delete a plan at any time (Edit plan details → Delete this plan). That removes its guests, answers, items, votes and photos.</li>
   <li>A guest can change their answer, or ask the host to remove them.</li>
   <li>You can remove your profile picture in your profile. To delete your whole profile, or anything else, email us (below). We answer within 30 days.</li>
  </ul></section>
  <section><h2>Children</h2><p>m.o is for people 13 and older.</p></section>
  <section><h2>Changes</h2><p>If this page changes in a way that matters, the date at the top changes.</p></section>
 </LegalPage>;
}
