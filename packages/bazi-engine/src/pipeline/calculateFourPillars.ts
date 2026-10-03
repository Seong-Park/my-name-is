import type { NatalBirthInput, FourPillarsCalculationResult, FieldResolution, Ganzhi, NormalizedCandidate, NormalizedInterval, EvidenceItem } from '@mylife/bazi-domain';
import { MYLIFE_STANDARD_V1 } from '@mylife/bazi-rules';
import type { CalendarContext } from '../time/providers';
import { resolveSolarDate } from '../time/calendar';
import { resolveBirthInstants } from '../time/timezone';
import { toTrueSolarTime } from '../time/trueSolarTime';
import { applyDayBoundary } from '../time/dayBoundary';
import { CalendarProviderError } from '../time/provider-errors';
import { calculateYearPillar } from '../pillars/yearPillar';
import { calculateMonthPillar } from '../pillars/monthPillar';
import { calculateDayPillar } from '../pillars/dayPillar';
import { calculateHourPillar } from '../pillars/hourPillar';
import { previousInstant, solarCoordinateMs, splitCandidateInterval } from '../time/candidateIntervals';

function resolve(values: readonly Ganzhi[]): FieldResolution<Ganzhi> {
  const [first, second, ...rest] = [...new Map(values.map(value => [value.index, value])).values()].sort((a, b) => a.index - b.index);
  if (!first) throw new CalendarProviderError('PROVIDER_FAILURE', 'No pillar candidates');
  return second ? { status: 'ambiguous', candidates: [first, second, ...rest] } : { status: 'confirmed', value: first };
}

export function calculateFourPillars(input: NatalBirthInput, context: CalendarContext): FourPillarsCalculationResult {
  try {
    return calculate(input, context);
  } catch (error) {
    if (error instanceof CalendarProviderError) throw error;
    throw new CalendarProviderError('PROVIDER_FAILURE', 'Four-pillar provider failed', { cause: error });
  }
}

