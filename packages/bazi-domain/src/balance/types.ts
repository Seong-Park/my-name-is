import type { AnalysisInputState } from '../chart/analysis';
import type { EvidenceItem, JudgmentMeta } from '../chart/evidence';
import type { Element } from '../ganzhi/types';
import type { TenGod } from '../ten-gods/types';
import type { StrengthClass, StrengthResult } from '../structure/strength';

export type BalanceMethod = 'johu' | 'eokbu' | 'tonggwan' | 'byeongyak';

/** 특정 천간을 오행으로 축약하지 않는다. 런타임 규칙표는 M2가 소유한다. */
export type BalanceTarget =
  | { element: 'wood'; stem?: '甲' | '乙' }
  | { element: 'fire'; stem?: '丙' | '丁' }
  | { element: 'earth'; stem?: '戊' | '己' }
  | { element: 'metal'; stem?: '庚' | '辛' }
  | { element: 'water'; stem?: '壬' | '癸' };

export interface BalanceCandidate extends Pick<JudgmentMeta, 'ruleCode' | 'rulesetVersion'> {
  method: BalanceMethod;
  target: BalanceTarget;
  role: 'yongshin_candidate' | 'heeshin_candidate' | 'gishin_candidate' | 'neutral' | 'conditional';
  status: 'candidate' | 'selected' | 'rejected';
  /** 근거 있는 규칙이 정한 순위만 기록하며 전역 방법 우선순위가 아니다. */
  priority?: number;
  supportingEvidence: readonly [EvidenceItem, ...EvidenceItem[]];
  conflictingEvidence: readonly EvidenceItem[];
  conditions: readonly string[];
  limitations: readonly string[];
}

interface BalanceForce {
  element: Element;
  evidence: readonly [EvidenceItem, ...EvidenceItem[]];
}

/** 적용조건 진단과 실제 후보는 별개다. 단순 오행 존재를 판정으로 바꾸지 않는다. */
export interface BalanceDiagnoses {
  johu: { conditions: readonly string[]; evidence: readonly [EvidenceItem, ...EvidenceItem[]] };
  eokbu: {
    /** 부분/잠정/중화 불확실 상태는 applicable로 승격하지 않는다. */
    strength: StrengthResult & { status: 'confirmed'; strengthClass: Exclude<StrengthClass, 'balanced_or_uncertain'> };
    /** 생부/방부/설/모/극 범주의 검색 공간이며 후보 목록이 아니다. */
    searchSpace: readonly TenGod[];
    reviewedConditions: readonly string[];
    evidence: readonly [EvidenceItem, ...EvidenceItem[]];
  };
  tonggwan: {
    conflictingForces: readonly [BalanceForce, BalanceForce, ...BalanceForce[]];
    bridgeElement: Element;
    evidence: readonly [EvidenceItem, ...EvidenceItem[]];
  };
  byeongyak: {
    disease: { code: string; evidence: readonly [EvidenceItem, ...EvidenceItem[]] };
    remedy: { target: BalanceTarget; evidence: readonly [EvidenceItem, ...EvidenceItem[]] };
  };
}

export type BalanceMethodResultFor<M extends BalanceMethod> = JudgmentMeta & {
  method: M;
  input: AnalysisInputState;
} & (
  | {
      status: 'applicable'; candidates: readonly (BalanceCandidate & { method: M })[];
      diagnosis: BalanceDiagnoses[M]; evidence: readonly [EvidenceItem, ...EvidenceItem[]];
      limitations: readonly string[];
    }
  | {
      status: 'not_applicable' | 'insufficient_data' | 'unsupported' | 'not_evaluated';
      candidates: readonly []; diagnosis: null; limitations: readonly [string, ...string[]];
    }
  | (M extends 'eokbu' ? {
      status: 'suspended_due_to_special_pattern'; candidates: readonly []; diagnosis: null;
      limitations: readonly [string, ...string[]];
    } : never)
);

export type BalanceMethodResult = {
  [M in BalanceMethod]: BalanceMethodResultFor<M>
}[BalanceMethod];

/** 직렬화 순서만 고정한다. 네 방법의 우선순위나 적용 순서가 아니다. */
export type BalanceMethodResults = readonly [
  BalanceMethodResultFor<'johu'>, BalanceMethodResultFor<'eokbu'>,
  BalanceMethodResultFor<'tonggwan'>, BalanceMethodResultFor<'byeongyak'>,
];

/** 후보 채택과 별도로 최종 선택 규칙·버전·근거를 보존한다. */
export interface PrimaryYongshin extends JudgmentMeta {
  candidate: BalanceCandidate & { role: 'yongshin_candidate'; status: 'selected' };
  evidence: readonly [EvidenceItem, ...EvidenceItem[]];
}

export type BalanceResult = JudgmentMeta & {
  methodResults: BalanceMethodResults;
  heeshinCandidates: readonly (BalanceCandidate & { role: 'heeshin_candidate' })[];
  gishinCandidates: readonly (BalanceCandidate & { role: 'gishin_candidate' })[];
  otherCandidates: readonly (BalanceCandidate & { role: 'neutral' | 'conditional' })[];
  supportingEvidence: readonly EvidenceItem[];
  conflictingEvidence: readonly EvidenceItem[];
  limitations: readonly string[];
} & (
  | {
      input: Extract<AnalysisInputState, { completeness: 'complete' }>;
      specialPatternStatus: 'clear'; resolutionStatus: 'resolved'; primaryYongshin: PrimaryYongshin;
    }
  | ({
      input: AnalysisInputState;
      specialPatternStatus: 'clear' | 'special_review' | 'unsupported_special_pattern' | 'not_evaluated';
      primaryYongshin: null;
    } & (
      | { resolutionStatus: 'aligned'; supportingEvidence: readonly [EvidenceItem, ...EvidenceItem[]] }
      | { resolutionStatus: 'conflict'; conflictingEvidence: readonly [EvidenceItem, ...EvidenceItem[]] }
      | { resolutionStatus: 'unresolved' }
    ))
);
