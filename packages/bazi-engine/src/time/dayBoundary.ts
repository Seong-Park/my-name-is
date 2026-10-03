import type { MYLIFE_STANDARD_V1 } from '@mylife/bazi-rules';
import type { SolarDateTime } from './trueSolarTime';
import { CalendarProviderError } from './provider-errors';

export type DayBoundaryPolicy = Pick<typeof MYLIFE_STANDARD_V1, 'dayBoundary' | 'timeBasis'>;

/** 이미 진태양시인 좌표에만 일계를 적용한다. timezone/EoT를 다시 적용하지 않는다. */
export function applyDayBoundary(solarDateTime: SolarDateTime, policy: DayBoundaryPolicy): string {
  const start = Date.parse(`${solarDateTime.date}T00:00:00Z`);
  if (policy.timeBasis !== 'true-solar-time' || policy.dayBoundary !== '23:00'
    || !/^\d{4}-\d{2}-\d{2}$/.test(solarDateTime.date)
    || !Number.isFinite(start) || new Date(start).toISOString().slice(0, 10) !== solarDateTime.date
    || !Number.isFinite(solarDateTime.secondOfDay) || solarDateTime.secondOfDay < 0 || solarDateTime.secondOfDay >= 86400) {
    throw new CalendarProviderError('INVALID_INPUT', 'Expected a valid solar coordinate and approved 23:00 true-solar policy');
  }
  const [hour, minute] = policy.dayBoundary.split(':').map(Number);
  if (solarDateTime.secondOfDay < hour * 3600 + minute * 60) return solarDateTime.date;
  return new Date(start + 86400000).toISOString().slice(0, 10);
}
