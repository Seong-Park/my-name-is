# SPEC — Bazi Engine

원본: [02_SPEC_BAZI_ENGINE.md](https://github.com/Seong-Park/mylife/blob/9c3566c61ae18c1c0884d07dff8aa48657bbd58a/docs/v2/02_SPEC_BAZI_ENGINE.md). 아래는 계산 엔진의 목표 계약이다. 현재 domain에는 BirthProfile·계산 입력, 간지·FourPillars·공통 판정 근거, 시간 정규화·항목별 불확실성·M3 결과 및 M4~M8 분석 결과 타입이 구현됐다. 운·전체 결과 조합까지 M1 타입 정의를 완료했다. 실제 계산 함수는 후속이다.

## 소유권과 파일 배치

- Domain: `packages/bazi-domain/src/{birth,ganzhi,chart,ten-gods,relations,structure,balance,auxiliary,luck}`.
- Rules: `packages/bazi-rules/src`의 고정 규칙표 및 `rulesets/mylife-standard-v1`.
- Engine: `packages/bazi-engine/src/{time,pillars,derived,structure,balance,luck,pipeline}`.
- `pipeline/calculateBazi.ts`는 완성된 단계들을 조합한다. 순수 엔진 내부에서 persistence나 narrative를 호출하지 않는다.
- `calculateBazi`는 전체 엔진이 갖춰진 이후의 계약이다. M3에서는 팔자 계산 부분만 검증한다.

## 입력 계약

`BirthProfile`은 원본 입력 모델, `BaziBirthInput`은 계산에 필요한 값의 snapshot이다. 식별자와 소유권은 Application/DB에서 관리한다. 시간·규칙·역법 버전 및 세운 범위는 명시적 계산 컨텍스트로 고정한다. 시스템 현재 시각을 엔진 내부에서 읽지 않는다.

```ts
interface BaziBirthInput {
  birthDate: string; // YYYY-MM-DD
  birthTime: string | null;
  timeAccuracy: 'exact' | 'approximate' | 'unknown';
  calendarType: 'solar' | 'lunar';
  isLeapMonth?: boolean;
  cityId: string;
  timezoneId: string;
  latitude: number;
  longitude: number;
  sexForBazi?: 'male' | 'female'; // 원국 계산에는 선택; 대운 전용 입력에서는 필수
}
```

양력을 기본으로 한다. 현재 BirthProfile 입력은 `korean-lunar-calendar@0.4.0`으로 음력·윤달 유효성을 검사하고 원본 음력 날짜를 저장한다. 엔진의 음력→양력 계산 변환과 버전·지원 범위 검증은 M3 대상이며 입력 검증 구현만으로 완료됐다고 보지 않는다. 계산 변환을 지원하지 않는 범위는 명시적 오류로 처리하고 양력으로 가장하지 않는다. `unknown`은 `birthTime: null`로 보존한다. 도시·timezone은 Application이 확정한 데이터를 전달하며 엔진은 도시 DB에 접근하지 않는다.

### ADR-001 수정안과 입력·부분 결과 계약

[ADR-001](https://github.com/Seong-Park/mylife/blob/9c3566c61ae18c1c0884d07dff8aa48657bbd58a/docs/bazi/adr/ADR-001-day-boundary.md)은 날짜 경계·자시·불확실성 정책이 승인된 accepted 상태다. DST gap은 유효하지 않은 입력이다. Overlap에서 offset이 제공되면 해당 offset으로 확정하고, 없으면 가능한 두 instant를 계산한다. 명리 결과가 같으면 해당 결과를 확정하고 다르면 `ambiguous`와 후보를 반환한다. 결과가 같더라도 실제 instant가 확정됐다는 의미는 아니므로 정규화 후보와 근거는 보존한다.

위 입력 예시는 개념 설명용이다. Task 2에서 구현한 NatalBirthInput에는 선택적 `utcOffsetSeconds`(동쪽 양수)가 있으며 시간 정확도와 nullable 시각을 연계한다. Task 4에서 정규화 후보와 항목별 확정값/불확실성 타입을 정의했다. 후보 비교는 실제 instant나 보정 메타데이터가 아닌 명리 결과를 대상으로 하며, 대운 시작 등 후속 시간 의존 출력도 구현 시 비교 범위에 포함해야 한다.

시간 미상에서도 후보 간 동일한 항목은 확정값으로 반환할 수 있다. 추정시각은 대표시각을 사용했다는 상태를 유지한다. `dayBoundary`와 자시 구간(`ziHourStart`, `ziHourEnd`)은 별도 ruleset 값이며, 시주 천간은 날짜 경계 적용 이후의 일간을 사용한다. 코드 구현은 승인된 범위에 따라 해당 마일스톤에서 수행한다.

### Task 4 구현 계약

- `BirthInstantResolution`은 시간대 해석의 중간 결과이며, 비어 있지 않은 UTC 후보 또는 일정 offset의 시간 구간을 갖는다. `TimeNormalizationResult`는 태양시 보정이 끝난 후보/구간과 양력 날짜·시간대·근거를 보존한다. 구간의 시작/끝 포함 여부는 명시적이다.
- `NormalizedCandidate`의 UTC 밀리초, 민간 시각 객체, offsetSeconds, longitudeSeconds, equationOfTimeSeconds를 구분한다. longitudeSeconds는 **UTC 기준 경도×240초**이며 표준 자오선 대비 차이가 아니다. 진태양시는 UTC+경도 보정+균시차로 표현하고 offset/DST를 이중 차감하지 않는다.
- `FieldResolution<T>`는 confirmed의 value, ambiguous의 최소 2개 candidates, unavailable의 reason을 상호 배타적으로 갖는다. 후보 값의 고유성·실제 동일성은 엔진에서 검증한다.
- `FourPillarsCalculationResult`는 normalization과 별도로 기둥별 FieldResolution을 반환한다. 두 UTC 후보가 같은 팔자를 만들면 두 후보를 보존한 채 기둥은 confirmed로 반환할 수 있다. unknown은 시간 구간·partial·시주 unavailable을 요구한다. approximate는 대표시각 후보와 최소 1개의 제한을 보존한다. complete는 네 기둥이 확정됐다는 뜻이며 실제 instant 또는 추정 입력의 정확성이 확정됐다는 뜻이 아니다.
- 재현 버전은 engineVersion/rulesetVersion/calendarVersion/timezoneVersion/lunarCalendarVersion이다. 음력 변환을 사용하지 않으면 lunarCalendarVersion은 null이다. 오류 인터페이스 CalculationError는 INVALID_INPUT/DST_GAP/OFFSET_MISMATCH/UNSUPPORTED_DATE/UNSUPPORTED_TIMEZONE/PROVIDER_FAILURE를 구분한다. overlap은 오류 코드가 아니다.
- 날짜 형식·구간 순서·후보 중복·보정 수치·근거 충분성·버전 일치와 오류 생성은 M3 런타임 검증 책임이다. 이번 타입 구현은 천문·시간대 계산 구현을 뜻하지 않는다.

## 출력 계약

### ADR-002 수정안과 계산용 입력

[ADR-002](https://github.com/Seong-Park/mylife/blob/9c3566c61ae18c1c0884d07dff8aa48657bbd58a/docs/bazi/adr/ADR-002-daeun-direction.md)의 `sexForBazi`는 계정 gender와 분리한 명시적 계산 파라미터다. 위 예시에서는 원국 계산을 위해 선택 필드로 표시했다. Task 2에서 NatalBirthInput(선택)과 LuckBirthInput(필수)을 구분했다. 성별 누락 시 원국 계산은 허용하고 대운 직접 호출은 validation error로 처리해야 하며, 실제 함수와 런타임 검증은 후속 구현이다. 현재 BirthProfile 등록 UI/DTO의 성별 필수 정책은 이 계산 전용 계약과 별개다.

방향은 계산된 연간 음양을 사용하고 첫 대운은 월주의 다음/이전 간지다. 월주 자체를 대운 목록에 넣지 않는다. 방향·간지 배열은 ADR-002, 시작 나이·시점은 ADR-003의 책임이다. 대운 evidence는 yearPillar/yearStem/yearStemYinYang/sexForBazi/direction/monthPillar/firstDaeunPillar와 ruleCode/rulesetVersion을 보존한다.

원본 Engine SPEC의 필드 이름을 기준으로 한다. 개요의 `normalizedTime`, 경계 문서의 `timeNormalization`은 아래 `normalization`으로 정합화한다. `palaces`는 `palace`로, 일괄 `luck`은 `luckSettings/daeun/seun/luckInteractions`로 구분한다.

```ts
type BaziCalculationResult = FourPillarsCalculationResult & {
  // normalization, pillars, versions, inputAccuracy, completeness는 M3 계약에서 상속
  // 기둥별 FieldResolution을 유지한다.
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
}
```

이는 Task 6에서 구현한 데이터 구획 계약이다. 전체 결과는 FourPillarsCalculationResult를 확장하므로 기둥별 FieldResolution과 시간 미상의 partial/hour unavailable을 보존한다. 별도 단순 FourPillars 타입의 hour는 nullable이다. 배열 구획의 AnalysisResult는 미평가 null과 평가된 빈 목록을 구분한다. `fundamentals`에 음양·오행·일간·월령을 포함한다. 부분 계산 결과에서 불확실한 판정을 확정값으로 채우지 않는다.

## ADR-003: 상징 나이와 서비스 날짜

[ADR-003](https://github.com/Seong-Park/mylife/blob/9c3566c61ae18c1c0884d07dff8aa48657bbd58a/docs/bazi/adr/ADR-003-daeun-start-age.md)은 대운 시작 나이·서비스 날짜 매핑 정책이 승인된 accepted 상태다. `luckSettings`에서 아래 개념을 분리하며 Task 6에서 구체적인 타입을 정의했다.

- `luckStartAge`: 원시 `deltaSeconds`, `symbolicAgeYears = deltaSeconds / 259200`, `exactSymbolicDays = deltaSeconds / 720`를 보존한다. `exactAgeYears`라는 이름은 사용하지 않는다.
- 표시용 `wholeSymbolicDays`, `years/months/days`와 `fractionalSymbolicDay`는 원시값과 별개다. floor나 표시 반올림으로 원시값을 덮어쓰지 않는다.
- `firstLuckStartDate`: 출생지 민간 날짜에 표시용 연→월→일을 더하는 서비스 파생값이다. 별도 `calendarMappingVersion = mylife-calendar-mapping-v1`을 기록하며, 절입 데이터의 `calendarVersion`과 구분한다.
- 시작값 상태는 `confirmed/range/ambiguous/unavailable`을 표현할 수 있어야 한다. 시작 나이가 범위여도 방향과 간지 배열이 같으면 별도 확정값을 반환할 수 있다.
- 대운 경계는 첫 서비스 시작일에 각각 10×n calendar years를 더하고 `[startDate, nextStartDate)`로 표현한다. 표시용 포함 종료일은 ViewModel이 산출한다.

M9 검증에는 0/719/720/721/259200초 간격, 절 선택, 1월 29~31일·윤년·월말 매핑, 기간 중복/공백 및 불확실성 상태를 포함한다. 이는 검증 요구이며 현재 구현 완료를 의미하지 않는다.

### Task 6 운·전체 결과 구현과 한계

- [luck/types.ts](../../../../../packages/bazi-domain/src/luck/types.ts)는 ADR-002 방향 근거와 ADR-003 원시 간격·상징 나이·표시 나이를 보존한다. 기준 절은 12절 리터럴로 제한한다. LuckStartAge와 FirstLuckStartDate는 각각 confirmed/range/ambiguous/unavailable을 갖고 방향은 별도의 FieldResolution이다.
- 날짜 매핑 값은 사용한 상징 나이, 출생지 민간 날짜·시간대, calendarMappingVersion을 보존한다. LuckPeriod는 간지와 날짜 확정 상태를 분리하며 날짜 후보 하나 안에 [startDate,nextStartDate)를 함께 저장한다. 대운은 0부터 시작하는 index, 세운은 year로 식별한다. seunYearRange의 startYear/endYearInclusive는 필수다.
- LuckInteraction은 원국/대운/세운 참여 위치를 구분하고 BaziRelation의 글자 계층·관계 종류·2자/3자 계약을 재사용한다. 관계 발생과 합화 판단은 분리한다.
- [chart/result.ts](../../../../../packages/bazi-domain/src/chart/result.ts)는 전체 파이프라인 계약이며 M3 함수의 반환 타입으로 사용하지 않는다. M1은 정의만 완료했다.
- 숫자의 유한성·정수 범위·공식 일치, 날짜 형식·구간 순서, 후보 유일성·상관관계, 연도 범위와 결과 목록 일치, 계층별 참조와 원국/운 간 관계 여부, 구획별 입력·버전 일치는 M9/전체 파이프라인 런타임 검증 책임이다. range의 min/max는 해당 값의 최소/최대 경계이며 후보 간 대응을 인덱스만으로 추정하면 안 된다.
- 세운 날짜 경계의 실제 정책은 M9에서 결정·검증한다. 이번 타입 추가로 세운 시작일을 Gregorian 1월 1일로 확정하지 않는다. [루트 용어집](https://github.com/Seong-Park/mylife/blob/9c3566c61ae18c1c0884d07dff8aa48657bbd58a/CONTEXT.md)의 대운 시작 나이와 첫 대운 시작일은 accepted ADR-003의 개념을 따르며, 정수 대운수로 반올림하거나 1~10으로 제한하지 않는다.

## ADR-004: 관측값과 다축 강약 판정

[ADR-004](adr/ADR-004-strength-model.md)은 구조·원칙이 승인된 accepted 상태다. 세부 판정 규칙과 diagnostics 가중치 검증은 별도다. 고정 100점 기여도와 40/60 임계값을 기본 판정법으로 사용하지 않는다. M1에서 다음 계약을 구분하고 M2/M5/M6에서 승인된 규칙과 fixture로 검증한다.

- 관측값: 월지·계절, 지장간과 위치, 십성별 수/위치, 통근·투간 및 탐지된 관계. 계절 상태와 통근 강도의 해석은 버전이 있는 규칙표에 의존한다.
- 판정 축: 월령/得時, 통근/得地, 생조/得勢를 보존한다. 비겁과 인성, 식상과 재성과 관살을 각각 분리한다. 왕쇠에 해당하는 `dayMasterSeasonalState`와 종합 강약 `strengthClass`는 별개다.
- 결과: `very_weak/weak/balanced_or_uncertain/strong/very_strong`, `status: confirmed/provisional/partial/unsupported`, `confidence: high/medium/low`, `evidence[]`, `limitations[]`. 중간 등급은 완전한 중화를 보장하지 않는다. 구체적인 판정 규칙과 confidence 부여 조건은 아직 검토 대상이며 임의로 확정하지 않는다.
- 내부 diagnostics는 축별로 유지하며 사용자용 절대 점수나 확률로 표시하지 않는다. Task 3에서 공통 `JudgmentMeta`와 `NumericJudgmentMeta`/`QualitativeJudgmentMeta`를 분리했다. 강약 판정에는 정성적 confidence를 사용하며 숫자 score/confidence를 강제하지 않는다.
- 합충 탐지는 `interactionEvidence`와 제한으로 남기고 자동 변환·정량 감점을 하지 않는다. 강약만으로 종격을 추론하지 않는다.
- 시간 미상은 누락 영역과 가능한 등급 후보를 보존한다. 후보가 같은 등급이어도 `partial`을 유지한다.

구조·원칙 승인은 완료됐지만, 대표 fixture와 명시적 판정 규칙 검증 전에는 강약 판정 구현 완료로 취급하지 않는다.

## ADR-005: 격국 후보와 성립 상태

[ADR-005](adr/ADR-005-pattern-model.md)은 후보 탐색 구조와 상태 모델이 승인된 accepted 상태다. M1에서 후보 집합과 후보별 상태를 정의하고 M6에서 승인된 탐색 규칙을 검증한다.

- 월지 지장간의 명시적 role과 십성, 연·월·시 천간의 투간을 근거로 일반 8격 후보를 만든다. 일간은 투간 위치에서 제외한다. 복수 투간 후보를 모두 보존하며 본기→중기→여기 순서로 하나만 남기지 않는다.
- 투간이 없으면 월지 본기를 `month-main-qi-fallback` 후보로 기록한다. 비겁 월령은 일반 8격으로 치환하지 않고 `special-month-structure`와 `specialReview`로 별도 검토한다. 건록·월겁·양인 등의 가능성과 최종 성립을 혼동하지 않는다.
- `patternCandidate`, `preferredCandidate`, `confirmedPattern`을 구분한다. 우선 후보 선정 조건은 ruleset으로 명시해야 하며, 변격 조건을 평가하지 못한 것을 '변격 없음'으로 간주하지 않는다. 성격·파격·구제 미평가는 `formationStatus: not_evaluated`로 보존한다. v1은 격국을 자동 확정하지 않는다.
- 후보별 source/role/tenGod, exposureStatus/exposedPillars, candidateStatus/formationStatus, supportingEvidence/conflictingEvidence/limitations 및 ruleCode/rulesetVersion을 보존한다. 회합 탐지 자체로 변격이나 합화를 확정하지 않는다.
- 특수격은 탐지 규칙이 지원하는 경우에만 의심 후보와 `special_review`를 반환한다. 강약 결과나 단일 조건만으로 종격·화기격 등을 확정하지 않는다.
- 시간 미상은 `partial`과 가능한 후보를 유지하며, 후보가 같아도 원국의 부분 상태를 지우지 않는다. 임의 confidence 숫자를 만들지 않는다.
- 격국의 `patternBasis/patternCandidate/patternSupport`와 ADR-006의 `balanceYongshin/favorableElement/unfavorableElement`는 별개 개념이다. 격국 기준을 균형 용신 필드로 저장하거나 자동 변환하지 않는다.

후보 상태, 성립 평가 상태, 입력 완전성은 서로 덮어쓰지 않도록 M1에서 구체적인 타입을 정합화한다. 성격·파격·구제 및 특수격 최종 규칙은 미구현이며 후보 탐색 구조의 승인이 그 규칙의 승인이나 구현 완료를 뜻하지 않는다.

## ADR-006: 방법별 분석과 균형 결과 조정

[ADR-006](adr/ADR-006-yongshin-priority.md)은 다중 방법 분석 구조와 resolution 상태 모델이 승인된 accepted 상태다. 방법별 세부 규칙과 주용신 선택 규칙은 별도 검증 대상이다. 조후·억부·통관·병약은 각자의 검증된 적용조건을 평가하고 `methodResults[]`를 반환한다. 조후 우선→억부 fallback의 전역 우선순위는 사용하지 않는다.

- 방법별 적용 상태는 `applicable/not_applicable/insufficient_data/unsupported/not_evaluated`를 구분하며 applicable일 때만 후보를 생성한다. 특수격으로 억부가 중단되는 `suspended_due_to_special_pattern`도 표현해야 한다. 미지원·미평가를 적용조건 불충족으로 가장하지 않는다.
- 억부의 생부/방부 및 설/모/극은 검색 공간이다. 현재 원국의 존재·계절 기능·충돌·과도 여부·통근·투간을 검토한 후보와 구분한다. ADR-004의 partial/provisional/balanced_or_uncertain은 억부에 불확실성으로 전달한다.
- 후보는 method, target.element와 선택적 target.stem, role, candidate/selected/rejected, 조건·근거·제한·규칙 버전을 보존한다. 조후에서 특정 천간을 오행으로만 축약하지 않는다. targetElement/targetStem과 target.element/stem 표기는 M1에서 하나의 타입으로 정합화하며 천간과 오행의 일치를 검증한다.
- `resolutionStatus`는 aligned/conflict/resolved/unresolved를 구분한다. 합치·충돌 근거와 방법별 결과는 최종 선택 후에도 보존한다. aligned 자체를 주용신 확정으로 해석하지 않으며, 검증된 선택 규칙 없이는 `primaryYongshin: null`이다. 선택 규칙 부재가 이미 탐지한 conflict/aligned 근거를 삭제하지 않도록 상태 전이와 저장 계약을 M1/M7에서 명시한다.
- 희신·기신은 각각의 근거와 조건이 필요하며 상생/상극만으로 자동 배정하지 않는다. neutral/conditional 및 미배정도 표현한다. priority는 근거 있는 규칙이 있을 때만 기록한다.
- 특수격 검토 시 일반 억부만으로 최종 용희기를 확정하지 않는다. 계산 가능한 독립 진단은 유지한다. 시간 미상은 가능한 후보와 partial을 보존하고 임의 시주를 만들지 않는다.

방법별 상태, 후보 상태, resolution 상태, 입력 완전성은 별개다. 세부 적용조건·양립성·주용신 선택 규칙은 출처와 fixture 검토 전까지 미확정이며, M0 문서 수정은 구현 완료가 아니다.

## 계산 순서

### Task 5 분석 결과 타입 구현

아래는 `packages/bazi-domain`의 공개 계약이다. 계산 알고리즘·규칙표·계수의 구현 또는 정확성 검증을 의미하지 않는다.

| 영역 | 공개 타입과 보존 내용 |
| --- | --- |
| 관측·십성 | FundamentalsResult, HiddenStemResult, TenGodResult: 일간·월령·음양오행 관측 위치, 지장간 role/source, 배분 단위, 십성 기준 일간 |
| 관계 | BaziRelation: 천간/지지 구분, 2자/3자 members와 원국 위치, 별도 transformation 평가 결과 |
| 통근·투간 | RootingResult, ExposureResult: 검사 대상 천간, 원국 지지·지장간 source, 통근 존재 목록과 미평가 가능한 강도, 투간 위치 |
| 강약 | StrengthResult: 계절 상태와 종합 강약 분리, 월령/통근/투간 관측, 비겁·인성 및 식상·재성·관살 분리, 정성적 confidence와 축별 diagnostics |
| 격국 | PatternResult/StructureResult: 복수·우선·탈락·가능 후보, 월령 기준 patternBasis/patternSupport, 투간·미투간 fallback, 특수격 검토 및 미평가 성립 상태 |
| 용희기 | BalanceResult: 네 방법 결과, 검색 공간과 실제 후보, 천간/오행 target, 적용/중단 상태, 합치·충돌 근거, nullable 주용신 및 선택 규칙 |
| 보조 분석 | TwelveStageResult, ShinsalResult, KinshipResult, PalaceResult: 규칙·근거·위치·부분 입력·미지원 상태 |

`AnalysisInputState`는 누락/불확실한 기둥을 보존한다. 공통 `AnalysisResult<T>`는 evaluated/partial의 실제 data와 unsupported/not_evaluated/insufficient_data의 null을 구분한다. 평가 결과에는 최소 1개 evidence가 필요하고, 부분·미지원·미평가 상태에는 제한을 기록한다. 빈 관측 목록은 평가 완료 후 탐지된 항목이 없는 경우에만 사용한다. 부분 원국의 partial은 결과 후보가 같아도 유지한다.

`StrengthResult`의 미지원·미평가에는 관측값을 남기되 strengthClass/confidence는 null이다. 부분 강약은 possibleStrengthClasses를 보존한다. 계절·통근 깊이 등의 코드와 diagnostics 수치 의미는 채택 ruleset에서 정하며 여기서 가중치를 승인하지 않는다.

`PatternResult.data.reviewStatus`는 general/special_review/unsupported_special_pattern이며, 상위 평가 상태·입력 완전성과 독립적이다. 비겁은 special-month-structure 후보로 분리한다. 우선 후보에는 preferenceEvidence, 탈락에는 rejectionReason이 필요하다. v1 formationStatus는 not_evaluated이고 confirmedPattern은 null이다. 이 모델은 성격·파격·구제·특수격 자동 확정을 지원하지 않는다.

`BalanceMethodResults`는 [johu, eokbu, tonggwan, byeongyak] 네 항목의 직렬화 순서를 고정해 미지원 방법의 누락을 방지한다. 이 순서는 적용 우선순위가 아니다. applicable만 후보를 갖고 방법별 진단을 보존한다. 억부 applicable의 진단은 confirmed이며 balanced_or_uncertain이 아닌 강약 근거를 요구한다. 불충분한 강약은 insufficient_data 등으로 표현한다. 통관은 대립 세력과 매개 오행, 병약은 병과 약의 구조를 따로 보존한다.

`BalanceResult.input`은 부분 입력을 나타내며 resolutionStatus와 별개다. aligned/conflict/unresolved의 primaryYongshin은 null이다. resolved는 완전 입력·특수격 검토 clear·선택된 용신 후보와 최종 선택 규칙/버전/비어 있지 않은 근거를 요구한다. 부분 입력과 특수격 검토 중에는 보수적으로 주용신을 확정하지 않는다. 최종 선택 뒤에도 방법별 결과와 충돌 근거는 남는다. 희신·기신·neutral/conditional을 보존하되 모든 오행의 역할 배정을 요구하지 않는다.

타입은 최소 형태를 검증한다. source와 실제 원국의 일치, 서로 다른 members의 유일성, preferred 후보의 목록 소속, 선택 주용신과 해당 방법 후보의 일치, 근거 내용의 충분성 및 규칙·버전 일치는 M4~M8 엔진 검증 책임이다. 아래 전체 계산 순서는 그 후 구현한다.

```text
BaziBirthInput + versioned calculation context
→ normalizeBirthTime
→ year/month/day/hour pillars
→ fundamentals / hidden stems / ten gods
→ relations
→ rooting / exposure
→ strength / pattern
→ element roles
→ twelve stages / shinsal / kinship / palace
→ daeun direction / start / periods / seun
→ natal × luck interactions
→ BaziCalculationResult
```

공통 규칙표 lookup과 팔자·십성·관계 탐지는 결정적 계산이다. 통근 강도, 신강신약, 격국, 용희기 등은 선택한 ruleset의 판정이다. 양쪽 모두 같은 입력과 버전에는 같은 결과를 반환한다.

```ts
interface JudgmentMeta {
  ruleCode: string;
  rulesetVersion: string;
  evidence: readonly EvidenceItem[];
}
interface NumericJudgmentMeta extends JudgmentMeta {
  score?: number;
  confidence?: number;
}
interface QualitativeJudgmentMeta extends JudgmentMeta {
  confidence: 'high' | 'medium' | 'low';
}
```

Task 3의 `EvidenceItem`은 ruleCode/rulesetVersion과 계산 입력 필드 또는 원국 연월일시의 천간·지지 위치 참조를 갖는다. 배열 필드는 필수이며 빈 근거만으로 판정을 확정할 수 있다는 뜻은 아니다. 개별 판정 상태와 근거 충분성 검증은 후속 분석 계약에서 정의한다. 간지 타입의 index는 0~59 정수로 제한하지만 stem/branch/index 상호 대응은 M2/M3에서 검증한다.

점수는 해당 ruleset 내부 척도이며 통계적 확률이 아니다. 검증하지 않은 confidence 수치를 만들지 않는다. 원본에 누락됐던 `luckInteractions`를 출력에 포함해 persistence로 전달한다.

## 검증

M3에서 독립 근거를 가진 팔자 fixture 20~100건으로 시작하고 PRD 최종 기준인 100건에 도달한다. 같은 결과가 반복되는지와 외부 기준에 맞는지는 별도 검사다. 시간대/DST·절입·날짜 경계·시간 미상과 ADR의 경계 사례를 포함한다. Legacy 비교 차이는 오류라고 자동 판정하지 않고 이유와 적용 버전을 기록한다.

[ADR-001~007](README.md#검토할-adr)은 accepted다. 승인 범위와 실제 구현·검증 상태는 별개이며, 미검증 세부 판정 정책을 확정하거나 `mylife-standard-v1` 전체가 완성됐다고 표시하지 않는다.
