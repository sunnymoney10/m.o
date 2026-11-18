// Avatar choices people make for themselves. The server stores only values from these lists.
// Face tones include the brand colours and a range of skin tones; it's the person's own choice, never assigned.
export const AVATAR={
 tones:[['butter','#f5d36a'],['sky','#c5d4f0'],['periwinkle','#8ea4d8'],['sage','#a9c4a0'],['skin1','#f1c9a5'],['skin2','#d9a27a'],['skin3','#b8794f'],['skin4','#8d5636'],['skin5','#6b3d26'],['skin6','#4a2a1c']],
 hair:[['none','No hair'],['short','Short'],['fade','Fade'],['curls','Curls'],['afro','Afro'],['bun','Bun'],['braids','Braids'],['locs','Locs'],['cap','Cap']],
 hairColors:[['black','#1d1416'],['plum','#3a1a2b'],['brown','#5a3a22'],['auburn','#8f3f22'],['blonde','#d9b56b'],['grey','#a8a1a4'],['pink','#e8a598'],['blue','#8ea4d8']],
 shirts:[['brick','#b23b28'],['butter','#f5d36a'],['periwinkle','#8ea4d8'],['plum','#3a1a2b'],['blush','#e8a598'],['sage','#a9c4a0']],
 backgrounds:[['butter','#f5d36a'],['sky','#c5d4f0'],['blush','#f7e2da'],['cream','#fbefc6'],['mist','#e4ebf8']],
} as const;
export type Avatar={tone:string;hair:string;hairColor:string;shirt:string;bg:string;glasses:boolean;hoops:boolean};
export const DEFAULT_AVATAR:Avatar={tone:'butter',hair:'short',hairColor:'plum',shirt:'brick',bg:'sky',glasses:false,hoops:false};
const keys=(list:readonly (readonly [string,string])[])=>list.map(x=>x[0]);
const color=(list:readonly (readonly [string,string])[],k:string)=>list.find(x=>x[0]===k)?.[1]||list[0][1];

// Returns a valid avatar or null. Anything not on the lists is dropped.
export function cleanAvatar(v:unknown):Avatar|null{
 if(!v||typeof v!=='object')return null;const a=v as Record<string,unknown>;
 const pickKey=(k:string,list:readonly (readonly [string,string])[])=>typeof a[k]==='string'&&keys(list).includes(a[k] as string)?a[k] as string:null;
 const out={tone:pickKey('tone',AVATAR.tones),hair:pickKey('hair',AVATAR.hair),hairColor:pickKey('hairColor',AVATAR.hairColors),shirt:pickKey('shirt',AVATAR.shirts),bg:pickKey('bg',AVATAR.backgrounds)};
 if(Object.values(out).some(x=>x===null))return null;
 return {...(out as Omit<Avatar,'glasses'|'hoops'>),glasses:a.glasses===true,hoops:a.hoops===true};
}
export function parseAvatar(s:unknown){if(typeof s!=='string'||!s)return null;try{return cleanAvatar(JSON.parse(s))}catch{return null}}
// Colours for drawing an avatar.
export function avatarColors(a:Avatar){return {skin:color(AVATAR.tones,a.tone),hair:color(AVATAR.hairColors,a.hairColor),shirt:color(AVATAR.shirts,a.shirt),bg:color(AVATAR.backgrounds,a.bg)}}

// Profile photos are small images resized on the phone before upload, so they fit the free database tier.
export const PHOTO_MAX_BYTES=48000;
const PHOTO=/^data:image\/(jpeg|webp|png);base64,([A-Za-z0-9+/]+={0,2})$/;
export function parsePhoto(v:unknown):{type:string;bytes:Uint8Array}|null{
 if(typeof v!=='string'||v.length>PHOTO_MAX_BYTES*1.4)return null;const m=PHOTO.exec(v);if(!m)return null;
 let bin:string;try{bin=atob(m[2])}catch{return null}
 if(!bin.length||bin.length>PHOTO_MAX_BYTES)return null;
 const bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));
 // Check the file really is the image type it claims to be.
 const ok=m[1]==='jpeg'?bytes[0]===0xff&&bytes[1]===0xd8:m[1]==='png'?bytes[0]===0x89&&bytes[1]===0x50:String.fromCharCode(...bytes.slice(8,12))==='WEBP';
 return ok?{type:'image/'+m[1],bytes}:null;
}
