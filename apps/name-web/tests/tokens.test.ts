import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countMessageTokens,validateStoryTokens } from '../lib/server/tokens.ts';
import { storyMessages } from '../lib/server/deepseek.ts';
import { HttpError } from '../lib/server/http.ts';

test('검증한 두 메시지 형식의 실측 차이에 보수 여유를 두고 3000 초과를 전송 전에 거절한다',()=>{
  const candidate={candidateId:'development-only',hangul:'임천',hanja:'林泉',meanings:['나무가 모인 숲','물이 솟아나는 샘'],targetElement:'개발 검증용 · 명리 추천 아님',evidence:['문장 형식 검증을 위한 한자 뜻 자료이며 실제 추천 결과가 아니다.']};
  const messages=storyMessages(candidate,'0–5');
  assert.equal(countMessageTokens(messages),512,'Pinned tokenizer / v3 prompt');
  assert.equal(validateStoryTokens(messages),640);
  candidate.evidence=['긴 근거를 임의로 잘라내지 않는다. '.repeat(1000)];
  assert.throws(()=>validateStoryTokens(storyMessages(candidate,'0–5')),(e:unknown)=>e instanceof HttpError&&e.status===422&&e.code==='PROMPT_TOO_LARGE');
  assert.throws(()=>validateStoryTokens([...messages,{role:'user',content:'extra'}]),(e:unknown)=>e instanceof HttpError&&e.code==='AI_DISABLED');
});
