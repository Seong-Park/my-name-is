import type { AnalysisResult } from '../chart/analysis';
import type { FieldResolution } from '../chart/calculation';
import type { EvidenceReference } from '../chart/evidence';
import type { PillarPosition } from '../chart/pillars';
import type { Branch, Stem } from '../ganzhi/types';
import type { StemSource, TenGod } from '../ten-gods/types';

export type TwelveStage = '長生' | '沐浴' | '冠帶' | '建祿' | '帝旺' | '衰'
  | '病' | '死' | '墓' | '絶' | '胎' | '養';

/** 배속표·음간/토간 정책은 M2의 채택 규칙을 따른다. 여기서는 결과만 정의한다. */
export type TwelveStageResult = AnalysisResult<{
  dayMaster: Stem;
  position: PillarPosition;
  branch: Branch;
  stage: TwelveStage;
}>;

/** code는 M2 신살 지원 목록의 규칙 식별자. 미지원과 탐지 결과 false를 구분한다. */
export type ShinsalResult = AnalysisResult<{ code: string } & (
  | { detected: true; members: readonly [EvidenceReference, ...EvidenceReference[]]; activation: FieldResolution<string> }
  | { detected: false; members: readonly []; activation: null }
)>;

/** 육친 배속은 ruleset의 roleCode로 보존하며 관계 당사자의 실제 존재를 단정하지 않는다. */
export type KinshipResult = AnalysisResult<{
  roleCode: string;
  tenGod: TenGod;
  source: StemSource;
}>;

export type PalaceResult = AnalysisResult<{
  position: PillarPosition;
  domainCodes: readonly string[];
  observations: readonly EvidenceReference[];
}>;
