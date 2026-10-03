import moment from 'moment-timezone';
import tzdata from 'moment-timezone/data/packed/latest.json';
import lunarPackage from 'korean-lunar-calendar/package.json';
import { MYLIFE_STANDARD_V1 } from '@mylife/bazi-rules';
import type { CalendarContext } from './providers';
import { createTimeZoneProvider } from './timezone-provider';
import { createAstronomyProvider } from './astronomy-provider';
import { createLunarProvider, type LunarCalendarBackend } from './lunar-provider';

/** 호출자가 clock-reading 음력 생성자를 밖에서 초기화한 다음 context를 주입한다. */
export function createCalendarContext(lunarCalendar: LunarCalendarBackend): CalendarContext {
  return Object.freeze({
    timezone: Object.freeze(createTimeZoneProvider()),
    astronomy: Object.freeze(createAstronomyProvider()),
    lunar: Object.freeze(createLunarProvider(lunarCalendar)),
    versions: Object.freeze({
      engineVersion: 'bazi-engine-calendar-v1',
      rulesetVersion: MYLIFE_STANDARD_V1.version,
      calendarVersion: 'astronomy-engine@2.1.19/ut-as-utc/espenak-meeus/v1',
      timezoneVersion: `moment-timezone@${moment.tz.version}/moment@${moment.version}/tzdb@${tzdata.version}`,
      lunarCalendarVersion: `korean-lunar-calendar@${lunarPackage.version}`,
    }),
    supportedRange: Object.freeze({ from: '1900-01-01', to: '2026-12-31', calendar: 'proleptic-gregorian' }),
    uncertainty: Object.freeze({ jieSeconds: 1800, equationOfTimeSeconds: 10, basis: 'engineering-budget-not-certified-bound' }),
    limitations: Object.freeze([
      'UT1 is approximated by UTC; historical instants use proleptic Gregorian UT encoded as UTC.',
      'Astronomy uncertainty is an engineering budget, not a certified maximum error.',
      'Independent EoT numerical samples cover 2026 only; historical EoT is not independently certified.',
      'tzdb 2025b is pinned; historical records and later legal timezone changes can require a versioned update.',
      'Lunar source range is wider than the common supported birth range; HKO rows are individual Chinese-calendar cross-checks.',
    ]),
  });
}
