// One-shot development calibration, NOT an analysis result or a recommended name.
// Keeps the attempt ledger even on failure; never run the empty-ledger cleanup after this call.
import { loadEnvFile } from 'node:process';
import { mkdir,writeFile,readFile } from 'node:fs/promises';
import { randomBytes,randomUUID } from 'node:crypto';
import { databasePool } from '../lib/server/database.ts';
import { reserveStory,dispatchStory,settleStory } from '../lib/server/ledger.ts';
import { storyMessages,callDeepSeek,PROMPT_VERSION } from '../lib/server/deepseek.ts';
import { countMessageTokens,TOKENIZER_SHA256 } from '../lib/server/tokens.ts';
import { deepSeekCostNano } from '../lib/server/pricing.ts';
import { winterWoodBalance } from '../lib/server/interpretation.ts';

loadEnvFile('.env.local');
if(!process.env.DEEPSEEK_API_KEY?.trim()) throw new Error('DEEPSEEK_KEY_MISSING');
const mode=process.argv[2]??'initial';
if(!['initial','--retry','--korean','--long','--syntax','--winter','--winter-v3'].includes(mode)||process.argv.slice(3).some(arg=>arg!=='--dry-run')||process.argv.length>4) throw new Error('UNKNOWN_ARGUMENT');
const candidate={candidateId:'development-only',hangul:'가상',hanja:'假想',meanings:['실제로 일어난 일이 아닌 상상'],targetElement:'개발 검증용 · 명리 추천 아님',evidence:['실제 사람이나 추천 결과가 아닌 문장 형식 검증용 자료다.']};
if(mode==='--korean') Object.assign(candidate,{hangul:'임천',hanja:'林泉',meanings:['나무가 모인 숲','물이 솟아나는 샘'],evidence:['문장 형식 검증을 위한 한자 뜻 자료이며 실제 추천 결과가 아니다.']});
if((mode==='--winter'||mode==='--winter-v3')) Object.assign(candidate,{hangul:'김욱현',hanja:'金煜炫',meanings:['환하게 비추는 빛 또는 불꽃.','빛이 밝게 빛나는 모습.'],targetElement:'화',evidence:winterWoodBalance('庚寅 戊子 甲寅 丙寅'.split(' ').map(p=>({stem:p[0],branch:p[1]})))!.evidence});
if(mode==='--syntax'||(mode==='--winter'||mode==='--winter-v3')) {
  if(mode==='--syntax')
  Object.assign(candidate,{hangul:'김동림',hanja:'金桐林',meanings:['오동·벽오동류를 가리키는 나무 이름.','나무가 모여 자란 숲.'],targetElement:'목',evidence:['문법 검증용 가상 후보이며 실제 출생정보를 포함하지 않는다.']});
  const transport=globalThis.fetch;
  globalThis.fetch=async(...args:Parameters<typeof fetch>)=>{
    const response=await transport(...args);
    try {
      const envelope=await response.clone().json();
      const content=envelope?.choices?.[0]?.message?.content;
      if(typeof content==='string') try { JSON.parse(content); } catch(error) {
        const position=error instanceof SyntaxError?Number(error.message.match(/position (\d+)/)?.[1]):NaN;
        // Only character classes around the fault: no prompt, output text, or exception message.
        const classes=Number.isSafeInteger(position)?[...content.slice(Math.max(0,position-8),position+8)].map(c=>'{}[]:,"\\'.includes(c)?c:c==='\n'?'LF':/\s/.test(c)?'SPACE':'TEXT'):[];
        console.log(JSON.stringify({syntaxDiagnostic:true,position:Number.isSafeInteger(position)?position:null,classes}));
      }
    } catch { /* The normal transport/parser handles malformed envelopes. */ }
    return response;
  };
}
if(mode==='--long') {
  candidate.evidence.push('한자 자형 𠮷·吉, 따옴표 "자료", 역슬래시 \\, 줄바꿈\n과 기호 JSON 처리 검증. 아래 반복은 개인정보와 실제 판정 근거가 아니다.');
  const sentence='이 자료는 가상 문장 형식 검증만을 위한 반복 설명이다. 이름이 삶을 바꾸거나 실제 과거를 설명한다는 뜻이 아니며, 아이의 배움과 놀이를 상상하는 장면으로만 사용한다. ';
  while(countMessageTokens(storyMessages(candidate,'13–18'))<2300) candidate.evidence.push(sentence);
}
const messages=storyMessages(candidate,mode==='--korean'?'0–5':mode==='--long'||(mode==='--winter'||mode==='--winter-v3')?'13–18':'19+');
const templateTokens=countMessageTokens(messages);
// Leave at least 500 tokens for unconfirmed API overhead; this is not the production gate.
if(templateTokens>2500||Buffer.byteLength(messages.map(m=>m.content).join(''))>16384) throw new Error('CALIBRATION_TOO_LARGE');
if(process.argv[3]==='--dry-run') {console.log(JSON.stringify({mode,templateTokens,paidCall:false}));process.exit(0);}
await mkdir('.cache',{recursive:true});
const retry=mode==='--retry';
const initial=retry?JSON.parse(await readFile('.cache/deepseek-calibration-attempt.json','utf8')):null;
const ids={analysisId:initial?.analysisId??randomUUID(),candidateId:initial?.candidateId??randomBytes(32).toString('base64url'),attempt:(retry?1:0) as 0|1,idempotencyKey:randomUUID(),browserMac:initial?.browserMac??randomBytes(32).toString('base64url'),promptVersion:"calibration-"+PROMPT_VERSION};
const label=retry?'retry':mode==='initial'?'attempt':mode.slice(2);
const attemptPath=`.cache/deepseek-calibration-${label}.json`;
await writeFile(attemptPath,JSON.stringify(ids),{flag:'wx'});
const pool=databasePool();
let operationId:string|undefined;
try {
  operationId=await reserveStory(pool,ids);
  await writeFile(attemptPath,JSON.stringify({...ids,operationId}));
  if(!await dispatchStory(pool,operationId)) throw new Error('DISPATCH_NOT_GRANTED');
  const startedAt=Date.now();
  const result=await callDeepSeek(messages);
  const finishedAt=Date.now();
  if(!result) {
    await settleStory(pool,operationId,{state:'uncertain'});
    throw new Error('PROVIDER_UNCERTAIN');
  }
  const created=new Date(result.created*1000);
  const costNano=deepSeekCostNano(result.usage,startedAt,finishedAt);
  if(costNano===null) {
    await settleStory(pool,operationId,{state:'uncertain',providerFinished:true});
    throw new Error('PRICING_REQUIRES_RECONCILIATION');
  }
  const u=result.usage;
  await settleStory(pool,operationId,{state:result.story?'succeeded':'failed',costNano,inputTokens:u.inputTokens,outputTokens:u.outputTokens,...(result.story?{}:{errorCode:'STORY_INVALID' as const})});
  const report={developmentOnly:true,notARecommendation:true,mode,tokenizerSha256:TOKENIZER_SHA256,templateTokens,actualInputTokens:u.inputTokens,overhead:u.inputTokens-templateTokens,outputTokens:u.outputTokens,costNano:costNano.toString(),storyValid:!!result.story,validation:result.validation,created:created.toISOString()};
  await writeFile(mode==='initial'?'.cache/deepseek-calibration-result.json':`.cache/deepseek-calibration-${label}-result.json`,JSON.stringify({report,story:result.story},null,2));
  console.log(JSON.stringify(report));
  if(!result.story) process.exitCode=1;
} catch(error) {
  console.error(error instanceof Error && /^[A-Z_]+$/.test(error.message)?error.message:'CALIBRATION_FAILED_CHECK_LEDGER');
  process.exitCode=1;
} finally { await pool.end(); }
