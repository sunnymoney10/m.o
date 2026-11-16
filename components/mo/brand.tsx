// Small brand pieces from the mo. visual direction: hand-drawn emphasis marks and blob photo frames.
export function Marks({className='',color='coral'}:{className?:string;color?:'coral'|'purple'}){
 return <svg className={'marks marks-'+color+' '+className} viewBox="0 0 60 60" aria-hidden="true"><path d="M30 6l4 14M50 16l-11 10M56 38l-14-2" strokeWidth="6" strokeLinecap="round" fill="none"/></svg>
}
export function BlobPhoto({src,tone='purple',className='',alt=''}:{src:string;tone?:'purple'|'coral';className?:string;alt?:string}){
 return <img className={'blob-photo '+tone+' '+className} src={src} alt={alt} loading="lazy"/>
}
export function BlobPair({left,right,leftLabel,rightLabel}:{left:string;right:string;leftLabel?:string;rightLabel?:string}){
 return <div className="blob-pair">
  <figure><BlobPhoto src={left} tone="purple"/>{leftLabel&&<figcaption>{leftLabel}</figcaption>}</figure>
  <span className="connector" aria-hidden="true"/>
  <figure><BlobPhoto src={right} tone="coral" className="b2"/>{rightLabel&&<figcaption>{rightLabel}</figcaption>}</figure>
 </div>
}
