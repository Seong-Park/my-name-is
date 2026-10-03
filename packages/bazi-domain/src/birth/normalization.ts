import type { EvidenceItem } from '../chart/evidence';

/** 실제 시간축의 UTC epoch milliseconds. 유효 범위는 엔진에서 검사한다. */
export type UtcInstantMilliseconds = number;

/** 시간대가 부여되지 않은 달력 좌표. UTC instant 또는 Date 객체가 아니다. */
export interface CivilDateTime {
  date: string;
  time: string;
}

export interface BirthInstantCandidate {
  instantUtcMs: UtcInstantMilliseconds;
  /** 지역 민간 시각 = UTC + offsetSeconds. 역사적 offset/DST를 이미 포함한다. */
  offsetSeconds: number;
}

/** 시간대 전환점으로 분할한 일정 offset 구간. 끝점 포함 여부를 보존한다. */
export interface BirthInstantInterval {
  startUtcMs: UtcInstantMilliseconds;
  endUtcMs: UtcInstantMilliseconds;
  startInclusive: boolean;
  endInclusive: boolean;
  offsetSeconds: number;
}

/** 시간대 해석 단계의 중간 결과. gap은 빈 후보가 아닌 CalculationError다. */
export type BirthInstantResolution =
  | { kind: 'instant'; candidates: readonly [BirthInstantCandidate, ...BirthInstantCandidate[]]; intervals?: never }
  | { kind: 'interval'; intervals: readonly [BirthInstantInterval, ...BirthInstantInterval[]]; candidates?: never };

export interface NormalizedCandidate extends BirthInstantCandidate {
  /** UTC 기준 경도 보정 = 경도(동쪽 양수) × 240초. offset을 재차감하지 않는다. */
  longitudeSeconds: number;
  /** 겉보기 태양시 - 평균 태양시. UTC + 경도 보정 + 균시차로 태양시 좌표를 얻는다. */
  equationOfTimeSeconds: number;
  trueSolarTime: CivilDateTime;
  evidence: readonly EvidenceItem[];
}

/** 끝점은 구간의 경계이며 실제 출생시각으로 선택된 값이 아니다. */
export interface NormalizedInterval {
  start: NormalizedCandidate;
  end: NormalizedCandidate;
  startInclusive: boolean;
  endInclusive: boolean;
}

/** unknown의 구간 내부 경계 탐색은 엔진 책임이며 끝점 보정의 선형 보간을 뜻하지 않는다. */
export type TimeNormalizationResult = {
  solarDate: string;
  timezoneId: string;
  evidence: readonly EvidenceItem[];
} & (
  | { kind: 'instant'; candidates: readonly [NormalizedCandidate, ...NormalizedCandidate[]]; intervals?: never }
  | { kind: 'interval'; intervals: readonly [NormalizedInterval, ...NormalizedInterval[]]; candidates?: never }
);
