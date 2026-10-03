import { writeFileSync } from 'node:fs';
import { recommendationHanja,HANJA_VERSION,type Element } from '../lib/server/hanja.ts';
import { selectNames,NAME_REVIEW_VERSION } from '../lib/server/naming.ts';

// Vocabulary audit only: assumed directions are not natal interpretations.
// Reuses the existing winter demo's name fields; no new birth profile or AI call.
const rows=[];
for(const target of ['WOOD','FIRE','EARTH','METAL','WATER'] as Element[]) {
 for(const mood of ['any','masculine','feminine','neutral'] as const) {
  const direction={target,allowed:[target],evidence:['어휘 분포 진단용 가정 · 실제 추천 아님']};
  const selected=selectNames({surname:'김',givenName:'현욱',mood},{balance:direction,amplify:direction},3);
  const count=(names:typeof selected.balance)=>({count:names.length,reviewedNatural:names.filter(n=>n.natural===0).length,moodMatch:mood==='any'?null:names.filter(n=>n.mood===0).length});
  rows.push({target,mood,eligibleReadings:recommendationHanja.filter(h=>h.element===target).length,balance:count(selected.balance),amplifyAfterBalanceExclusion:count(selected.amplify)});
 }
}
const result={scope:'한자 어휘만의 조건부 분포 진단. 두 유형의 목표가 같다고 가정해 중복 제거 이후를 확인한다. 실제 명리 제공률·추천 품질·분위기 검증을 뜻하지 않는다.',hanjaVersion:HANJA_VERSION,nameReviewVersion:NAME_REVIEW_VERSION,rows};
writeFileSync(new URL('../../../docs/verification/2026-10-03-name-vocabulary-distribution.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
