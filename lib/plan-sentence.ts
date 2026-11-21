// Reads a one-sentence plan ("Friendsgiving at my place Thursday at 4") with fixed rules, not a model.
// It only suggests: the host sees what was read and taps to use it. Nothing here is saved on its own.

const DAYS=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
const MONTHS=['january','february','march','april','may','june','july','august','september','october','november','december'];
const pad=(n:number)=>String(n).padStart(2,'0');
const localValue=(d:Date)=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

export type Reading={
 date:string;        // datetime-local value ("2026-11-26T16:00"), or '' if no day was found
 timeGiven:boolean;  // false when the sentence named a day but no time (6 PM, or 7 PM for tonight, is filled in, and the host is told)
 title:string;       // the sentence with the day and time taken out
 kind:'trip'|'gathering'|null; // a suggestion from the words used, or null
};

const DAY_WORD=`(?:sun|mon|tues?|wed(?:nes)?|thu(?:rs?)?|fri|sat(?:ur)?)(?:day)?`;
const MONTH_WORD=`(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)`;
const TIME=`(?:at\\s+)?(?:noon|midnight|\\d{1,2}(?::\\d{2})?\\s*(?:a\\.?m\\.?|p\\.?m\\.?)|(?<=at\\s+)\\d{1,2}(?::\\d{2})?)`;

function dayIndex(w:string){const s=w.toLowerCase().slice(0,3);return DAYS.findIndex(d=>d.startsWith(s))}
function monthIndex(w:string){const s=w.toLowerCase().slice(0,3);return MONTHS.findIndex(m=>m.startsWith(s))}

function readTime(t:string):[number,number]|null{
 const s=t.toLowerCase().trim().replace(/^at\s+/,'').replace(/\./g,'').trim();
 if(s==='noon')return [12,0];if(s==='midnight')return [0,0];
 const m=s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);if(!m)return null;
 let h=+m[1];const min=m[2]?+m[2]:0;if(h>23||min>59)return null;
 if(m[3]==='pm'&&h<12)h+=12;else if(m[3]==='am'&&h===12)h=0;
 else if(!m[3]&&h>=1&&h<=11)h+=12; // "at 4" with no am/pm: read as afternoon or evening; the host can change it
 return [h,min];
}

export function readSentence(text:string,now=new Date()):Reading{
 let rest=` ${text} `,day:Date|null=null,time:[number,number]|null=null,fallback:[number,number]=[18,0];
 const take=(re:RegExp)=>{const m=rest.match(re);if(m){rest=rest.replace(m[0],' ')}return m};
 const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
 let m:RegExpMatchArray|null;
 if((m=take(new RegExp(`\\s(?:on\\s+)?(?:${DAY_WORD},?\\s+)?(${MONTH_WORD})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?=[\\s,.!?])`,'i')))){
  const mi=monthIndex(m[1]),d=+m[2];day=new Date(today.getFullYear(),mi,d);if(day.getMonth()!==mi)day=null;else if(day<today)day.setFullYear(day.getFullYear()+1);
 }else if((m=take(/\s(?:on\s+)?(\d{1,2})\/(\d{1,2})(?=[\s,.!?])/))){
  const mi=+m[1]-1,d=+m[2];day=new Date(today.getFullYear(),mi,d);if(mi<0||mi>11||day.getMonth()!==mi)day=null;else if(day<today)day.setFullYear(day.getFullYear()+1);
 }else if((m=take(/\s(today|tonight|tomorrow(?:\s+night)?|this\s+weekend)(?=[\s,.!?])/i))){
  const w=m[1].toLowerCase();day=new Date(today);
  if(w.startsWith('tomorrow'))day.setDate(day.getDate()+1);
  else if(w.startsWith('this'))day.setDate(day.getDate()+(6-day.getDay()+7)%7); // this weekend: Saturday
  if(w==='tonight'||w==='tomorrow night')fallback=[19,0];
 }else if((m=take(new RegExp(`\\s(?:on\\s+)?(?:(this|next)\\s+)?(${DAY_WORD})(?=[\\s,.!?])`,'i')))){
  const want=dayIndex(m[2]);if(want>=0){day=new Date(today);let add=(want-day.getDay()+7)%7;if(add===0)add=7;day.setDate(day.getDate()+add)}
 }
 if(day){
  const t=take(new RegExp(`\\s${TIME}(?=[\\s,.!?])`,'i'));
  if(t){const r=readTime(t[0]);if(r)time=r}
 }
 const title=(day?rest:` ${text} `).replace(/\s+([,.!?])/g,'$1').replace(/\s{2,}/g,' ').replace(/[\s,]+$/,'').replace(/^\s+/,'').replace(/\s+(on|at|this|next)$/i,'');
 const kind=/\b(trip|weekend away|getaway|road ?trip|vacation|cabin|camping|retreat|beach house|lake house)\b/i.test(text)?'trip':text.trim()?'gathering':null;
 if(!day)return {date:'',timeGiven:false,title:text,kind};
 const at=new Date(day);const [h,min]=time||fallback;at.setHours(h,min,0,0);
 return {date:localValue(at),timeGiven:!!time,title:title||text,kind};
}

// Ideas for the bring list (or jobs, for trips). Shown as suggestions; nothing is added until the host taps one.
export function bringIdeas(title:string,kind:string):string[]{
 const t=title.toLowerCase();
 if(kind==='trip')return ['Book the stay','Drive (say how many seats)','Groceries for the first night','Plan one dinner out'];
 if(/friendsgiving|thanksgiving|potluck|dinner|feast|cookout|bbq|barbecue/.test(t))return ['The main dish','A side','Dessert','Drinks & ice'];
 if(/birthday|party|celebrat|shower/.test(t))return ['Snacks','Drinks & ice','The cake','A playlist'];
 if(/game|movie|watch/.test(t))return ['Snacks','Drinks','A game to play'];
 if(/brunch|breakfast/.test(t))return ['Something sweet','Fruit','Juice or coffee'];
 if(/picnic|beach|park|hike/.test(t))return ['Snacks','Drinks & ice','A blanket','A speaker'];
 return ['Snacks','Drinks & ice'];
}
