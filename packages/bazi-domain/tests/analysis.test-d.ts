import type {
  AnalysisResult, FundamentalsResult, HiddenStemResult, TenGodResult,
  EvidenceItem, AnalysisInputState,
} from '../src/index';
import type { BaziRelation, RootingResult, ExposureResult } from '../src/index';
import type { StrengthResult, StrengthObservations } from '../src/index';
import type { PatternCandidate, PatternResult, StructureResult } from '../src/index';
import type { BalanceCandidate, BalanceMethodResult, BalanceResult, BalanceTarget } from '../src/index';
import type { TwelveStageResult, ShinsalResult, KinshipResult, PalaceResult } from '../src/index';

const evidence: EvidenceItem = {
  ruleCode: 'TEST', rulesetVersion: 'test-v1',
  references: [{ kind: 'pillar', position: 'month', component: 'branch' }],
};
const complete: AnalysisInputState = { completeness: 'complete', missingPillars: [], uncertainPillars: [] };
const incomplete: AnalysisInputState = { completeness: 'partial', missingPillars: ['hour'], uncertainPillars: [] };
const meta = { ruleCode: 'TEST', rulesetVersion: 'test-v1', evidence: [evidence] as const, limitations: [] as const };
const hidden: HiddenStemResult = {
  ...meta, source: { position: 'month', branch: '寅', stem: '甲', role: 'main' },
  weight: null,
};
const tenGod: TenGodResult = {
  ...meta, dayMaster: '甲', tenGod: 'peer',
  source: { kind: 'hidden_stem', ...hidden.source },
};
const fundamentals: FundamentalsResult = {
  ...meta, input: complete, status: 'evaluated', data: {
    dayMaster: { status: 'confirmed', value: '甲' },
    monthCommand: { status: 'confirmed', value: '寅' },
    components: [{ position: 'day', component: 'stem', character: '甲', element: 'wood', yinYang: 'yang' }],
  },
};
// 평가 결과가 비어 있는 것과 미평가 상태는 다르다.
const evaluatedEmpty: AnalysisResult<readonly TenGodResult[]> = { ...meta, input: complete, status: 'evaluated', data: [] };
const notEvaluated: AnalysisResult<readonly TenGodResult[]> = {
  ...meta, input: complete, status: 'not_evaluated', data: null, limitations: ['규칙 평가 전'],
};
const unsupported: AnalysisResult<readonly TenGodResult[]> = { ...notEvaluated, status: 'unsupported' };
// @ts-expect-error 미지원 상태를 계산된 빈 목록으로 표현하지 않는다.
const unsupportedAsEmpty: AnalysisResult<readonly TenGodResult[]> = { ...unsupported, data: [] };
// @ts-expect-error 부분 입력의 관측 결과는 partial을 보존한다.
const partialAsEvaluated: FundamentalsResult = { ...fundamentals, input: incomplete };
// @ts-expect-error 지장간 역할은 배열 index가 아니다.
const invalidHiddenRole: HiddenStemResult = { ...hidden, source: { ...hidden.source, role: 0 } };
// @ts-expect-error 지장간 관측에는 source가 필요하다.
const missingHiddenSource: HiddenStemResult = { ...meta, weight: null };
// @ts-expect-error 십성은 오행 문자열이 아니다.
const invalidTenGod: TenGodResult = { ...tenGod, tenGod: 'wood' };
// @ts-expect-error 성공 판정에는 최소 하나의 근거가 필요하다.
const groundlessEvaluation: FundamentalsResult = { ...fundamentals, evidence: [] };
void [hidden, tenGod, evaluatedEmpty, notEvaluated, unsupported, unsupportedAsEmpty,
  partialAsEvaluated, invalidHiddenRole, missingHiddenSource, invalidTenGod, groundlessEvaluation];

