import type { TimeNormalizationResult } from '../birth/normalization';
import type { Ganzhi } from '../ganzhi/types';
import type { EvidenceItem } from './evidence';
import type { PillarPosition } from './pillars';

/** 각 항목의 값 확정 여부. 후보의 중복 제거·동일성 판정은 엔진 책임이다. */
export type FieldResolution<T> =
  | { status: 'confirmed'; value: T; candidates?: never; reason?: never }
  | { status: 'ambiguous'; candidates: readonly [T, T, ...T[]]; value?: never; reason?: never }
  | { status: 'unavailable'; reason: string; value?: never; candidates?: never };

export interface CalculationVersions {
  engineVersion: string;
  rulesetVersion: string;
  /** 절입·균시차 공급자의 데이터/알고리즘 버전. */
  calendarVersion: string;
  timezoneVersion: string;
  /** 음력 변환을 사용하지 않았다면 null. */
  lunarCalendarVersion: string | null;
}

type ResolvedPillars = Record<PillarPosition, FieldResolution<Ganzhi>>;
type ConfirmedPillars = Record<PillarPosition, Extract<FieldResolution<Ganzhi>, { status: 'confirmed' }>>;
type KnownTimeResult =
  | { completeness: 'complete'; pillars: ConfirmedPillars }
  | { completeness: 'partial'; pillars: ResolvedPillars };

/** M3 전용 결과. 입력 정확도·UTC 후보 수·각 기둥 확정 여부는 별개다. */
export type FourPillarsCalculationResult = {
  versions: CalculationVersions;
  evidence: readonly EvidenceItem[];
} & (
  | ({
      inputAccuracy: 'exact';
      normalization: Extract<TimeNormalizationResult, { kind: 'instant' }>;
      limitations: readonly string[];
    } & KnownTimeResult)
  | ({
      inputAccuracy: 'approximate';
      normalization: Extract<TimeNormalizationResult, { kind: 'instant' }>;
      /** 대표시각 계산은 최소 한 가지 제한을 명시한다. */
      limitations: readonly [string, ...string[]];
    } & KnownTimeResult)
  | {
      inputAccuracy: 'unknown';
      completeness: 'partial';
      normalization: Extract<TimeNormalizationResult, { kind: 'interval' }>;
      pillars: Omit<ResolvedPillars, 'hour'> & {
        hour: Extract<FieldResolution<Ganzhi>, { status: 'unavailable' }>;
      };
      limitations: readonly string[];
    }
);

/** 엔진 예외가 준수할 형태만 정의한다. 런타임 Error 클래스는 엔진 책임이다. */
export interface CalculationError extends Error {
  code:
    | 'INVALID_INPUT'
    | 'DST_GAP'
    | 'OFFSET_MISMATCH'
    | 'UNSUPPORTED_DATE'
    | 'UNSUPPORTED_TIMEZONE'
    | 'PROVIDER_FAILURE';
}
