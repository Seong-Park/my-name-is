import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkRateLimit } from '../lib/server/rate-limit.ts';
import { HttpError } from '../lib/server/http.ts';

test('분당 분석10·검색60·새 회상문6을 분리하고 중복 시도는 다시 세지 않는다',()=>{
  const key=crypto.randomUUID();
  for(const [operation,limit] of [['analyses',10],['hanja-search',60],['stories',6]] as const) {
    for(let i=0;i<limit;i++) checkRateLimit(operation,key,operation==='stories'?String(i):undefined,1000);
    if(operation==='stories') checkRateLimit(operation,key,'0',2000);
    assert.throws(()=>checkRateLimit(operation,key,'new',2000),(e:unknown)=>e instanceof HttpError&&e.code==='RATE_LIMITED'&&e.retryAfterSeconds===59&&e.retryable);
    checkRateLimit(operation,key,'new',61000);
    checkRateLimit(operation,`${key}-other`,'new',2000);
  }
});
