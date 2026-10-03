import { test } from "node:test";
import assert from "node:assert/strict";
import { POST } from "../app/api/name/v1/[operation]/route.ts";
import { emptyInput, isAnalysis } from '../lib/contracts.ts';
import { searchHanja,hanjaExplanation } from '../lib/server/hanja.ts';
import { analysisContent,analysisVersions,VISIBLE_COUNT } from '../lib/server/analysis.ts';
import { verifyReceipt } from '../lib/server/receipt.ts';

test('현재 이름의 한자 설명은 검토된 독음별 자원오행만 제시한다',()=>{
  const pine=searchHanja({sound:'송'}).rows.find(r=>r.character==='松')!;
  assert.match(hanjaExplanation(pine.id),/자원오행은 목/);
  assert.match(hanjaExplanation(pine.id),/서비스 해석/);
  const kim=searchHanja({sound:'김'}).rows.find(r=>r.character==='金')!;
  assert.doesNotMatch(hanjaExplanation(kim.id),/자원오행은/);
});

test('지원 구조의 실제 역법→추천→후보 재계산을 연결하고 다른 분석 후보를 거절한다',async()=>{
  const oldSecret=process.env.NAME_RECEIPT_SECRET,oldKey=process.env.DEEPSEEK_API_KEY;
  process.env.NAME_RECEIPT_SECRET='ab'.repeat(32);
  delete process.env.DEEPSEEK_API_KEY;
  const input={...emptyInput,birthDate:'1962-03-27',timeAccuracy:'exact' as const,birthTime:'08:00',birthCityId:'KR-1111000000',surname:'김',givenName:'연우',surnameHanja:[searchHanja({sound:'김'}).rows.find(row=>row.character==='金')!.id],givenNameHanja:[null,null]};
  const request=(operation:string,body:unknown,cookie?:string)=>POST(new Request(`http://127.0.0.1:3100/api/name/v1/${operation}`,{method:'POST',headers:{origin:'http://127.0.0.1:3100','content-type':'application/json','Idempotency-Key':crypto.randomUUID(),...(cookie?{cookie}:{})},body:JSON.stringify(body)}),{params:Promise.resolve({operation})});
  try {
    const response=await request('analyses',input);
    assert.equal(response.status,200);
    const result=await response.json();
    assert.equal(isAnalysis(result),true);
    assert.equal(result.currentName.status,'partial');
    assert.equal(result.recommendations.balance.status,'withheld');
    assert.equal(result.recommendations.amplify.status,'available');
    assert.equal(result.recommendations.amplify.candidates.length,3);
    const first=result.recommendations.amplify.candidates[0];
    assert.equal(first.hangul,'김송림');
    assert.equal(first.hanja,'金松林');
    assert.match(first.optionalNumerology,/원격 16/);
    assert.match(first.optionalNumerology,/형격 16/);
    assert.match(first.optionalNumerology,/이격 9/);
    assert.match(first.optionalNumerology,/정격 24/);
    assert.deepEqual(Object.keys(first).sort(),['candidateId','evidence','hangul','hanja','meanings','optionalNumerology','targetElement']);
    const cookie=response.headers.get('set-cookie')!.split(';')[0];
    const browser=cookie.slice(cookie.indexOf('=')+1);
    const receipt=verifyReceipt(result.receipt,input,analysisVersions(input),browser,VISIBLE_COUNT);
    assert.deepEqual(analysisContent(input,receipt.analysisId).recommendations,result.recommendations);
    const enabled=await request('stories',{input,receipt:result.receipt,candidateId:first.candidateId,attempt:0},cookie);
    assert.equal((await enabled.json()).error.code,'AI_DISABLED','Real public candidate reaches provider configuration gate');
    const other=await (await request('analyses',input,cookie)).json();
    assert.notEqual(other.recommendations.amplify.candidates[0].candidateId,first.candidateId);
    assert.equal((await request('stories',{input,receipt:other.receipt,candidateId:first.candidateId,attempt:0},cookie)).status,403);
    const unknown=await (await request('analyses',{...input,timeAccuracy:'unknown',birthTime:null},cookie)).json();
    assert.equal(unknown.recommendations.amplify.status,'withheld');
    assert.ok(unknown.recommendations.amplify.reasonCodes.includes('TIME_UNCERTAIN'));
    const noSurname=await (await request('analyses',{...input,surnameHanja:[null]},cookie)).json();
    assert.equal(noSurname.recommendations.amplify.candidates[0].optionalNumerology,undefined);
  } finally {
    if(oldSecret===undefined) delete process.env.NAME_RECEIPT_SECRET; else process.env.NAME_RECEIPT_SECRET=oldSecret;
    if(oldKey===undefined) delete process.env.DEEPSEEK_API_KEY; else process.env.DEEPSEEK_API_KEY=oldKey;
  }
});

