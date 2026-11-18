// The m.o wordmark: heavy lowercase letters with a round dot, set in the ink color.
export function Wordmark({className=''}:{className?:string}){
 return <span className={'wordmark '+className} aria-hidden="true">m<span className="wordmark-dot">.</span>o</span>
}
