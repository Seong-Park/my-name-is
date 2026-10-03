import type { TwelveStageResult, ShinsalResult, KinshipResult, PalaceResult } from '../auxiliary/types';
import type { BalanceResult } from '../balance/types';
import type { LuckSettings, LuckPeriod, LuckInteraction } from '../luck/types';
import type { BaziRelation } from '../relations/types';
import type { StructureResult } from '../structure/pattern';
import type { RootingResult, ExposureResult } from '../structure/rooting';
import type { FundamentalsResult, HiddenStemResult, TenGodResult } from '../ten-gods/types';
import type { AnalysisResult } from './analysis';
import type { FourPillarsCalculationResult } from './calculation';

/** 전체 파이프라인의 계약. M3 함수는 FourPillarsCalculationResult만 반환한다.
 * 배열 구획도 미평가(null)와 평가 후 빈 결과([])를 구별한다.
 * 구획 사이 버전·후보·입력 상태 일치와 참조 무결성은 파이프라인에서 검증한다.
 */
export type BaziCalculationResult = FourPillarsCalculationResult & {
  fundamentals: FundamentalsResult;
  hiddenStems: AnalysisResult<readonly HiddenStemResult[]>;
  tenGods: AnalysisResult<readonly TenGodResult[]>;
  relations: AnalysisResult<readonly BaziRelation[]>;
  rooting: AnalysisResult<readonly RootingResult[]>;
  exposures: AnalysisResult<readonly ExposureResult[]>;
  structure: StructureResult;
  balance: BalanceResult;
  twelveStages: AnalysisResult<readonly TwelveStageResult[]>;
  shinsal: AnalysisResult<readonly ShinsalResult[]>;
  kinship: AnalysisResult<readonly KinshipResult[]>;
  palace: AnalysisResult<readonly PalaceResult[]>;
  luckSettings: LuckSettings;
  daeun: AnalysisResult<readonly Extract<LuckPeriod, { kind: 'daeun' }>[]>;
  seun: AnalysisResult<readonly Extract<LuckPeriod, { kind: 'seun' }>[]>;
  luckInteractions: AnalysisResult<readonly LuckInteraction[]>;
};
