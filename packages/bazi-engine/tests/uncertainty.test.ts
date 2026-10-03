import { expect, it } from 'vitest';
import KoreanLunarCalendar from 'korean-lunar-calendar';
import type { NatalBirthInput } from '@mylife/bazi-domain';
import { calculateFourPillars, createCalendarContext, resolveBirthInstants } from '../src/index';

const context = createCalendarContext(new KoreanLunarCalendar());
const unknown: NatalBirthInput = { birthDate: '2026-01-02', birthTime: null, timeAccuracy: 'unknown', calendarType: 'solar', isLeapMonth: false,
  cityId: 'test', timezoneId: 'Etc/UTC', latitude: 0, longitude: 0 };
const zero = { ...context, uncertainty: { ...context.uncertainty, jieSeconds: 0, equationOfTimeSeconds: 0 }, astronomy: {
  ...context.astronomy, equationOfTimeSeconds: () => 0,
  jieInstants: (from: number, to: number) => context.astronomy.jieInstants(from, to).map(row => ({ ...row, uncertaintySeconds: 0 })),
} };

it('미상은 전 구간에서 같은 연월만 확정하며 일주 후보·시주 unavailable을 반환한다', () => {
  const result = calculateFourPillars(unknown, zero);
  expect(result.inputAccuracy).toBe('unknown'); expect(result.completeness).toBe('partial');
  expect(result.pillars.year).toMatchObject({ status: 'confirmed', value: { index: 41 } });
  expect(result.pillars.month).toMatchObject({ status: 'confirmed', value: { index: 24 } });
  expect(result.pillars.day).toEqual({ status: 'ambiguous', candidates: [
    { stem: '丙', branch: '子', index: 12 }, { stem: '丁', branch: '丑', index: 13 },
  ] });
  expect(result.pillars.hour.status).toBe('unavailable');
  if (result.normalization.kind !== 'interval') throw new Error('expected intervals');
  expect(result.normalization.intervals).toHaveLength(13);
  expect(result.normalization.intervals[0].start.instantUtcMs).toBe(Date.parse('2026-01-02T00:00:00Z'));
  expect(result.normalization.intervals.at(-1)?.end.instantUtcMs).toBe(Date.parse('2026-01-03T00:00:00Z'));
});

it('미상 날짜 끝의 제외된 일계는 다음 일주 후보를 만들지 않는다', () => {
  const result = calculateFourPillars({ ...unknown, longitude: -15 }, zero);
  expect(result.pillars.day).toEqual({ status: 'confirmed', value: { stem: '丙', branch: '子', index: 12 } });
});

it('균시차를 선형 보간하지 않고 짧은 일계 경계를 풀어 후보를 보존한다', () => {
  const start = Date.parse('2026-01-02T00:00:00Z');
  const curved = { ...zero, astronomy: { ...zero.astronomy,
    equationOfTimeSeconds: (instant: number) => ((instant - start) / 86400000) ** 2 * 0.2,
  } };
  const result = calculateFourPillars({ ...unknown, longitude: -15 }, curved);
  expect(result.pillars.day.status).toBe('ambiguous');
  if (result.normalization.kind !== 'interval') throw new Error('expected intervals');
  const last = result.normalization.intervals.at(-1)!;
  expect(last.end.instantUtcMs - last.start.instantUtcMs).toBeGreaterThan(0);
  expect(last.end.instantUtcMs - last.start.instantUtcMs).toBeLessThan(250);
});

it('입춘을 포함한 미상 날짜는 연주와 월주를 모두 후보로 남긴다', () => {
  const result = calculateFourPillars({ ...unknown, birthDate: '2026-02-03' }, zero);
  expect(result.pillars.year.status).toBe('ambiguous'); expect(result.pillars.month.status).toBe('ambiguous');
});

it.each([
  ['22:59:55', 'ambiguous', 'ambiguous'], ['00:59:55', 'confirmed', 'ambiguous'],
  ['12:00:00', 'confirmed', 'confirmed'],
] as const)('균시차 오차가 %s 경계에 닿으면 일주 %s·시주 %s', (birthTime, dayStatus, hourStatus) => {
  const uncertain = { ...zero, uncertainty: { ...zero.uncertainty, equationOfTimeSeconds: 10 } };
  const result = calculateFourPillars({ ...unknown, birthTime, timeAccuracy: 'exact' }, uncertain);
  expect(result.pillars.day.status).toBe(dayStatus); expect(result.pillars.hour.status).toBe(hourStatus);
  if (hourStatus === 'ambiguous') {
    expect(result.completeness).toBe('partial');
    expect(result.limitations.join(' ')).toContain('uncertainty');
  }
});

