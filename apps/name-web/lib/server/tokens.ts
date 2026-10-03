import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Tokenizer } from '@huggingface/tokenizers';
import type { Message } from './deepseek';
import { HttpError } from './http';

export const TOKENIZER_SHA256='89085f12ef79460ac5f66d1119325ddfc694b4ab209d80bbd81d35f081dc9614';
export const TOKENIZER_CONFIG_SHA256='841f8cf146e3f0ad1082594a31f68ecf7608c20467ef355081333d85bbaeb1cb';
let tokenizer:Tokenizer|undefined;
// 2026-10-01: three distinct Korean/Hanja/escaped/long fixtures, four paid responses,
// all measured +24. 128 includes 104 tokens of operational margin; recheck on model/prompt changes.
// This is an empirical allowance, not a provider guarantee against future model changes.
// 2026-10-03 v3 winter fixture: template639 / API663, still +24 (three paragraphs valid).
export function validateStoryTokens(messages:Message[]):number {
  const upper=countMessageTokens(messages)+128;
  if(upper>3000) throw new HttpError(422,'PROMPT_TOO_LARGE','회상문 근거가 입력 한도를 넘었어요. 이름 결과는 계속 볼 수 있어요.');
  return upper;
}
export function countMessageTokens(messages:Message[]):number {
  if(messages.length!==2||messages[0].role!=='system'||messages[1].role!=='user') throw new HttpError(503,'AI_DISABLED','지원하지 않는 이야기 메시지 형식이에요.');
  try {
    if(!tokenizer) {
      const data=readFileSync(new URL('../../.cache/deepseek_v4_tokenizer/tokenizer.json',import.meta.url));
      if(createHash('sha256').update(data).digest('hex')!==TOKENIZER_SHA256) throw new Error('Tokenizer version mismatch');
      const configBytes=readFileSync(new URL('../../.cache/deepseek_v4_tokenizer/tokenizer_config.json',import.meta.url));
      if(createHash('sha256').update(configBytes).digest('hex')!==TOKENIZER_CONFIG_SHA256) throw new Error('Tokenizer config mismatch');
      const config=JSON.parse(configBytes.toString('utf8'));
      tokenizer=new Tokenizer(JSON.parse(data.toString('utf8')),config);
    }
    // Exact system+user branch of the official chat_template; API overhead is calibrated separately.
    return tokenizer.encode(`<｜begin▁of▁sentence｜>${messages[0].content}<｜User｜>${messages[1].content}<｜Assistant｜>`).ids.length;
  } catch { throw new HttpError(503,'AI_DISABLED','토큰 계산 자료를 확인하지 못했어요.'); }
}
