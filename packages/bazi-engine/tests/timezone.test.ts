import { expect, it } from 'vitest';
import KoreanLunarCalendar from 'korean-lunar-calendar';
import type { NatalBirthInput } from '@mylife/bazi-domain';
import { createCalendarContext, resolveBirthInstants } from '../src/index';
import reference from './fixtures/calendar-reference.json';

const context = createCalendarContext(new KoreanLunarCalendar());
const base: NatalBirthInput = {
  birthDate: '2023-03-22', calendarType: 'solar', isLeapMonth: false,
  timeAccuracy: 'exact', birthTime: '12:00', cityId: 'seoul', timezoneId: 'Asia/Seoul',
  latitude: 37.5665, longitude: 126.978,
};

it.each([
  ['1900-01-01', '00:00', 'Asia/Seoul', '1899-12-31T15:32:08Z', 30472],
  ['1954-03-20', '23:29:59', 'Asia/Seoul', '1954-03-20T14:29:59Z', 32400],
  ['1954-03-21', '00:00', 'Asia/Seoul', '1954-03-20T15:30:00Z', 30600],
  ['1988-05-08', '01:59:59', 'Asia/Seoul', '1988-05-07T16:59:59Z', 32400],
  ['1988-05-08', '03:00', 'Asia/Seoul', '1988-05-07T17:00:00Z', 36000],
  ['1988-10-09', '01:59:59', 'Asia/Seoul', '1988-10-08T15:59:59Z', 36000],
  ['1988-10-09', '03:00', 'Asia/Seoul', '1988-10-08T18:00:00Z', 32400],
  ['2026-12-31', '23:59:59', 'America/New_York', '2027-01-01T04:59:59Z', -18000],
] as const)('%s %s: 전환 전후·지원 범위 양 끝의 UTC 날짜 넘김을 보존한다', (birthDate, birthTime, timezoneId, utc, offsetSeconds) => {
  expect(resolveBirthInstants({ ...base, birthDate, birthTime, timezoneId }, context)).toEqual({ kind: 'instant', candidates: [{ instantUtcMs: Date.parse(utc), offsetSeconds }] });
});

it('대응하는 음력 평달/윤달과 양력은 동일 UTC instant로 해석된다', () => {
  for (const [leap, solar] of [[false, '2023-02-20'], [true, '2023-03-22']] as const) {
    const lunar = Object.freeze({ ...base, birthDate: '2023-02-01', calendarType: 'lunar', isLeapMonth: leap } as const);
    const expected = { kind: 'instant', candidates: [{ instantUtcMs: Date.parse(`${solar}T03:00:00Z`), offsetSeconds: 32400 }] };
    expect(resolveBirthInstants(lunar, context)).toEqual(expected);
    expect(resolveBirthInstants({ ...base, birthDate: solar }, context)).toEqual(expected);
    expect(lunar.birthDate).toBe('2023-02-01');
    expect(lunar.calendarType).toBe('lunar');
  }
});

it.each(reference.timezone)('$id: gap/overlap와 역사적 초 단위 offset을 보존한다', row => {
  const [birthDate, birthTime] = row.local.split('T');
  const input = { ...base, birthDate, birthTime, timezoneId: row.zone };
  if (row.expectedInstantsUtcMs.length === 0) {
    expect(() => resolveBirthInstants(input, context)).toThrowError(expect.objectContaining({ code: 'DST_GAP' }));
  } else {
    expect(resolveBirthInstants(input, context)).toEqual({ kind: 'instant', candidates: row.expectedInstantsUtcMs.map((instantUtcMs, index) => ({ instantUtcMs, offsetSeconds: row.offsetSeconds[index] })) });
  }
});

