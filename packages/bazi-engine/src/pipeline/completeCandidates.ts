import type { Ganzhi, NatalBirthInput } from '@mylife/bazi-domain';
import { MYLIFE_STANDARD_V1 } from '@mylife/bazi-rules';
import type { CalendarContext } from '../time/providers';
import { previousInstant, solarCoordinateMs, splitCandidateInterval } from '../time/candidateIntervals';
import { calculateFourPillars } from './calculateFourPillars';
import { calculateYearPillar } from '../pillars/yearPillar';
import { calculateMonthPillar } from '../pillars/monthPillar';
import { calculateDayPillar } from '../pillars/dayPillar';
import { calculateHourPillar } from '../pillars/hourPillar';
import { applyDayBoundary } from '../time/dayBoundary';

export type CompletePillars = readonly [Ganzhi, Ganzhi, Ganzhi, Ganzhi];

/** Internal joint possibilities within the provider's engineering uncertainty budget.
 * Original unknown/partial resolutions stay unchanged; no noon or per-field product.
 */
export function calculateFourPillarsWithCandidates(input: NatalBirthInput, context: CalendarContext) {
  const result = calculateFourPillars(input, context);
  const possibilities = new Map<string, CompletePillars>();
  function collect(instant: number) {
    const yearMonth = new Map<string, readonly [Ganzhi, Ganzhi]>();
    function addYearMonth(at: number) {
      const year = calculateYearPillar(at, context);
      const month = calculateMonthPillar(at, year, context);
      yearMonth.set(`${year.index}/${month.index}`, [year, month]);
    }
    addYearMonth(instant);
    for (const jie of context.astronomy.jieInstants(instant, instant)) {
      const budget = Math.max(context.uncertainty.jieSeconds, jie.uncertaintySeconds) * 1000;
      if (instant >= jie.instantUtcMs - budget && instant < jie.instantUtcMs + budget) {
        addYearMonth(previousInstant(jie.instantUtcMs));
        addYearMonth(jie.instantUtcMs);
      }
    }
    const coordinate = solarCoordinateMs(instant, input.longitude, context);
    const budget = context.uncertainty.equationOfTimeSeconds * 1000;
    const low = coordinate - budget, high = coordinate + budget;
    const coordinates = new Set([low, high]);
    for (let boundary = Math.floor((low - 3600000) / 7200000) * 7200000 + 3600000; boundary <= high; boundary += 7200000)
      if (boundary >= low) coordinates.add(boundary);
    for (const at of coordinates) {
      const start = Math.floor(at / 86400000) * 86400000;
      const solar = { date: new Date(start).toISOString().slice(0, 10), secondOfDay: (at - start) / 1000 };
      const day = calculateDayPillar(applyDayBoundary(solar, MYLIFE_STANDARD_V1));
      const hour = calculateHourPillar(day, solar.secondOfDay, MYLIFE_STANDARD_V1);
      // Year/month and day/hour retain their dependency. Independent astronomy
      // uncertainty ranges are combined only at this same possible UTC instant.
      for (const [year, month] of yearMonth.values()) {
        const pillars: CompletePillars = [year, month, day, hour];
        possibilities.set(pillars.map(p => p.index).join('/'), pillars);
      }
    }
  }
  if (result.normalization.kind === 'instant') {
    for (const candidate of result.normalization.candidates) collect(candidate.instantUtcMs);
  } else {
    for (const interval of result.normalization.intervals) {
      const row = { startUtcMs: interval.start.instantUtcMs, endUtcMs: interval.end.instantUtcMs,
        offsetSeconds: interval.start.offsetSeconds, startInclusive: true as const, endInclusive: false as const };
      for (const part of splitCandidateInterval(row, input.longitude, context, true)) {
        // The possible set is constant between these solved event boundaries.
        // Include boundary instants and the last representable instant to preserve
        // zero-width coincidences and very short intervals without fixed sampling.
        collect(part.startUtcMs);
        const last = previousInstant(part.endUtcMs);
        collect(Math.min(last, part.startUtcMs + (part.endUtcMs - part.startUtcMs) / 2));
        collect(last);
      }
    }
  }
  return { ...result, possiblePillars: [...possibilities.values()].sort((a, b) => {
    for (let i = 0; i < 4; i++) if (a[i].index !== b[i].index) return a[i].index - b[i].index;
    return 0;
  }) };
}
