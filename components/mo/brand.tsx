// m.o brand marks, drawn as shapes (not typed text) so they look the same everywhere.
// The idea: the dot in "m.o" is a person with a saved seat at the table, a round head over one table line.
// Wordmark: the full name. Mark: the seat on its own, for icons and small places. Sizes follow font-size (1em tall).
// Ink parts use currentColor; the head is always brick. See docs/brand.md for use rules.
export function Wordmark({className=''}:{className?:string}){
 return <svg className={'wordmark '+className} viewBox="0 20 160 66" aria-hidden="true" focusable="false">
  <path d="M10 80V37M10 52a15 15 0 0 1 30 0v28M40 52a15 15 0 0 1 30 0v28" fill="none" stroke="currentColor" strokeWidth="14"/>
  <circle className="mark-head" cx="91" cy="64" r="9.5"/>
  <rect x="80" y="75" width="22" height="5" rx="2.5" fill="currentColor"/>
  <circle cx="131" cy="55" r="18" fill="none" stroke="currentColor" strokeWidth="14"/>
 </svg>
}
export function Mark({className=''}:{className?:string}){
 return <svg className={'brand-mark '+className} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
  <circle className="mark-head" cx="32" cy="25" r="13"/>
  <rect x="13" y="43" width="38" height="8" rx="4" fill="currentColor"/>
 </svg>
}
