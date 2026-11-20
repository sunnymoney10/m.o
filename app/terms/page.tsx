import {LegalPage} from '@/components/mo/legal';
export const metadata={title:'Terms · m.o',description:'The rules for using m.o.'};
export default function Terms(){
 return <LegalPage title="Terms" intro="By using m.o, you agree to these rules. They’re short on purpose.">
  <section><h2>m.o is free</h2><p>Planning, inviting and answering cost nothing. If that ever changes for a new feature, it will be clearly marked, and nothing you already use will be taken away without notice.</p></section>
  <section><h2>Use it kindly</h2><ul>
   <li>Invite people you know. Don’t use m.o to spam, harass, or trick anyone.</li>
   <li>Don’t post anything illegal, hateful, or sexual, or anything you don’t have the right to share.</li>
   <li>Don’t try to get into plans you weren’t invited to, or to break or overload the site.</li>
  </ul></section>
  <section><h2>Your content is yours</h2><p>You keep what you add. You let m.o store it and show it to the people in your plan, so the app can work. That’s all it’s used for.</p></section>
  <section><h2>We can remove things</h2><p>We may remove a plan, a picture or a profile that breaks these rules, or limit how much one person can do at once to keep m.o working for everyone.</p></section>
  <section><h2>No promises</h2><p>m.o is offered as it is. We work to keep it running and your plans safe, but we can’t promise it will never be down or lose something. Keep anything important (like a booking confirmation) somewhere else too. m.o isn’t responsible for the events people plan with it.</p></section>
  <section><h2>Age</h2><p>You must be 13 or older to use m.o.</p></section>
  <section><h2>Changes</h2><p>If these terms change in a way that matters, the date at the top changes.</p></section>
 </LegalPage>;
}
