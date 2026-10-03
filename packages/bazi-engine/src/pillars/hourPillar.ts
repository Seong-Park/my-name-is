import type { Ganzhi } from '@mylife/bazi-domain';
import { MYLIFE_STANDARD_V1 } from '@mylife/bazi-rules';
import { CalendarProviderError } from '../time/provider-errors';

export type HourPillarPolicy = Pick<typeof MYLIFE_STANDARD_V1,
  'timeBasis' | 'dayBoundary' | 'ziHourStart' | 'ziHourEnd' | 'splitZiHour' | 'hourStemUsesRolledDayMaster'>;

/** dayPillar는 이미 일계를 적용한 일주. 시각은 같은 진태양시의 [0,86400) 초 좌표다. */
export function calculateHourPillar(dayPillar: Ganzhi, solarSecondOfDay: number, policy: HourPillarPolicy): Ganzhi {
  const { stems, branches, ganzhiCycle } = MYLIFE_STANDARD_V1.tables;
  const day = ganzhiCycle[dayPillar.index];
  if (!day || day.stem !== dayPillar.stem || day.branch !== dayPillar.branch
    || !Number.isFinite(solarSecondOfDay) || solarSecondOfDay < 0 || solarSecondOfDay >= 86400
    || policy.timeBasis !== 'true-solar-time' || policy.dayBoundary !== '23:00'
    || policy.ziHourStart !== '23:00' || policy.ziHourEnd !== '01:00'
    || policy.splitZiHour !== false || policy.hourStemUsesRolledDayMaster !== true) {
    throw new CalendarProviderError('INVALID_INPUT', 'Expected a consistent rolled day pillar, solar seconds and approved hour policy');
  }
  const hour = Math.floor((solarSecondOfDay + 3600) / 7200) % 12;
  const dayStem = stems.findIndex(row => row.stem === dayPillar.stem);
  const stem = stems[((dayStem % 5) * 2 + hour) % 10].stem;
  const branch = branches[hour].branch;
  const match = ganzhiCycle.find(row => row.stem === stem && row.branch === branch)!;
  return { stem, branch, index: match.index };
}
