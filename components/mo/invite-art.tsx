'use client';
import {Scene,sceneFor} from './art';
import {INVITE_THEMES,INVITE_COLORS} from '@/lib/invite-theme';
import type {Plan} from '@/lib/types';

// Invite styling is a small, deterministic header. Titles and details stay in normal app text.
export function InviteArt({plan,className=''}:{plan:Plan;className?:string}){
 if(plan.cover_url)return <img className={'scene invite-cover '+className} src={plan.cover_url} alt="Custom invite cover"/>;
 const theme=INVITE_THEMES.find(t=>t[0]===plan.theme)||INVITE_THEMES[0];
 if(theme[0]==='company'&&!plan.emoji&&(!plan.accent||plan.accent==='butter'))return <Scene className={className} kind={sceneFor(plan.kind,plan.made_it)} seed={plan.id}/>;
 const color=INVITE_COLORS[plan.accent as keyof typeof INVITE_COLORS]||INVITE_COLORS.butter,emoji=plan.emoji||theme[2];
 return <svg className={'scene invite-art '+className} viewBox="0 0 640 320" role="img" aria-label={theme[1]+' invite background'} preserveAspectRatio="xMidYMid slice">
  <rect width="640" height="320" fill={color}/>
  <circle cx="80" cy="80" r="125" fill="#fffaf3" opacity=".23"/><circle cx="575" cy="285" r="170" fill="#fffaf3" opacity=".2"/>
  <path d="M0 30Q320 120 640 30" fill="none" stroke={plan.accent==='plum'?'#f5d36a':'#3a1a2b'} strokeWidth="4"/>
  {[65,180,320,460,575].map((x,i)=><circle key={x} cx={x} cy={i===2?75:i%2?64:44} r="7" fill="#fffaf3"/>)}
  <g aria-hidden="true" fontFamily="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif" textAnchor="middle">
   <text x="105" y="240" fontSize="64" opacity=".45" transform="rotate(-18 105 210)">{emoji}</text>
   <text x="535" y="195" fontSize="68" opacity=".45" transform="rotate(16 535 175)">{emoji}</text>
   <text x="320" y="250" fontSize="145">{emoji}</text>
  </g>
 </svg>;
}
