import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { callDeepSeek, parseDeepSeekResponse, storyMessages } from '../lib/server/deepseek.ts';

test('회상문은 정확한 3문단·길이·추가 키·완료 상태와 usage를 검사한다', () => {
  const paragraph='가상의 이야기 속에서 작은 뜻을 따라 하루를 천천히 돌아보았을지도 몰라요. 주변의 말을 듣고 나만의 속도로 걸었을 법해요.';
  const response={model:'deepseek-flash',created:1790985600,choices:[{finish_reason:'stop',message:{content:JSON.stringify({paragraphs:[paragraph,paragraph,paragraph]})}}],usage:{prompt_tokens:100,prompt_cache_hit_tokens:0,prompt_cache_miss_tokens:100,completion_tokens:150,total_tokens:250}};
  const result=parseDeepSeekResponse(response);
  assert.equal(result?.story?.paragraphs.length,3);
  assert.equal(result?.usage.inputTokens,100);
  const choice=(content:string,finish_reason='stop')=>({...response,choices:[{finish_reason,message:{content}}]});
  for(const content of [JSON.stringify({paragraphs:[paragraph,paragraph,paragraph],extra:true}),JSON.stringify({paragraphs:['짧음',paragraph,paragraph]}),JSON.stringify({paragraphs:[paragraph+'\n줄바꿈',paragraph,paragraph]}),'not-json']) {
    const invalid=parseDeepSeekResponse(choice(content));
    assert.equal(invalid?.story,null);
    assert.equal(invalid?.usage.outputTokens,150,'Charged invalid output retains usage');
  }
  assert.equal(parseDeepSeekResponse(choice(response.choices[0].message.content,'length'))?.story,null);
  assert.equal(parseDeepSeekResponse(choice(response.choices[0].message.content,'length'))?.validation.code,'INCOMPLETE_OUTPUT');
  assert.equal(parseDeepSeekResponse(choice(JSON.stringify({paragraphs:['짧음',paragraph,paragraph]})))?.validation.code,'PARAGRAPH_LENGTH');
  assert.equal(parseDeepSeekResponse({...response,usage:{...response.usage,total_tokens:1}}),null);
  assert.equal(parseDeepSeekResponse({...response,model:'different-model'}),null);
  assert.equal(parseDeepSeekResponse(choice('{'))?.validation.code,'INVALID_JSON');
  assert.equal(parseDeepSeekResponse(choice('  '))?.validation.code,'EMPTY_CONTENT');
  assert.equal(parseDeepSeekResponse(choice('```json\n{}\n```'))?.validation.code,'FENCED_JSON');
  assert.equal(parseDeepSeekResponse(choice('\uFEFF{}'))?.validation.code,'JSON_BOM');
  assert.equal(parseDeepSeekResponse(choice('{"paragraphs":["a\nb"]}'))?.validation.code,'JSON_CONTROL_CHARACTER');
  assert.equal(parseDeepSeekResponse(choice('{"paragraphs":["a" "b"]}'))?.validation.code,'JSON_DELIMITER');
  assert.equal(parseDeepSeekResponse(choice('{"paragraphs":["a","b","c"}'))?.validation.code,'JSON_DELIMITER','Missing array close stays a failure; never repair provider JSON');
  assert.equal(parseDeepSeekResponse(choice(JSON.stringify({paragraphs:[paragraph]})))?.validation.code,'PARAGRAPH_COUNT');
  assert.equal(parseDeepSeekResponse(choice(JSON.stringify({paragraphs:[paragraph,paragraph,4]})))?.validation.code,'PARAGRAPH_TYPE');
  assert.equal(parseDeepSeekResponse(choice(JSON.stringify({paragraphs:[paragraph,paragraph,paragraph],extra:true})))?.validation.code,'ADDITIONAL_KEYS');
});

test('공급자 전송은 JSON·thinking off·출력 상한을 지키고 실패를 재시도하지 않는다',async()=>{
  const previous=process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY='unit-test-only';
  let calls=0;
  const requests:RequestInit[]=[];
  const transport=mock.method(globalThis,'fetch',async (_url:unknown,init:RequestInit)=>{
    calls++; requests.push(init);
    return new Response('provider failure',{status:503});
  });
  try {
    const messages=[{role:'system' as const,content:'JSON'},{role:'user' as const,content:'{}'}];
    assert.equal(await callDeepSeek(messages),null);
    assert.equal(calls,1);
    const sent=JSON.parse(String(requests[0].body));
    assert.deepEqual(sent,{model:'deepseek-flash',thinking:{type:'disabled'},response_format:{type:'json_object'},max_tokens:1024,stream:false,messages});
    assert.equal(requests[0].redirect,'error');
    assert.ok(requests[0].signal instanceof AbortSignal);
    transport.mock.mockImplementation(async()=>{calls++;throw new Error('transport unavailable');});
    assert.equal(await callDeepSeek(messages),null);
    assert.equal(calls,2,'No retry on uncertain transport');
    transport.mock.mockImplementation(async()=>{calls++;return new Response('x'.repeat(65537));});
    assert.equal(await callDeepSeek(messages),null);
    assert.equal(calls,3,'Oversized output fails without another paid call');
  } finally {
    transport.mock.restore();
    if(previous===undefined) delete process.env.DEEPSEEK_API_KEY; else process.env.DEEPSEEK_API_KEY=previous;
  }
});

test('LLM 전송 데이터는 공개 후보의 뜻·근거와 연령대로 제한한다', () => {
  const messages=storyMessages({candidateId:'private-id',hangul:'가상',hanja:'假想',meanings:['검증용 뜻'],targetElement:'검증용',evidence:['개발 검증용이며 실제 추천이 아니다.']},'6–12');
  assert.equal(messages.length,2);
  const data=JSON.parse(messages[1].content);
  assert.deepEqual(Object.keys(data).sort(),['ageBand','evidence','hangul','hanja','meanings','targetElement'].sort());
  assert.equal(JSON.stringify(messages).includes('private-id'),false);
  assert.match(messages[0].content,/JSON/);
});
