import {
  Body, MakeTime, GeoVector, RotateVector, Rotation_EQJ_EQD, EquatorFromVector, SiderealTime, SearchSunLongitude,
} from 'astronomy-engine';
import type { AstronomyProvider, JieInstant } from './providers';
import { assertInstant, CalendarProviderError } from './provider-errors';

const QUERY_FROM = Date.UTC(1899, 11, 30);
const QUERY_TO_EXCLUSIVE = Date.UTC(2027, 0, 3);

function astronomyCall<T>(calculate: () => T): T {
  try {
    return calculate();
  } catch (error) {
    if (error instanceof CalendarProviderError) throw error;
    throw new CalendarProviderError('PROVIDER_FAILURE', 'Astronomy backend failed', { cause: error });
  }
}

// 1월~12월 절: 태양의 겉보기 황경 285°,315°,...255°. 날짜는 검색 창일 뿐 경계값이 아니다.
const MONTH_JIE = ['소한', '입춘', '경칩', '청명', '입하', '망종', '소서', '입추', '백로', '한로', '입동', '대설'] as const;

export function createAstronomyProvider(): AstronomyProvider {
  const years = new Map<number, readonly JieInstant[]>();
  function yearTerms(year: number): readonly JieInstant[] {
    const cached = years.get(year);
    if (cached) return cached;
    const terms = MONTH_JIE.map((code, month) => {
      const found = astronomyCall(() => SearchSunLongitude((285 + month * 30) % 360, new Date(Date.UTC(year, month, 1)), 20));
      if (!found || !Number.isFinite(found.date.getTime())) throw new CalendarProviderError('PROVIDER_FAILURE', `Solar longitude search failed: ${year} ${code}`);
      return { code, instantUtcMs: found.date.getTime(), uncertaintySeconds: 1800 };
    });
    years.set(year, terms);
    return terms;
  }
  return {
    jieInstants(fromUtcMs, toUtcMs) {
      assertInstant(fromUtcMs, QUERY_FROM, QUERY_TO_EXCLUSIVE);
      assertInstant(toUtcMs, QUERY_FROM, QUERY_TO_EXCLUSIVE);
      if (fromUtcMs > toUtcMs) throw new CalendarProviderError('INVALID_INPUT', 'Reversed astronomy interval');
      const fromYear = new Date(fromUtcMs).getUTCFullYear();
      const toYear = new Date(toUtcMs).getUTCFullYear();
      const terms: JieInstant[] = [];
      for (let year = Math.max(1899, fromYear - 1); year <= Math.min(2027, toYear + 1); year++) {
        terms.push(...yearTerms(year));
      }
      const after = terms.findIndex(term => term.instantUtcMs > fromUtcMs);
      const first = after === -1 ? terms.length - 1 : after - 1;
      const last = terms.findIndex(term => term.instantUtcMs >= toUtcMs);
      return terms.slice(first, last + 1).map(term => ({ ...term }));
    },
    equationOfTimeSeconds(instantUtcMs) {
      assertInstant(instantUtcMs, QUERY_FROM, QUERY_TO_EXCLUSIVE);
      return astronomyCall(() => {
        const time = MakeTime(new Date(instantUtcMs));
        const sun = RotateVector(Rotation_EQJ_EQD(time), GeoVector(Body.Sun, time, true));
        const raHours = EquatorFromVector(sun).ra;
        const utcHours = ((instantUtcMs % 86400000) + 86400000) % 86400000 / 3600000;
        const difference = SiderealTime(time) - raHours + 12 - utcHours;
        return (((difference + 12) % 24 + 24) % 24 - 12) * 3600;
      });
    },
  };
}