function calculate(input: NatalBirthInput, context: CalendarContext): FourPillarsCalculationResult {
  if (!Number.isFinite(input.latitude) || Math.abs(input.latitude) > 90
    || !Number.isFinite(input.longitude) || Math.abs(input.longitude) > 180
    || context.versions.rulesetVersion !== MYLIFE_STANDARD_V1.version) {
    throw new CalendarProviderError('INVALID_INPUT', 'Expected valid coordinates and supported ruleset version');
  }
  if (!Number.isFinite(context.uncertainty.jieSeconds) || context.uncertainty.jieSeconds < 0 || context.uncertainty.jieSeconds > 86400) {
    throw new CalendarProviderError('PROVIDER_FAILURE', 'Invalid jie uncertainty budget');
  }
  const solarDate = resolveSolarDate(input, context);
  const instants = resolveBirthInstants(input, context);
  const evidence: EvidenceItem[] = [{ ruleCode: 'FOUR_PILLARS_STANDARD_V1', rulesetVersion: context.versions.rulesetVersion,
    references: [{ kind: 'input', field: 'birthDate' }, { kind: 'input', field: 'birthTime' }, { kind: 'input', field: 'timeAccuracy' }] }];
  for (const ruleCode of ['YEAR_LICHUN_UTC_V1', 'MONTH_TWELVE_JIE_V1', 'DAY_SOLAR_2300_V1',
    ...(input.timeAccuracy === 'unknown' ? [] : ['HOUR_ROLLED_DAY_V1'])]) {
    evidence.push({ ruleCode, rulesetVersion: context.versions.rulesetVersion,
      references: [{ kind: 'input', field: 'birthDate' }, { kind: 'input', field: 'timezoneId' }, { kind: 'input', field: 'longitude' }] });
  }
  let usedJieSeconds = context.uncertainty.jieSeconds;
  const limitations = () => [...context.limitations,
    `Provider uncertainty engineering budgets: jie=${usedJieSeconds}s, EoT=${context.uncertainty.equationOfTimeSeconds}s; not certified bounds.`];
  const versions = { ...context.versions, lunarCalendarVersion: input.calendarType === 'lunar' ? context.versions.lunarCalendarVersion : null };
  const years: Ganzhi[] = [], months: Ganzhi[] = [], days: Ganzhi[] = [], hours: Ganzhi[] = [];
  function normalized(instantUtcMs: number, offsetSeconds: number): NormalizedCandidate {
    const solar = toTrueSolarTime(instantUtcMs, input.longitude, context);
    return { instantUtcMs, offsetSeconds, longitudeSeconds: solar.longitudeSeconds, equationOfTimeSeconds: solar.equationOfTimeSeconds,
      trueSolarTime: { date: solar.date, time: new Date(solar.secondOfDay * 1000).toISOString().slice(11, 23) }, evidence: solar.evidence };
  }
  function collectYearMonth(instant: number) {
    const year = calculateYearPillar(instant, context);
    years.push(year); months.push(calculateMonthPillar(instant, year, context));
  }
  function collect(from: number, to = from) {
    collectYearMonth(from); collectYearMonth(to);
    for (const jie of context.astronomy.jieInstants(from, to)) {
      if (!Number.isFinite(jie.uncertaintySeconds) || jie.uncertaintySeconds < 0 || jie.uncertaintySeconds > 86400) {
        throw new CalendarProviderError('PROVIDER_FAILURE', 'Invalid jie uncertainty');
      }
      const budget = Math.max(context.uncertainty.jieSeconds, jie.uncertaintySeconds) * 1000;
      usedJieSeconds = Math.max(usedJieSeconds, budget / 1000);
      // 가능한 경계 [jie-budget,jie+budget]. 최신 경계의 정각부터는 이전 기둥이 불가능하다.
      if (to >= jie.instantUtcMs - budget && from < jie.instantUtcMs + budget) {
        collectYearMonth(jie.instantUtcMs - 1); collectYearMonth(jie.instantUtcMs);
      }
    }
    const budget = context.uncertainty.equationOfTimeSeconds * 1000;
    const low = solarCoordinateMs(from, input.longitude, context) - budget;
    const high = solarCoordinateMs(to, input.longitude, context) + budget;
    const coordinates = new Set([low, high]);
    // 오차 구간의 양 끝뿐 아니라 그 사이의 모든 시진/일계도 열거한다.
    for (let boundary = Math.floor((low - 3600000) / 7200000) * 7200000 + 3600000; boundary <= high; boundary += 7200000) {
      if (boundary >= low) coordinates.add(boundary);
    }
    for (const coordinate of coordinates) {
      const start = Math.floor(coordinate / 86400000) * 86400000;
      const solar = { date: new Date(start).toISOString().slice(0, 10), secondOfDay: (coordinate - start) / 1000 };
      const day = calculateDayPillar(applyDayBoundary(solar, MYLIFE_STANDARD_V1));
      days.push(day);
      if (input.timeAccuracy !== 'unknown') hours.push(calculateHourPillar(day, solar.secondOfDay, MYLIFE_STANDARD_V1));
    }
  }
  if (instants.kind === 'interval') {
    const intervals: NormalizedInterval[] = [];
    for (const interval of instants.intervals.flatMap(row => splitCandidateInterval(row, input.longitude, context))) {
      collect(interval.startUtcMs, previousInstant(interval.endUtcMs));
      intervals.push({ start: normalized(interval.startUtcMs, interval.offsetSeconds), end: normalized(interval.endUtcMs, interval.offsetSeconds),
        startInclusive: interval.startInclusive, endInclusive: interval.endInclusive });
    }
    const [first, ...rest] = intervals;
    if (!first) throw new CalendarProviderError('PROVIDER_FAILURE', 'Missing normalized interval');
    return { inputAccuracy: 'unknown', completeness: 'partial', versions, evidence, limitations: limitations(),
      normalization: { kind: 'interval', solarDate, timezoneId: input.timezoneId, evidence, intervals: [first, ...rest] },
      pillars: { year: resolve(years), month: resolve(months), day: resolve(days), hour: { status: 'unavailable', reason: 'Birth time is unknown.' } } };
  }
  if (input.timeAccuracy === 'unknown') throw new CalendarProviderError('PROVIDER_FAILURE', 'Unknown time requires intervals');
  const candidates = instants.candidates.map(candidate => {
    collect(candidate.instantUtcMs);
    return normalized(candidate.instantUtcMs, candidate.offsetSeconds);
  });
  const [first, ...rest] = candidates;
  if (!first) throw new CalendarProviderError('PROVIDER_FAILURE', 'Missing normalized candidate');
  const year = resolve(years), month = resolve(months), day = resolve(days), hour = resolve(hours);
  const completion = year.status === 'confirmed' && month.status === 'confirmed' && day.status === 'confirmed' && hour.status === 'confirmed'
    ? { completeness: 'complete' as const, pillars: { year, month, day, hour } }
    : { completeness: 'partial' as const, pillars: { year, month, day, hour } };
  const common = { ...completion, evidence, versions,
    normalization: { kind: 'instant' as const, solarDate, timezoneId: input.timezoneId, evidence, candidates: [first, ...rest] as [NormalizedCandidate, ...NormalizedCandidate[]] } };
  return input.timeAccuracy === 'approximate'
    ? { ...common, inputAccuracy: 'approximate', limitations: ['Approximate time uses a representative instant; no error interval was supplied.', ...limitations()] }
    : { ...common, inputAccuracy: 'exact', limitations: limitations() };
}
