import type { NatalBirthInput } from '@mylife/bazi-domain';
import type { CalendarContext } from './providers';
import { CalendarProviderError } from './provider-errors';

function isGregorianDate(date: string): boolean {
  const ms = Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === date;
}

/** 원본 snapshot을 유지하고 계산용 양력 날짜만 반환한다. */
export function resolveSolarDate(input: NatalBirthInput, context: CalendarContext): string {
  if (typeof input.birthDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.birthDate)
    || !['solar', 'lunar'].includes(input.calendarType) || typeof input.isLeapMonth !== 'boolean') {
    throw new CalendarProviderError('INVALID_INPUT', 'Expected an explicit calendar, ISO date and leap flag');
  }
  if (input.calendarType === 'solar' && (input.isLeapMonth || !isGregorianDate(input.birthDate))) {
    throw new CalendarProviderError('INVALID_INPUT', 'Invalid Gregorian date or solar leap-month flag');
  }
  // 원본 역법 입력도 1900년부터 받는다. 변환한 양력 범위는 별도로 검사한다.
  if (input.birthDate < '1900-01-01') throw new CalendarProviderError('UNSUPPORTED_DATE', 'Birth input starts at 1900');
  let solarDate = input.birthDate;
  if (input.calendarType === 'lunar') {
    try {
      solarDate = context.lunar.toSolar(input.birthDate, input.isLeapMonth);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(solarDate) || !isGregorianDate(solarDate)) {
        throw new CalendarProviderError('PROVIDER_FAILURE', 'Lunar provider returned an invalid Gregorian date');
      }
    } catch (error) {
      if (error instanceof CalendarProviderError) throw error;
      throw new CalendarProviderError('PROVIDER_FAILURE', 'Lunar provider failed', { cause: error });
    }
  }
  if (solarDate < context.supportedRange.from || solarDate > context.supportedRange.to) {
    throw new CalendarProviderError('UNSUPPORTED_DATE', 'Converted date is outside the context range');
  }
  return solarDate;
}
