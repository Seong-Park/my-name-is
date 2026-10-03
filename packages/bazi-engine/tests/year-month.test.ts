import { expect, it } from 'vitest';
import KoreanLunarCalendar from 'korean-lunar-calendar';
import { calculateYearPillar, calculateMonthPillar, createCalendarContext, CalendarProviderError } from '../src/index';
import { GANZHI_CYCLE } from '@mylife/bazi-rules';
import reference from './fixtures/calendar-reference.json';
import type { JieInstant } from '../src/index';

const realContext = createCalendarContext(new KoreanLunarCalendar());
// HKO 表四 / NAOJ 暦Wiki 干支의 독립 월두법 표. 계산식으로 기대값을 만들지 않는다.
const monthRows = [
  '丙寅 丁卯 戊辰 己巳 庚午 辛未 壬申 癸酉 甲戌 乙亥 丙子 丁丑',
  '戊寅 己卯 庚辰 辛巳 壬午 癸未 甲申 乙酉 丙戌 丁亥 戊子 己丑',
  '庚寅 辛卯 壬辰 癸巳 甲午 乙未 丙申 丁酉 戊戌 己亥 庚子 辛丑',
  '壬寅 癸卯 甲辰 乙巳 丙午 丁未 戊申 己酉 庚戌 辛亥 壬子 癸丑',
  '甲寅 乙卯 丙辰 丁巳 戊午 己未 庚申 辛酉 壬戌 癸亥 甲子 乙丑',
].map(row => row.split(' '));
const jieCodes = ['입춘', '경칩', '청명', '입하', '망종', '소서', '입추', '백로', '한로', '입동', '대설', '소한'] as const;
const terms: readonly JieInstant[] = [
  { code: '대설', instantUtcMs: Date.parse('2025-12-07T00:00:00Z'), uncertaintySeconds: 0 },
  { code: '소한', instantUtcMs: Date.parse('2026-01-05T23:00:00Z'), uncertaintySeconds: 0 },
  { code: '입춘', instantUtcMs: Date.parse('2026-02-03T23:00:00Z'), uncertaintySeconds: 0 },
  { code: '경칩', instantUtcMs: Date.parse('2026-03-05T00:00:00Z'), uncertaintySeconds: 0 },
  { code: '청명', instantUtcMs: Date.parse('2026-04-05T00:00:00Z'), uncertaintySeconds: 0 },
];
function fakeContext(rows = terms) {
  return { ...realContext, astronomy: {
    equationOfTimeSeconds() { throw new Error('Do not apply solar correction to jie comparison'); },
    jieInstants: () => rows,
  }, timezone: {
    possibleInstants() { throw new Error('Already UTC'); },
    offsetSeconds() { throw new Error('Already UTC'); },
  } };
}

it.each([
  ['2026-01-01T00:00:00Z', '乙', '巳', 41],
  ['2026-01-05T22:59:59Z', '乙', '巳', 41],
  ['2026-01-05T23:00:00Z', '乙', '巳', 41],
  ['2026-02-03T22:59:59Z', '乙', '巳', 41],
  ['2026-02-03T23:00:00Z', '丙', '午', 42],
  ['2026-02-03T23:00:01Z', '丙', '午', 42],
  ['2026-02-04T08:00:00+09:00', '丙', '午', 42],
] as const)('%s의 연주는 입춘 UTC를 기준으로 한다', (instant, stem, branch, index) => {
  expect(calculateYearPillar(Date.parse(instant), fakeContext())).toEqual({ stem, branch, index });
});

it.each(monthRows.map((expected, group) => ({ expected, group })))('월두법 그룹 $group의 두 연간 × 12개월을 독립 표로 검증한다', ({ expected, group }) => {
  for (const yearPillar of [GANZHI_CYCLE[group], GANZHI_CYCLE[group + 5]]) {
    jieCodes.forEach((code, month) => {
      const instant = Date.UTC(2000, month + 1, 5);
      const context = fakeContext([{ code, instantUtcMs: instant, uncertaintySeconds: 0 }]);
      const result = calculateMonthPillar(instant, yearPillar, context);
      expect(result.stem + result.branch).toBe(expected[month]);
      expect(GANZHI_CYCLE[result.index]).toMatchObject(result);
    });
  }
});

it('甲子 기준의 앞뒤 60년 주기와 표 전체를 검증한다', () => {
  for (const year of [1924, 1984]) {
    GANZHI_CYCLE.forEach(({ stem, branch, index }, offset) => {
      const instant = Date.UTC(year + offset, 5, 1);
      const context = fakeContext([{ code: '입하', instantUtcMs: instant, uncertaintySeconds: 0 }]);
      expect(calculateYearPillar(instant, context)).toEqual({ stem, branch, index });
    });
  }
});

