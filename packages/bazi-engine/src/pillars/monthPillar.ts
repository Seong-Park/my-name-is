import type { Ganzhi } from '@mylife/bazi-domain';
import { MYLIFE_STANDARD_V1 } from '@mylife/bazi-rules';
import type { CalendarContext } from '../time/providers';
import { activeJie } from './jie';
import { CalendarProviderError } from '../time/provider-errors';

/** yearPillar는 같은 instant의 입춘 기준 연주다. 월두법: 甲己丙寅, 乙庚戊寅 등. */
export function calculateMonthPillar(instantUtcMs: number, yearPillar: Ganzhi, context: CalendarContext): Ganzhi {
  const { stems, branches, ganzhiCycle } = MYLIFE_STANDARD_V1.tables;
  const year = ganzhiCycle[yearPillar.index];
  if (!year || year.stem !== yearPillar.stem || year.branch !== yearPillar.branch) {
    throw new CalendarProviderError('INVALID_INPUT', 'Inconsistent year pillar');
  }
  const jie = activeJie(instantUtcMs, context);
  const month = MYLIFE_STANDARD_V1.referenceJie.indexOf(jie.code);
  const yearStem = stems.findIndex(row => row.stem === yearPillar.stem);
  const stem = stems[((yearStem % 5) * 2 + 2 + month) % 10].stem;
  const branch = branches[(month + 2) % 12].branch;
  const match = ganzhiCycle.find(row => row.stem === stem && row.branch === branch)!;
  return { stem, branch, index: match.index };
}
