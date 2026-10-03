import { expect, it, vi } from 'vitest';
import KoreanLunarCalendar from 'korean-lunar-calendar';
import { createCalendarContext } from '../src/index';

it('공급자 버전·공통 지원 날짜·오차 정책을 계산 context에 고정한다', () => {
  const context = createCalendarContext(new KoreanLunarCalendar());
  expect(context.versions).toEqual({
    engineVersion: 'bazi-engine-calendar-v1',
    rulesetVersion: 'mylife-standard-v1',
    calendarVersion: 'astronomy-engine@2.1.19/ut-as-utc/espenak-meeus/v1',
    timezoneVersion: 'moment-timezone@0.6.0/moment@2.31.0/tzdb@2025b',
    lunarCalendarVersion: 'korean-lunar-calendar@0.4.0',
  });
  expect(context.supportedRange).toEqual({ from: '1900-01-01', to: '2026-12-31', calendar: 'proleptic-gregorian' });
  expect(context.uncertainty).toEqual({ jieSeconds: 1800, equationOfTimeSeconds: 10, basis: 'engineering-budget-not-certified-bound' });
  expect(Object.isFrozen(context.versions)).toBe(true);
  expect(Object.isFrozen(context.supportedRange)).toBe(true);
  expect(Object.isFrozen(context.uncertainty)).toBe(true);
  expect(Object.isFrozen(context)).toBe(true);
  expect(context.limitations.length).toBeGreaterThan(0);
});

it('초기화 후 날짜·실행 순서·이전 음력 상태·반환값 수정에 의존하지 않는다', () => {
  const context = createCalendarContext(new KoreanLunarCalendar());
  const instant = Date.UTC(2026, 1, 11, 12);
  const read = () => ({
    instants: context.timezone.possibleInstants('1988-10-09T02:30:00', 'Asia/Seoul'),
    eot: context.astronomy.equationOfTimeSeconds(instant),
    jie: context.astronomy.jieInstants(instant, instant),
    solar: context.lunar.toSolar('2023-02-01', true),
  });
  const first = read();
  context.lunar.toSolar('2026-01-01', false);
  // JS 소비자의 반환값 변경이 내부 캐시를 오염시키지 않는다.
  Reflect.set(first.jie[0], 'instantUtcMs', 0);
  const expected = read();
  vi.useFakeTimers();
  try {
    vi.setSystemTime(new Date('2040-01-01T00:00:00Z'));
    expect(read()).toEqual(expected);
    vi.setSystemTime(new Date('1901-01-01T00:00:00Z'));
    expect(read()).toEqual(expected);
  } finally { vi.useRealTimers(); }
  expect(expected.jie[0].instantUtcMs).not.toBe(0);
});
