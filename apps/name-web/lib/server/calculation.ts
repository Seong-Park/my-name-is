import KoreanLunarCalendar from 'korean-lunar-calendar';
import { calculateFourPillarsWithCandidates, createCalendarContext, CalendarProviderError } from '../../../../packages/bazi-engine/src/index';
import { koreaNow, type Input } from '../contracts';
import { toNatalInput } from './input';
import { HttpError, invalidInput } from './http';
import type { AgeBand } from './receipt';

export function calculateBirth(input: Input) {
  try {
    // The lunar backend is mutable: create one per calculation, never share it across requests.
    return calculateFourPillarsWithCandidates(toNatalInput(input),createCalendarContext(new KoreanLunarCalendar()));
  } catch (error) {
    if (error instanceof CalendarProviderError && ['INVALID_INPUT','UNSUPPORTED_DATE','DST_GAP','OFFSET_MISMATCH'].includes(error.code)) throw invalidInput();
    throw new HttpError(503,'CALCULATION_UNAVAILABLE','출생정보 계산을 완료하지 못했어요. 잠시 뒤 다시 시도해 주세요.');
  }
}

export function ageBand(solarDate: string, analysisDate = koreaNow().slice(0,10)): AgeBand {
  const age = Number(analysisDate.slice(0,4))-Number(solarDate.slice(0,4))-(analysisDate.slice(5)<solarDate.slice(5)?1:0);
  return age<6 ? '0–5' : age<13 ? '6–12' : age<19 ? '13–18' : '19+';
}
