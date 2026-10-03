import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { HttpError, invalidInput, uuidPattern as uuid } from './http';
import type { StoryValidationCode } from './deepseek';

// Official peak/cache-miss price checked 2026-10-01. Recheck before enabling paid calls.
export const MAX_COST_NANO = 2128800n;
export const PRICING_VERSION = 'deepseek-flash-2026-10-01-peak-0.30-1.20';
type ReservationInput = {analysisId:string;candidateId:string;attempt:0|1;idempotencyKey:string;browserMac:string;promptVersion:string};
type Attempt = {
  operation_id:string;analysis_id:string;candidate_id:string;attempt:number;idempotency_key:string;browser_mac:string;
  day:string;state:string;reserved_nano:string;cost_nano:string|null;provider_finished_at:Date|null;
};
export type Settlement = ({state:'succeeded'|'failed';costNano:bigint;inputTokens:number;outputTokens:number;errorCode?:'STORY_INVALID'|`STORY_INVALID_${StoryValidationCode}`|'PROVIDER_FAILED'} | {state:'uncertain';providerFinished?:boolean}) & {halt?:boolean};
const unavailable = (cause?:unknown) => {
  const error=new HttpError(503,'BUDGET_STORE_UNAVAILABLE','비용 기록에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.',true);
  const code=cause && typeof cause==='object' && 'code' in cause ? String(cause.code) : '';
  if(/^[A-Z0-9_]{1,40}$/.test(code)) error.cause={code};
  return error;
};

async function locked<T>(pool:Pool, work:(client:PoolClient)=>Promise<T|HttpError>):Promise<T> {
  let client:PoolClient;
  try { client=await pool.connect(); } catch(error) { throw unavailable(error); }
  let destroy=false;
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL statement_timeout = '5s'");
    // ponytail: one global transaction lock fits four concurrent calls; shard only if throughput requires it.
    await client.query('SELECT pg_advisory_xact_lock(716240101)');
    const result=await work(client);
    await client.query('COMMIT');
    if (result instanceof HttpError) throw result;
    return result;
  } catch(error) {
    try { await client.query('ROLLBACK'); } catch { destroy=true; }
    if(error instanceof HttpError) throw error;
    throw unavailable(error);
  } finally { client.release(destroy); }
}

async function recover(client:PoolClient) {
  // Undispatched reservations are safe to release. Dispatched work never gets a time-based slot release.
  await client.query(`WITH expired AS (
    UPDATE name_private.name_ai_attempts SET state='failed',cost_nano=0,error_code='RESERVATION_EXPIRED',
      settled_at=clock_timestamp(),provider_finished_at=clock_timestamp()
    WHERE state='reserved' AND created_at<clock_timestamp()-interval '2 minutes'
    RETURNING day,reserved_nano
  ), totals AS (SELECT day,sum(reserved_nano) amount FROM expired GROUP BY day)
  UPDATE name_private.name_ai_days d SET reserved_nano=d.reserved_nano-t.amount FROM totals t WHERE d.day=t.day`);
  await client.query(`WITH lost AS (
    UPDATE name_private.name_ai_attempts SET state='uncertain',cost_nano=reserved_nano,
      error_code='PROVIDER_UNCERTAIN',settled_at=clock_timestamp()
    WHERE state='dispatching' AND dispatched_at<clock_timestamp()-interval '60 seconds'
    RETURNING day,reserved_nano
  ), totals AS (SELECT day,sum(reserved_nano) amount FROM lost GROUP BY day)
  UPDATE name_private.name_ai_days d SET reserved_nano=d.reserved_nano-t.amount,cost_nano=d.cost_nano+t.amount
  FROM totals t WHERE d.day=t.day`);
}

function duplicate(row:Attempt):HttpError {
  if(row.state==='reserved'||row.state==='dispatching') return new HttpError(409,'STORY_IN_PROGRESS','이야기 생성이 진행 중이에요.',false,5);
  if(row.state==='uncertain') return new HttpError(504,'PROVIDER_UNCERTAIN','이전 호출의 종료 여부를 확인하고 있어요. 다시 호출하지 않습니다.');
  return new HttpError(409,'STORY_ALREADY_FINISHED','이 호출은 이미 끝났어요. 저장된 이야기를 확인해 주세요.',row.attempt===0);
}

