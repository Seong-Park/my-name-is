import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Hold } from '../components/Results.tsx';
import { createMock } from '../lib/dev/mock.ts';
import { emptyInput } from '../lib/contracts.ts';

test('보류 화면은 미지원 구조와 정확 시각의 경계를 설명하며 시간 변경을 유도하지 않는다',async()=>{
 const mock=createMock(()=>({analysis:'both',story:'success',hanja:'rows',count:3}));
 const analysis=await mock.api.analyze({...emptyInput,timeAccuracy:'exact',birthTime:'04:00'});
 for(const [code,reason] of [['STRUCTURE_UNSUPPORTED',/검토된.*구조.*범위/],['TIME_UNCERTAIN',/경계.*불확실/]] as const) {
  analysis.recommendations.balance.reasonCodes=[code];
  const html=renderToStaticMarkup(createElement(Hold,{analysis,type:'balance',current:()=>{},review:()=>{},time:()=>{},switchType:()=>{}}));
  assert.match(html,reason);
  assert.ok(html.indexOf('확인된 소리와 뜻')>html.search(reason),'이유를 확인된 내용보다 먼저 설명한다');
  assert.doesNotMatch(html,/출생시간 추가하기/);
  assert.match(html,/지금 이름 살펴보기/);
 }
});
