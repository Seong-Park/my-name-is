import type { ProviderUsage } from './deepseek';

// Checked against live official pricing HTML on 2026-10-01 (search caches omit holidays).
// https://api-docs.deepseek.com/quick_start/pricing/
// 2026 holidays: 国办发明电〔2025〕7号, Beijing government republication:
// https://www.beijing.gov.cn/cs/gncs/zcwj/202603/t20260327_4568275.html
const holidays2026=[['01-01','01-03'],['02-15','02-23'],['04-04','04-06'],['05-01','05-05'],['06-19','06-21'],['09-25','09-27'],['10-01','10-07']];

function peak(at:number):boolean|null {
  const date=new Date(at),hour=date.getUTCHours(),weekday=date.getUTCDay();
  if(weekday===0||weekday===6||!((hour>=1&&hour<4)||(hour>=6&&hour<10))) return false;
  // Peak windows are 09–12 / 14–18 China time, on the same UTC calendar date.
  if(date.getUTCFullYear()!==2026) return null;
  const day=date.toISOString().slice(5,10);
  return !holidays2026.some(([from,to])=>day>=from&&day<=to);
}

export function deepSeekCostNano(usage:ProviderUsage,startedAt:number,finishedAt:number):bigint|null {
  if(![startedAt,finishedAt].every(n=>Number.isSafeInteger(n)&&n>=0&&n<=8640000000000000)||finishedAt<startedAt||finishedAt-startedAt>60000) return null;
  if(![usage.inputTokens,usage.outputTokens,usage.cacheHitTokens,usage.cacheMissTokens].every(n=>Number.isSafeInteger(n)&&n>=0)||usage.inputTokens!==usage.cacheHitTokens+usage.cacheMissTokens) return null;
  const before=peak(startedAt),after=peak(finishedAt);
  // The documented schedule doesn't specify a billing instant for calls crossing a boundary.
  // Keep the reservation charge until reconciliation instead of guessing from response.created.
  if(before===null||after===null||before!==after) return null;
  const offPeak=BigInt(usage.cacheHitTokens)*3n+BigInt(usage.cacheMissTokens)*150n+BigInt(usage.outputTokens)*600n;
  return before?offPeak*2n:offPeak;
}
