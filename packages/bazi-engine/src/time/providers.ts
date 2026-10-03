import type { BirthInstantInterval, CalculationVersions, ReferenceJie } from '@mylife/bazi-domain';

export interface TimeZoneProvider {
  possibleInstants(local: string, zone: string): readonly number[];
  /** 민간 시각 = UTC + offsetSeconds. */
  offsetSeconds(instantUtcMs: number, zone: string): number;
  /** 고정 tzdb 전환을 모두 열거한 민간 날짜의 일정-offset 구간. unknown 계산에 필수다. */
  civilDateIntervals?(date: string, zone: string): readonly BirthInstantInterval[];
}

export interface LunarProvider {
  toSolar(date: string, leap: boolean): string;
}

export interface AstronomyProvider {
  /** 겉보기 태양시 − 평균 태양시, 초. UTC+EoT는 연속·단조 증가해야 한다. */
  equationOfTimeSeconds(instantUtcMs: number): number;
  /** 구간 내부 경계와 이를 감싸는 직전/직후 절을 포함한다. 정각은 중복하지 않는다. */
  jieInstants(fromUtcMs: number, toUtcMs: number): readonly JieInstant[];
}

export interface JieInstant {
  readonly code: ReferenceJie;
  readonly instantUtcMs: number;
  /** 통합 엔진은 물리적인 12절과 0~86400초의 오차만 지원한다. */
  readonly uncertaintySeconds: number;
}

export { createTimeZoneProvider } from './timezone-provider';
export { createLunarProvider } from './lunar-provider';
export { createAstronomyProvider } from './astronomy-provider';

export interface CalendarContext {
  readonly timezone: TimeZoneProvider;
  readonly astronomy: AstronomyProvider;
  readonly lunar: LunarProvider;
  readonly versions: Readonly<CalculationVersions>;
  /** 출생 민간 날짜의 공통 검증 범위. 공급자의 경계 보조 자료 범위와 별개다. */
  readonly supportedRange: {
    readonly from: string;
    readonly to: string;
    readonly calendar: 'proleptic-gregorian';
  };
  readonly uncertainty: {
    /** 0~86400초. 인접 절입만으로 안전하게 후보를 열거할 수 있는 지원 한도다. */
    readonly jieSeconds: number;
    readonly equationOfTimeSeconds: number;
    readonly basis: 'engineering-budget-not-certified-bound';
  };
  readonly limitations: readonly string[];
}