it('명목 일계는 제외된 끝점이어도 균시차 오차가 경계에 걸치면 후보를 남긴다', () => {
  const uncertain = { ...zero, uncertainty: { ...zero.uncertainty, equationOfTimeSeconds: 10 } };
  const result = calculateFourPillars({ ...unknown, longitude: -15 }, uncertain);
  expect(result.pillars.day.status).toBe('ambiguous');
});

it('큰 균시차 오차 구간은 양 끝 사이의 시진도 모두 포함한다', () => {
  const uncertain = { ...zero, uncertainty: { ...zero.uncertainty, equationOfTimeSeconds: 10800 } };
  const result = calculateFourPillars({ ...unknown, birthTime: '12:00', timeAccuracy: 'exact' }, uncertain);
  expect(result.pillars.hour.status).toBe('ambiguous');
  if (result.pillars.hour.status !== 'ambiguous') throw new Error('expected candidates');
  expect(result.pillars.hour.candidates.map(row => row.branch).sort()).toEqual(['巳', '午', '未', '申'].sort());
});

it.each([-1000, 0, 1000])('입춘 오차 안의 %s ms에서는 양쪽 연월주를 보존한다', delta => {
  const lichun = context.astronomy.jieInstants(Date.parse('2026-02-01T00:00:00Z'), Date.parse('2026-02-05T00:00:00Z')).find(row => row.code === '입춘')!;
  const instant = new Date(lichun.instantUtcMs + delta).toISOString();
  const result = calculateFourPillars({ ...unknown, birthDate: instant.slice(0, 10), birthTime: instant.slice(11, 23), timeAccuracy: 'exact' }, context);
  expect(result.pillars.year).toEqual({ status: 'ambiguous', candidates: [{ stem: '乙', branch: '巳', index: 41 }, { stem: '丙', branch: '午', index: 42 }] });
  expect(result.pillars.month.status).toBe('ambiguous');
});

it('절입 정각은 오차가 0일 때 새 연월주로 확정된다', () => {
  const lichun = zero.astronomy.jieInstants(Date.parse('2026-02-01T00:00:00Z'), Date.parse('2026-02-05T00:00:00Z')).find(row => row.code === '입춘')!;
  const iso = new Date(lichun.instantUtcMs).toISOString();
  const result = calculateFourPillars({ ...unknown, birthDate: iso.slice(0, 10), birthTime: iso.slice(11, 23), timeAccuracy: 'exact' }, zero);
  expect(result.pillars.year).toMatchObject({ status: 'confirmed', value: { index: 42 } });
  expect(result.pillars.month).toMatchObject({ status: 'confirmed', value: { index: 26 } });
});

it.each([
  ['1900-01-01', 'Asia/Seoul', 126.978], ['2026-12-31', 'America/New_York', -74],
  ['2026-03-08', 'America/New_York', -74], ['2026-11-01', 'America/New_York', -74],
] as const)('%s %s의 전체 미상 구간은 실제 공급자에서도 재현된다', (birthDate, timezoneId, longitude) => {
  const input = Object.freeze({ ...unknown, birthDate, timezoneId, longitude });
  const result = calculateFourPillars(input, context);
  expect(result.pillars.hour.status).toBe('unavailable');
  expect(calculateFourPillars(input, context)).toEqual(result);
  if (result.normalization.kind !== 'interval') throw new Error('expected intervals');
  const original = resolveBirthInstants(input, context);
  if (original.kind !== 'interval') throw new Error('expected intervals');
  expect(result.normalization.intervals.reduce((sum, row) => sum + row.end.instantUtcMs - row.start.instantUtcMs, 0))
    .toBe(original.intervals.reduce((sum, row) => sum + row.endUtcMs - row.startUtcMs, 0));
});

it('같은 미상 구간의 마지막 포함 ms와 제외 끝점을 혼동하지 않는다', () => {
  const start = Date.parse('2026-01-02T22:59:59.998Z');
  const short = { ...zero, timezone: { ...zero.timezone,
    civilDateIntervals: () => [{ startUtcMs: start, endUtcMs: start + 2, startInclusive: true, endInclusive: false, offsetSeconds: 0 }],
  } };
  expect(calculateFourPillars(unknown, short).pillars.day).toMatchObject({ status: 'confirmed', value: { index: 12 } });
  const crossing = { ...short, timezone: { ...short.timezone,
    civilDateIntervals: () => [{ startUtcMs: start, endUtcMs: start + 3, startInclusive: true, endInclusive: false, offsetSeconds: 0 }],
  } };
  expect(calculateFourPillars(unknown, crossing).pillars.day.status).toBe('ambiguous');
});

