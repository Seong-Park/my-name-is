import { expect, it, vi } from 'vitest';
import { calculateDayPillar, calculateHourPillar, applyDayBoundary } from '../src/index';
import { GANZHI_CYCLE, MYLIFE_STANDARD_V1 } from '@mylife/bazi-rules';
import reference from './fixtures/day-reference.json';

// HKO Table 5의 고정 기대값: 甲己, 乙庚, 丙辛, 丁壬, 戊癸 그룹; 子~亥 순서.
const hourRows = [
  '甲子 乙丑 丙寅 丁卯 戊辰 己巳 庚午 辛未 壬申 癸酉 甲戌 乙亥',
  '丙子 丁丑 戊寅 己卯 庚辰 辛巳 壬午 癸未 甲申 乙酉 丙戌 丁亥',
  '戊子 己丑 庚寅 辛卯 壬辰 癸巳 甲午 乙未 丙申 丁酉 戊戌 己亥',
  '庚子 辛丑 壬寅 癸卯 甲辰 乙巳 丙午 丁未 戊申 己酉 庚戌 辛亥',
  '壬子 癸丑 甲寅 乙卯 丙辰 丁巳 戊午 己未 庚申 辛酉 壬戌 癸亥',
].map(row => row.split(' '));

it.each(hourRows.map((expected, group) => ({ expected, group })))('시두법 그룹 $group의 두 일간 × 12시진', ({ expected, group }) => {
  for (const day of [GANZHI_CYCLE[group], GANZHI_CYCLE[group + 5]]) {
    expected.forEach((label, hour) => {
      const result = calculateHourPillar(day, hour * 7200, MYLIFE_STANDARD_V1);
      expect(result.stem + result.branch).toBe(label);
      expect(GANZHI_CYCLE[result.index]).toMatchObject(result);
    });
  }
});

it.each([
  ['1899-12-31', '1900-01-01'], ['1900-02-28', '1900-03-01'],
  ['1999-12-31', '2000-01-01'], ['2000-02-28', '2000-02-29'], ['2000-02-29', '2000-03-01'],
  ['2024-02-28', '2024-02-29'], ['2024-02-29', '2024-03-01'],
  ['2026-12-31', '2027-01-01'], ['0001-12-31', '0002-01-01'], ['9999-12-30', '9999-12-31'],
])('%s → %s Gregorian 인접 날짜는 간지 한 칸 차이다', (before, after) => {
  expect((calculateDayPillar(after).index - calculateDayPillar(before).index + 60) % 60).toBe(1);
});

it('하루씩 60일 동안 모든 일진을 순서대로 지나고 기준으로 돌아온다', () => {
  const base = Date.parse('2026-01-02T00:00:00Z');
  const seen = new Set<number>();
  for (let offset = 0; offset < 60; offset++) {
    const date = new Date(base + offset * 86400000).toISOString().slice(0, 10);
    const result = calculateDayPillar(date);
    expect(result.index).toBe((12 + offset) % 60);
    expect(GANZHI_CYCLE[result.index]).toMatchObject(result);
    seen.add(result.index);
  }
  expect(seen.size).toBe(60);
});

it('호스트 날짜 getter·현재 시각 없이 계산하고 입력 및 반환 표를 변경하지 않는다', () => {
  const day = Object.freeze({ ...GANZHI_CYCLE[12] });
  const spies = [vi.spyOn(Date, 'now'), vi.spyOn(Date.prototype, 'getFullYear'),
    vi.spyOn(Date.prototype, 'getMonth'), vi.spyOn(Date.prototype, 'getDate'), vi.spyOn(Date.prototype, 'getHours')];
  for (const spy of spies) spy.mockImplementation(() => { throw new Error('Host time forbidden'); });
  try {
    const first = calculateDayPillar('2026-01-02');
    first.stem = '甲';
    expect(calculateDayPillar('2026-01-02').stem).toBe('丙');
    const result = calculateHourPillar(day, 0, MYLIFE_STANDARD_V1);
    result.stem = '甲';
    expect(calculateHourPillar(day, 0, MYLIFE_STANDARD_V1)).toEqual({ stem: '戊', branch: '子', index: 24 });
    expect(day.stem).toBe('丙');
  } finally { for (const spy of spies) spy.mockRestore(); }
});

it.each(reference.days)('독립 역서의 $date 일진', ({ date, stem, branch, index }) => {
  expect(calculateDayPillar(date)).toEqual({ stem, branch, index });
});

