import { describe, expect, it } from 'vitest';
import { createTimeZoneProvider, createLunarProvider, createAstronomyProvider } from '../src/time/providers';
import KoreanLunarCalendar from 'korean-lunar-calendar';
import reference from './fixtures/calendar-reference.json';

describe('고정 tzdb 시간대 공급자', () => {
  it.each(reference.timezone)('$id: 원문 offset/전환의 모든 후보를 보존한다', row => {
    const provider = createTimeZoneProvider();
    const instants = provider.possibleInstants(row.local, row.zone);
    expect(instants).toEqual(row.expectedInstantsUtcMs);
    expect(instants.map(instant => provider.offsetSeconds(instant, row.zone))).toEqual(row.offsetSeconds);
  });

  it.each(['2026-02-30T12:00:00', '2026-01-01T24:00:00', '2026-01-01T12:00:00Z', 'garbage'])('무효 민간 좌표 %s를 정규화하지 않는다', local => {
    expect(() => createTimeZoneProvider().possibleInstants(local, 'Asia/Seoul')).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }));
  });
  it('지원 연도 밖과 알 수 없는 시간대를 명시적으로 거절한다', () => {
    const provider = createTimeZoneProvider();
    expect(() => provider.possibleInstants('1899-12-31T12:00:00', 'Asia/Seoul')).toThrowError(expect.objectContaining({ code: 'UNSUPPORTED_DATE' }));
    expect(() => provider.possibleInstants('2027-01-01T12:00:00', 'Asia/Seoul')).toThrowError(expect.objectContaining({ code: 'UNSUPPORTED_DATE' }));
    expect(() => provider.possibleInstants('2026-01-01T12:00:00', 'Mars/Olympus')).toThrowError(expect.objectContaining({ code: 'UNSUPPORTED_TIMEZONE' }));
    expect(() => provider.offsetSeconds(NaN, 'Asia/Seoul')).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }));
    expect(() => provider.offsetSeconds(Date.parse('1800-01-01Z'), 'Asia/Seoul')).toThrowError(expect.objectContaining({ code: 'UNSUPPORTED_DATE' }));
  });
});

describe('천문 공급자의 독립 NAOJ 기준값', () => {
  it.each(reference.equationOfTime)('$instantUtcMs: 균시차는 겉보기 태양시 − 평균 태양시다', row => {
    const provider = createAstronomyProvider();
    expect(Math.abs(provider.equationOfTimeSeconds(row.instantUtcMs) - row.expectedSeconds)).toBeLessThanOrEqual(row.comparisonToleranceSeconds);
  });

  it('무효·역순·범위 밖 천문 구간을 명시적으로 거절한다', () => {
    const provider = createAstronomyProvider();
    const instant = Date.UTC(2026, 0, 1);
    expect(() => provider.equationOfTimeSeconds(NaN)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }));
    expect(() => provider.equationOfTimeSeconds(Date.UTC(1800, 0, 1))).toThrowError(expect.objectContaining({ code: 'UNSUPPORTED_DATE' }));
    expect(() => provider.jieInstants(instant, instant - 1)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }));
    expect(() => provider.jieInstants(instant, Date.UTC(2028, 0, 1))).toThrowError(expect.objectContaining({ code: 'UNSUPPORTED_DATE' }));
  });

  it.each([...reference.jie, ...reference.paddingJie])('$code $instantUtcMs: 절입은 분 정밀도 독립값과 일치한다', row => {
    const provider = createAstronomyProvider();
    const center = Math.max(Date.UTC(1900, 0, 1), Math.min(row.instantUtcMs, Date.UTC(2026, 11, 31)));
    const terms = provider.jieInstants(center, center);
    const actual = terms.find(term => term.code === row.code && Math.abs(term.instantUtcMs - row.instantUtcMs) < 40 * 86400000);
    expect(actual).toBeDefined();
    expect(Math.abs(actual!.instantUtcMs - row.instantUtcMs) / 1000).toBeLessThanOrEqual(row.comparisonToleranceSeconds);
    expect(actual!.uncertaintySeconds).toBe(1800);
  });

  it('1900~2026 모든 해의 12절과 앞뒤 1899/2027 경계를 순서대로 제공한다', () => {
    const provider = createAstronomyProvider();
    const terms = provider.jieInstants(Date.UTC(1900, 0, 1), Date.UTC(2026, 11, 31, 23, 59, 59));
    expect(terms).toHaveLength(127 * 12 + 2);
    expect(new Date(terms[0].instantUtcMs).getUTCFullYear()).toBe(1899);
    expect(new Date(terms.at(-1)!.instantUtcMs).getUTCFullYear()).toBe(2027);
    for (let year = 1900; year <= 2026; year++) {
      const rows = terms.filter(term => new Date(term.instantUtcMs).getUTCFullYear() === year);
      expect(rows).toHaveLength(12);
      expect(new Set(rows.map(row => row.code)).size).toBe(12);
    }
    expect(terms.every((term, index) => index === 0 || term.instantUtcMs > terms[index - 1].instantUtcMs)).toBe(true);
    const boundary = terms[1].instantUtcMs;
    expect(provider.jieInstants(boundary, boundary)).toEqual([terms[1]]);
  });
});

