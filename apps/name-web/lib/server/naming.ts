import { createHash } from 'node:crypto';
import type { Input } from '../contracts';
import { recommendationHanja,type RecommendationHanja,type Element } from './hanja';
import { phonetics } from './phonetics';
import review from './name-review.json';

type Direction = {target:Element;allowed:Element[];evidence:string[]};
type Reviews = {names:{name:string;moods:string[]}[];excludeGiven:string[];excludeFull:string[]};
export const NAME_REVIEW_VERSION=createHash('sha256').update(JSON.stringify(review)).digest('hex').slice(0,16);

// UTF-16 string order and localeCompare differ from the required Unicode scalar order.
export function compareCodePoints(a:string,b:string) {
  const left=[...a],right=[...b];
  for(let i=0;i<Math.min(left.length,right.length);i++) {
    const difference=left[i].codePointAt(0)!-right[i].codePointAt(0)!;
    if(difference) return difference;
  }
  return left.length-right.length;
}

// Internal only: a Direction must come from the validated interpretation module.
// It is never accepted from a public request or inferred from missing data.
export function selectNames(input:Pick<Input,'surname'|'givenName'|'mood'>,
  directions:{balance:Direction|null;amplify:Direction|null},visible:1|2|3,
  source:readonly RecommendationHanja[]=recommendationHanja,reviews:Reviews=review) {
  const names=new Map(reviews.names.map(row=>[row.name,row]));
  const excludedGiven=new Set(reviews.excludeGiven),excludedFull=new Set(reviews.excludeFull);
  function candidates(type:'balance'|'amplify') {
    const direction=directions[type];
    if(!direction) return [];
    // The target itself is always permitted; no generating element is auto-added.
    const allowed=new Set([...direction.allowed,direction.target]);
    const result=[];
    // ponytail: O(n²) over the small reviewed vocabulary; pre-index elements if growth makes this slow.
    for(const first of source) for(const second of source) {
      const valid=type==='balance'
        ? allowed.has(first.element)&&allowed.has(second.element)&&(first.element===direction.target||second.element===direction.target)
        : first.element===direction.target&&second.element===direction.target;
      if(!valid) continue;
      const givenName=(first.sound+second.sound).normalize('NFC');
      const hangul=input.surname+givenName;
      if(givenName===input.givenName || excludedGiven.has(givenName)||excludedFull.has(hangul)) continue;
      const inspected=names.get(givenName);
      result.push({givenName,hangul,hanja:first.character+second.character,hanjaIds:[first.id,second.id],
        meanings:[first.meaning!,second.meaning!],targetElement:direction.target,evidence:direction.evidence,
        // IDs and publication are handled after this private selection, never by these ranks.
        key:`${first.id}:${second.id}`,natural:inspected?0:1,
        mood:input.mood==='any'||inspected?.moods.includes(input.mood)?0:1,
        conflicts:phonetics(hangul).conflicts});
    }
    result.sort((a,b)=>a.natural-b.natural||a.mood-b.mood||a.conflicts-b.conflicts||compareCodePoints(a.givenName,b.givenName)||compareCodePoints(a.hanja,b.hanja));
    const seen=new Set<string>();
    return result.filter(row=>{if(seen.has(row.givenName)) return false;seen.add(row.givenName);return true;});
  }
  const balance=candidates('balance').slice(0,3);
  const balancedNames=new Set(balance.map(row=>row.givenName));
  const amplify=candidates('amplify').filter(row=>!balancedNames.has(row.givenName)).slice(0,3);
  return {balance:balance.slice(0,visible),amplify:amplify.slice(0,visible)};
}
