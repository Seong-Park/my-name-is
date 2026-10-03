import { expect, it } from 'vitest';
import KoreanLunarCalendar from 'korean-lunar-calendar';
import type { NatalBirthInput } from '@mylife/bazi-domain';
import { calculateFourPillars, createCalendarContext } from '../src/index';

const context = createCalendarContext(new KoreanLunarCalendar());
const deterministic = { ...context, uncertainty: { ...context.uncertainty, jieSeconds: 0, equationOfTimeSeconds: 0 },
  astronomy: { ...context.astronomy, equationOfTimeSeconds: () => 0 } };
const base: NatalBirthInput = {
  birthDate: '2026-01-02', birthTime: '12:00', timeAccuracy: 'exact', calendarType: 'solar', isLeapMonth: false,
  timezoneId: 'Etc/UTC', longitude: 0, latitude: 0, cityId: 'greenwich',
};

it('일반 입력의 네 기둥·보정 근거·버전을 조합하며 입력을 변경하지 않는다', () => {
  const input = Object.freeze({ ...base });
  const result = calculateFourPillars(input, deterministic);
  expect(result.inputAccuracy).toBe('exact');
  expect(result.completeness).toBe('complete');
  expect(result.pillars).toEqual({
    year: { status: 'confirmed', value: { stem: '乙', branch: '巳', index: 41 } },
    month: { status: 'confirmed', value: { stem: '戊', branch: '子', index: 24 } },
    day: { status: 'confirmed', value: { stem: '丙', branch: '子', index: 12 } },
    hour: { status: 'confirmed', value: { stem: '甲', branch: '午', index: 30 } },
  });
  expect(result.normalization).toMatchObject({ kind: 'instant', solarDate: '2026-01-02', timezoneId: 'Etc/UTC', candidates: [{
    instantUtcMs: Date.parse('2026-01-02T12:00:00Z'), offsetSeconds: 0, longitudeSeconds: 0, equationOfTimeSeconds: 0,
    trueSolarTime: { date: '2026-01-02', time: '12:00:00.000' },
  }] });
  expect(result.versions).toEqual({ ...context.versions, lunarCalendarVersion: null });
  expect(result.evidence.length).toBeGreaterThan(0);
  expect(result.limitations).toEqual(expect.arrayContaining([...context.limitations]));
  expect(calculateFourPillars(input, deterministic)).toEqual(result);
  expect(input).toEqual(base);
});

it.each([
  { latitude: NaN }, { latitude: 91 }, { longitude: -181 },
])('무효 좌표를 통합 입력에서 거절한다: %j', invalid => {
  expect(() => calculateFourPillars({ ...base, ...invalid }, context)).toThrow(expect.objectContaining({ code: 'INVALID_INPUT' }));
});

it.each([-1, NaN, Infinity])('무효 절입 오차 %s를 확정 결과로 숨기지 않는다', jieSeconds => {
  expect(() => calculateFourPillars(base, { ...context, uncertainty: { ...context.uncertainty, jieSeconds } }))
    .toThrow(expect.objectContaining({ code: 'PROVIDER_FAILURE' }));
});

it('개별 절입의 무효 오차를 공급자 실패로 반환한다', () => {
  const invalid = { ...context, astronomy: { ...context.astronomy,
    jieInstants: (from: number, to: number) => context.astronomy.jieInstants(from, to).map(row => ({ ...row, uncertaintySeconds: NaN })),
  } };
  expect(() => calculateFourPillars(base, invalid)).toThrow(expect.objectContaining({ code: 'PROVIDER_FAILURE' }));
});

