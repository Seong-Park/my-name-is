import type { Stem, Branch, Element, YinYang, Ganzhi } from '../src/index';
import type { FourPillars, PillarPosition } from '../src/index';
import type { EvidenceItem, JudgmentMeta, NumericJudgmentMeta, QualitativeJudgmentMeta } from '../src/index';

const stem: Stem = '甲';
const branch: Branch = '子';
const element: Element = 'wood';
const yinYang: YinYang = 'yang';
const first: Ganzhi = { stem: '甲', branch: '子', index: 0 };
const last: Ganzhi = { stem: '癸', branch: '亥', index: 59 };
// @ts-expect-error 천간은 한자 식별자다.
const invalidStem: Stem = '갑';
// @ts-expect-error 천간을 지지로 사용할 수 없다.
const invalidBranch: Branch = '甲';
// @ts-expect-error 오행의 공개 식별자는 소문자다.
const invalidElement: Element = 'WOOD';
// @ts-expect-error 음양은 두 값만 허용한다.
const invalidYinYang: YinYang = 'neutral';
// @ts-expect-error 60갑자 index의 하한은 0이다.
const negative: Ganzhi = { ...first, index: -1 };
// @ts-expect-error 60갑자 index의 상한은 59다.
const overflow: Ganzhi = { ...first, index: 60 };
// @ts-expect-error 간지 index는 정수다.
const fractional: Ganzhi = { ...first, index: 0.5 };

void [stem, branch, element, yinYang, first, last, invalidStem, invalidBranch,
  invalidElement, invalidYinYang, negative, overflow, fractional];

const position: PillarPosition = 'day';
const threePillars: FourPillars = { year: first, month: first, day: last, hour: null };
const fourPillars: FourPillars = { ...threePillars, hour: first };
// @ts-expect-error 원국의 위치는 연월일시만 허용한다.
const invalidPosition: PillarPosition = 'luck';
// @ts-expect-error 확정 팔자 모델에는 연주가 필요하다.
const missingYear: FourPillars = { month: first, day: last, hour: null };
// @ts-expect-error 확정 팔자 모델에는 월주가 필요하다.
const missingMonth: FourPillars = { year: first, day: last, hour: null };
// @ts-expect-error 확정 팔자 모델에는 일주가 필요하다.
const missingDay: FourPillars = { year: first, month: first, hour: null };
// @ts-expect-error 시간 미상도 hour: null을 명시한다.
const missingHour: FourPillars = { year: first, month: first, day: last };
// @ts-expect-error 불확실한 일주는 별도 결과 wrapper로 표현한다.
const unknownDay: FourPillars = { ...threePillars, day: null };
void [position, fourPillars, invalidPosition, missingYear, missingMonth, missingDay, missingHour, unknownDay];

const evidence: EvidenceItem = {
  ruleCode: 'TEST_RULE', rulesetVersion: 'test-v1',
  references: [
    { kind: 'input', field: 'birthDate' },
    { kind: 'pillar', position: 'day', component: 'stem' },
  ],
};
const metadata: JudgmentMeta = { ruleCode: 'TEST_RULE', rulesetVersion: 'test-v1', evidence: [evidence] };
const numeric: NumericJudgmentMeta = { ...metadata, score: 50, confidence: 0.5 };
const qualitative: QualitativeJudgmentMeta = { ...metadata, confidence: 'high' };
// @ts-expect-error 판정 메타에서 근거 필드를 생략할 수 없다.
const missingEvidence: JudgmentMeta = { ruleCode: 'TEST_RULE', rulesetVersion: 'test-v1' };
// @ts-expect-error 근거의 규칙 버전이 필요하다.
const missingVersion: EvidenceItem = { ruleCode: 'TEST_RULE', references: [] };
// @ts-expect-error 입력/위치 참조 필드를 생략할 수 없다.
const missingReferences: EvidenceItem = { ruleCode: 'TEST_RULE', rulesetVersion: 'test-v1' };
// @ts-expect-error 저장용 소유권은 계산 입력 필드가 아니다.
const invalidReference: EvidenceItem = { ...evidence, references: [{ kind: 'input', field: 'ownerId' }] };
// @ts-expect-error 참조 위치도 연월일시로 제한한다.
const invalidPillarReference: EvidenceItem = { ...evidence, references: [{ kind: 'pillar', position: 'luck', component: 'stem' }] };
// @ts-expect-error 정성적 신뢰도에 임의 수치를 넣을 수 없다.
const numericAsQualitative: QualitativeJudgmentMeta = { ...metadata, confidence: 0.9 };
// @ts-expect-error 숫자형 신뢰도와 정성 등급은 별도 계약이다.
const qualitativeAsNumeric: NumericJudgmentMeta = { ...metadata, confidence: 'high' };
// @ts-expect-error 공통 메타는 숫자 신뢰도 계약을 강제하지 않는다.
const numericAsCommon: JudgmentMeta = { ...metadata, confidence: 0.5 };
void [numeric, qualitative, missingEvidence, missingVersion, missingReferences,
  invalidReference, invalidPillarReference, numericAsQualitative, qualitativeAsNumeric, numericAsCommon];
