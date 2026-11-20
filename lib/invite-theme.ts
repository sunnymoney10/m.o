export const INVITE_THEMES=[
 ['company','Good company','✨'],['skating','Skating','🛼'],['music','Music','🎵'],
 ['outdoors','Outdoors','🌿'],['dinner','Dinner','🍽️'],['celebration','Celebration','🎉'],
 ['travel','Travel','🧳'],['games','Games','🎲'],
] as const;
export const INVITE_COLORS={butter:'#f5d36a',sky:'#c5d4f0',blush:'#e9b2a5',sage:'#b5c9aa',plum:'#3a1a2b'};
export function themeError(v:{theme?:unknown;accent?:unknown;emoji?:unknown}){
 if(v.theme!==undefined&&!INVITE_THEMES.some(t=>t[0]===v.theme))return 'Choose an invite theme from the list.';
 if(v.accent!==undefined&&(typeof v.accent!=='string'||!Object.hasOwn(INVITE_COLORS,v.accent)))return 'Choose a background color from the list.';
 if(v.emoji!==undefined){if(typeof v.emoji!=='string')return 'Choose one emoji, or leave it empty.';const s=v.emoji.trim();if(s&&(s.length>32||[...new Intl.Segmenter('en',{granularity:'grapheme'}).segment(s)].length!==1||!/[\p{Extended_Pictographic}\p{Regional_Indicator}]/u.test(s)))return 'Use one emoji, such as 🛼 or 🎵.'}
 return '';
}
export function suggestedTheme(title:string){const t=title.toLowerCase();return /skat|roller/.test(t)?'skating':/concert|music|karaoke|band/.test(t)?'music':/hike|picnic|park|beach|walk/.test(t)?'outdoors':/birthday|party|celebrat/.test(t)?'celebration':/dinner|potluck|friendsgiving|brunch/.test(t)?'dinner':/trip|travel|weekend away/.test(t)?'travel':/game|board/.test(t)?'games':null}

// One emoji is enough: familiar activities get a matching preset; other emoji get a stable color.
export function styleFromEmoji(emoji:string){
 const e=emoji.trim();if(!e||themeError({emoji:e}))return null;
 const groups=[['skating','sky','🛼 🛹 ⛸️'],['music','plum','🎵 🎶 🎧 🎤 🎸 🎹 🥁 🎺 🎻'],['outdoors','sage','🌿 🌳 🌲 🌻 🌸 🌼 🌺 🏕️ 🏖️ 🥾 🏔️ 🌊 ☀️'],['dinner','blush','🍽️ 🍴 🍕 🍔 🌮 🍣 🍝 🥘 🥗 🍜 🥞 🧁 🍷 ☕'],['celebration','butter','🎉 🎊 🎂 🎈 🥳 🎁 🪩 💃 🕺'],['travel','sky','🧳 ✈️ 🚗 🚆 🚢 🗺️ 🌍 🏝️'],['games','butter','🎲 🎮 🃏 ♟️ 🏀 ⚽ 🏈 🎳']] as const;
 const plain=e.replace(/\uFE0F/g,'');
 const match=groups.find(([, ,list])=>list.split(' ').some(x=>x.replace(/\uFE0F/g,'')===plain));
 const colors=Object.keys(INVITE_COLORS);const hash=Array.from(e).reduce((n,c)=>n+c.codePointAt(0)!,0);
 return {emoji:e,theme:match?.[0]||'company',accent:match?.[1]||colors[hash%colors.length]};
}
