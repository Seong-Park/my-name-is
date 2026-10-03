import type { AnalysisResult } from '../chart/analysis';
import type { FieldResolution } from '../chart/calculation';
import type { JudgmentMeta } from '../chart/evidence';
import type { PillarPosition } from '../chart/pillars';
import type { Branch, Element, Stem, YinYang } from '../ganzhi/types';

export type TenGod =
  | 'peer' | 'rob_wealth' | 'eating_god' | 'hurting_officer'
  | 'direct_wealth' | 'indirect_wealth' | 'direct_officer' | 'seven_killings'
  | 'direct_resource' | 'indirect_resource';
export type HiddenStemRole = 'main' | 'middle' | 'residual';

export interface HiddenStemSource {
  position: PillarPosition;
  branch: Branch;
  stem: Stem;
  role: HiddenStemRole;
}

export type StemSource =
  | { kind: 'visible_stem'; position: PillarPosition; stem: Stem }
  | ({ kind: 'hidden_stem' } & HiddenStemSource);

export interface HiddenStemResult extends JudgmentMeta {
  source: HiddenStemSource;
  /** 채택 규칙의 배분 단위. 강약 점수로 해석하지 않으며 미평가면 null. */
  weight: { value: number; unit: string } | null;
}

export interface TenGodResult extends JudgmentMeta {
  source: StemSource;
  dayMaster: Stem;
  tenGod: TenGod;
}

export type ComponentObservation = {
  position: PillarPosition;
  element: Element;
  yinYang: YinYang;
} & (
  | { component: 'stem'; character: Stem }
  | { component: 'branch'; character: Branch }
);

/** 관측 가능한 위치만 보존한다. 누락 위치는 input에 기록한다. */
export type FundamentalsResult = AnalysisResult<{
  dayMaster: FieldResolution<Stem>;
  monthCommand: FieldResolution<Branch>;
  components: readonly ComponentObservation[];
}>;
