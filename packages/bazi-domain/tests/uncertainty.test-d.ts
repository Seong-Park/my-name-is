import type { FieldResolution, Ganzhi } from '../src/index';
import type { BirthInstantResolution, NormalizedCandidate, TimeNormalizationResult, CivilDateTime } from '../src/index';
import type { FourPillarsCalculationResult, CalculationVersions, CalculationError } from '../src/index';

const first: Ganzhi = { stem: '甲', branch: '子', index: 0 };
const second: Ganzhi = { stem: '乙', branch: '丑', index: 1 };
const confirmed: FieldResolution<Ganzhi> = { status: 'confirmed', value: first };
const ambiguous: FieldResolution<Ganzhi> = { status: 'ambiguous', candidates: [first, second] };
const unavailable: FieldResolution<Ganzhi> = { status: 'unavailable', reason: 'unknown-time' };
// @ts-expect-error 후보와 단일 확정값은 함께 사용할 수 없다.
const mixed: FieldResolution<Ganzhi> = { status: 'ambiguous', candidates: [first, second], value: first };
// @ts-expect-error 불확실한 후보는 최소 두 개여야 한다.
const oneCandidate: FieldResolution<Ganzhi> = { status: 'ambiguous', candidates: [first] };
// @ts-expect-error 빈 후보를 성공한 불확실성 결과로 반환할 수 없다.
const emptyCandidates: FieldResolution<Ganzhi> = { status: 'ambiguous', candidates: [] };
// @ts-expect-error 계산 불가에는 이유가 필요하다.
const noReason: FieldResolution<Ganzhi> = { status: 'unavailable' };
const mixedVariable = { status: 'confirmed' as const, value: first, candidates: [first, second] };
// @ts-expect-error 변수로 전달해도 확정값/후보 혼용은 거절한다.
const mixedFromVariable: FieldResolution<Ganzhi> = mixedVariable;

function getConfirmed(result: FieldResolution<Ganzhi>): Ganzhi | null {
  if (result.status === 'confirmed') return result.value;
  return null;
}
void [confirmed, ambiguous, unavailable, mixed, oneCandidate, emptyCandidates,
  noReason, mixedFromVariable, getConfirmed];

const civil: CivilDateTime = { date: '2026-01-01', time: '12:00:00' };
// 아래 숫자는 타입 계약용 가상 값이며 천문 기대값이 아니다.
const candidate: NormalizedCandidate = {
  instantUtcMs: 1000, offsetSeconds: 32400,
  longitudeSeconds: 30480, equationOfTimeSeconds: -180,
  trueSolarTime: civil,
  evidence: [{ ruleCode: 'TIME_TEST', rulesetVersion: 'test-v1', references: [{ kind: 'input', field: 'longitude' }] }],
};
const overlap: TimeNormalizationResult = {
  kind: 'instant', solarDate: '2026-01-01', timezoneId: 'Test/Zone',
  candidates: [candidate, { ...candidate, instantUtcMs: 3601000, offsetSeconds: 28800 }],
  evidence: candidate.evidence,
};
const unknownNormalization: TimeNormalizationResult = {
  kind: 'interval', solarDate: '2026-01-01', timezoneId: 'Test/Zone',
  intervals: [{ start: candidate, end: { ...candidate, instantUtcMs: 86401000 }, startInclusive: true, endInclusive: false }],
  evidence: candidate.evidence,
};
const rawInstants: BirthInstantResolution = { kind: 'instant', candidates: [{ instantUtcMs: 1000, offsetSeconds: 32400 }] };
const rawIntervals: BirthInstantResolution = {
  kind: 'interval', intervals: [{ startUtcMs: 1000, endUtcMs: 86401000, offsetSeconds: 32400, startInclusive: true, endInclusive: false }],
};
// @ts-expect-error 민간 날짜·시각 객체를 UTC 밀리초 값으로 쓰지 않는다.
const civilAsInstant: NormalizedCandidate = { ...candidate, instantUtcMs: civil };
// @ts-expect-error 균시차가 없는 불완전 보정을 정규화 완료로 반환하지 않는다.
const missingCorrection: NormalizedCandidate = { instantUtcMs: 1000, offsetSeconds: 32400, longitudeSeconds: 30480, trueSolarTime: civil, evidence: [] };
// @ts-expect-error 빈 UTC 후보는 성공 결과가 아니다. DST gap은 오류다.
const emptyInstants: BirthInstantResolution = { kind: 'instant', candidates: [] };
// @ts-expect-error 시간 미상 구간도 비어 있을 수 없다.
const emptyIntervals: TimeNormalizationResult = { ...unknownNormalization, intervals: [] };
// @ts-expect-error 구간과 임의 대표 instant를 함께 반환하지 않는다.
const inventedRepresentative: TimeNormalizationResult = { ...unknownNormalization, candidates: [candidate] };
void [overlap, unknownNormalization, rawInstants, rawIntervals, civilAsInstant,
  missingCorrection, emptyInstants, emptyIntervals, inventedRepresentative];

