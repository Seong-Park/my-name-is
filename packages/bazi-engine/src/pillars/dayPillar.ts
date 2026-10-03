import type { Ganzhi } from '@mylife/bazi-domain';
import { GANZHI_CYCLE } from '@mylife/bazi-rules';
import { CalendarProviderError } from '../time/provider-errors';

// HKO Almanac 2026, January 2: 丙子(index 12). 날짜 표시는 tests/fixtures/day-reference.json 참조.
const REFERENCE_DAY = Date.parse('2026-01-02T00:00:00Z') / 86400000;

/** 일계 적용이 끝난 Gregorian 날짜. 시간대나 23:00 보정을 다시 하지 않는다. */
export function calculateDayPillar(rolledSolarDate: string): Ganzhi {
  const midnight = Date.parse(`${rolledSolarDate}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(rolledSolarDate) || !Number.isFinite(midnight)
    || new Date(midnight).getUTCFullYear() < 1
    || new Date(midnight).toISOString().slice(0, 10) !== rolledSolarDate) {
    throw new CalendarProviderError('INVALID_INPUT', 'Expected a Gregorian date in YYYY-MM-DD format, years 0001–9999');
  }
  const ordinal = midnight / 86400000;
  const { stem, branch, index } = GANZHI_CYCLE[((ordinal - REFERENCE_DAY + 12) % 60 + 60) % 60];
  return { stem, branch, index };
}
