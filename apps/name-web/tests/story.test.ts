import { test,mock } from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { generateStory } from '../lib/server/story.ts';
import { HttpError } from '../lib/server/http.ts';
import { ApiError, retryAttempt } from '../lib/client/api.ts';
test('회상문 예약 전 거절은 같은 시도, 확정 실패는 한 번만, 불확실한 전송은 재시도하지 않는다', () => {
  assert.equal(retryAttempt(new ApiError('AI_BUSY', '', true), 0), 0);
  assert.equal(retryAttempt(new ApiError('AI_BUSY', '', true), 1), 1);
  assert.equal(retryAttempt(new ApiError('AI_DISABLED', '', false), 0), null);
  assert.equal(retryAttempt(new ApiError('PROVIDER_FAILED', '', true), 0), 1);
  assert.equal(retryAttempt(new ApiError('PROVIDER_FAILED', '', true), 1), null);
  assert.equal(retryAttempt(new ApiError('PROVIDER_UNCERTAIN', '', true), 0), null);
});

test('회상문은 예약·dispatch 커밋 후 한 번 전송하고 실제 usage·검증 실패·불명 상태를 정산한다',async()=>{
  const previous=process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY='unit-test-only';
  const paragraph='가상의 이야기 속에서 작은 뜻을 따라 하루를 천천히 돌아보았을지도 몰라요. 주변의 말을 듣고 나만의 속도로 걸었을 법해요.';
  const receipt={v:1 as const,keyId:'v1' as const,analysisId:crypto.randomUUID(),inputMac:'unused',browserMac:'b'.repeat(43),versions:{},visibleCount:3,ageBand:'19+' as const,issuedAt:0,expiresAt:1};
  const candidate={candidateId:'c'.repeat(43),hangul:'가상',hanja:'假想',meanings:['개발 검증'],targetElement:'검증용',evidence:['실제 추천 아님']};
  const clock=mock.method(Date,'now',()=>Date.parse('2026-10-08T16:00:00Z'));
  try {
    for(const mode of ['success','invalid','uncertain','pricing-unknown','over-budget','settlement-failure']) {
      clock.mock.mockImplementation(()=>Date.parse(mode==='pricing-unknown'?'2027-01-04T02:00:00Z':'2026-10-08T16:00:00Z'));
      const pool=new Pool();
      let checkedOut=0,calls=0,commits=0;
      let row:Record<string,unknown>|undefined;
      let totals:unknown[]=[];
      const client={release:()=>{checkedOut--;},query:async(sql:string,values:unknown[]=[])=>{
        if(sql==='COMMIT') commits++;
        if(sql.includes('statement_timestamp()')) return {rows:[{day:'2026-10-09',month:'2026-10-01',now:new Date(Date.now())}]};
        if(sql.includes('day_cost')) return {rows:[{day_cost:'0',month_cost:'0',halted:false}]};
        if(sql.includes('count(*)')) return {rows:[{count:'0'}]};
        if(sql.startsWith('SELECT *')) return {rows:sql.includes('operation_id')&&row?[row]:[]};
        if(sql.startsWith('INSERT INTO name_private.name_ai_attempts')) row={state:'reserved',day:values[8],reserved_nano:values[9],cost_nano:null,provider_finished_at:null};
        if(sql.includes("SET state='dispatching'")) {row!.state='dispatching';return {rows:[{day:row!.day}]};}
        if(sql.includes('SET state=$2')) {
          if(mode==='settlement-failure') throw new Error('private driver failure');
          Object.assign(row!,{state:values[1],cost_nano:values[2],provider_finished_at:values[6]?new Date():null});
        }
        if(sql.includes('cost_nano=cost_nano+$2')) totals=values;
        return {rows:[]};
      }};
      const connection=mock.method(pool,'connect',async()=>{checkedOut++;return client;});
      const transport=mock.method(globalThis,'fetch',async()=>{
        calls++;
        assert.equal(checkedOut,0,'No connection held during provider call');
        assert.equal(commits,2,'Reservation and dispatch committed before sending');
        if(mode==='uncertain') throw new Error('network interruption');
        const input=mode==='over-budget'?3100:425;
        return Response.json({model:'deepseek-flash',created:Math.floor(Date.now()/1000),usage:{prompt_tokens:input,prompt_cache_hit_tokens:0,prompt_cache_miss_tokens:input,completion_tokens:132,total_tokens:input+132},choices:[{finish_reason:'stop',message:{content:JSON.stringify({paragraphs:mode==='invalid'?['short']:[paragraph,paragraph,paragraph]})}}]});
      });
      try {
        const run=generateStory(receipt,candidate,0,crypto.randomUUID(),pool);
        if(mode==='success') assert.equal((await run).story.paragraphs.length,3);
        else {
          const code={invalid:'STORY_INVALID',uncertain:'PROVIDER_UNCERTAIN','pricing-unknown':'PROVIDER_UNCERTAIN','over-budget':'AI_DISABLED','settlement-failure':'BUDGET_STORE_UNAVAILABLE'}[mode];
          await assert.rejects(run,(e:unknown)=>e instanceof HttpError&&e.code===code&&!e.message.includes('private driver'));
        }
        assert.equal(calls,1);
        assert.equal(checkedOut,0);
        if(mode==='success'||mode==='invalid') assert.equal(row!.cost_nano,'142950');
        if(mode==='invalid') assert.equal(row!.state,'failed');
        if(mode==='uncertain') {assert.equal(row!.state,'uncertain');assert.equal(row!.cost_nano,'2128800');assert.equal(row!.provider_finished_at,null);}
        if(mode==='pricing-unknown') {assert.equal(row!.state,'uncertain');assert.equal(row!.cost_nano,'2128800');assert.ok(row!.provider_finished_at);}
        if(mode==='over-budget') {assert.equal(totals[7],true,'Calibration drift halts new calls');assert.equal(row!.state,'failed');}
      } finally {transport.mock.restore();connection.mock.restore();await pool.end();}
    }
  } finally {clock.mock.restore();if(previous===undefined) delete process.env.DEEPSEEK_API_KEY; else process.env.DEEPSEEK_API_KEY=previous;}
});

test('응답 유실과 진행 중 상태는 같은 attempt만 확인한다', () => {
  for (const code of ['NETWORK_ERROR','INVALID_RESPONSE','STORY_IN_PROGRESS']) {
    assert.equal(retryAttempt(new ApiError(code,''),0),0);
    assert.equal(retryAttempt(new ApiError(code,''),1),1);
  }
});