const relation: BaziRelation = {
  ...meta, layer: 'branch', kind: 'sanhe',
  members: [{ position: 'year', character: '申' }, { position: 'month', character: '子' }, { position: 'day', character: '辰' }],
  transformation: { ...meta, input: complete, status: 'not_evaluated', data: null, limitations: ['합화 미평가'] },
};
const clash: BaziRelation = { ...relation, kind: 'clash', members: [{ position: 'month', character: '子' }, { position: 'day', character: '午' }] };
// @ts-expect-error 삼합은 세 위치의 members가 필요하다.
const shortSanhe: BaziRelation = { ...relation, members: [{ position: 'year', character: '申' }, { position: 'month', character: '子' }] };
// @ts-expect-error 천간 관계에 지지를 넣을 수 없다.
const branchAsStem: BaziRelation = { ...meta, layer: 'stem', kind: 'combination', members: [{ position: 'year', character: '甲' }, { position: 'day', character: '子' }], transformation: relation.transformation };
// @ts-expect-error 관계 탐지만으로 합화 오행을 확정할 수 없다.
const implicitTransformation: BaziRelation = { ...relation, transformation: { ...relation.transformation, data: 'water' } };
const roots: RootingResult = {
  ...meta, input: complete, status: 'evaluated', data: {
    target: { position: 'day', stem: '甲' }, roots: [{
      ...meta, source: hidden.source, rootType: 'test-same-stem',
      rootDepth: { status: 'unavailable', reason: '강도 규칙 미평가' },
    }],
  },
};
const noRoots: RootingResult = { ...roots, data: { ...roots.data, roots: [] } };
const exposure: ExposureResult = { ...meta, input: complete, status: 'evaluated', data: { source: hidden.source, exposedPillars: ['year', 'month'] } };
const hiddenReference: EvidenceItem = { ...evidence, references: [{ kind: 'hidden_stem', ...hidden.source }] };
// @ts-expect-error 통근 근거의 지장간 source를 버리지 않는다.
const rootWithoutSource: RootingResult = { ...roots, data: { ...roots.data, roots: [{ ...meta, rootType: 'test', rootDepth: { status: 'confirmed', value: 'test' } }] } };
void [clash, shortSanhe, branchAsStem, implicitTransformation, noRoots, exposure, hiddenReference, rootWithoutSource];

const observations: StrengthObservations = {
  dayMaster: { status: 'confirmed', value: '甲' },
  seasonal: {
    monthBranch: { status: 'confirmed', value: '寅' },
    season: { status: 'confirmed', value: 'test-spring' },
    dayMasterSeasonalState: { status: 'unavailable', reason: '계절표 미검증' },
    hasSeasonalSupport: { status: 'unavailable', reason: '계절표 미검증' },
    seasonalEvidence: [evidence],
  },
  roots: [roots], exposures: [exposure],
  peerSupport: [tenGod], resourceSupport: [],
  outputDrain: [], wealthExpenditure: [], controlPressure: [],
};
const strength: StrengthResult = {
  ...meta, input: complete, observations, interactionEvidence: [],
  status: 'provisional', strengthClass: 'strong', confidence: 'low',
};
const partialStrength: StrengthResult = {
  ...meta, input: incomplete, observations, interactionEvidence: [],
  status: 'partial', strengthClass: null, possibleStrengthClasses: ['weak', 'balanced_or_uncertain'],
  confidence: 'low', limitations: ['시주 누락'],
};
const unsupportedStrength: StrengthResult = {
  ...meta, input: complete, observations, interactionEvidence: [],
  status: 'unsupported', strengthClass: null, confidence: null, limitations: ['판정 규칙 미지원'],
};
// @ts-expect-error 부분 원국은 같은 후보여도 confirmed로 승격하지 않는다.
const partialConfirmed: StrengthResult = { ...strength, input: incomplete, status: 'confirmed' };
// @ts-expect-error 강약 confidence는 정성적 등급이다.
const strengthProbability: StrengthResult = { ...strength, confidence: 0.9 };
// @ts-expect-error 미지원 판정에 강약 등급을 채우지 않는다.
const inventedStrength: StrengthResult = { ...unsupportedStrength, strengthClass: 'weak' };
// @ts-expect-error 내부 diagnostics에 단일 절대점수를 추가하지 않는다.
const absoluteScore: StrengthResult = { ...strength, diagnostics: { totalScore: 100 } };
// @ts-expect-error 계절 상태 관측과 최종 강약 판정을 하나로 대체하지 않는다.
const noObservations: StrengthResult = { ...meta, input: complete, status: 'confirmed', strengthClass: 'strong', confidence: 'high', interactionEvidence: [] };
void [partialStrength, unsupportedStrength, partialConfirmed, strengthProbability, inventedStrength, absoluteScore, noObservations];