test('실제 원국·확인된 한자 풀이와 서명 영수증을 반환하고 미검증 추천은 만들지 않는다', async () => {
  const previous=process.env.NAME_RECEIPT_SECRET;
  process.env.NAME_RECEIPT_SECRET='ef'.repeat(32);
  try {
    const input={...emptyInput,birthDate:'1990-05-21',birthCityId:'KR-1111000000',surname:'김',givenName:'연우',surnameHanja:[searchHanja({sound:'김'}).rows.find(r=>r.character==='金')!.id],givenNameHanja:[null,null]};
    const request=(operation:string,body:unknown,cookie?:string)=>POST(new Request(`http://127.0.0.1:3100/api/name/v1/${operation}`,{method:'POST',headers:{origin:'http://127.0.0.1:3100','content-type':'application/json','Idempotency-Key':'12345678-1234-4123-8123-123456789012',...(cookie?{cookie}:{})},body:JSON.stringify(body)}),{params:Promise.resolve({operation})});
    const response=await request('analyses',input);
    assert.equal(response.status,200);
    const value=await response.json();
    assert.equal(isAnalysis(value),true);
    assert.equal(value.currentName.grade,null);
    const surname=value.currentName.explanations.find((e:{title:string})=>e.title==='성씨 김 · 金');
    assert.doesNotMatch(surname.text,/자원오행은 금/,'금의 뜻을 미검토 성씨 독음 김에 전용하지 않는다');
    const sound=value.currentName.explanations.find((e:{title:string})=>e.title==='이름의 소리 · 초성 기준');
    assert.ok(sound?.text.includes('김(ㄱ·목) → 연(ㅇ·토) → 우(ㅇ·토)'));
    assert.ok(sound?.text.includes('김–연: 상극'));
    assert.ok(sound?.text.includes('연–우: 동일 오행'));
    assert.equal(value.recommendations.balance.status,'withheld');
    assert.deepEqual(value.recommendations.amplify.candidates,[]);
    assert.equal(response.headers.get('cache-control'),'private, no-store');
    const cookie=response.headers.get('set-cookie')!.split(';')[0];
    assert.ok(cookie.startsWith('name-browser-dev='));
    const reused=await request('analyses',input,cookie);
    assert.equal(reused.headers.get('set-cookie'),null);
    const story={input,receipt:value.receipt,candidateId:'forged',attempt:0};
    assert.equal((await request('stories',story,cookie)).status,403);
    assert.equal((await request('stories',story)).status,403);
    assert.equal((await request('stories',{...story,extra:'injected'},cookie)).status,400);
    for(let i=0;i<8;i++) assert.equal((await request('analyses',input,cookie)).status,200);
    const limited=await request('analyses',input,cookie);
    assert.equal(limited.status,429);
    assert.equal((await limited.json()).error.code,'RATE_LIMITED');
    assert.ok(Number(limited.headers.get('Retry-After'))>0);
  } finally { if(previous===undefined) delete process.env.NAME_RECEIPT_SECRET; else process.env.NAME_RECEIPT_SECRET=previous; }
});

test('회상문은 영수증·DB 처리 전에 누락되거나 잘못된 중복 방지 키를 거절한다', async () => {
  for (const key of [null, 'not-a-uuid', '00000000-0000-0000-0000-000000000000', '12345678-1234-4123-8123-123456789012,12345678-1234-4123-8123-123456789012']) {
    const response=await POST(new Request('http://127.0.0.1:3100/api/name/v1/stories',{
      method:'POST',headers:{origin:'http://127.0.0.1:3100','content-type':'application/json',...(key===null?{}:{'Idempotency-Key':key})},body:'{}'
    }),{params:Promise.resolve({operation:'stories'})});
    assert.equal(response.status,400);
    assert.equal((await response.json()).error.code,'INVALID_INPUT');
  }
});
test("Next 내부 URL 대신 서비스 origin을 검사하고 미구현 API를 503으로 구분한다", async () => {
  const context = { params: Promise.resolve({ operation: "analyses" }) };
  const response = await POST(
    new Request("http://localhost:3100/api/name/v1/analyses", {
      method: "POST",
      headers: { origin: "http://127.0.0.1:3100", 'content-type': 'application/json' },
      body: JSON.stringify({...emptyInput,birthDate:'1990-05-21',birthCityId:'KR-1111000000',surname:'김',givenName:'연우',surnameHanja:[null],givenNameHanja:[null,null]}),
    }),
    context,
  );
  assert.equal(response.status, 503);
  const foreign = await POST(
    new Request("http://localhost:3100/api/name/v1/analyses", {
      method: "POST",
      headers: { origin: "https://foreign.example" },
    }),
    context,
  );
  assert.equal(foreign.status, 403);
});

test('한자 검색 라우트는 실제 자료를 최대 30행만 반환한다', async () => {
  const response = await POST(new Request('http://127.0.0.1:3100/api/name/v1/hanja-search', {
    method:'POST',headers:{origin:'http://127.0.0.1:3100','content-type':'application/json'},body:JSON.stringify({sound:'수'})
  }), {params:Promise.resolve({operation:'hanja-search'})});
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.rows.length,30);
  assert.ok(body.nextCursor);
  assert.equal(response.headers.get('cache-control'),'private, no-store');
});

test('추가 검토 한자의 뜻을 검색에 연결하고 내부 자원오행 목록은 응답에 싣지 않는다', () => {
  const result=searchHanja({sound:'은'});
  const row=result.rows.find(r=>r.character==='垠');
  assert.equal(row?.meaning,'땅의 경계와 가장자리, 물가의 언덕');
  assert.ok(row?.reviewStatus.includes('2024'));
  assert.ok(!Object.hasOwn(row!,'element'));
  assert.ok(!JSON.stringify(result).includes('recommendation_eligible'));
});

test('신규 브라우저의 첫 검색은 다른 방문자의 제한을 소진하지 않는다', async () => {
  const previous=process.env.NAME_RECEIPT_SECRET;
  process.env.NAME_RECEIPT_SECRET='12'.repeat(32);
  try {
    for(let i=0;i<61;i++) {
      const response=await POST(new Request('http://127.0.0.1:3100/api/name/v1/hanja-search',{method:'POST',headers:{origin:'http://127.0.0.1:3100','content-type':'application/json'},body:JSON.stringify({sound:'송'})}),{params:Promise.resolve({operation:'hanja-search'})});
      assert.equal(response.status,200);
      assert.ok(response.headers.get('set-cookie'));
    }
  } finally {
    if(previous===undefined) delete process.env.NAME_RECEIPT_SECRET; else process.env.NAME_RECEIPT_SECRET=previous;
  }
});
