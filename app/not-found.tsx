// The page people see when a link is wrong or a page no longer exists: m.o's own art and two ways back.
import {Scene} from '@/components/mo/art';
import {Wordmark} from '@/components/mo/brand';
export const metadata={title:'Page not found · m.o'};
export default function NotFound(){
 return <main className="lost-page">
  <a className="lost-mark" href="/" aria-label="m.o home"><Wordmark/></a>
  <div className="lost-art"><Scene kind="night" seed="lost"/></div>
  <h1>We can’t find that page.</h1>
  <p>The link may have a typo, or the page was moved. If someone sent you a plan, ask them to send the link again.</p>
  <div className="lost-actions"><a className="primary lost-plans" href="/?view=plans">Go to my plans</a><a className="outline-button lost-home" href="/">Go to the home page</a></div>
  <p className="lost-help">Need a hand? <a href="/help">See Help</a>.</p>
 </main>;
}