export async function reserveStory(pool:Pool,input:ReservationInput):Promise<string> {
  if(!uuid.test(input.analysisId)||!uuid.test(input.idempotencyKey)||!['candidateId','browserMac'].every(k=>/^[A-Za-z0-9_-]{43}$/.test(input[k as 'candidateId'|'browserMac']))||![0,1].includes(input.attempt)||!/^[-a-zA-Z0-9_.]{1,80}$/.test(input.promptVersion)) throw invalidInput();
  return locked(pool,async client=>{
    await recover(client);
    const existing=await client.query<Attempt>(`SELECT * FROM name_private.name_ai_attempts
      WHERE idempotency_key=$1 OR (analysis_id=$2 AND candidate_id=$3 AND attempt=$4)`,[input.idempotencyKey,input.analysisId,input.candidateId,input.attempt]);
    if(existing.rows.some(r=>r.analysis_id!==input.analysisId||r.candidate_id!==input.candidateId||r.attempt!==input.attempt||r.browser_mac!==input.browserMac)) return new HttpError(409,'IDEMPOTENCY_CONFLICT','같은 요청 키를 다른 작업에 사용할 수 없어요.');
    if(existing.rows[0]) return duplicate(existing.rows[0]);
    if(input.attempt===1) {
      const previous=await client.query<Attempt>('SELECT * FROM name_private.name_ai_attempts WHERE analysis_id=$1 AND candidate_id=$2 AND attempt=0',[input.analysisId,input.candidateId]);
      const row=previous.rows[0];
      if(!row||row.browser_mac!==input.browserMac) return new HttpError(409,'ATTEMPT_LIMIT','최초 요청을 먼저 완료해 주세요.');
      if(!['succeeded','failed'].includes(row.state)||!row.provider_finished_at) return duplicate(row);
    }
    const {rows:[clock]}=await client.query<{day:string;month:string;now:Date}>(`SELECT
      (statement_timestamp() AT TIME ZONE 'Asia/Seoul')::date::text AS "day",
      date_trunc('month',statement_timestamp() AT TIME ZONE 'Asia/Seoul')::date::text AS "month",statement_timestamp() AS "now"`);
    const {rows:[totals]}=await client.query<{day_cost:string;month_cost:string;halted:boolean}>(`SELECT
      coalesce(sum(cost_nano+reserved_nano) FILTER (WHERE day=$1::date),0)::text day_cost,
      coalesce(sum(cost_nano+reserved_nano) FILTER (WHERE day>=$2::date AND day<($2::date+interval '1 month')),0)::text month_cost,
      coalesce(bool_or(ai_halted),false) halted FROM name_private.name_ai_days`,[clock.day,clock.month]);
    if(totals.halted) return new HttpError(503,'AI_DISABLED','비용 대조가 끝날 때까지 이야기 생성을 중단했어요.');
    const dayFull=BigInt(totals.day_cost)+MAX_COST_NANO>3000000000n;
    const monthFull=BigInt(totals.month_cost)+MAX_COST_NANO>55000000000n;
    if(dayFull||monthFull) {
      const reset=monthFull ? new Date(Date.UTC(Number(clock.month.slice(0,4)),Number(clock.month.slice(5,7)),1)-9*3600000) : new Date(Date.parse(`${clock.day}T00:00:00+09:00`)+86400000);
      return new HttpError(429,'BUDGET_EXHAUSTED',monthFull?'이번 달 이야기 생성 한도에 도달했어요.':'오늘 이야기 생성 한도에 도달했어요.',true,Math.max(1,Math.ceil((reset.getTime()-clock.now.getTime())/1000)));
    }
    const {rows:[active]}=await client.query<{count:string}>(`SELECT count(*)::text count FROM name_private.name_ai_attempts WHERE state IN ('reserved','dispatching') OR (state='uncertain' AND provider_finished_at IS NULL)`);
    if(Number(active.count)>=4) return new HttpError(429,'AI_BUSY','현재 생성 요청이 많아요. 잠시 뒤 다시 시도해 주세요.',true,5);
    const operationId=randomUUID();
    await client.query('INSERT INTO name_private.name_ai_days(day,reserved_nano) VALUES($1,$2) ON CONFLICT(day) DO UPDATE SET reserved_nano=name_ai_days.reserved_nano+excluded.reserved_nano',[clock.day,MAX_COST_NANO.toString()]);
    await client.query(`INSERT INTO name_private.name_ai_attempts(operation_id,analysis_id,candidate_id,attempt,idempotency_key,browser_mac,model,pricing_version,prompt_version,day,reserved_nano,state)
      VALUES($1,$2,$3,$4,$5,$6,'deepseek-flash',$7,$8,$9,$10,'reserved')`,[operationId,input.analysisId,input.candidateId,input.attempt,input.idempotencyKey,input.browserMac,PRICING_VERSION,input.promptVersion,clock.day,MAX_COST_NANO.toString()]);
    return operationId;
  });
}

