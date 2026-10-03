import moment from 'moment-timezone';
import data from 'moment-timezone/data/packed/latest.json';
import type { TimeZoneProvider } from './providers';
import { assertInstant, CalendarProviderError } from './provider-errors';

function civilCoordinate(local: string): number {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{3})?)?$/.test(local)) {
    throw new CalendarProviderError('INVALID_INPUT', 'Expected a timezone-free ISO civil coordinate');
  }
  const coordinate = Date.parse(`${local}Z`);
  if (!Number.isFinite(coordinate) || new Date(coordinate).toISOString().slice(0, local.length) !== local) {
    throw new CalendarProviderError('INVALID_INPUT', 'Invalid civil date or time');
  }
  assertInstant(coordinate, Date.UTC(1900, 0, 1), Date.UTC(2027, 0, 1));
  return coordinate;
}

/** 전체 packed 자료를 private snapshot으로 풀어 global tz.load/호스트 ICU와 분리한다. */
export function createTimeZoneProvider(): TimeZoneProvider {
  const zones = new Map(data.zones.map(packed => {
    const zone = moment.tz.unpack(packed);
    return [zone.name, zone] as const;
  }));
  for (const link of data.links) {
    const [first, second] = link.split('|');
    const zone = zones.get(first) ?? zones.get(second);
    if (!zone) throw new CalendarProviderError('PROVIDER_FAILURE', `Missing bundled timezone link: ${link}`);
    zones.set(first, zone);
    zones.set(second, zone);
  }
  function offsetSeconds(instantUtcMs: number, name: string): number {
    // 民간 범위의 양 끝에서 timezone offset으로 넘어가는 UTC 날짜를 허용한다.
    assertInstant(instantUtcMs, Date.UTC(1899, 11, 30), Date.UTC(2027, 0, 3));
    const zone = zones.get(name);
    if (!zone) throw new CalendarProviderError('UNSUPPORTED_TIMEZONE', `Unknown timezone: ${name}`);
    const index = zone.untils.findIndex(until => instantUtcMs < until);
    const seconds = Math.round(-zone.offsets[index] * 60);
    return seconds === 0 ? 0 : seconds;
  }
  return {
    offsetSeconds,
    civilDateIntervals(date, name) {
      const zone = zones.get(name);
      if (!zone) throw new CalendarProviderError('UNSUPPORTED_TIMEZONE', `Unknown timezone: ${name}`);
      const from = civilCoordinate(`${date}T00:00:00`);
      return zone.untils.flatMap((until, index) => {
        const seconds = Math.round(-zone.offsets[index] * 60) || 0;
        const start = Math.max(index === 0 ? -Infinity : zone.untils[index - 1], from - seconds * 1000);
        const end = Math.min(until, from + 86400000 - seconds * 1000);
        return start < end ? [{ startUtcMs: start, endUtcMs: end, startInclusive: true, endInclusive: false, offsetSeconds: seconds }] : [];
      });
    },
    possibleInstants(local, name) {
      const zone = zones.get(name);
      if (!zone) throw new CalendarProviderError('UNSUPPORTED_TIMEZONE', `Unknown timezone: ${name}`);
      const coordinateMs = civilCoordinate(local);
      return [...new Set(zone.offsets.map(minutes => Math.round(-minutes * 60)))]
        .map(offset => coordinateMs - offset * 1000)
        .filter(instant => instant + offsetSeconds(instant, name) * 1000 === coordinateMs)
        .sort((a, b) => a - b);
    },
  };
}