it.each(['1960-01-02', '2026-01-02'])('%s의 제외 끝점 직전 0.5ms 일계 후보도 누락하지 않는다', birthDate => {
  const start = Date.parse(`${birthDate}T22:59:59.998Z`);
  const tiny = { ...zero, astronomy: { ...zero.astronomy, equationOfTimeSeconds: () => 0.0005 },
    timezone: { ...zero.timezone, civilDateIntervals: () => [{ startUtcMs: start, endUtcMs: start + 2,
      startInclusive: true, endInclusive: false, offsetSeconds: 0 }] } };
  const result = calculateFourPillars({ ...unknown, birthDate }, tiny);
  expect(result.pillars.day.status).toBe('ambiguous');
  if (result.normalization.kind !== 'interval') throw new Error('expected intervals');
  expect(result.normalization.intervals).toHaveLength(2);
});

it('unknown에 구간 능력이 없는 공급자는 명시적으로 실패한다', () => {
  const limited = { ...zero, timezone: { possibleInstants: zero.timezone.possibleInstants, offsetSeconds: zero.timezone.offsetSeconds } };
  expect(() => calculateFourPillars(unknown, limited)).toThrow(expect.objectContaining({ code: 'PROVIDER_FAILURE' }));
});

it('unknown의 잘못된 시각·offset과 잘못된 시간대 오류를 구분한다', () => {
  expect(() => calculateFourPillars(JSON.parse(JSON.stringify({ ...unknown, birthTime: '12:00' })), context)).toThrow(expect.objectContaining({ code: 'INVALID_INPUT' }));
  expect(() => calculateFourPillars({ ...unknown, utcOffsetSeconds: NaN }, context)).toThrow(expect.objectContaining({ code: 'INVALID_INPUT' }));
  expect(() => calculateFourPillars({ ...unknown, timezoneId: 'not-a-zone' }, context)).toThrow(expect.objectContaining({ code: 'UNSUPPORTED_TIMEZONE' }));
});

it('구간 질의의 외부 예외도 공급자 오류 계약으로 감싼다', () => {
  const failing = { ...zero, astronomy: { ...zero.astronomy, jieInstants(from: number, to: number) {
    if (from !== to) throw new Error('range backend failure');
    return zero.astronomy.jieInstants(from, to);
  } } };
  expect(() => calculateFourPillars(unknown, failing)).toThrow(expect.objectContaining({ code: 'PROVIDER_FAILURE' }));
});

it.each([
  ['2026-01-02', 'Etc/UTC', 24, 1],
  ['2026-03-08', 'America/New_York', 23, 2],
  ['2026-11-01', 'America/New_York', 25, 2],
  ['1988-05-08', 'Asia/Seoul', 23, 2],
  ['1988-10-09', 'Asia/Seoul', 25, 2],
  ['2026-04-05', 'Australia/Lord_Howe', 24.5, 2],
] as const)('%s %s의 미상 날짜는 %s시간의 실제 구간이다', (birthDate, timezoneId, hours, count) => {
  const result = resolveBirthInstants({ ...unknown, birthDate, timezoneId }, context);
  if (result.kind !== 'interval') throw new Error('expected intervals');
  expect(result.intervals).toHaveLength(count);
  expect(result.intervals.reduce((sum, row) => sum + row.endUtcMs - row.startUtcMs, 0)).toBe(hours * 3600000);
  const startLocal = Date.parse(`${birthDate}T00:00:00Z`);
  for (const row of result.intervals) {
    expect(row.startInclusive).toBe(true); expect(row.endInclusive).toBe(false);
    expect(row.startUtcMs + row.offsetSeconds * 1000).toBeGreaterThanOrEqual(startLocal);
    expect(row.endUtcMs + row.offsetSeconds * 1000).toBeLessThanOrEqual(startLocal + 86400000);
    expect(context.timezone.offsetSeconds(row.startUtcMs, timezoneId)).toBe(row.offsetSeconds);
    expect(context.timezone.offsetSeconds(row.endUtcMs - 1, timezoneId)).toBe(row.offsetSeconds);
  }
});

it('건너뛴 민간 날짜를 임의 정오로 대체하지 않는다', () => {
  expect(() => resolveBirthInstants({ ...unknown, birthDate: '2011-12-30', timezoneId: 'Pacific/Apia' }, context))
    .toThrow(expect.objectContaining({ code: 'DST_GAP' }));
});

it('미상 날짜의 명시 offset은 일치하는 구간만 보존한다', () => {
  const input = { ...unknown, birthDate: '2026-11-01', timezoneId: 'America/New_York', utcOffsetSeconds: -18000 };
  const result = resolveBirthInstants(input, context);
  expect(result).toEqual({ kind: 'interval', intervals: [{ startUtcMs: Date.parse('2026-11-01T06:00:00Z'),
    endUtcMs: Date.parse('2026-11-02T05:00:00Z'), startInclusive: true, endInclusive: false, offsetSeconds: -18000 }] });
  expect(() => resolveBirthInstants({ ...input, utcOffsetSeconds: 0 }, context)).toThrow(expect.objectContaining({ code: 'OFFSET_MISMATCH' }));
});
