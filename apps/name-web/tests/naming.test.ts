import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectNames, compareCodePoints } from '../lib/server/naming.ts';
import { recommendationHanja } from '../lib/server/hanja.ts';

const input = {surname:'김',givenName:'연우',mood:'any' as const};
const fire = {target:'FIRE' as const,allowed:['FIRE' as const],evidence:['명리 판정이 아닌 조합 계약 단위 검사']};

test('추가 화 후보는 검토된 독음·뜻만 채택하고 熙는 보류한다',()=>{
  for(const [character,sound] of [['燦','찬'],['炯','형'],['煐','영']])
    assert.ok(recommendationHanja.some(row=>row.character===character&&row.sound===sound&&row.element==='FIRE'));
  assert.ok(!recommendationHanja.some(row=>row.character==='熙'));
});

test('검토된 한자로만 두 글자를 만들며, 미확정 목표에는 후보를 만들지 않는다', () => {
  assert.deepEqual(selectNames(input,{balance:null,amplify:null},3),{balance:[],amplify:[]});
  const result=selectNames(input,{balance:fire,amplify:fire},3);
  assert.equal(result.balance.length,3);
  assert.equal(result.amplify.length,3);
  assert.equal(new Set([...result.balance,...result.amplify].map(c=>c.givenName)).size,6);
  for (const candidate of [...result.balance,...result.amplify]) {
    assert.equal([...candidate.givenName].length,2);
    assert.ok(candidate.hangul.startsWith('김'));
    assert.ok([...candidate.hanja].every(c=>['炫','煜','煥','燦','炯','煐'].includes(c)));
  }
  assert.ok(recommendationHanja.some(r=>r.character==='垠'));
  assert.ok(!recommendationHanja.some(r=>r.character==='炎'||r.character==='昱'||r.character==='永'));
});

test('숨긴 균형형도 극대화형 중복에서 제외하고 입력 순서에 영향받지 않는다', () => {
  const all=selectNames(input,{balance:fire,amplify:fire},3);
  const one=selectNames(input,{balance:fire,amplify:fire},1);
  assert.deepEqual(one.balance,all.balance.slice(0,1));
  assert.deepEqual(one.amplify,all.amplify.slice(0,1));
  assert.deepEqual(selectNames(input,{balance:fire,amplify:fire},3,[...recommendationHanja].reverse()),all);
  const exclude=selectNames({...input,givenName:all.balance[0].givenName},{balance:fire,amplify:fire},3);
  assert.ok(![...exclude.balance,...exclude.amplify].some(c=>c.givenName===all.balance[0].givenName));
  assert.equal(compareCodePoints('𠀀','金')>0,true);
  assert.equal(compareCodePoints('가','가나')<0,true);
});

test('자연스러움→분위기→상극→코드포인트 순서와 정확한 제외를 적용한다', () => {
  const reviews={names:[{name:'환욱',moods:['feminine' as const]},{name:'현욱',moods:['masculine' as const]}],excludeGiven:['욱욱'],excludeFull:['김환환']};
  const result=selectNames({...input,mood:'feminine'},{balance:fire,amplify:null},3,recommendationHanja,reviews);
  assert.equal(result.balance[0].givenName,'환욱');
  assert.equal(result.balance[1].givenName,'현욱');
  assert.ok(result.balance.every(c=>c.givenName!=='욱욱'&&c.hangul!=='김환환'));
  const oneChar=selectNames(input,{balance:fire,amplify:fire},3,recommendationHanja.filter(r=>r.character==='炫'),{names:[],excludeGiven:[],excludeFull:[]});
  assert.equal(oneChar.balance.length,1);
  assert.equal(oneChar.amplify.length,0);
});

test('균형형 보조는 명시된 집합만 사용하며 극대화형은 목표 두 글자만 사용한다', () => {
  const goals={balance:{...fire,allowed:['FIRE','WOOD'] as ('FIRE'|'WOOD')[]},amplify:fire};
  const reviews={names:[{name:'송현',moods:[]},{name:'은현',moods:[]}],excludeGiven:[],excludeFull:[]};
  const result=selectNames(input,goals,3,recommendationHanja,reviews);
  assert.equal(result.balance[0].givenName,'송현');
  assert.ok(result.balance.every(c=>c.givenName!=='은현'));
  assert.ok(result.amplify.every(c=>[...c.hanja].every(h=>['炫','煜','煥','燦','炯','煐'].includes(h))));
});

test('동음 한자 후보는 자형을 보존하고 코드포인트 순서의 한 조합만 남긴다', () => {
  const direction={...fire,allowed:['FIRE','EARTH','METAL'] as ('FIRE'|'EARTH'|'METAL')[]};
  const reviews={names:[{name:'은현',moods:[]}],excludeGiven:[],excludeFull:[]};
  const all=selectNames(input,{balance:direction,amplify:null},3,recommendationHanja,reviews);
  assert.equal(all.balance[0].givenName,'은현');
  assert.equal(all.balance[0].hanja,'垠炫');
  assert.equal(all.balance.filter(c=>c.givenName==='은현').length,1);
  assert.deepEqual(selectNames(input,{balance:direction,amplify:null},3,[...recommendationHanja].reverse(),reviews),all);
});