const versions: CalculationVersions = {
  engineVersion: 'test-engine-v1', rulesetVersion: 'test-rules-v1',
  calendarVersion: 'test-astronomy-v1', timezoneVersion: 'test-tzdb-v1', lunarCalendarVersion: null,
};
const result: FourPillarsCalculationResult = {
  inputAccuracy: 'exact', completeness: 'complete', normalization: overlap,
  pillars: { year: confirmed, month: confirmed, day: confirmed, hour: confirmed },
  versions, evidence: candidate.evidence, limitations: [],
};
// 두 instant를 보존하면서도 각 기둥은 확정할 수 있다.
const partial: FourPillarsCalculationResult = {
  ...result, completeness: 'partial', pillars: { ...result.pillars, day: ambiguous },
};
const unknownResult: FourPillarsCalculationResult = {
  ...result, inputAccuracy: 'unknown', completeness: 'partial', normalization: unknownNormalization,
  pillars: { year: confirmed, month: confirmed, day: ambiguous, hour: unavailable },
};
const approximateResult: FourPillarsCalculationResult = {
  ...result, inputAccuracy: 'approximate', limitations: ['입력 오차 범위가 제공되지 않은 대표시각 계산'],
};
// @ts-expect-error 시간 미상의 시주는 확정할 수 없다.
const inventedHour: FourPillarsCalculationResult = { ...unknownResult, pillars: { ...unknownResult.pillars, hour: confirmed } };
// @ts-expect-error 시간 미상에 instant 대표값을 사용하지 않는다.
const unknownAsInstant: FourPillarsCalculationResult = { ...unknownResult, normalization: overlap };
// @ts-expect-error 시간 미상 결과는 입력이 불완전함을 보존한다.
const unknownAsComplete: FourPillarsCalculationResult = { ...unknownResult, completeness: 'complete' };
// @ts-expect-error 추정시각의 제한을 빈 배열로 지우지 않는다.
const approximateWithoutLimitation: FourPillarsCalculationResult = { ...approximateResult, limitations: [] };
// @ts-expect-error 불확실한 기둥이 있는 결과는 complete가 아니다.
const ambiguousAsComplete: FourPillarsCalculationResult = { ...result, pillars: { ...result.pillars, day: ambiguous } };
// @ts-expect-error 재현 가능한 결과는 시간대 데이터 버전도 필요하다.
const missingTimezoneVersion: CalculationVersions = { engineVersion: 'v1', rulesetVersion: 'v1', calendarVersion: 'v1', lunarCalendarVersion: null };
const gap: CalculationError = { name: 'CalculationError', message: '존재하지 않는 지역시각', code: 'DST_GAP' };
// @ts-expect-error overlap은 오류 코드가 아니라 후보를 가진 성공 결과다.
const overlapAsError: CalculationError = { ...gap, code: 'DST_OVERLAP' };
void [partial, unknownResult, approximateResult, inventedHour, unknownAsInstant,
  unknownAsComplete, approximateWithoutLimitation, ambiguousAsComplete,
  missingTimezoneVersion, gap, overlapAsError];
