import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deepSeekCostNano } from '../lib/server/pricing.ts';

test('공식 평일 혼잡 시간·중국 휴일·경계와 캐시 사용량을 정수 정산한다',()=>{
  const usage={inputTokens:100,cacheHitTokens:20,cacheMissTokens:80,outputTokens:50};
  const cost=(iso:string,end=iso)=>deepSeekCostNano(usage,Date.parse(iso),Date.parse(end));
  const peak=20n*6n+80n*300n+50n*1200n;
  for(const hour of ['01:00:00','03:59:59','06:00:00','09:59:59']) assert.equal(cost(`2026-10-08T${hour}Z`),peak);
  for(const hour of ['00:59:59','04:00:00','05:59:59','10:00:00']) assert.equal(cost(`2026-10-08T${hour}Z`),peak/2n);
  for(const date of ['2026-01-02','2026-02-23','2026-04-06','2026-05-05','2026-06-19','2026-09-25','2026-10-01','2026-10-07','2026-10-10']) assert.equal(cost(`${date}T02:00:00Z`),peak/2n,date);
  assert.equal(cost('2026-10-08T00:59:59Z','2026-10-08T01:00:01Z'),null,'No invented billing timestamp at a price transition');
  assert.equal(cost('2027-01-04T02:00:00Z'),null,'Unverified holiday year');
  assert.equal(cost('2026-10-08T02:00:00Z','2026-10-08T02:01:01Z'),null,'Only a bounded completed call can be priced');
  assert.equal(cost('invalid'),null);
  assert.equal(deepSeekCostNano({...usage,cacheHitTokens:21},Date.now(),Date.now()),null);
});