it('알려진 offset은 overlap 후보를 선택하고 불일치는 거절한다', () => {
  const overlap = { ...base, birthDate: '1988-10-09', birthTime: '02:30' };
  for (const [utcOffsetSeconds, iso] of [[36000, '1988-10-08T16:30:00Z'], [32400, '1988-10-08T17:30:00Z']] as const) {
    expect(resolveBirthInstants({ ...overlap, utcOffsetSeconds }, context)).toEqual({ kind: 'instant', candidates: [{ instantUtcMs: Date.parse(iso), offsetSeconds: utcOffsetSeconds }] });
  }
  expect(() => resolveBirthInstants({ ...overlap, utcOffsetSeconds: 30600 }, context)).toThrowError(expect.objectContaining({ code: 'OFFSET_MISMATCH' }));
  expect(() => resolveBirthInstants({ ...base, utcOffsetSeconds: 0 }, context)).toThrowError(expect.objectContaining({ code: 'OFFSET_MISMATCH' }));
});

it('초 단위 offset과 0을 유효한 명시 입력으로 검산한다', () => {
  expect(resolveBirthInstants({ ...base, birthDate: '1900-01-01', utcOffsetSeconds: 30472 }, context)).toEqual({ kind: 'instant', candidates: [{ instantUtcMs: Date.parse('1900-01-01T03:32:08Z'), offsetSeconds: 30472 }] });
  expect(resolveBirthInstants({ ...base, timezoneId: 'Etc/UTC', utcOffsetSeconds: 0 }, context)).toEqual({ kind: 'instant', candidates: [{ instantUtcMs: Date.parse('2023-03-22T12:00:00Z'), offsetSeconds: 0 }] });
});

it('approximate는 대표시각 후보만 해석하고 원본 정확도를 변경하지 않는다', () => {
  const input = Object.freeze({ ...base, timeAccuracy: 'approximate' } as const);
  expect(resolveBirthInstants(input, context)).toEqual(resolveBirthInstants(base, context));
  expect(input.timeAccuracy).toBe('approximate');
});

it('unknown 입력은 임의 정오 대신 전체 날짜 구간을 반환한다', () => {
  expect(resolveBirthInstants({ ...base, timeAccuracy: 'unknown', birthTime: null }, context))
    .toMatchObject({ kind: 'interval', intervals: [{ startUtcMs: Date.parse('2023-03-21T15:00:00Z'), endUtcMs: Date.parse('2023-03-22T15:00:00Z') }] });
});

it.each([NaN, Infinity, 32400.5, 100000])('무효 offset %s를 불일치와 구분한다', utcOffsetSeconds => {
  expect(() => resolveBirthInstants({ ...base, utcOffsetSeconds }, context)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }));
});

it.each(['24:00', '12:60', '1:00', '12:00Z'])('잘못된 시간 %s를 입력 단계에서 차단한다', birthTime => {
  expect(() => resolveBirthInstants({ ...base, birthTime }, context)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }));
});

it('공급자 예외와 민간 좌표에 맞지 않는 UTC 후보를 성공으로 반환하지 않는다', () => {
  const throwContext = { ...context, timezone: { ...context.timezone, possibleInstants() { throw new Error('timezone failed'); } } };
  expect(() => resolveBirthInstants(base, throwContext)).toThrowError(expect.objectContaining({ code: 'PROVIDER_FAILURE' }));
  for (const instant of [NaN, Date.parse('2023-03-22T04:00:00Z')]) {
    const wrongContext = { ...context, timezone: { possibleInstants: () => [instant], offsetSeconds: () => 32400 } };
    expect(() => resolveBirthInstants(base, wrongContext)).toThrowError(expect.objectContaining({ code: 'PROVIDER_FAILURE' }));
  }
});

it('주입 공급자의 후보는 중복을 제거하고 UTC 순으로 정렬한다', () => {
  const input = { ...base, birthDate: '1988-10-09', birthTime: '02:30' };
  const first = Date.parse('1988-10-08T16:30:00Z');
  const second = Date.parse('1988-10-08T17:30:00Z');
  const unordered = { ...context, timezone: { ...context.timezone, possibleInstants: () => [second, first, second] } };
  expect(resolveBirthInstants(input, unordered)).toEqual({ kind: 'instant', candidates: [{ instantUtcMs: first, offsetSeconds: 36000 }, { instantUtcMs: second, offsetSeconds: 32400 }] });
});
