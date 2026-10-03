import { expect, it } from 'vitest';
import KoreanLunarCalendar from 'korean-lunar-calendar';
import type { NatalBirthInput } from '@mylife/bazi-domain';
import { CalendarProviderError, createCalendarContext, resolveSolarDate } from '../src/index';

const context = createCalendarContext(new KoreanLunarCalendar());
const base: NatalBirthInput = {
  birthDate: '2023-02-01', calendarType: 'lunar', isLeapMonth: false,
  timeAccuracy: 'exact', birthTime: '12:00', cityId: 'seoul', timezoneId: 'Asia/Seoul',
  latitude: 37.5665, longitude: 126.978,
};

it.each([
  [false, '2023-02-20'], [true, '2023-03-22'],
] as const)('음력 평/윤달 leap=%s를 변환하고 원본 snapshot을 보존한다', (isLeapMonth, expected) => {
  const input = Object.freeze({ ...base, isLeapMonth });
  expect(resolveSolarDate(input, context)).toBe(expected);
  expect(input).toEqual({ ...base, isLeapMonth });
  expect(resolveSolarDate({ ...base, calendarType: 'solar', birthDate: expected }, context)).toBe(expected);
});

it.each([
  ['2023-01-01', 'lunar', true, 'INVALID_INPUT'],
  ['2023-02-30', 'solar', false, 'INVALID_INPUT'],
  ['2023-2-01', 'solar', false, 'INVALID_INPUT'],
  ['2023-02-01', 'solar', true, 'INVALID_INPUT'],
  ['1899-12-01', 'lunar', false, 'UNSUPPORTED_DATE'],
  ['1899-12-31', 'solar', false, 'UNSUPPORTED_DATE'],
  ['2027-01-01', 'solar', false, 'UNSUPPORTED_DATE'],
  ['2026-12-01', 'lunar', false, 'UNSUPPORTED_DATE'],
] as const)('%s %s의 무효/범위 밖 입력을 거절한다', (birthDate, calendarType, isLeapMonth, code) => {
  expect(() => resolveSolarDate({ ...base, birthDate, calendarType, isLeapMonth }, context))
    .toThrowError(expect.objectContaining({ code }));
});

it('context의 범위와 공급자 자체의 범위 오류를 보존한다', () => {
  const limited = { ...context, supportedRange: { ...context.supportedRange, to: '2023-03-21' } };
  expect(() => resolveSolarDate({ ...base, isLeapMonth: true }, limited)).toThrowError(expect.objectContaining({ code: 'UNSUPPORTED_DATE' }));
  const unavailable = { ...context, lunar: { toSolar() { throw new CalendarProviderError('UNSUPPORTED_DATE', 'source range'); } } };
  expect(() => resolveSolarDate(base, unavailable)).toThrowError(expect.objectContaining({ code: 'UNSUPPORTED_DATE' }));
});

it('공급자 예외와 잘못된 양력 응답은 PROVIDER_FAILURE다', () => {
  for (const toSolar of [() => { throw new Error('offline data failure'); }, () => '2023-02-30']) {
    expect(() => resolveSolarDate(base, { ...context, lunar: { toSolar } })).toThrowError(expect.objectContaining({ code: 'PROVIDER_FAILURE' }));
  }
});

it.each([
  ['1900-01-01', 'solar', false, '1900-01-01'],
  ['1900-05-01', 'lunar', false, '1900-05-28'],
  ['2026-12-31', 'solar', false, '2026-12-31'],
] as const)('공통 지원 범위의 날짜 %s를 처리한다', (birthDate, calendarType, isLeapMonth, expected) => {
  expect(resolveSolarDate({ ...base, birthDate, calendarType, isLeapMonth }, context)).toBe(expected);
});
