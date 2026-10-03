import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyInput } from '../lib/contracts.ts';
import { issueReceipt, verifyReceipt, browserIdentity, candidateId } from '../lib/server/receipt.ts';
import { HttpError } from '../lib/server/http.ts';

test('영수증은 입력·브라우저·버전을 결합하고 만료와 변조를 거절한다', () => {
  const previous = process.env.NAME_RECEIPT_SECRET;
  process.env.NAME_RECEIPT_SECRET = 'ab'.repeat(32);
  try {
    const now = Date.parse('2026-10-01T00:00:00Z');
    const input = {...emptyInput,birthDate:'1990-05-21',birthCityId:'KR-1111000000',surname:'김',givenName:'연우',surnameHanja:[null],givenNameHanja:[null,null]};
    const versions = {rules:'test-v1',config:'visible-1'};
    const identity = browserIdentity(null, false, now);
    assert.match(identity.setCookie!, /HttpOnly; SameSite=Strict; Path=\//);
    assert.equal(identity.setCookie!.includes('Secure'),false);
    const cookie = identity.setCookie!.split(';')[0];
    assert.equal(browserIdentity(cookie,false,now+1000).token,identity.token);
    assert.equal(browserIdentity(cookie,false,now+1000).setCookie,undefined);
    assert.notEqual(browserIdentity(cookie,false,now+30*86400000).token,identity.token);
    assert.match(browserIdentity(null,true,now).setCookie!,/^__Host-name-browser=.*; Secure$/);
    const issued = issueReceipt(input,versions,identity.token,'19+',1,now);
    const payload = verifyReceipt(issued.receipt,input,versions,identity.token,1,now);
    assert.equal(payload.analysisId,issued.analysisId);
    assert.equal(payload.ageBand,'19+');
    assert.ok(Buffer.byteLength(issued.receipt)<=2048);
    const publicPayload = Buffer.from(issued.receipt.split('.')[0],'base64url').toString();
    assert.equal(publicPayload.includes(input.birthDate),false);
    assert.equal(publicPayload.includes(input.givenName),false);
    const reject = (fn:()=>unknown, code:string) => assert.throws(fn,(e:unknown)=>e instanceof HttpError && e.code===code);
    reject(()=>verifyReceipt(issued.receipt,{...input,givenName:'연서'},versions,identity.token,1,now),'RECEIPT_INVALID');
    reject(()=>verifyReceipt(issued.receipt,input,versions,'other-browser',1,now),'RECEIPT_INVALID');
    reject(()=>verifyReceipt(issued.receipt,input,{...versions,rules:'v2'},identity.token,1,now),'ANALYSIS_STALE');
    reject(()=>verifyReceipt(issued.receipt,input,versions,identity.token,2,now),'ANALYSIS_STALE');
    reject(()=>verifyReceipt(issued.receipt,input,versions,identity.token,1,now+86400000),'RECEIPT_EXPIRED');
    reject(()=>verifyReceipt(issued.receipt+'x',input,versions,identity.token,1,now),'RECEIPT_INVALID');
    reject(()=>verifyReceipt('a'.repeat(2049),input,versions,identity.token,1,now),'RECEIPT_INVALID');
    const first = candidateId(issued.analysisId,'balance','internal-name');
    assert.equal(candidateId(issued.analysisId,'balance','internal-name'),first);
    assert.notEqual(candidateId(issued.analysisId,'amplify','internal-name'),first);
    process.env.NAME_RECEIPT_SECRET = 'cd'.repeat(32);
    reject(()=>verifyReceipt(issued.receipt,input,versions,identity.token,1,now),'RECEIPT_INVALID');
  } finally {
    if (previous === undefined) delete process.env.NAME_RECEIPT_SECRET;
    else process.env.NAME_RECEIPT_SECRET = previous;
  }
});
