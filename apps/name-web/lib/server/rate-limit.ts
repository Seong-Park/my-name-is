import { HttpError } from './http';

type Operation='analyses'|'hanja-search'|'stories';
const limits={analyses:10,'hanja-search':60,stories:6};
const windows=new Map<string,{until:number;count:number;seen:Set<string>}>();

// ponytail: one process, bounded memory; global money/concurrency safety stays in PostgreSQL.
// No untrusted forwarded IP header is accepted as an identity.
export function checkRateLimit(operation:Operation,identity:string,unique?:string,now=performance.now()) {
  const key=`${operation}:${identity}`;
  let window=windows.get(key);
  if(!window||now>=window.until) {
    if(windows.size>=10000) for(const [oldKey,old] of windows) if(now>=old.until) windows.delete(oldKey);
    if(!window&&windows.size>=10000) throw new HttpError(429,'RATE_LIMITED','요청이 많아요. 잠시 뒤 다시 시도해 주세요.',true,60);
    window={until:now+60000,count:0,seen:new Set()};
    windows.set(key,window);
  }
  if(operation==='stories'&&unique!==undefined&&window.seen.has(unique)) return;
  if(window.count>=limits[operation]) throw new HttpError(429,'RATE_LIMITED','요청이 많아요. 잠시 뒤 다시 시도해 주세요.',true,Math.max(1,Math.ceil((window.until-now)/1000)));
  window.count++;
  if(operation==='stories'&&unique!==undefined) window.seen.add(unique);
}
