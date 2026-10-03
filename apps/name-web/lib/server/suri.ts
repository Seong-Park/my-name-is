import { createHash } from 'node:crypto';
import copy from './suri-copy.json';
// 熊崎健翁 1930, pp.46–50 and 66–81; not luck grades or life predictions.
export const SURI_VERSION=`kumazaki-1930-v3-${createHash('sha256').update(JSON.stringify(copy)).digest('hex').slice(0,16)}`;
export const suriReference=(value:number):string|null=>Number.isInteger(value)&&value>=1&&value<=81?copy.items[value-1]??null:null;
export function suriValues(surname:readonly (number|null)[],given:readonly (number|null)[]) {
  if(![surname,given].every(rows=>rows.length>=1&&rows.length<=2&&rows.every(n=>typeof n==='number'&&Number.isSafeInteger(n)&&n>0))) return null;
  const s=surname as readonly number[],n=given as readonly number[];
  const bounded=(value:number)=>value<=81?value:null;
  return {
    won:bounded(n[0]+(n[1]??1)),
    hyeong:bounded(s[s.length-1]+n[0]),
    i:bounded((s.length===2?s[0]:1)+(n[1]??1)),
    jeong:bounded([...s,...n].reduce((sum,value)=>sum+value,0)),
  };
}

export function suriExplanations(surname:readonly (number|null)[],given:readonly (number|null)[]) {
  const values=suriValues(surname,given);
  if(!values) return [];
  const labels={won:'원격',hyeong:'형격',i:'이격',jeong:'정격'};
  const explanations=[{title:'원획 합산 · 참고',text:Object.entries(values).map(([key,value])=>`${labels[key as keyof typeof labels]} ${value??'제공 범위 밖'}`).join(' · ')+
    '. 검토한 강희자전 전사 획수와 1930년 구마사키 판본의 산식을 사용했어요. 1~81만 제공하며 초과값은 환산하지 않아요. '+
    '아래는 원전의 상징을 정리한 참고 설명이며, 이름 등급이나 실제 삶의 결과를 판단하지 않아요. 다른 격·삼재 조건을 여기서 판정한 것은 아니에요.'}];
  for(const [key,value] of Object.entries(values)) if(value!==null)
    explanations.push({title:`${labels[key as keyof typeof labels]} ${value} · 원전 참고`,text:suriReference(value)!});
  return explanations;
}
