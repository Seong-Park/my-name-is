import { expect, it } from 'vitest';
import KoreanLunarCalendar from 'korean-lunar-calendar';
import { createCalendarContext, toTrueSolarTime, applyDayBoundary } from '../src/index';
import { MYLIFE_STANDARD_V1 } from '@mylife/bazi-rules';
import reference from './fixtures/calendar-reference.json';

const realContext = createCalendarContext(new KoreanLunarCalendar());
function contextWithEot(seconds: number) {
  return {
    ...realContext,
    astronomy: { ...realContext.astronomy, equationOfTimeSeconds: () => seconds },
  };
}

it.each([
  [0, 0, '2026-06-01', 43200],
  [15, 0, '2026-06-01', 46800],
  [-15, 0, '2026-06-01', 39600],
  [0, 120, '2026-06-01', 43320],
  [0, -120, '2026-06-01', 43080],
  [180, 0, '2026-06-02', 0],
  [-180, 0, '2026-06-01', 0],
] as const)('경도 %s와 균시차 %s를 UTC에 각각 한 번 적용한다', (longitude, eot, date, secondOfDay) => {
  const result = toTrueSolarTime(Date.parse('2026-06-01T12:00:00Z'), longitude, contextWithEot(eot));
  expect(result).toMatchObject({ date, secondOfDay, longitudeSeconds: longitude * 240, equationOfTimeSeconds: eot });
  expect(result.evidence).toEqual([{
    ruleCode: 'TRUE_SOLAR_TIME_UTC_LONGITUDE_EOT_V1', rulesetVersion: 'mylife-standard-v1',
    references: [{ kind: 'input', field: 'longitude' }],
  }]);
});

it('시간대 공급자나 DST 보정을 다시 호출하지 않는다', () => {
  const context = { ...contextWithEot(0), timezone: {
    possibleInstants() { throw new Error('timezone must not be reapplied'); },
    offsetSeconds() { throw new Error('offset must not be reapplied'); },
  } };
  const result = toTrueSolarTime(Date.parse('1988-05-07T17:00:00Z'), 135, context);
  expect(result).toMatchObject({ date: '1988-05-08', secondOfDay: 7200 });
});

it.each([
  ['2026-06-01', 82799, '2026-06-01'],
  ['2026-06-01', 82799.999, '2026-06-01'],
  ['2026-06-01', 82800, '2026-06-02'],
  ['2026-06-01', 3599, '2026-06-01'],
  ['2026-06-01', 3600, '2026-06-01'],
  ['2026-01-31', 82800, '2026-02-01'],
  ['2026-12-31', 82800, '2027-01-01'],
  ['2024-02-28', 82800, '2024-02-29'],
  ['2024-02-29', 82800, '2024-03-01'],
  ['1900-02-28', 82800, '1900-03-01'],
  ['2000-02-28', 82800, '2000-02-29'],
] as const)('%s의 태양시 %s초에서 명리 날짜는 %s다', (date, secondOfDay, expected) => {
  const input = Object.freeze({ date, secondOfDay });
  expect(applyDayBoundary(input, MYLIFE_STANDARD_V1)).toBe(expected);
  expect(input).toEqual({ date, secondOfDay });
});

it('음수 epoch의 자정 직전 소수 초를 다음 날짜로 절삭하지 않는다', () => {
  expect(toTrueSolarTime(Date.parse('1960-01-01T00:00:00Z'), 0, contextWithEot(-0.0005)))
    .toMatchObject({ date: '1959-12-31' });
});

it.each(reference.equationOfTime)('독립 EoT $instantUtcMs를 실제 태양시 좌표까지 대조한다', row => {
  const actual = toTrueSolarTime(row.instantUtcMs, 0, realContext);
  expect(Math.abs(actual.secondOfDay - (43200 + row.expectedSeconds))).toBeLessThanOrEqual(row.comparisonToleranceSeconds);
});

