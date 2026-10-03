import type { LuckStartAge, FirstLuckStartDate, LuckSettings, LuckStartAgeValue } from '../src/index';

// 계약용 가상 자료. 천문/달력 계산 기대값이 아니다.
const age: LuckStartAgeValue = {
  ruleCode: 'TEST', rulesetVersion: 'test', evidence: [], calendarVersion: 'terms-test',
  direction: 'forward', birthInstantUtcMs: 0, referenceTerm: '입춘', referenceTermInstantUtcMs: 720,
  deltaSeconds: 720, symbolicAgeYears: 720 / 259200, exactSymbolicDays: 1,
  wholeSymbolicDays: 1, fractionalSymbolicDay: 0, years: 0, months: 0, days: 1,
};
const confirmed: LuckStartAge = { status: 'confirmed', value: age };
const range: LuckStartAge = { status: 'range', min: age, max: age };
const ambiguous: LuckStartAge = { status: 'ambiguous', candidates: [age, age] };
const unavailable: LuckStartAge = { status: 'unavailable', reason: 'unknown-time' };
// @ts-expect-error 범위와 확정값 혼용 금지
const mixed: LuckStartAge = { ...range, value: age };
// @ts-expect-error 후보 최소 두 개
const single: LuckStartAge = { status: 'ambiguous', candidates: [age] };
// @ts-expect-error 원시값을 표시 나이로 대체할 수 없다.
const displayOnly: LuckStartAgeValue = { years: 0, months: 0, days: 1 };
const date: FirstLuckStartDate = { status: 'confirmed', value: {
  date: '2026-01-02', birthCivilDate: '2026-01-01', timezoneId: 'Asia/Seoul',
  calendarMappingVersion: 'mylife-calendar-mapping-v1', luckStartAge: age,
} };
const settings: LuckSettings = {
  seunYearRange: { startYear: 2026, endYearInclusive: 2030 },
  direction: { status: 'confirmed', value: {
    direction: 'forward', yearPillar: { stem: '甲', branch: '子', index: 0 },
    yearStem: '甲', yearStemYinYang: 'yang', sexForBazi: 'male',
    monthPillar: { stem: '甲', branch: '子', index: 0 }, firstDaeunPillar: { stem: '乙', branch: '丑', index: 1 },
    ruleCode: 'TEST', rulesetVersion: 'test', evidence: [],
  } },
  luckStartAge: range, firstLuckStartDate: { status: 'unavailable', reason: 'mapping-pending' },
};
const { seunYearRange, ...noYears } = settings;
// @ts-expect-error 세운 연도 범위는 호출자가 명시한다.
const missingYears: LuckSettings = noYears;
// @ts-expect-error 민간 날짜에 UTC instant를 넣지 않는다.
const instantDate: FirstLuckStartDate = { status: 'confirmed', value: 1000 };
void [confirmed, range, ambiguous, unavailable, mixed, single, displayOnly, date, settings, missingYears, instantDate, seunYearRange];

import type { LuckPeriod, LuckInteraction, BaziCalculationResult, FourPillarsCalculationResult } from '../src/index';
const period: LuckPeriod = {
  kind: 'daeun', index: 0, pillar: { status: 'confirmed', value: { stem: '乙', branch: '丑', index: 1 } },
  dates: { status: 'unavailable', reason: 'unknown-start' }, ruleCode: 'TEST', rulesetVersion: 'test', evidence: [],
};
const dated: LuckPeriod = { ...period, dates: { status: 'confirmed', value: {
  startDate: '2026-01-02', nextStartDate: '2036-01-02', timezoneId: 'Asia/Seoul',
  calendarMappingVersion: 'mylife-calendar-mapping-v1',
} } };
// @ts-expect-error 확정 날짜 경계에는 배타적 다음 시작일이 필요하다.
const noEnd: LuckPeriod['dates'] = { status: 'confirmed', value: { startDate: '2026-01-02', timezoneId: 'Asia/Seoul', calendarMappingVersion: 'v1' } };
// @ts-expect-error 세운에는 명시적 연도 필요
const noYear: LuckPeriod = { ...period, kind: 'seun' };
const interaction: LuckInteraction = {
  layer: 'branch', kind: 'clash', ruleCode: 'TEST', rulesetVersion: 'test', evidence: [],
  members: [
    { source: { kind: 'natal', position: 'day' }, character: '子' },
    { source: { kind: 'seun', year: 2026 }, character: '午' },
  ],
  transformation: { status: 'not_evaluated', input: { completeness: 'complete', missingPillars: [], uncertainPillars: [] }, data: null, ruleCode: 'TEST', rulesetVersion: 'test', evidence: [], limitations: ['type fixture'] },
};
// @ts-expect-error 삼합에는 세 참여자가 필요하다.
const shortSanhe: LuckInteraction = { ...interaction, kind: 'sanhe' };
// @ts-expect-error 천간 관계에 지지 참여자를 넣을 수 없다.
const branchAsStem: LuckInteraction = { ...interaction, layer: 'stem', kind: 'combination' };

declare const m3: FourPillarsCalculationResult;
declare const all: BaziCalculationResult;
const originalM3: FourPillarsCalculationResult = all;
// @ts-expect-error M3 결과만으로 전체 분석 완료를 주장할 수 없다.
const premature: BaziCalculationResult = m3;
const uncomputed: BaziCalculationResult['daeun'] = {
  status: 'not_evaluated', input: { completeness: 'complete', missingPillars: [], uncertainPillars: [] },
  data: null, ruleCode: 'TEST', rulesetVersion: 'test', evidence: [], limitations: ['M9 pending'],
};
// @ts-expect-error 미계산은 빈 운 배열과 다르다.
const emptyUncomputed: BaziCalculationResult['daeun'] = { ...uncomputed, data: [] };
declare const seun: Extract<LuckPeriod, { kind: 'seun' }>;
// @ts-expect-error 대운 구획에 세운을 넣지 않는다.
const wrongPeriod: Extract<BaziCalculationResult['daeun'], { status: 'evaluated' }>['data'] = [seun];
void [dated, noEnd, noYear, interaction, shortSanhe, branchAsStem, originalM3, premature, emptyUncomputed, wrongPeriod];

if (date.status === 'confirmed') {
  const dateRange: FirstLuckStartDate = { status: 'range', min: date.value, max: date.value };
  const dateCandidates: FirstLuckStartDate = { status: 'ambiguous', candidates: [date.value, date.value] };
  const { calendarMappingVersion, ...unversioned } = date.value;
  // @ts-expect-error 절입 버전과 별개인 날짜 매핑 버전 필수
  const missingMapping: FirstLuckStartDate = { status: 'confirmed', value: unversioned };
  void [dateRange, dateCandidates, calendarMappingVersion, missingMapping];
}
const mixedVariable = { status: 'unavailable' as const, reason: 'missing', value: age };
// @ts-expect-error 변수 경유로도 불가 상태에 값을 숨기지 않는다.
const mixedUnavailable: LuckStartAge = mixedVariable;
// @ts-expect-error 중기는 기산 절이 아니다.
const notJie: LuckStartAgeValue = { ...age, referenceTerm: '춘분' };
declare const analyses: Omit<BaziCalculationResult, keyof FourPillarsCalculationResult>;
const assembled: BaziCalculationResult = { ...m3, ...analyses };
if (assembled.inputAccuracy === 'unknown') {
  const partial: 'partial' = assembled.completeness;
  const hourUnavailable: 'unavailable' = assembled.pillars.hour.status;
  void [partial, hourUnavailable];
}
void [mixedUnavailable, notJie, assembled];
