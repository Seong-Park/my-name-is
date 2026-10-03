import type { NatalBirthInput } from '../birth/input';
import type { PillarPosition } from './pillars';
import type { HiddenStemSource } from '../ten-gods/types';

/** 계산 입력 snapshot 또는 원국의 관측 위치를 가리킨다. */
export type EvidenceReference =
  | { kind: 'input'; field: keyof NatalBirthInput }
  | { kind: 'pillar'; position: PillarPosition; component: 'stem' | 'branch' }
  | ({ kind: 'hidden_stem' } & HiddenStemSource);

export interface EvidenceItem {
  ruleCode: string;
  rulesetVersion: string;
  references: readonly EvidenceReference[];
}

/** 근거의 유무와 확정 가능 여부는 개별 판정 상태 계약에서 검증한다. */
export interface JudgmentMeta {
  ruleCode: string;
  rulesetVersion: string;
  evidence: readonly EvidenceItem[];
}

/** 해당 규칙에서 검증된 내부 수치만 사용한다. 통계적 확률을 뜻하지 않는다. */
export interface NumericJudgmentMeta extends JudgmentMeta {
  score?: number;
  confidence?: number;
}

/** ADR-004의 정성적 신뢰도. 숫자형 메타데이터와 혼합하지 않는다. */
export interface QualitativeJudgmentMeta extends JudgmentMeta {
  confidence: 'high' | 'medium' | 'low';
}
