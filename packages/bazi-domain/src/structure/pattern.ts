import type { AnalysisResult } from '../chart/analysis';
import type { FieldResolution } from '../chart/calculation';
import type { EvidenceItem, JudgmentMeta } from '../chart/evidence';
import type { PillarPosition } from '../chart/pillars';
import type { HiddenStemSource, TenGod } from '../ten-gods/types';
import type { StrengthResult } from './strength';

export type GeneralPatternTenGod = Exclude<TenGod, 'peer' | 'rob_wealth'>;
export type MonthHiddenStemSource = HiddenStemSource & { position: 'month' };
export type PatternExposurePosition = Exclude<PillarPosition, 'day'>;

/** 승인된 v1 후보 모델. 성격·파격·구제 규칙을 구현한 것으로 취급하지 않는다. */
export type PatternCandidate = Pick<JudgmentMeta, 'ruleCode' | 'rulesetVersion'> & {
  id: string;
  source: MonthHiddenStemSource;
  formationStatus: 'not_evaluated';
  supportingEvidence: readonly [EvidenceItem, ...EvidenceItem[]];
  conflictingEvidence: readonly EvidenceItem[];
  limitations: readonly string[];
} & (
  | { patternFamily: 'general'; tenGod: GeneralPatternTenGod; specialReview?: never }
  | { patternFamily: 'special-month-structure'; tenGod: 'peer' | 'rob_wealth'; specialReview: true }
) & (
  | { candidateSource: 'month-hidden-stem-exposure'; exposureStatus: 'exposed'; exposedPillars: readonly [PatternExposurePosition, ...PatternExposurePosition[]] }
  | {
      candidateSource: 'month-main-qi-fallback'; source: MonthHiddenStemSource & { role: 'main' };
      exposureStatus: 'not_exposed'; exposedPillars: readonly [];
    }
) & (
  | { candidateStatus: 'candidate'; preferenceEvidence?: never; rejectionReason?: never }
  | { candidateStatus: 'preferred'; preferenceEvidence: readonly [EvidenceItem, ...EvidenceItem[]]; rejectionReason?: never }
  | { candidateStatus: 'rejected'; rejectionReason: string; preferenceEvidence?: never }
);

export interface PatternAnalysis {
  /** 격국의 기준 기운이며 균형 용신의 target과 다른 계약이다. */
  patternBasis: FieldResolution<MonthHiddenStemSource>;
  patternSupport: readonly EvidenceItem[];
  patternCandidates: readonly PatternCandidate[];
  preferredCandidate: Extract<PatternCandidate, { candidateStatus: 'preferred' }> | null;
  confirmedPattern: null;
  /** 입력 완전성/평가 상태와 독립적인 특수격 검토 상태. */
  reviewStatus: 'general' | 'special_review' | 'unsupported_special_pattern';
  suspectedPatterns: readonly {
    code: string;
    evidence: readonly [EvidenceItem, ...EvidenceItem[]];
    limitations: readonly string[];
  }[];
  possibleCandidates: readonly PatternCandidate[];
}

export type PatternResult = AnalysisResult<PatternAnalysis>;

export interface StructureResult {
  strength: StrengthResult;
  pattern: PatternResult;
}