// HKO 天干和地支, Table 3. 시진 시작 직전/정각/직후와 자정의 연속성.
it.each([
  [0, '子'], [3599.999, '子'], [3600, '丑'], [3600.001, '丑'],
  [10799.999, '丑'], [10800, '寅'], [17999.999, '寅'], [18000, '卯'],
  [25199.999, '卯'], [25200, '辰'], [32399.999, '辰'], [32400, '巳'],
  [39599.999, '巳'], [39600, '午'], [46799.999, '午'], [46800, '未'],
  [53999.999, '未'], [54000, '申'], [61199.999, '申'], [61200, '酉'],
  [68399.999, '酉'], [68400, '戌'], [75599.999, '戌'], [75600, '亥'],
  [82799.999, '亥'], [82800, '子'], [82800.001, '子'], [84599, '子'], [84600, '子'], [86399.999, '子'],
] as const)('태양시 %s초의 시지는 %s다', (second, branch) => {
  expect(calculateHourPillar(GANZHI_CYCLE[0], second, MYLIFE_STANDARD_V1).branch).toBe(branch);
});

it('23:00 일계로 바뀐 일간을 시주에 사용하고 일계를 두 번 적용하지 않는다', () => {
  const before = calculateDayPillar(applyDayBoundary({ date: '2026-01-01', secondOfDay: 82799 }, MYLIFE_STANDARD_V1));
  const after = calculateDayPillar(applyDayBoundary({ date: '2026-01-01', secondOfDay: 82800 }, MYLIFE_STANDARD_V1));
  expect(before).toEqual({ stem: '乙', branch: '亥', index: 11 });
  expect(after).toEqual({ stem: '丙', branch: '子', index: 12 });
  expect(calculateHourPillar(before, 82799, MYLIFE_STANDARD_V1)).toEqual({ stem: '丁', branch: '亥', index: 23 });
  expect(calculateHourPillar(after, 82800, MYLIFE_STANDARD_V1)).toEqual({ stem: '戊', branch: '子', index: 24 });
  expect(calculateHourPillar(after, 0, MYLIFE_STANDARD_V1)).toEqual({ stem: '戊', branch: '子', index: 24 });
});

it('기준일에서 60일 전후는 같은 일진이다', () => {
  const expected = { stem: '丙', branch: '子', index: 12 };
  expect(calculateDayPillar('2025-11-03')).toEqual(expected);
  expect(calculateDayPillar('2026-03-03')).toEqual(expected);
});

it.each([-1, 86400, NaN, Infinity])('시주 초 좌표 %s를 거절한다', second => {
  expect(() => calculateHourPillar(GANZHI_CYCLE[0], second, MYLIFE_STANDARD_V1))
    .toThrow(expect.objectContaining({ code: 'INVALID_INPUT' }));
});

it.each([
  { stem: '甲', branch: '丑', index: 0 }, { stem: '甲', branch: '子', index: 60 },
  { stem: '?', branch: '子', index: 0 },
])('일주 내부 간지·index 불일치를 거절한다: %j', invalid => {
  expect(() => calculateHourPillar(JSON.parse(JSON.stringify(invalid)), 0, MYLIFE_STANDARD_V1))
    .toThrow(expect.objectContaining({ code: 'INVALID_INPUT' }));
});

it.each([
  { timeBasis: 'civil-time' }, { dayBoundary: '00:00' }, { ziHourStart: '23:30' },
  { ziHourEnd: '00:00' }, { splitZiHour: true }, { hourStemUsesRolledDayMaster: false },
])('승인되지 않은 시주 정책을 거절한다: %j', patch => {
  const policy = JSON.parse(JSON.stringify({ ...MYLIFE_STANDARD_V1, ...patch }));
  expect(() => calculateHourPillar(GANZHI_CYCLE[0], 0, policy))
    .toThrow(expect.objectContaining({ code: 'INVALID_INPUT' }));
});

it.each(['', '2026-2-01', '2026-02-30', '1900-02-29', '2026-13-01', '2026-00-01', '2026-01-00',
  '0000-01-01', '10000-01-01', '2026-01-02T00:00:00Z', '2026-01-02+09:00'])('잘못된 명리 날짜 %s를 거절한다', date => {
  expect(() => calculateDayPillar(date)).toThrow(expect.objectContaining({ code: 'INVALID_INPUT' }));
});
