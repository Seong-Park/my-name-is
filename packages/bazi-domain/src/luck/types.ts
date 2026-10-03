import type { UtcInstantMilliseconds } from '../birth/normalization';
import type { FieldResolution } from '../chart/calculation';
import type { JudgmentMeta } from '../chart/evidence';
import type { Ganzhi, Stem, YinYang } from '../ganzhi/types';
import type { BaziRelation } from '../relations/types';
import type { PillarPosition } from '../chart/pillars';

export type LuckDirection = 'forward' | 'reverse';
export type ReferenceJie = '입춘' | '경칩' | '청명' | '입하' | '망종' | '소서' | '입추' | '백로' | '한로' | '입동' | '대설' | '소한';

/** 범위 순서·후보 유일성과 수치 정합성은 M9에서 검증한다. */
export type LuckResolution<T> =
  | { status: 'confirmed'; value: T; min?: never; max?: never; candidates?: never; reason?: never }
  | { status: 'range'; min: T; max: T; value?: never; candidates?: never; reason?: never }
  | { status: 'ambiguous'; candidates: readonly [T, T, ...T[]]; value?: never; min?: never; max?: never; reason?: never }
  | { status: 'unavailable'; reason: string; value?: never; min?: never; max?: never; candidates?: never };

export interface LuckDirectionValue extends JudgmentMeta {
  direction: LuckDirection;
  yearPillar: Ganzhi;
  yearStem: Stem;
  yearStemYinYang: YinYang;
  sexForBazi: 'male' | 'female';
  monthPillar: Ganzhi;
  firstDaeunPillar: Ganzhi;
}

/** 원시 간격·360일제 상징 나이·표시 구성요소를 모두 보존한다. */
export interface LuckStartAgeValue extends JudgmentMeta {
  calendarVersion: string;
  direction: LuckDirection;
  birthInstantUtcMs: UtcInstantMilliseconds;
  referenceTerm: ReferenceJie;
  referenceTermInstantUtcMs: UtcInstantMilliseconds;
  deltaSeconds: number;
  symbolicAgeYears: number;
  exactSymbolicDays: number;
  wholeSymbolicDays: number;
  fractionalSymbolicDay: number;
  years: number;
  months: number;
  days: number;
}

export type LuckStartAge = LuckResolution<LuckStartAgeValue>;

export interface FirstLuckStartDateValue {
  /** 출생지 Gregorian 민간 날짜 YYYY-MM-DD. UTC instant가 아니다. */
  date: string;
  birthCivilDate: string;
  timezoneId: string;
  calendarMappingVersion: string;
  /** 날짜 매핑에 실제 사용한 상징 나이와 절입 근거. */
  luckStartAge: LuckStartAgeValue;
}
export type FirstLuckStartDate = LuckResolution<FirstLuckStartDateValue>;

/** 양 끝 연도를 포함한다. 정수·지원 범위·순서 검사는 호출 경계 책임이다. */
export interface SeunYearRange { startYear: number; endYearInclusive: number }

export interface LuckSettings {
  seunYearRange: SeunYearRange;
  direction: FieldResolution<LuckDirectionValue>;
  luckStartAge: LuckStartAge;
  firstLuckStartDate: FirstLuckStartDate;
}

/** [startDate, nextStartDate). 포함 종료일은 ViewModel에서 계산한다. */
export interface LuckDateInterval {
  startDate: string;
  nextStartDate: string;
  timezoneId: string;
  calendarMappingVersion: string;
}

/** 간지가 확정되어도 날짜는 범위/후보/불가일 수 있다. index는 0부터 시작한다. */
export type LuckPeriod = JudgmentMeta & {
  pillar: FieldResolution<Ganzhi>;
  dates: LuckResolution<LuckDateInterval>;
} & (
  | { kind: 'daeun'; index: number; year?: never }
  | { kind: 'seun'; year: number; index?: never }
);

export type LuckInteractionSource =
  | { kind: 'natal'; position: PillarPosition }
  | { kind: 'daeun'; index: number }
  | { kind: 'seun'; year: number };

/** 원국 관계의 종류·글자·인원수 계약을 유지하며 참여자의 시간 계층을 추가한다. */
type WithLuckSources<R extends BaziRelation> = R extends BaziRelation
  ? Omit<R, 'members'> & { members: LuckMembers<R['members']> }
  : never;
type LuckMembers<T extends readonly { character: unknown }[]> = {
  readonly [K in keyof T]: { source: LuckInteractionSource; character: T[K]['character'] }
};
export type LuckInteraction = WithLuckSources<BaziRelation>;
