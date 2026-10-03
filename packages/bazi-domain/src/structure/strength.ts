import type { AnalysisInputState } from '../chart/analysis';
import type { FieldResolution } from '../chart/calculation';
import type { EvidenceItem, JudgmentMeta, QualitativeJudgmentMeta } from '../chart/evidence';
import type { Branch, Stem } from '../ganzhi/types';
import type { TenGodResult } from '../ten-gods/types';
import type { ExposureResult, RootingResult } from './rooting';

export type StrengthClass = 'very_weak' | 'weak' | 'balanced_or_uncertain' | 'strong' | 'very_strong';

export interface StrengthObservations {
  dayMaster: FieldResolution<Stem>;
  seasonal: {
    monthBranch: FieldResolution<Branch>;
    /** 계절/왕쇠 코드는 채택한 버전별 계절표에서 정의한다. */
    season: FieldResolution<string>;
    dayMasterSeasonalState: FieldResolution<string>;
    hasSeasonalSupport: FieldResolution<boolean>;
    seasonalEvidence: readonly EvidenceItem[];
  };
  roots: readonly RootingResult[];
  exposures: readonly ExposureResult[];
  peerSupport: readonly TenGodResult[];
  resourceSupport: readonly TenGodResult[];
  outputDrain: readonly TenGodResult[];
  wealthExpenditure: readonly TenGodResult[];
  controlPressure: readonly TenGodResult[];
}

/** 내부 축별 진단이며 사용자 점수나 확률이 아니다. 계수는 여기서 정하지 않는다. */
export type StrengthDiagnostics = Partial<Record<
  'seasonalSupport' | 'rootSupport' | 'peerSupport' | 'resourceSupport'
  | 'outputPressure' | 'wealthPressure' | 'controlPressure', number
>>;

export type StrengthResult = JudgmentMeta & {
  observations: StrengthObservations;
  interactionEvidence: readonly EvidenceItem[];
  diagnostics?: StrengthDiagnostics;
} & (
  | {
      status: 'confirmed' | 'provisional';
      input: Extract<AnalysisInputState, { completeness: 'complete' }>;
      strengthClass: StrengthClass; confidence: QualitativeJudgmentMeta['confidence'];
      evidence: readonly [EvidenceItem, ...EvidenceItem[]]; limitations: readonly string[];
      possibleStrengthClasses?: never;
    }
  | {
      status: 'partial'; input: Extract<AnalysisInputState, { completeness: 'partial' }>;
      strengthClass: null; possibleStrengthClasses: readonly StrengthClass[];
      confidence: QualitativeJudgmentMeta['confidence'];
      evidence: readonly [EvidenceItem, ...EvidenceItem[]]; limitations: readonly [string, ...string[]];
    }
  | {
      status: 'unsupported' | 'not_evaluated'; input: AnalysisInputState;
      strengthClass: null; confidence: null; possibleStrengthClasses?: never;
      limitations: readonly [string, ...string[]];
    }
);
