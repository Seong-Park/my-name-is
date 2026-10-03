import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readJson, HttpError } from '../lib/server/http.ts';
import { searchHanja } from '../lib/server/hanja.ts';
import { parseAnalysisInput, toNatalInput } from '../lib/server/input.ts';
import { emptyInput } from '../lib/contracts.ts';

test('분석 입력은 한자 독음·지역을 서버 대조하고 분위기를 성별로 변환하지 않는다', () => {
  const input = {...emptyInput, birthDate:'1990-05-21', birthCityId:'KR-1111000000', surname:' 김 ', givenName:'연우', surnameHanja:[null], givenNameHanja:[null,null]};
  const parsed = parseAnalysisInput(input);
  assert.equal(parsed.surname,'김');
  const {mood, ...withoutMood} = input;
  assert.equal(parseAnalysisInput(withoutMood).mood,'any');
  const kim = searchHanja({sound:'김'}).rows.find(r=>r.character==='金')!;
  assert.equal(parseAnalysisInput({...input,surnameHanja:[kim.id]}).surnameHanja[0],kim.id);
  for (const change of [{birthCityId:'unknown'},{surnameHanja:['金']},{givenNameHanja:[kim.id,null]},{mood:['any']},{constructor:1},{latitude:37},{birthTime:'12:00'},{birthDate:'1990-02-30'}]) {
    assert.throws(()=>parseAnalysisInput({...input,...change}),HttpError);
  }
  const natal = toNatalInput(parseAnalysisInput({...input,mood:'feminine'}));
  assert.equal(natal.timezoneId,'Asia/Seoul');
  assert.equal(natal.cityId,input.birthCityId);
  assert.equal(typeof natal.longitude,'number');
  assert.equal(natal.birthTime,null);
  assert.equal(Object.hasOwn(natal,'sexForBazi'),false);
});

test('실제 읽은 JSON 바이트를 제한하고 형식 오류는 입력을 되돌리지 않는다', async () => {
  const req = (body: string, contentType = 'application/json') => new Request('http://127.0.0.1:3100', { method: 'POST', headers: {'content-type':contentType}, body });
  assert.deepEqual(await readJson(req('{"sound":"김"}')), {sound:'김'});
  for (const bad of ['null', '[]', '{secret']) await assert.rejects(readJson(req(bad)), (e: unknown) => e instanceof HttpError && e.code === 'INVALID_INPUT' && !e.message.includes('secret'));
  await assert.rejects(readJson(req('{}', 'text/plain')), (e: unknown) => e instanceof HttpError && e.status === 400);
  await assert.rejects(readJson(req(JSON.stringify({sound:'가'.repeat(6000)}))), (e: unknown) => e instanceof HttpError && e.status === 413);
  const lyingLength = req(JSON.stringify({sound:'가'.repeat(6000)}));
  lyingLength.headers.set('content-length','1');
  await assert.rejects(readJson(lyingLength), (e: unknown) => e instanceof HttpError && e.status === 413);
});

test('검색은 검토된 뜻만 공개하고 cursor를 독음과 버전에 결합한다', () => {
  const kim = searchHanja({sound:'김'});
  assert.ok(kim.rows.some(r=>r.character==='金'));
  assert.equal(kim.rows.find(r=>r.character==='金')?.meaning, null);
  const forest = searchHanja({sound:'림'}).rows.find(r=>r.character==='林');
  assert.ok(forest?.meaning?.includes('숲'));
  assert.ok(!Object.hasOwn(forest!, 'element'));
  let page = searchHanja({sound:'수'}); const ids = new Set<string>();
  assert.ok(page.nextCursor);
  const stale = JSON.parse(Buffer.from(page.nextCursor!, 'base64url').toString('utf8'));
  stale.v = 'old-version';
  assert.throws(()=>searchHanja({sound:'수',cursor:Buffer.from(JSON.stringify(stale)).toString('base64url')}),HttpError);
  assert.throws(()=>searchHanja({sound:'김',cursor:page.nextCursor!}), HttpError);
  do {
    for (const row of page.rows) { assert.equal(ids.has(row.id),false); ids.add(row.id); }
    assert.ok(page.rows.length<=30);
    if (!page.nextCursor) break;
    page=searchHanja({sound:'수',cursor:page.nextCursor});
  } while(true);
  assert.ok(ids.size>30);
  for(const input of [{sound:'가나'},{sound:'김',extra:1},{sound:'김',cursor:'invalid'}]) assert.throws(()=>searchHanja(input),HttpError);
});
