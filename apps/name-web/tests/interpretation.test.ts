import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quzhiAmplify, winterWoodBalance } from '../lib/server/interpretation.ts';
import { analysisContent } from '../lib/server/analysis.ts';
import { calculateBirth } from '../lib/server/calculation.ts';
import { searchHanja } from '../lib/server/hanja.ts';
import { emptyInput } from '../lib/contracts.ts';

test('문헌 구조의 역법 회귀: 실제 계산에서 균형 후보와 확인된 화 이름 평가로 연결한다',()=>{
  const hanja=(sound:string,char:string)=>searchHanja({sound}).rows.find(r=>r.character===char)!.id;
  const input={...emptyInput,birthDate:'2010-12-30',birthTime:'04:00',timeAccuracy:'exact' as const,birthCityId:'KR-1111000000',surname:'김',givenName:'현욱',surnameHanja:[hanja('김','金')],givenNameHanja:[hanja('현','炫'),hanja('욱','煜')]};
  // Calendar regression equivalent of a preselected literature structure.
  // Not the historical person's date or an additional browser/LLM demo profile.
  const birth=calculateBirth(input);
  const pillarText=(value:ReturnType<typeof calculateBirth>)=>(['year','month','day','hour'] as const).map(key=>value.pillars[key].status==='confirmed'?value.pillars[key].value.stem+value.pillars[key].value.branch:null);
  assert.deepEqual(pillarText(birth),['庚寅','戊子','甲寅','丙寅']);
  const old=process.env.NAME_RECEIPT_SECRET;
  process.env.NAME_RECEIPT_SECRET='ab'.repeat(32);
  try {
    const result=analysisContent(input,'unit-literature-only',birth);
    assert.equal(result.recommendations.balance.status,'available');
    assert.ok(result.recommendations.balance.candidates.every(c=>c.targetElement==='화'));
    assert.equal(result.recommendations.amplify.status,'withheld');
    assert.equal(result.currentName.status,'rated');
    assert.equal(result.currentName.grade,'well_matched');
    assert.match(result.currentName.explanations.map(e=>e.text).join(' '),/이름 부분/);
    assert.equal(analysisContent({...input,surnameHanja:[null]},'unit-literature-only',birth).currentName.grade,null);
    assert.equal(analysisContent({...input,givenName:'송욱',givenNameHanja:[hanja('송','松'),hanja('욱','煜')]},'unit-literature-only',birth).currentName.grade,null,'WOOD has no confirmed balance role, not neutral or discouraged');
    const alternate={...input,birthDate:'1999-01-02'};
    assert.deepEqual(pillarText(calculateBirth(alternate)),['戊寅','甲子','甲寅','丙寅']);
    assert.equal(analysisContent(alternate,'unit-inference-calendar').recommendations.balance.status,'available');
    const unknown=analysisContent({...input,birthTime:null,timeAccuracy:'unknown'},'unit-unknown-calendar');
    assert.equal(unknown.recommendations.balance.status,'withheld');
    assert.equal(unknown.currentName.grade,null);
  } finally { if(old===undefined) delete process.env.NAME_RECEIPT_SECRET; else process.env.NAME_RECEIPT_SECRET=old; }
});

test('겨울 목 문헌 원형과 출처 기반 역할 보존 사례는 화 균형형을 제공한다',()=>{
  const chart=(text:string)=>text.split(' ').map(p=>({stem:p[0],branch:p[1]}));
  // First is a transcribed source example; second is the pre-code service inference,
  // not another historical case or an additional end-to-end birth profile.
  for(const value of ['庚寅 戊子 甲寅 丙寅','戊寅 甲子 甲寅 丙寅']) {
    const result=winterWoodBalance(chart(value));
    assert.equal(result?.strength,'strong');
    assert.equal(result?.target,'FIRE');
    assert.deepEqual(result?.allowed,['FIRE']);
    assert.deepEqual(result?.methods.map(m=>m.status),['applicable','applicable','not_applicable','not_applicable']);
    assert.ok(result?.methods.every(m=>m.evidence.length>0));
  }
  for(const value of ['庚寅 戊午 甲寅 丙寅','庚申 戊子 甲寅 丙寅','壬寅 戊子 甲寅 丙寅','戊寅 庚子 甲寅 丙寅','戊寅 戊子 甲寅 丙寅','庚寅 戊子 甲寅 丁卯'])
    assert.equal(winterWoodBalance(chart(value)),null,'Outside supported scope, not an opposite diagnosis');
  assert.equal(winterWoodBalance(chart('庚寅 戊子 甲寅')),null);
});

test('楠曰 곡직의 검토 구조군만 목 극대화로 해석하며 파격·미지원은 보류한다',()=>{
  const chart=(text:string)=>text.split(' ').map(p=>Object.freeze({stem:p[0],branch:p[1]}));
  const source=chart('壬寅 癸卯 甲子 戊辰');
  const before=JSON.stringify(source);
  const result=quzhiAmplify(source);
  assert.equal(result?.target,'WOOD');
  assert.deepEqual(result?.allowed,['WOOD']);
  assert.equal(result?.comparisons.length,4);
  assert.ok(result?.comparisons.every(pair=>pair.stronger==='WOOD'&&pair.basis.length>0));
  assert.equal(JSON.stringify(source),before,'No transformation or deletion of the chart');
  assert.equal(quzhiAmplify(chart('壬寅 癸卯 甲申 戊辰')),null,'Explicit 申破格 exclusion, not a fabricated complete historical case');
  assert.equal(quzhiAmplify(chart('庚寅 癸卯 甲子 戊辰')),null);
  assert.equal(quzhiAmplify(chart('壬寅 癸卯 甲子 甲子')),null,'Missing 辰');
  assert.equal(quzhiAmplify(chart('壬寅 癸卯 甲午 戊辰')),null,'Extra 火-root branch outside reviewed scope');
  assert.equal(quzhiAmplify(chart('壬寅 癸卯 甲子 丙辰')),null,'Exposed fire outside reviewed scope');
  assert.equal(quzhiAmplify(source.slice(0,3)),null);
});

test('시간 후보 합의는 모든 목표와 허용 교집합을 확인하고 미지원 하나도 숨기지 않는다', () => {
  const fire={target:'FIRE' as const,allowed:['FIRE','WOOD'] as const,evidence:['첫 원국']};
  const other={target:'FIRE' as const,allowed:['FIRE','EARTH'] as const,evidence:['둘째 원국']};
  assert.deepEqual(directionConsensus([fire,other])?.allowed,['FIRE']);
  assert.equal(directionConsensus([fire,null]),null);
  assert.equal(directionConsensus([]),null);
  assert.equal(directionConsensus([fire,{...other,target:'EARTH' as const}]),null);
});
import { directionConsensus } from '../lib/server/interpretation.ts';
