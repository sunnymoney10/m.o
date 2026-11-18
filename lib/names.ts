// Turns pasted or picked text into guest names only. m.o stores names, never phone numbers or emails,
// so anything that looks like contact details is dropped before it is saved (client and server both use this).
const EMAIL=/[^\s<>(),;]+@[^\s<>(),;]+\.[^\s<>(),;]+/g;
const PHONE=/\+?\d[\d\s().-]{5,}\d/g;
const EMOJI=/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu;
export function cleanName(raw:string){
 return raw.replace(EMAIL,' ').replace(PHONE,' ').replace(EMOJI,' ')
  .replace(/^[\s\-–—•*·~>]+|^\d+[.)]\s+/,'')            // list bullets and "1." numbering
  .replace(/\((?:you|me|admin)\)|<\s*>|\(\s*\)/gi,' ')  // leftovers like "(you)" or empty brackets
  .replace(/\s+/g,' ').replace(/^[\s,.;:]+|[\s,.;:]+$/g,'').slice(0,60);
}
export function splitNames(text:string){
 const seen=new Set<string>(),out:string[]=[];
 for(const part of text.split(/\n|,|;/)){const n=cleanName(part);const k=n.toLowerCase();if(n&&/\p{L}/u.test(n)&&!seen.has(k)){seen.add(k);out.push(n)}}
 return out;
}
