import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { reserveStory, settleStory, MAX_COST_NANO } from '../lib/server/ledger.ts';
import { HttpError } from '../lib/server/http.ts';

test('비용 상한은 정수이며 DB 장애에는 예약이나 공급자 성공을 반환하지 않는다', async () => {
  assert.equal(MAX_COST_NANO,3000n*300n+1024n*1200n);
  const pool = new Pool({connectionString:'postgresql://test:do-not-echo@127.0.0.1:1/unavailable',connectionTimeoutMillis:200});
  try {
    await assert.rejects(reserveStory(pool,{
      analysisId:crypto.randomUUID(),candidateId:'c'.repeat(43),attempt:0,idempotencyKey:crypto.randomUUID(),browserMac:'b'.repeat(43),promptVersion:'story-v1',
    }),(e:unknown)=>e instanceof HttpError && e.code==='BUDGET_STORE_UNAVAILABLE' && !e.message.includes('do-not-echo'));
  } finally { await pool.end(); }
});

test('종료만 확인된 uncertain은 비용을 재계상하지 않고 슬롯만 한 번 해제한다', async () => {
  const pool=new Pool();
  const updates:{sql:string;values:unknown[]}[]=[];
  const row={state:'uncertain',reserved_nano:MAX_COST_NANO.toString(),cost_nano:MAX_COST_NANO.toString(),provider_finished_at:null as Date|null,day:'2026-10-01'};
  const client={
    query:async (sql:string,values:unknown[]=[])=>{
      if(sql.startsWith('SELECT *')) return {rows:[row]};
      if(sql.startsWith('UPDATE')) {
        updates.push({sql,values});
        if(sql.includes('provider_finished_at')) row.provider_finished_at=new Date();
      }
      return {rows:[]};
    },
    release:()=>{},
  };
  // Only the database transport is replaced; exercise the production transition guard.
  const { mock }=await import('node:test');
  mock.method(pool,'connect',async()=>client);
  try {
    const id=crypto.randomUUID();
    assert.equal(await settleStory(pool,id,{state:'uncertain'}),false);
    assert.equal(await settleStory(pool,id,{state:'uncertain',providerFinished:true}),true);
    assert.equal(updates.length,1,'No day-total or token-counter update');
    assert.match(updates[0].sql,/provider_finished_at/);
    assert.equal(row.cost_nano,MAX_COST_NANO.toString());
    assert.equal(await settleStory(pool,id,{state:'uncertain',providerFinished:true}),false);
    assert.equal(updates.length,1,'Duplicate finish confirmation is a no-op');
  } finally { mock.restoreAll(); await pool.end(); }
});
