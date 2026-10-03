import type { Ganzhi } from '@mylife/bazi-domain';
import { GANZHI_CYCLE } from '@mylife/bazi-rules';
import type { CalendarContext } from '../time/providers';
import { activeJie } from './jie';

/** 입춘부터 새 연주. 1월 소한은 직전 명리 연도의 마지막 월이다. */
export function calculateYearPillar(instantUtcMs: number, context: CalendarContext): Ganzhi {
  const jie = activeJie(instantUtcMs, context);
  const year = new Date(jie.instantUtcMs).getUTCFullYear() - (jie.code === '소한' ? 1 : 0);
  const { stem, branch, index } = GANZHI_CYCLE[((year - 1984) % 60 + 60) % 60];
  return { stem, branch, index };
}