describe('외부 초기화 음력 공급자', () => {
  it.each(reference.lunar)('$date leap=$leap → $solar 독립 자료와 원본을 보존한다', row => {
    const input = Object.freeze({ date: row.date, leap: row.leap });
    // 라이브러리 생성자의 현재 시각 읽기는 계산 경로 밖에서 끝낸다.
    const calendar = new KoreanLunarCalendar();
    const provider = createLunarProvider(calendar);
    expect(provider.toSolar(input.date, input.leap)).toBe(row.solar);
    const [year, month, day] = row.solar.split('-').map(Number);
    expect(calendar.setSolarDate(year, month, day)).toBe(true);
    const [ly, lm, ld] = row.date.split('-').map(Number);
    expect(calendar.getLunarCalendar()).toEqual({ year: ly, month: lm, day: ld, intercalation: row.leap });
    expect(input).toEqual({ date: row.date, leap: row.leap });
  });

  it.each([
    ['2023-01-01', true, 'INVALID_INPUT'],
    ['2023-02-31', false, 'INVALID_INPUT'],
    ['2023-2-01', false, 'INVALID_INPUT'],
    ['0999-12-01', false, 'UNSUPPORTED_DATE'],
    ['2050-11-19', false, 'UNSUPPORTED_DATE'],
  ] as const)('무효·범위 밖 음력 %s는 이전 변환값을 재사용하지 않는다', (date, leap, code) => {
    const provider = createLunarProvider(new KoreanLunarCalendar());
    expect(provider.toSolar('2023-02-01', true)).toBe('2023-03-22');
    expect(() => provider.toSolar(date, leap)).toThrowError(expect.objectContaining({ code }));
    expect(provider.toSolar('2023-02-01', false)).toBe('2023-02-20');
  });

  it('외부 공급자의 예외와 잘못된 응답은 PROVIDER_FAILURE로 구분한다', () => {
    const broken = createLunarProvider({
      setLunarDate() { throw new Error('backend failed'); },
      getSolarCalendar() { return { year: 2023, month: 3, day: 22 }; },
      getLunarCalendar() { return { year: 2023, month: 2, day: 1, intercalation: true }; },
    });
    expect(() => broken.toSolar('2023-02-01', true)).toThrowError(expect.objectContaining({ code: 'PROVIDER_FAILURE' }));
    const wrong = createLunarProvider({
      setLunarDate() { return true; },
      getSolarCalendar() { return { year: 2023, month: 2, day: 31 }; },
      getLunarCalendar() { return { year: 2023, month: 2, day: 1, intercalation: true }; },
    });
    expect(() => wrong.toSolar('2023-02-01', true)).toThrowError(expect.objectContaining({ code: 'PROVIDER_FAILURE' }));
  });
});
