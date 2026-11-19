// D1's export lists tables alphabetically, each with its rows, so guests come before plans and loading it into an empty
// database fails ("no such table: main.plans"). This puts every table after the tables it points to. Same rows, new order.
export function parentsFirst(sql){
 const lines=sql.split('\n'),head=[],blocks=[],tail=[];let cur=null;
 for(const line of lines){const m=line.match(/^CREATE TABLE `([A-Za-z0-9_]+)` \($/);
  if(m){cur={name:m[1],lines:[line]};blocks.push(cur);continue}
  if(/^CREATE (UNIQUE )?INDEX /.test(line)){cur=null;tail.push(line);continue}
  (cur?cur.lines:cur===null&&blocks.length?tail:head).push(line)}
 const by=new Map(blocks.map(b=>[b.name,b])),done=new Set(),out=[];
 const visit=(b,seen=new Set())=>{if(done.has(b.name)||seen.has(b.name))return;seen.add(b.name);
  for(const [,p] of b.lines.join('\n').matchAll(/REFERENCES [`"]?([A-Za-z0-9_]+)[`"]?/g))if(by.has(p)&&p!==b.name)visit(by.get(p),seen);
  done.add(b.name);out.push(...b.lines)};
 for(const b of blocks)visit(b);
 return [...head,...out,...tail].join('\n');
}
