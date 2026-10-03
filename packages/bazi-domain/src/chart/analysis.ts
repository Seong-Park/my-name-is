import type { EvidenceItem, JudgmentMeta } from './evidence';
import type { PillarPosition } from './pillars';

export type AnalysisInputState =
  | { completeness: 'complete'; missingPillars: readonly []; uncertainPillars: readonly [] }
  | { completeness: 'partial'; missingPillars: readonly PillarPosition[]; uncertainPillars: readonly PillarPosition[] };

/** 평가한 결과에는 근거가 필요하다. 미평가/미지원은 빈 결과로 가장하지 않는다. */
export type AnalysisResult<T> = JudgmentMeta & (
  | {
      status: 'evaluated'; input: Extract<AnalysisInputState, { completeness: 'complete' }>;
      data: T; evidence: readonly [EvidenceItem, ...EvidenceItem[]]; limitations: readonly string[];
    }
  | {
      status: 'partial'; input: Extract<AnalysisInputState, { completeness: 'partial' }>;
      data: T; evidence: readonly [EvidenceItem, ...EvidenceItem[]]; limitations: readonly [string, ...string[]];
    }
  | {
      status: 'unsupported' | 'not_evaluated' | 'insufficient_data'; input: AnalysisInputState;
      data: null; limitations: readonly [string, ...string[]];
    }
);