it.each(reference.jie)('독립 절입 $code $instantUtcMs 전후의 연월주', row => {
  const year = new Date(row.instantUtcMs).getUTCFullYear();
  // 독립 fixture의 1900 庚子, 2000 庚辰, 2026 丙午. 소한/입춘 전은 전년도.
  const anchors: Record<number, { previous: number; current: number; group: number; previousGroup: number }> = {
    1900: { previous: 35, current: 36, group: 1, previousGroup: 0 },
    2000: { previous: 15, current: 16, group: 1, previousGroup: 0 },
    2026: { previous: 41, current: 42, group: 2, previousGroup: 1 },
  };
  const anchor = anchors[year];
  const month = jieCodes.findIndex(code => code === row.code);
  // 독립 공표값은 분 정밀도: ±1초를 진실로 간주하지 않고 공급자 오차 여유값 밖에서 비교한다.
  const margin = Math.max(row.comparisonToleranceSeconds, realContext.uncertainty.jieSeconds) * 1000 + 1000;
  for (const side of [-1, 1]) {
    const instant = row.instantUtcMs + side * margin;
    const priorYear = row.code === '소한' || (row.code === '입춘' && side < 0);
    const expectedYear = GANZHI_CYCLE[priorYear ? anchor.previous : anchor.current];
    const actualYear = calculateYearPillar(instant, realContext);
    expect(actualYear).toEqual({ stem: expectedYear.stem, branch: expectedYear.branch, index: expectedYear.index });
    const actualMonth = calculateMonthPillar(instant, actualYear, realContext);
    const expectedMonth = monthRows[priorYear ? anchor.previousGroup : anchor.group][side < 0 ? (month + 11) % 12 : month];
    expect(actualMonth.stem + actualMonth.branch).toBe(expectedMonth);
  }
});

it('실제 공급자의 정각 단일 경계 응답과 지원 범위 양 끝을 처리한다', () => {
  const start = Date.parse('2026-02-01T00:00:00Z');
  const lichun = realContext.astronomy.jieInstants(start, Date.parse('2026-02-10T00:00:00Z')).find(row => row.code === '입춘')!;
  expect(calculateYearPillar(lichun.instantUtcMs - 1, realContext).index).toBe(41);
  expect(calculateYearPillar(lichun.instantUtcMs, realContext).index).toBe(42);
  expect(calculateYearPillar(Date.parse('1899-12-31T10:00:00Z'), realContext).index).toBe(35);
  expect(calculateYearPillar(Date.parse('2027-01-01T10:00:00Z'), realContext).index).toBe(42);
  expect(() => calculateYearPillar(Date.parse('1800-01-01T00:00:00Z'), realContext))
    .toThrow(expect.objectContaining({ code: 'UNSUPPORTED_DATE' }));
});

it.each([NaN, Infinity, 9e15])('무효 instant %s는 공급자 호출 전에 거절한다', instant => {
  const context = fakeContext();
  expect(() => calculateYearPillar(instant, context)).toThrow(expect.objectContaining({ code: 'INVALID_INPUT' }));
  expect(() => calculateMonthPillar(instant, GANZHI_CYCLE[0], context)).toThrow(expect.objectContaining({ code: 'INVALID_INPUT' }));
});

it.each([
  [],
  [{ code: '입춘', instantUtcMs: NaN, uncertaintySeconds: 0 }],
  [{ code: '잘못된 절', instantUtcMs: Date.parse('2026-01-01T00:00:00Z'), uncertaintySeconds: 0 }],
  [{ code: '대설', instantUtcMs: Date.parse('2025-12-07T00:00:00Z'), uncertaintySeconds: 0 }],
].map(rows => ({ rows })))('무효 또는 구간을 감싸지 못하는 공급자 응답은 실패한다: $rows', ({ rows }) => {
  const context = fakeContext(JSON.parse(JSON.stringify(rows)));
  for (const calculate of [() => calculateYearPillar(Date.parse('2026-01-02T00:00:00Z'), context),
    () => calculateMonthPillar(Date.parse('2026-01-02T00:00:00Z'), GANZHI_CYCLE[41], context)]) {
    expect(calculate).toThrow(expect.objectContaining({ code: 'PROVIDER_FAILURE' }));
  }
});

it('외부 예외를 공급자 오류로 감싸고 기존 오류 코드는 보존한다', () => {
  const context = fakeContext();
  context.astronomy.jieInstants = () => { throw new Error('backend'); };
  expect(() => calculateYearPillar(0, context)).toThrow(expect.objectContaining({ code: 'PROVIDER_FAILURE' }));
  const failure = new CalendarProviderError('UNSUPPORTED_DATE', 'range');
  context.astronomy.jieInstants = () => { throw failure; };
  expect(() => calculateMonthPillar(0, GANZHI_CYCLE[0], context)).toThrow(failure);
});

it.each([
  { stem: '甲', branch: '丑', index: 0 },
  { stem: '甲', branch: '子', index: 60 },
  { stem: '?', branch: '子', index: 0 },
])('월주 입력 연간·연지·index 대응을 검증한다: %j', invalid => {
  expect(() => calculateMonthPillar(Date.parse('2026-02-04T00:00:00Z'), JSON.parse(JSON.stringify(invalid)), fakeContext()))
    .toThrow(expect.objectContaining({ code: 'INVALID_INPUT' }));
});

it.each([
  ['2026-01-05T22:59:59Z', '戊', '子', 24],
  ['2026-01-05T23:00:00Z', '己', '丑', 25],
  ['2026-01-05T23:00:01Z', '己', '丑', 25],
  ['2026-02-03T22:59:59Z', '己', '丑', 25],
  ['2026-02-03T23:00:00Z', '庚', '寅', 26],
  ['2026-02-03T23:00:01Z', '庚', '寅', 26],
  ['2026-03-04T23:59:59Z', '庚', '寅', 26],
  ['2026-03-05T00:00:00Z', '辛', '卯', 27],
  ['2026-03-05T00:00:01Z', '辛', '卯', 27],
] as const)('%s의 월주는 해당 절 정각부터 바뀐다', (iso, stem, branch, index) => {
  const instant = Date.parse(iso);
  const context = fakeContext();
  expect(calculateMonthPillar(instant, calculateYearPillar(instant, context), context)).toEqual({ stem, branch, index });
});