export async function dispatchStory(pool:Pool,operationId:string):Promise<boolean> {
  if(!uuid.test(operationId)) throw invalidInput();
  return locked(pool,async client=>{
    await recover(client);
    const {rows}=await client.query(`UPDATE name_private.name_ai_attempts SET state='dispatching',dispatched_at=clock_timestamp() WHERE operation_id=$1 AND state='reserved' RETURNING day`,[operationId]);
    if(!rows.length) return false;
    await client.query('UPDATE name_private.name_ai_days SET call_count=call_count+1 WHERE day=$1',[rows[0].day]);
    return true;
  });
}

export async function settleStory(pool:Pool,operationId:string,outcome:Settlement):Promise<boolean> {
  if(!uuid.test(operationId)) throw invalidInput();
  if(outcome.state!=='uncertain' && (outcome.costNano<0n || ![outcome.inputTokens,outcome.outputTokens].every(n=>Number.isSafeInteger(n)&&n>=0))) throw invalidInput();
  return locked(pool,async client=>{
    await recover(client);
    const {rows:[row]}=await client.query<Attempt>('SELECT * FROM name_private.name_ai_attempts WHERE operation_id=$1',[operationId]);
    if(!row||!['dispatching','uncertain'].includes(row.state)) return false;
    if(row.state==='uncertain'&&outcome.state==='uncertain') {
      if(outcome.halt) await client.query('UPDATE name_private.name_ai_days SET ai_halted=true WHERE day=$1',[row.day]);
      if(!outcome.providerFinished||row.provider_finished_at) return false;
      // Execution evidence releases the slot, not the conservative charge or retry guard.
      await client.query(`UPDATE name_private.name_ai_attempts SET provider_finished_at=clock_timestamp()
        WHERE operation_id=$1 AND state='uncertain' AND provider_finished_at IS NULL`,[operationId]);
      return true;
    }
    const uncertain=outcome.state==='uncertain';
    const cost=uncertain?BigInt(row.reserved_nano):outcome.costNano;
    const delta=cost-BigInt(row.cost_nano??'0');
    const released=row.state==='dispatching'?row.reserved_nano:'0';
    await client.query(`UPDATE name_private.name_ai_attempts SET state=$2,cost_nano=$3,input_tokens=$4,output_tokens=$5,error_code=$6,settled_at=clock_timestamp(),provider_finished_at=CASE WHEN $7 THEN coalesce(provider_finished_at,clock_timestamp()) ELSE provider_finished_at END WHERE operation_id=$1 AND state IN ('dispatching','uncertain')`,[operationId,outcome.state,cost.toString(),uncertain?null:outcome.inputTokens,uncertain?null:outcome.outputTokens,uncertain?'PROVIDER_UNCERTAIN':outcome.errorCode??null,!uncertain||outcome.providerFinished===true]);
    await client.query(`UPDATE name_private.name_ai_days SET cost_nano=cost_nano+$2,reserved_nano=reserved_nano-$3,
      input_tokens=input_tokens+$4,output_tokens=output_tokens+$5,success_count=success_count+$6,failure_count=failure_count+$7,
      ai_halted=ai_halted OR $8 WHERE day=$1`,[row.day,delta.toString(),released,uncertain?0:outcome.inputTokens,uncertain?0:outcome.outputTokens,outcome.state==='succeeded'?1:0,outcome.state==='failed'?1:0,cost>BigInt(row.reserved_nano)||outcome.halt===true]);
    return true;
  });
}
