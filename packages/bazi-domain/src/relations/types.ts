import type { AnalysisResult } from '../chart/analysis';
import type { JudgmentMeta } from '../chart/evidence';
import type { PillarPosition } from '../chart/pillars';
import type { Branch, Element, Stem } from '../ganzhi/types';

export interface RelationMember<T extends Stem | Branch> {
  position: PillarPosition;
  character: T;
}

type Pair<T> = readonly [T, T];
type Triple<T> = readonly [T, T, T];

/** 발생한 관계와 합화 평가는 독립이다. 위치 중복·규칙 일치는 엔진에서 검사한다. */
export type BaziRelation = JudgmentMeta & {
  transformation: AnalysisResult<Element | null>;
} & (
  | { layer: 'stem'; kind: 'combination'; members: Pair<RelationMember<Stem>> }
  | { layer: 'branch'; kind: 'liuhe' | 'clash' | 'break' | 'harm' | 'self_punishment'; members: Pair<RelationMember<Branch>> }
  | { layer: 'branch'; kind: 'sanhe' | 'fanghe'; members: Triple<RelationMember<Branch>> }
  | { layer: 'branch'; kind: 'punishment'; members: Pair<RelationMember<Branch>> | Triple<RelationMember<Branch>> }
);