it('인접 절입 열거의 안전 범위를 넘는 오차는 누락된 확정값 대신 실패한다', () => {
  expect(() => calculateFourPillars(base, { ...context, uncertainty: { ...context.uncertainty, jieSeconds: 86401 } }))
    .toThrow(expect.objectContaining({ code: 'PROVIDER_FAILURE' }));
  const wide = { ...context, astronomy: { ...context.astronomy,
    jieInstants: (from: number, to: number) => context.astronomy.jieInstants(from, to).map(row => ({ ...row, uncertaintySeconds: 86401 })),
  } };
  expect(() => calculateFourPillars(base, wide)).toThrow(expect.objectContaining({ code: 'PROVIDER_FAILURE' }));
});

it('기둥별 적용 규칙과 오차 여유값을 결과 근거·제한에 보존한다', () => {
  const result = calculateFourPillars(base, context);
  expect(result.evidence.map(row => row.ruleCode)).toEqual(expect.arrayContaining([
    'YEAR_LICHUN_UTC_V1', 'MONTH_TWELVE_JIE_V1', 'DAY_SOLAR_2300_V1', 'HOUR_ROLLED_DAY_V1',
  ]));
  expect(result.limitations.join(' ')).toContain('jie=1800s');
  expect(result.limitations.join(' ')).toContain('EoT=10s');
});

it('기존 계산 함수와 다른 ruleset 버전은 성공으로 표시하지 않는다', () => {
  expect(() => calculateFourPillars(base, { ...context, versions: { ...context.versions, rulesetVersion: 'unsupported' } }))
    .toThrow(expect.objectContaining({ code: 'INVALID_INPUT' }));
});

it('윤달 원본과 대응 양력은 같은 기둥이며 음력 공급자 버전만 구분한다', () => {
  const lunar = calculateFourPillars({ ...base, birthDate: '2023-02-01', calendarType: 'lunar', isLeapMonth: true }, context);
  const solar = calculateFourPillars({ ...base, birthDate: '2023-03-22' }, context);
  expect(lunar.pillars).toEqual(solar.pillars);
  expect(lunar.normalization).toEqual(solar.normalization);
  expect(lunar.versions.lunarCalendarVersion).toBe(context.versions.lunarCalendarVersion);
  expect(solar.versions.lunarCalendarVersion).toBeNull();
});

it('gap·offset 불일치를 정상 부분 결과로 바꾸지 않는다', () => {
  const input = { ...base, birthDate: '2026-03-08', birthTime: '02:30', timezoneId: 'America/New_York' };
  expect(() => calculateFourPillars(input, context)).toThrow(expect.objectContaining({ code: 'DST_GAP' }));
  expect(() => calculateFourPillars({ ...input, birthTime: '12:00', utcOffsetSeconds: 0 }, context)).toThrow(expect.objectContaining({ code: 'OFFSET_MISMATCH' }));
});

it('approximate는 대표시각의 계산임을 제한으로 남긴다', () => {
  const result = calculateFourPillars({ ...base, timeAccuracy: 'approximate' }, deterministic);
  expect(result.inputAccuracy).toBe('approximate');
  expect(result.pillars).toEqual(calculateFourPillars(base, deterministic).pillars);
  expect(result.limitations.join(' ')).toContain('representative');
});

it.each([
  [0, 'complete', 'confirmed'], [7.5, 'partial', 'ambiguous'],
] as const)('DST overlap 경도 %s에서는 기둥 값을 비교하고 UTC 두 후보를 보존한다', (longitude, completeness, hourStatus) => {
  const result = calculateFourPillars({ ...base, birthDate: '2026-11-01', birthTime: '01:30', timezoneId: 'America/New_York', longitude }, deterministic);
  expect(result.completeness).toBe(completeness);
  expect(result.pillars.hour.status).toBe(hourStatus);
  if (result.normalization.kind !== 'instant') throw new Error('expected instant');
  expect(result.normalization.candidates.map(candidate => candidate.instantUtcMs))
    .toEqual([Date.parse('2026-11-01T05:30:00Z'), Date.parse('2026-11-01T06:30:00Z')]);
  expect(result.pillars.day.status).toBe('confirmed');
});
