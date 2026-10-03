import type { NatalBirthInput, BirthInstantInterval } from '@mylife/bazi-domain';
import type { CalendarContext } from './providers';
import { CalendarProviderError } from './provider-errors';
import { toTrueSolarTime } from './trueSolarTime';

/** 제외된 끝점 바로 앞의 표현 가능한 값. 1ms를 빼면 그보다 짧은 후보를 잃는다. */
export function previousInstant(value: number): number {
  if (value === 0) return -Number.MIN_VALUE;
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, value);
  view.setBigUint64(0, view.getBigUint64(0) + (value > 0 ? -1n : 1n));
  return view.getFloat64(0);
}

/** 물리적 태양시 좌표는 UTC에 대해 연속·증가한다. 주입 EoT 공급자도 이 계약을 지켜야 한다. */
export function solarCoordinateMs(instant: number, longitude: number, context: CalendarContext): number {
  const solar = toTrueSolarTime(instant, longitude, context);
  return Date.parse(`${solar.date}T00:00:00Z`) + solar.secondOfDay * 1000;
}

/** 시간대 전환으로 잘린 [start,end)를 절입·실제 EoT를 푼 시진 경계로 다시 분할한다. */
export function splitCandidateInterval(row: BirthInstantInterval, longitude: number, context: CalendarContext, includeUncertainty = false): BirthInstantInterval[] {
  const cuts = new Set([row.startUtcMs, row.endUtcMs]);
  const fromSolar = solarCoordinateMs(row.startUtcMs, longitude, context);
  const toSolar = solarCoordinateMs(row.endUtcMs, longitude, context);
  if (toSolar <= fromSolar) throw new CalendarProviderError('PROVIDER_FAILURE', 'Apparent solar coordinate must increase with UTC');
  const budget = includeUncertainty ? context.uncertainty.equationOfTimeSeconds * 1000 : 0;
  // 01:00,03:00,...,23:00 and the instants where their uncertainty windows enter/leave.
  for (let boundary = Math.floor((fromSolar - budget - 3600000) / 7200000) * 7200000 + 3600000; boundary <= toSolar + budget; boundary += 7200000) {
   for (const target of new Set([boundary - budget, boundary, boundary + budget])) {
    if (target <= fromSolar) continue;
    if (target >= toSolar) continue;
    let low = row.startUtcMs, high = row.endUtcMs;
    while (true) {
      const middle = low + (high - low) / 2;
      if (middle === low || middle === high) break;
      if (solarCoordinateMs(middle, longitude, context) >= target) high = middle; else low = middle;
    }
    cuts.add(high);
   }
  }
  for (const jie of context.astronomy.jieInstants(row.startUtcMs, row.endUtcMs)) {
    const budget = includeUncertainty ? Math.max(context.uncertainty.jieSeconds, jie.uncertaintySeconds) * 1000 : 0;
    for (const instant of [jie.instantUtcMs - budget, jie.instantUtcMs, jie.instantUtcMs + budget])
      if (instant > row.startUtcMs && instant < row.endUtcMs) cuts.add(instant);
  }
  const sorted = [...cuts].sort((a, b) => a - b);
  return sorted.slice(0, -1).map((start, index) => ({ ...row, startUtcMs: start, endUtcMs: sorted[index + 1], startInclusive: true, endInclusive: false }));
}

/** 미상 입력은 민간 날짜 전체를 보존하고 명시 offset이 있으면 해당 구간만 선택한다. */
export function resolveCivilDateIntervals(input: NatalBirthInput, solarDate: string, context: CalendarContext): [BirthInstantInterval, ...BirthInstantInterval[]] {
  if (input.birthTime !== null) throw new CalendarProviderError('INVALID_INPUT', 'Unknown time must be null');
  try {
    if (!context.timezone.civilDateIntervals) throw new CalendarProviderError('PROVIDER_FAILURE', 'Timezone provider lacks complete civil-date interval support');
    const rows = context.timezone.civilDateIntervals(solarDate, input.timezoneId);
    if (!rows.length) throw new CalendarProviderError('DST_GAP', 'The civil date does not exist in this timezone');
    const localStart = Date.parse(`${solarDate}T00:00:00Z`);
    const sorted = [...rows].sort((a, b) => a.startUtcMs - b.startUtcMs);
    for (const [index, row] of sorted.entries()) {
      if (!Number.isFinite(row.startUtcMs) || !Number.isFinite(row.endUtcMs) || row.startUtcMs >= row.endUtcMs
        || !row.startInclusive || row.endInclusive || !Number.isInteger(row.offsetSeconds) || Math.abs(row.offsetSeconds) >= 86400
        || row.startUtcMs + row.offsetSeconds * 1000 < localStart || row.endUtcMs + row.offsetSeconds * 1000 > localStart + 86400000
        || (index > 0 && sorted[index - 1].endUtcMs > row.startUtcMs)
        || context.timezone.offsetSeconds(row.startUtcMs, input.timezoneId) !== row.offsetSeconds
        || context.timezone.offsetSeconds(previousInstant(row.endUtcMs), input.timezoneId) !== row.offsetSeconds) {
        throw new CalendarProviderError('PROVIDER_FAILURE', 'Invalid civil-date interval');
      }
    }
    const [first, ...rest] = sorted.filter(row => input.utcOffsetSeconds === undefined || row.offsetSeconds === input.utcOffsetSeconds);
    if (!first) throw new CalendarProviderError('OFFSET_MISMATCH', 'The supplied offset matches no interval');
    return [{ ...first }, ...rest.map(row => ({ ...row }))];
  } catch (error) {
    if (error instanceof CalendarProviderError) throw error;
    throw new CalendarProviderError('PROVIDER_FAILURE', 'Timezone interval provider failed', { cause: error });
  }
}