const patternCandidate: PatternCandidate = {
  ruleCode: 'PATTERN_TEST', rulesetVersion: 'test-v1', id: 'test-candidate',
  patternFamily: 'general', tenGod: 'direct_officer',
  source: { position: 'month', branch: '寅', stem: '甲', role: 'main' },
  candidateSource: 'month-hidden-stem-exposure', exposureStatus: 'exposed', exposedPillars: ['year'],
  candidateStatus: 'candidate', formationStatus: 'not_evaluated',
  supportingEvidence: [evidence], conflictingEvidence: [], limitations: [],
};
const preferred: PatternCandidate = { ...patternCandidate, candidateStatus: 'preferred', preferenceEvidence: [evidence] };
const pattern: PatternResult = {
  ...meta, input: complete, status: 'evaluated', data: {
    patternBasis: { status: 'confirmed', value: patternCandidate.source },
    patternSupport: [evidence], patternCandidates: [patternCandidate, preferred],
    preferredCandidate: preferred, confirmedPattern: null,
    reviewStatus: 'general', suspectedPatterns: [], possibleCandidates: [],
  },
};
const partialPattern: PatternResult = { ...pattern, input: incomplete, status: 'partial', limitations: ['시주 누락'] };
const specialMonth: PatternCandidate = { ...patternCandidate, patternFamily: 'special-month-structure', tenGod: 'peer', specialReview: true };
const structure: StructureResult = { strength: partialStrength, pattern: partialPattern };
// @ts-expect-error 비겁 월령을 일반 8격으로 바꾸지 않는다.
const peerAsGeneral: PatternCandidate = { ...patternCandidate, tenGod: 'peer' };
// @ts-expect-error 격국의 투간 근거에 일간은 포함하지 않는다.
const dayExposure: PatternCandidate = { ...patternCandidate, exposedPillars: ['day'] };
// @ts-expect-error 우선 후보는 성격/파격 평가가 끝난 확정 격국이 아니다.
const autoConfirmedPattern: PatternResult = { ...pattern, data: { ...pattern.data, confirmedPattern: preferred } };
// @ts-expect-error v1 성립 평가는 미평가 상태로 보존한다.
const formedCandidate: PatternCandidate = { ...patternCandidate, formationStatus: 'confirmed' };
// @ts-expect-error 우선 후보 선정에도 별도 근거가 필요하다.
const groundlessPreferred: PatternCandidate = { ...patternCandidate, candidateStatus: 'preferred' };
// @ts-expect-error 월지 지장간 source만 격국 기준으로 사용한다.
const yearPatternSource: PatternCandidate = { ...patternCandidate, source: { ...patternCandidate.source, position: 'year' } };
void [specialMonth, structure, peerAsGeneral, dayExposure, autoConfirmedPattern, formedCandidate, groundlessPreferred, yearPatternSource];

const fire: BalanceTarget = { element: 'fire', stem: '丁' };
// @ts-expect-error 천간과 오행이 다른 후보를 저장하지 않는다.
const wrongElementStem: BalanceTarget = { element: 'water', stem: '丁' };
const balanceCandidate = {
  ruleCode: 'BALANCE_TEST', rulesetVersion: 'test-v1', method: 'johu', target: fire,
  role: 'yongshin_candidate', status: 'candidate',
  supportingEvidence: [evidence], conflictingEvidence: [], conditions: ['테스트 조건'], limitations: [],
} satisfies BalanceCandidate;
const johu: BalanceMethodResult = {
  ...meta, input: complete, method: 'johu', status: 'applicable', candidates: [balanceCandidate],
  diagnosis: { conditions: ['테스트 조후 조건'], evidence: [evidence] },
};
const eokbu: BalanceMethodResult = {
  ...meta, input: complete, method: 'eokbu', status: 'not_evaluated',
  candidates: [], diagnosis: null, limitations: ['세부 규칙 미평가'],
};
const tonggwan: BalanceMethodResult = { ...eokbu, method: 'tonggwan', status: 'unsupported' };
const byeongyak: BalanceMethodResult = { ...eokbu, method: 'byeongyak', status: 'insufficient_data' };
const suspended: BalanceMethodResult = { ...eokbu, status: 'suspended_due_to_special_pattern' };
const balance = {
  ...meta, input: complete, methodResults: [johu, eokbu, tonggwan, byeongyak],
  resolutionStatus: 'unresolved', primaryYongshin: null, specialPatternStatus: 'clear',
  heeshinCandidates: [], gishinCandidates: [], otherCandidates: [],
  supportingEvidence: [evidence], conflictingEvidence: [],
} satisfies BalanceResult;
const aligned: BalanceResult = { ...balance, resolutionStatus: 'aligned', supportingEvidence: [evidence] };
const conflict: BalanceResult = { ...balance, resolutionStatus: 'conflict', conflictingEvidence: [evidence] };
const partialBalance: BalanceResult = { ...conflict, input: incomplete };
const specialBalance: BalanceResult = { ...balance, specialPatternStatus: 'special_review', methodResults: [johu, suspended, tonggwan, byeongyak] };
const resolved: BalanceResult = {
  ...balance, resolutionStatus: 'resolved', primaryYongshin: {
    ...meta, candidate: { ...balanceCandidate, role: 'yongshin_candidate', status: 'selected' },
  },
};
const conditional: BalanceCandidate = { ...balanceCandidate, role: 'conditional' };
// @ts-expect-error 미평가 방법에서는 실제 용신 후보를 만들지 않는다.
const unevaluatedCandidate: BalanceMethodResult = { ...eokbu, candidates: [{ ...balanceCandidate, method: 'eokbu' }] };
// @ts-expect-error 방법별 결과에 다른 방법의 후보를 섞지 않는다.
const mixedMethod: BalanceMethodResult = { ...johu, candidates: [{ ...balanceCandidate, method: 'eokbu' }] };
// @ts-expect-error 합치만으로 주용신을 확정하지 않는다.
const alignedPrimary: BalanceResult = { ...aligned, primaryYongshin: resolved.primaryYongshin };
// @ts-expect-error 선택 규칙 근거 없이 resolved로 승격하지 않는다.
const resolvedWithoutRule: BalanceResult = { ...balance, resolutionStatus: 'resolved', primaryYongshin: { candidate: { ...balanceCandidate, role: 'yongshin_candidate', status: 'selected' } } };
// @ts-expect-error 미지원 방법도 결과 목록에서 삭제하지 않는다.
const omittedMethods: BalanceResult = { ...balance, methodResults: [johu] };
// @ts-expect-error 특수격 검토 중 일반 주용신을 확정하지 않는다.
const specialResolved: BalanceResult = { ...resolved, specialPatternStatus: 'special_review' };
// @ts-expect-error 중단 상태는 일반 억부 방법의 상태다.
const suspendedJohu: BalanceMethodResult = { ...eokbu, method: 'johu', status: 'suspended_due_to_special_pattern' };
void [wrongElementStem, partialBalance, specialBalance, conditional, unevaluatedCandidate,
  mixedMethod, alignedPrimary, resolvedWithoutRule, omittedMethods, specialResolved, suspendedJohu];

