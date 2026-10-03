import type { AnalysisResult } from '../chart/analysis';
import type { FieldResolution } from '../chart/calculation';
import type { JudgmentMeta } from '../chart/evidence';
import type { PillarPosition } from '../chart/pillars';
import type { Stem } from '../ganzhi/types';
import type { HiddenStemSource } from '../ten-gods/types';

export interface RootEvidence extends JudgmentMeta {
  source: HiddenStemSource;
  /** ruleset이 정의하는 통근 유형·깊이 코드. 미검증 등급이나 가중치를 고정하지 않는다. */
  rootType: string;
  rootDepth: FieldResolution<string>;
}

export type RootingResult = AnalysisResult<{
  target: { position: PillarPosition; stem: Stem };
  roots: readonly RootEvidence[];
}>;

/** 일반 투간 관측. 격국 후보의 일간 제외 정책은 PatternCandidate에서 적용한다. */
export type ExposureResult = AnalysisResult<{
  source: HiddenStemSource;
  exposedPillars: readonly PillarPosition[];
}>;
