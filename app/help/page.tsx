// Help: answers to the questions people ask most, so they don't have to email. Plain fixed answers (not AI), kept in
// step with the app's real buttons. Anything not covered goes to the support email at the bottom.
import {LegalPage} from '@/components/mo/legal';
export const metadata={title:'Help · m.o',description:'Answers for hosts and guests, and how to reach m.o.'};
const Q=({q,children}:{q:string;children:React.ReactNode})=><details className="help-q"><summary>{q}</summary><div>{children}</div></details>;
export default function Help(){
 return <LegalPage title="Help" intro="Tap a question to see the answer. If yours isn’t here, email us at the bottom." contactTitle="Still stuck?" contactLine="Email">
  <section aria-labelledby="help-hosts"><h2 id="help-hosts">For hosts</h2>
   <Q q="How do I invite people?"><p>Open your plan, tap People, then Send invites. Each person gets their own text with their own link. m.o opens your Messages app with the text filled in, and you tap Send. To share one link in a group chat instead, tap Copy plan link.</p></Q>
   <Q q="Who can see the address?"><p>People you invited by name see it as soon as they say they’re coming or still checking. People who joined from the group link need your OK: in People, tap Approve arrival access next to their name. You can hide it from anyone with Hide arrival details.</p></Q>
   <Q q="How do I change or delete my plan?"><p>On the plan, tap the pencil (Edit plan details). You can change the name, date, place, type and more. Delete this plan is at the bottom. Deleting removes its guests, answers, items, votes and photos.</p></Q>
   <Q q="How do I fix the bring list?"><p>Open the Bring list tab. Each item has Edit and Remove. Whoever was bringing an item keeps it when you edit the wording.</p></Q>
   <Q q="Someone answered me by text. How do I add it?"><p>In People, tap Update answer next to their name. It shows as noted by you until they confirm it themselves.</p></Q>
   <Q q="How do I manage my plan on another phone?"><p>m.o remembers you by the browser you made the plan in. On that phone, open the plan and tap Get my host link (under More tools once it’s made). Open that link on the other phone and tap Open as host. Keep it private: anyone with it can manage your plan.</p></Q>
   <Q q="Can guests bring someone?"><p>Yes. A guest who answered can ask to bring someone, and you tap Yes or Not this time. To skip asking, edit the plan and tick Guests can bring someone without asking me.</p></Q>
  </section>
  <section aria-labelledby="help-guests"><h2 id="help-guests">For guests</h2>
   <Q q="How do I answer?"><p>Open the link your host sent you and tap I’m in, Still checking, or Can’t make it. You don’t need an account.</p></Q>
   <Q q="How do I change my answer?"><p>Open the plan, tap People, and tap Change under your answer.</p></Q>
   <Q q="How do I pick something to bring?"><p>After you answer, open the Bring list tab and tap I can bring this on an item.</p></Q>
   <Q q="Why can’t I see the address?"><p>If your host sent you your own link, the address shows once you answer. If you joined from a group link, your host needs to OK it first. Ask them to tap Approve arrival access next to your name.</p></Q>
   <Q q="My link doesn’t work."><p>Personal links can expire, or your host may have made a new one. Ask your host to send it again from People, then Send invites.</p></Q>
   <Q q="Can I bring someone?"><p>After you answer, look for Bringing someone? on the plan. Type their name and ask your host. If your host says yes, you can send them their own invite.</p></Q>
  </section>
  <section aria-labelledby="help-about"><h2 id="help-about">About m.o</h2>
   <Q q="Does m.o cost anything?"><p>No. Planning, inviting and answering are free, with no ads.</p></Q>
   <Q q="Does m.o text people for me?"><p>No. m.o opens your Messages app with the text filled in, and you tap Send. Your guests’ phone numbers stay on your phone.</p></Q>
   <Q q="Does it work with Apple Invites?"><p>You can add your m.o plan’s link to an Apple Invites event so guests see the bring list, and add the plan to your calendar. Answers in Apple Invites don’t show up in m.o.</p></Q>
   <Q q="How do I delete my information?"><p>Hosts can delete a plan themselves (see above). For anything else, email us and we’ll do it. See <a href="/privacy">Privacy</a> for what m.o keeps.</p></Q>
  </section>
 </LegalPage>;
}