// @ts-expect-error 억부 적용에는 충분히 확정된 강약 판정이 필요하다.
const eokbuWithoutStrength: BalanceMethodResult = { ...meta, input: complete, method: 'eokbu', status: 'applicable', candidates: [], diagnosis: { searchSpace: ['peer'], reviewedConditions: [], evidence: [evidence] } };
const appliedEokbu: BalanceMethodResult = {
  ...meta, input: complete, method: 'eokbu', status: 'applicable', candidates: [],
  diagnosis: { searchSpace: ['eating_god'], reviewedConditions: ['검증 조건'], evidence: [evidence], strength: { ...strength, status: 'confirmed', strengthClass: 'strong' } },
};
// @ts-expect-error 부분 강약 판정으로 억부 적용을 확정하지 않는다.
const partialEokbu: BalanceMethodResult = { ...appliedEokbu, diagnosis: { ...appliedEokbu.diagnosis, strength: partialStrength } };
void [eokbuWithoutStrength, appliedEokbu, partialEokbu];

const stage: TwelveStageResult = { ...meta, input: complete, status: 'evaluated', data: { dayMaster: '甲', position: 'year', branch: '亥', stage: '長生' } };
const noShinsal: ShinsalResult = { ...meta, input: complete, status: 'evaluated', data: { code: 'test-rule', detected: false, members: [], activation: null } };
const unsupportedShinsal: ShinsalResult = { ...meta, input: complete, status: 'unsupported', data: null, limitations: ['미지원 신살 규칙'] };
const kinship: KinshipResult = { ...meta, input: complete, status: 'evaluated', data: { roleCode: 'test-kinship', tenGod: 'peer', source: tenGod.source } };
const palace: PalaceResult = { ...meta, input: incomplete, status: 'partial', data: { position: 'month', domainCodes: ['test-family'], observations: [hiddenReference.references[0]] }, limitations: ['시주 누락'] };
// @ts-expect-error 십이운성 자리에 신살/격국 코드를 넣지 않는다.
const invalidStage: TwelveStageResult = { ...stage, data: { ...stage.data, stage: 'special_pattern' } };
// @ts-expect-error 미지원 신살을 탐지되지 않은 것으로 표시하지 않는다.
const unsupportedAsAbsent: ShinsalResult = { ...unsupportedShinsal, data: noShinsal.data };
// @ts-expect-error 신살을 탐지했다고 할 때 해당 원국 참조가 필요하다.
const detectedWithoutMembers: ShinsalResult = { ...noShinsal, data: { code: 'test-rule', detected: true, members: [], activation: { status: 'unavailable', reason: '강도 미평가' } } };
void [kinship, palace, invalidStage, unsupportedAsAbsent, detectedWithoutMembers];
