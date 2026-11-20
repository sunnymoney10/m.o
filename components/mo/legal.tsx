// Shared frame for the Privacy and Terms pages: the m.o mark, a heading, and a way back.
import {Wordmark} from '@/components/mo/brand';
import {SUPPORT_EMAIL,POLICY_DATE} from '@/lib/site';
export function LegalPage({title,intro,children,contactTitle='Contact',contactLine='Questions, a problem, or a request to delete your data: email'}:{title:string;intro:string;children:React.ReactNode;contactTitle?:string;contactLine?:string}){
 return <main className="legal-page">
  <a className="lost-mark" href="/" aria-label="m.o home"><Wordmark/></a>
  <h1>{title}</h1><p className="legal-date">Last updated {POLICY_DATE}</p>
  <p className="legal-intro">{intro}</p>
  {children}
  <section className="legal-contact"><h2>{contactTitle}</h2><p>{contactLine} <a href={'mailto:'+SUPPORT_EMAIL}>{SUPPORT_EMAIL}</a>.</p></section>
  <nav className="legal-links" aria-label="More"><a href="/help">Help</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/">Go to the home page</a></nav>
 </main>;
}
