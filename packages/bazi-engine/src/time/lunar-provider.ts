import type KoreanLunarCalendar from 'korean-lunar-calendar';
import type { LunarProvider } from './providers';
import { CalendarProviderError } from './provider-errors';

/** 생성자 초기화는 호출자가 계산 시작 전에 수행한다. */
export type LunarCalendarBackend = Pick<KoreanLunarCalendar, 'setLunarDate' | 'getSolarCalendar' | 'getLunarCalendar'>;

export function createLunarProvider(calendar: LunarCalendarBackend): LunarProvider {
  return {
    toSolar(date, leap) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || typeof leap !== 'boolean') {
        throw new CalendarProviderError('INVALID_INPUT', 'Expected an ISO lunar date and explicit leap flag');
      }
      if (date < '1000-01-01' || date > '2050-11-18') {
        throw new CalendarProviderError('UNSUPPORTED_DATE', 'Outside korean-lunar-calendar 0.4.0 range');
      }
      const [year, month, day] = date.split('-').map(Number);
      try {
        if (!calendar.setLunarDate(year, month, day, leap)) {
          throw new CalendarProviderError('INVALID_INPUT', 'Invalid lunar date or leap month');
        }
        const lunar = calendar.getLunarCalendar();
        if (lunar.year !== year || lunar.month !== month || lunar.day !== day || lunar.intercalation !== leap) {
          throw new CalendarProviderError('PROVIDER_FAILURE', 'Lunar backend changed the requested input');
        }
        const solar = calendar.getSolarCalendar();
        const value = `${solar.year.toString().padStart(4, '0')}-${solar.month.toString().padStart(2, '0')}-${solar.day.toString().padStart(2, '0')}`;
        const ms = Date.parse(`${value}T00:00:00Z`);
        if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 10) !== value) {
          throw new CalendarProviderError('PROVIDER_FAILURE', 'Lunar backend returned an invalid solar date');
        }
        return value;
      } catch (error) {
        if (error instanceof CalendarProviderError) throw error;
        throw new CalendarProviderError('PROVIDER_FAILURE', 'Lunar backend failed', { cause: error });
      }
    },
  };
}
