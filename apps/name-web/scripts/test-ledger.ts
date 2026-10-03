// Run only on the newly provisioned development ledger, before enabling any paid calls.
// These are disposable operational IDs, not mock birth profiles. No provider is called.
import { loadEnvFile } from 'node:process';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { databasePool } from '../lib/server/database.ts';
import { reserveStory,dispatchStory,settleStory,MAX_COST_NANO } from '../lib/server/ledger.ts';
import { HttpError } from '../lib/server/http.ts';

loadEnvFile('.env.local');
const pool=databasePool();
const inputs=Array.from({length:6},()=>({analysisId:randomUUID(),candidateId:randomUUID().replaceAll('-','').padEnd(43,'a'),attempt:0 as 0|1,idempotencyKey:randomUUID(),browserMac:'b'.repeat(43),promptVersion:'ledger-verification-v1'}));
const analysisIds=inputs.map(i=>i.analysisId);
const reject=(promise:Promise<unknown>,code:string)=>assert.rejects(promise,(e:unknown)=>e instanceof HttpError && e.code===code);
let started=false;
try {
  const {rows:[initial]}=await pool.query(`SELECT (SELECT count(*) FROM name_private.name_ai_attempts)::int attempts,
    (SELECT count(*) FROM name_private.name_ai_days)::int days`);
  assert.deepEqual(initial,{attempts:0,days:0},'Requires an empty, dedicated development ledger');
  started=true;
  const batch=await Promise.allSettled(inputs.map(i=>reserveStory(pool,i)));
  const accepted=batch.flatMap((r,index)=>r.status==='fulfilled'?[{id:r.value,input:inputs[index]}]:[]);
  for(const r of batch) if(r.status==='rejected' && r.reason.code!=='AI_BUSY') console.error(JSON.stringify({code:r.reason.code,sqlState:r.reason.cause?.code}));
  assert.equal(accepted.length,4,'Concurrent reservation limit');
  for(const r of batch) if(r.status==='rejected') assert.equal(r.reason.code,'AI_BUSY');
  const first=accepted[0];
  await reject(reserveStory(pool,first.input),'STORY_IN_PROGRESS');
  await reject(reserveStory(pool,{...first.input,idempotencyKey:randomUUID()}),'STORY_IN_PROGRESS');
  await reject(reserveStory(pool,{...inputs[5],analysisId:randomUUID(),idempotencyKey:first.input.idempotencyKey}),'IDEMPOTENCY_CONFLICT');
  let {rows:[day]}=await pool.query('SELECT * FROM name_private.name_ai_days');
  assert.equal(BigInt(day.reserved_nano),4n*MAX_COST_NANO);
  for(const row of accepted) assert.equal(await dispatchStory(pool,row.id),true);
  assert.equal(await dispatchStory(pool,first.id),false,'No duplicate dispatch');
  assert.equal(await settleStory(pool,first.id,{state:'succeeded',costNano:1500n,inputTokens:1,outputTokens:1}),true);
  assert.equal(await settleStory(pool,first.id,{state:'succeeded',costNano:1500n,inputTokens:1,outputTokens:1}),false,'No double settlement');
  const second=accepted[1];
  assert.equal(await settleStory(pool,second.id,{state:'uncertain'}),true);
  assert.equal(await settleStory(pool,second.id,{state:'uncertain'}),false);
  await reject(reserveStory(pool,{...second.input,attempt:1,idempotencyKey:randomUUID()}),'PROVIDER_UNCERTAIN');
  ({rows:[day]}=await pool.query('SELECT * FROM name_private.name_ai_days'));
  assert.equal(BigInt(day.cost_nano),MAX_COST_NANO+1500n);
  assert.equal(BigInt(day.reserved_nano),2n*MAX_COST_NANO,'Uncertain cost moves once');
  assert.equal(await settleStory(pool,second.id,{state:'uncertain',providerFinished:true}),true);
  assert.equal(await settleStory(pool,second.id,{state:'uncertain',providerFinished:true}),false);
  const {rows:[finishedUnknown]}=await pool.query('SELECT state,cost_nano,provider_finished_at FROM name_private.name_ai_attempts WHERE operation_id=$1',[second.id]);
  assert.equal(finishedUnknown.state,'uncertain');
  assert.ok(finishedUnknown.provider_finished_at);
  assert.equal(BigInt(finishedUnknown.cost_nano),MAX_COST_NANO);
  await reject(reserveStory(pool,{...second.input,attempt:1,idempotencyKey:randomUUID()}),'PROVIDER_UNCERTAIN');
  assert.equal(await settleStory(pool,second.id,{state:'failed',costNano:1000n,inputTokens:1,outputTokens:0,errorCode:'STORY_INVALID'}),true);
  const retry=await reserveStory(pool,{...second.input,attempt:1,idempotencyKey:randomUUID()});
  assert.equal(await dispatchStory(pool,retry),true);
  await settleStory(pool,retry,{state:'failed',costNano:0n,inputTokens:0,outputTokens:0,errorCode:'PROVIDER_FAILED'});
  await reject(reserveStory(pool,{...second.input,attempt:1,idempotencyKey:randomUUID()}),'STORY_ALREADY_FINISHED');
  for(const row of accepted.slice(2)) await settleStory(pool,row.id,{state:'failed',costNano:0n,inputTokens:0,outputTokens:0,errorCode:'PROVIDER_FAILED'});
  ({rows:[day]}=await pool.query('SELECT * FROM name_private.name_ai_days'));
  assert.equal(BigInt(day.cost_nano),2500n);
  assert.equal(BigInt(day.reserved_nano),0n);
  assert.equal(BigInt(day.call_count),5n);
  assert.equal(BigInt(day.success_count),1n);
  assert.equal(BigInt(day.failure_count),4n);
  console.log('PASS: concurrent cap, duplicate keys/attempts, dispatch once, settlement once, uncertain accounting, one retry');
  const fresh=()=>{const input={...inputs[0],analysisId:randomUUID(),idempotencyKey:randomUUID()};analysisIds.push(input.analysisId);return input;};
  const budgetInput=fresh();
  await pool.query('UPDATE name_private.name_ai_days SET cost_nano=3000000000');
  await reject(reserveStory(pool,budgetInput),'BUDGET_EXHAUSTED');
  await pool.query('UPDATE name_private.name_ai_days SET cost_nano=55000000000');
  await reject(reserveStory(pool,budgetInput),'BUDGET_EXHAUSTED');
  await pool.query('UPDATE name_private.name_ai_days SET cost_nano=2500');
  const expired=await reserveStory(pool,budgetInput);
  await pool.query("UPDATE name_private.name_ai_attempts SET created_at=clock_timestamp()-interval '121 seconds' WHERE operation_id=$1",[expired]);
  const next=await reserveStory(pool,fresh());
  const {rows:[expiredRow]}=await pool.query('SELECT state,cost_nano,provider_finished_at FROM name_private.name_ai_attempts WHERE operation_id=$1',[expired]);
  assert.equal(expiredRow.state,'failed');
  assert.equal(BigInt(expiredRow.cost_nano),0n);
  assert.ok(expiredRow.provider_finished_at);
  assert.equal(await dispatchStory(pool,expired),false,'Expired reservation cannot dispatch');
  const lostIds=[next];
  for(let i=0;i<3;i++) lostIds.push(await reserveStory(pool,fresh()));
  for(const id of lostIds) assert.equal(await dispatchStory(pool,id),true);
  await pool.query("UPDATE name_private.name_ai_attempts SET dispatched_at=clock_timestamp()-interval '61 seconds' WHERE operation_id=ANY($1::uuid[])",[lostIds]);
  await reject(reserveStory(pool,fresh()),'AI_BUSY');
  const {rows:lost}=await pool.query('SELECT state,provider_finished_at FROM name_private.name_ai_attempts WHERE operation_id=ANY($1::uuid[])',[lostIds]);
  assert.equal(lost.length,4);
  assert.ok(lost.every(row=>row.state==='uncertain'&&row.provider_finished_at===null),'Time does not release unknown external executions');
  ({rows:[day]}=await pool.query('SELECT * FROM name_private.name_ai_days'));
  assert.equal(BigInt(day.reserved_nano),0n);
  assert.equal(BigInt(day.cost_nano),2500n+4n*MAX_COST_NANO);
  await reject(reserveStory(pool,fresh()),'AI_BUSY');
  for(const id of lostIds) await settleStory(pool,id,{state:'failed',costNano:0n,inputTokens:0,outputTokens:0,errorCode:'PROVIDER_FAILED'});
  const overrun=await reserveStory(pool,fresh());
  await dispatchStory(pool,overrun);
  await settleStory(pool,overrun,{state:'succeeded',costNano:MAX_COST_NANO+1n,inputTokens:3001,outputTokens:1024});
  await reject(reserveStory(pool,fresh()),'AI_DISABLED');
  console.log('PASS: daily/monthly budget, refusal does not consume attempt, abandoned reservation, lost dispatch retains slots, cost overrun halts new calls');
} catch(error) {
  console.error(error instanceof assert.AssertionError ? `LEDGER_ASSERTION_FAILED: ${error.message}` : error instanceof HttpError ? error.code : 'LEDGER_DB_TEST_FAILED');
  process.exitCode=1;
} finally {
  if(started) {
    // Clean only this run's operational IDs. Keep the day row if any other writer appeared.
    const client=await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(716240101)');
      const {rows:[foreign]}=await client.query('SELECT count(*)::int count FROM name_private.name_ai_attempts WHERE NOT (analysis_id=ANY($1::uuid[]))',[analysisIds]);
      if(foreign.count!==0) throw new Error('Other writer detected; preserve all evidence for inspection');
      await client.query('DELETE FROM name_private.name_ai_attempts WHERE analysis_id=ANY($1::uuid[])',[analysisIds]);
      await client.query('DELETE FROM name_private.name_ai_days WHERE NOT EXISTS (SELECT 1 FROM name_private.name_ai_attempts)');
      await client.query('COMMIT');
    } catch { await client.query('ROLLBACK'); console.error('TEST_CLEANUP_REQUIRES_INSPECTION'); process.exitCode=1; }
    finally { client.release(); }
  }
  await pool.end();
}
