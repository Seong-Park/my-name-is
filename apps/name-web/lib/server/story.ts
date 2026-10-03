import type { Pool } from 'pg';
import type { Candidate } from '../contracts';
import type { verifyReceipt } from './receipt';
import { databasePool } from './database';
import { reserveStory,dispatchStory,settleStory } from './ledger';
import { storyMessages,callDeepSeek,PROMPT_VERSION } from './deepseek';
import { validateStoryTokens } from './tokens';
import { deepSeekCostNano } from './pricing';
import { HttpError } from './http';

let sharedPool:Pool|undefined;

// The route must first verify the receipt and recompute this PUBLIC candidate.
export async function generateStory(receipt:ReturnType<typeof verifyReceipt>,candidate:Candidate,attempt:0|1,idempotencyKey:string,pool?:Pool) {
  if(!process.env.DEEPSEEK_API_KEY?.trim()) throw new HttpError(503,'AI_DISABLED','이야기 생성 설정을 준비하고 있어요.');
  const messages=storyMessages(candidate,receipt.ageBand);
  const tokenUpper=validateStoryTokens(messages);
  pool??=sharedPool??=databasePool();
  const operationId=await reserveStory(pool,{analysisId:receipt.analysisId,candidateId:candidate.candidateId,attempt,idempotencyKey,browserMac:receipt.browserMac,promptVersion:PROMPT_VERSION});
  if(!await dispatchStory(pool,operationId)) throw new HttpError(409,'STORY_ALREADY_FINISHED','이 요청은 이미 종료됐어요.',attempt===0);
  // No checked-out connection or transaction survives either ledger operation.
  const startedAt=Date.now();
  let result;
  try { result=await callDeepSeek(messages); } catch { result=null; }
  const finishedAt=Date.now();
  if(!result) {
    await settleStory(pool,operationId,{state:'uncertain'});
    throw new HttpError(504,'PROVIDER_UNCERTAIN','공급자의 처리 종료 여부를 확인하지 못했어요. 추가 호출은 하지 않습니다.');
  }
  const u=result.usage;
  const halt=u.inputTokens>tokenUpper||u.outputTokens>1024;
  const costNano=deepSeekCostNano(u,startedAt,finishedAt);
  if(costNano===null) {
    await settleStory(pool,operationId,{state:'uncertain',providerFinished:true,halt});
    throw new HttpError(504,'PROVIDER_UNCERTAIN','생성은 종료됐지만 비용 확인이 필요해요. 추가 호출은 하지 않습니다.');
  }
  const succeeded=!!result.story&&!halt;
  await settleStory(pool,operationId,{state:succeeded?'succeeded':'failed',costNano,inputTokens:u.inputTokens,outputTokens:u.outputTokens,halt,...(succeeded?{}:{errorCode:halt?'PROVIDER_FAILED' as const:`STORY_INVALID_${result.validation.code??'INVALID_STRUCTURE'}` as const})});
  if(halt) throw new HttpError(503,'AI_DISABLED','토큰 계산 기준을 다시 확인할 때까지 이야기 생성을 중단했어요.');
  if(!result.story) throw new HttpError(502,'STORY_INVALID','이야기의 문단 형식을 확인하지 못했어요.',attempt===0);
  return {analysisId:receipt.analysisId,candidateId:candidate.candidateId,attempt,story:result.story,promptVersion:PROMPT_VERSION};
}