it.each([
  ['2026-12-31T22:59:55Z', '2026-12-31', 82785, '2026-12-31', 82805, ['2026-12-31', '2027-01-01']],
  ['2026-06-01T00:59:55Z', '2026-06-01', 3585, '2026-06-01', 3605, ['2026-06-01', '2026-06-01']],
  ['2026-06-01T00:00:05Z', '2026-05-31', 86395, '2026-06-01', 15, ['2026-06-01', '2026-06-01']],
] as const)('%s: 경계 양쪽의 오차 좌표를 후속 후보 판정용으로 보존한다', (instant, earlyDate, earlySecond, lateDate, lateSecond, days) => {
  const result = toTrueSolarTime(Date.parse(instant), 0, contextWithEot(0));
  expect(result.uncertainty).toEqual({
    seconds: 10, basis: 'engineering-budget-not-certified-bound',
    earliest: { date: earlyDate, secondOfDay: earlySecond },
    latest: { date: lateDate, secondOfDay: lateSecond },
  });
  expect([applyDayBoundary(result.uncertainty.earliest, MYLIFE_STANDARD_V1), applyDayBoundary(result.uncertainty.latest, MYLIFE_STANDARD_V1)]).toEqual(days);
  expect(result.limitations).toEqual(realContext.limitations);
});

it('01:00 시진 경계 양쪽을 남기며 단일 후보로 확정하지 않는다', () => {
  const { uncertainty } = toTrueSolarTime(Date.parse('2026-06-01T00:59:55Z'), 0, contextWithEot(0));
  expect(uncertainty.earliest.secondOfDay).toBeLessThan(3600);
  expect(uncertainty.latest.secondOfDay).toBeGreaterThanOrEqual(3600);
});

it.each([NaN, Infinity, -181, 181])('잘못된 경도 %s를 거절한다', longitude => {
  expect(() => toTrueSolarTime(Date.UTC(2026, 0, 1), longitude, contextWithEot(0))).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }));
});

it('잘못된 instant와 공급자 예외·비정상 수치·오차를 구분한다', () => {
  expect(() => toTrueSolarTime(NaN, 0, contextWithEot(0))).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }));
  for (const seconds of [NaN, Infinity]) {
    expect(() => toTrueSolarTime(Date.UTC(2026, 0, 1), 0, contextWithEot(seconds))).toThrowError(expect.objectContaining({ code: 'PROVIDER_FAILURE' }));
  }
  const failed = { ...realContext, astronomy: { ...realContext.astronomy, equationOfTimeSeconds() { throw new Error('eot failed'); } } };
  expect(() => toTrueSolarTime(Date.UTC(2026, 0, 1), 0, failed)).toThrowError(expect.objectContaining({ code: 'PROVIDER_FAILURE' }));
  for (const seconds of [-1, NaN, Infinity]) {
    const invalid = { ...contextWithEot(0), uncertainty: { ...realContext.uncertainty, equationOfTimeSeconds: seconds } };
    expect(() => toTrueSolarTime(Date.UTC(2026, 0, 1), 0, invalid)).toThrowError(expect.objectContaining({ code: 'PROVIDER_FAILURE' }));
  }
  expect(() => toTrueSolarTime(Date.UTC(1800, 0, 1), 0, realContext)).toThrowError(expect.objectContaining({ code: 'UNSUPPORTED_DATE' }));
});

it.each([
  ['2026-02-30', 0], ['2026-2-01', 0], ['2026-01-01', -1],
  ['2026-01-01', 86400], ['2026-01-01', NaN], ['2026-01-01', Infinity],
] as const)('잘못된 태양시 좌표 %s/%s를 날짜로 가장하지 않는다', (date, secondOfDay) => {
  expect(() => applyDayBoundary({ date, secondOfDay }, MYLIFE_STANDARD_V1)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }));
});

it('일계와 자시 시작은 별개 정책이며 허용되지 않은 일계 정책은 거절한다', () => {
  const unsupported = JSON.parse('{"dayBoundary":"00:00","timeBasis":"civil-time"}');
  expect(() => applyDayBoundary({ date: '2026-01-01', secondOfDay: 82800 }, unsupported)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }));
});
