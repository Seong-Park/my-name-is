# Bazi Implementation Tracker

기준: [load_map 최종 표](https://github.com/Seong-Park/mylife/blob/9c3566c61ae18c1c0884d07dff8aa48657bbd58a/docs/v2/load_map.md). `[x]` 증거 있음, `[ ]` 미완료. **M0·M1·M2·M3 완료 / ADR-001~007 accepted / 비회원 BirthProfile 및 첫 탄생 기록 vertical slice 구현**. M2는 채택한 고정표·정책 범위이며, M3는 인메모리 순수 계산 엔진 범위다. 기존 마일스톤 전체 완료와 선행 수직 슬라이스 완료를 구분한다.

## M0 — 폴더 구조·문서 정합화·ADR

- [x] 사용자 제공 원본 7개 확보; `docs/v2` 보존.
- [x] `apps/bazi-web`, 6개 `packages/bazi-*`, `scripts/bazi` 골격과 책임 README 준비.
- [x] 초기 private package 메타데이터 및 lockfile importer 준비. 이후 BirthProfile 구현으로 domain 타입 export와 application/db/web 의존성·실행 구성이 추가됐다. rules/engine은 골격 상태다.
- [x] 개요·PRD·Engine·Data Flow·DB·Narrative 문서 정합화.
- [x] 기존 코드/DB와 차이 분석: [LEGACY_GAP](https://github.com/Seong-Park/mylife/blob/9c3566c61ae18c1c0884d07dff8aa48657bbd58a/docs/bazi/LEGACY_GAP.md).
- [x] ADR 001~006 권장 초안 작성.
- [x] ADR-001 사용자 수정안 반영: DST overlap 후보 비교, 항목별 확정값, 일계/자시 상수 분리.
- [x] ADR-001 날짜 경계 승인 (`accepted`).
- [x] ADR-002 사용자 수정안 반영: 계산 전용 입력, ADR-003과 책임 분리, 첫 대운·evidence·경계 테스트 명시.
- [x] ADR-002 대운 방향 승인 (`accepted`).
- [x] ADR-003 사용자 수정안 반영: 원시 상징 나이 보존, 서비스 날짜·매핑 버전 분리, 범위/후보 상태.
- [x] ADR-003 대운 시작 나이·날짜 승인 (`accepted`).
- [x] ADR-004 사용자 수정안 반영: 설명 가능한 다축 판정, 관측/판정 분리, 고정 100점·40/60 임계값 제거, 내부 diagnostics 및 부분 결과 보존.
- [x] ADR-004 구조·원칙 승인 (`accepted`). 대표 fixture·명시적 판정 규칙·diagnostics 가중치 검증은 M6에 남아 있다.
- [x] ADR-005 사용자 수정안 반영: 복수 후보 보존, 미투간 fallback, 후보/우선 후보/성립 분리, 비겁 월령 별도 검토, 격국 기준과 균형 용신 분리.
- [x] ADR-005 후보 탐색 구조와 상태 모델 승인 (`accepted`). 성격·파격·구제 및 특수격 최종 규칙은 M6 후속 검증이다.
- [x] ADR-006 사용자 수정안 반영: 독립 방법별 적용조건·결과, resolution 상태, 천간 후보, 검색 공간과 실제 후보 분리, 주용신·희신·기신 자동 확정 방지.
- [x] ADR-006 다중 방법 분석 구조와 resolution 상태 모델 승인 (`accepted`). 방법별 세부 규칙과 주용신 선택 규칙은 M7 후속 검증이다.
- [x] ADR-007 비회원 Principal/Session 분리 승인 (`accepted`); BirthProfile 저장 흐름에 반영.
- [x] 2026-09-23 M0 문서 정합화: 승인·구현·과거 검증 이력 분리. [Task 1 기록](https://github.com/Seong-Park/mylife/blob/9c3566c61ae18c1c0884d07dff8aa48657bbd58a/docs/superpowers/plans/2026-09-23-bazi-m0-m3.md#task-1-실행-기록).
- [x] Task 1 재검증: 전체 테스트 72개 파일 / 492개 통과 + 프로덕션 빌드 exit 0, error/warning 없음. 최초 M0의 491개 기록은 과거 이력으로 보존: [실행 기록](https://github.com/Seong-Park/mylife/blob/9c3566c61ae18c1c0884d07dff8aa48657bbd58a/docs/bazi/VALIDATION.md).

## M1 — bazi-domain

- [x] BirthProfile/BirthProfileInput/BirthLocation 타입과 공개 export: `packages/bazi-domain/src/index.ts`.
- [x] 천간·지지·오행·음양·간지·FourPillars 타입. GanzhiIndex는 0~59 정수, 시주는 nullable. 공개 타입 양성/음성 테스트 통과. 천간·지지·index 상호 대응 검증은 M2/M3 대상.
- [x] 원국 입력과 대운 필수 입력 타입 분리: NatalBirthInput은 sexForBazi 선택, LuckBirthInput은 필수. BirthTimeInput은 시간 정확도와 nullable 시각을 연계한다. 공개 타입 양성/음성 테스트 통과. 실제 계산·입력 검증 함수는 M3/M9 대상.
- [x] 선택적 UTC offset, 시간대 중간 후보/구간, 태양시 정규화, 기둥별 확정/후보/계산 불가, 미상·추정·부분 결과, 버전·오류 및 M3 FourPillarsCalculationResult 타입. EvidenceItem/JudgmentMeta와 숫자형·정성형 메타 포함. 실제 후보 비교·보정 계산은 M3, 전체 분석 결과 조합과 운 후보도 Task 5~6에서 정의했다.
- [x] 관측·십성·지장간 source, 2자/3자 관계 members, 통근·투간, 구조·균형 및 4종 보조 분석 결과 타입. Task 5 공개 타입 양성/음성 계약 검증.
- [x] 운 타입과 전체 BaziCalculationResult 조합: `src/luck/types.ts`, `src/chart/result.ts`, `tests/luck.test-d.ts`. M3 불확실성 보존, 명시적 세운 연도 범위, 대운/세운 구획과 상호작용의 참여 계층 구분.
- [x] luckStartAge와 firstLuckStartDate 구분, calendarMappingVersion, confirmed/range/ambiguous/unavailable 타입. 원시·상징·표시값 보존, 방향 단독 확정과 반개구간 날짜 계약 검증. 실제 계산은 M9 대상.
- [x] ADR-004 계절 상태/종합 강약, 다축 관측값, 정성적 confidence/status/evidence/limitations 및 후보 등급 타입; 공통 숫자 메타데이터와 분리. 관측 보존과 미지원 판정 null 계약 검증.
- [x] ADR-005 복수 후보·우선 후보·미평가 성립·부분 입력, 후보별 근거와 patternBasis 분리 타입. v1 confirmedPattern은 null로 고정.
- [x] ADR-006 방법별 적용/특수격 중단·후보·resolution·부분 입력 타입 분리, 천간/오행 일치 및 nullable primaryYongshin 계약. 합치/충돌만으로 확정하지 않음.

수용 기준: 정의만 포함하고 계산/DB/LLM 의존 없음. 승인된 ADR 상태와 unknown을 손실 없이 표현.

**M1 완료 (2026-09-23, 타입 정의 범위).** 위 경로는 `packages/bazi-domain` 기준이다. 파일·공개 계약 검증 근거:

| M1 항목 | 소스 | 타입 테스트 |
| --- | --- | --- |
| BirthProfile·계산 입력 | `birth/profile.ts`, `birth/input.ts` | `birth.test-d.ts` |
| 간지·팔자·공통 근거 | `ganzhi/types.ts`, `chart/pillars.ts`, `chart/evidence.ts` | `chart.test-d.ts` |
| 시간·불확실성·M3 | `birth/normalization.ts`, `chart/calculation.ts` | `uncertainty.test-d.ts` |
| 관측·십성·관계·통근·보조 분석 | `ten-gods/`, `relations/`, `structure/rooting.ts`, `auxiliary/` | `analysis.test-d.ts` |
| ADR-004·005·006 | `structure/strength.ts`, `structure/pattern.ts`, `balance/types.ts` | `analysis.test-d.ts` |
| ADR-002·003 운·전체 조합 | `luck/types.ts`, `chart/result.ts` | `luck.test-d.ts` |

모든 소스 경로는 `src/`, 테스트는 `tests/` 아래다. 실제 실행 결과는 [검증 기록](https://github.com/Seong-Park/mylife/blob/9c3566c61ae18c1c0884d07dff8aa48657bbd58a/docs/bazi/VALIDATION.md)에 기록한다. M1 완료는 M2 규칙표나 M3~M9 계산 구현 완료를 뜻하지 않는다.

## M2 — bazi-rules

- [x] Task 7 자료 조사·출처 계약: [RULE_SOURCES](RULE_SOURCES.md), `packages/bazi-rules/src/types.ts`, 독립 표본 38개와 출처 검사.
- [x] Task 7 채택 결정: 권고안 제시 후 사용자의 다음 작업 진행 지시에 따라 P1~P4를 채택했다. 결정 기록은 RULE_SOURCES.md, fixture 정책 상태도 adopted로 갱신했다.
- [x] Task 8 천간 10·지지 12·60갑자·지장간 12지지/28장간·십성 100셀: `src/{stems,branches,ganzhi,hidden-stems,ten-gods}.ts`, 공개 index와 `tests/basic-tables.test.ts` 전체 기대값 검증.

- [x] 천간/지지, 지장간 역할·가중치, 십성, 천간·지지 관계표. 지장간 weight는 P1에 따라 null이며 수치 가중치를 도입하지 않는다.
- [x] Task 9 관계 48행·십이운성 120셀·신살 4종 전체 기대값 검증. 신살 P3 연지 기준, 미지원/미상 조건 명시.
- [x] 십이운성/신살 표, `mylife-standard-v1` 정책표와 버전. Task 10 `MYLIFE_STANDARD_V1` 공개, ADR-001~003 상수와 Task 8~9 표 연결, 독립 표본 38개 전 행 의미 대조 및 readonly 타입 검사.

수용 기준: 규칙 출처·전체 항목 fixture·가중치 무결성; 미검증 계절표를 완성 규칙으로 취급하지 않음.

**M2 완료 (2026-09-23, Task 10).** [출처·채택 범위](RULE_SOURCES.md), [패키지 계약](../../../../../packages/bazi-rules/README.md), [검증 증거](https://github.com/Seong-Park/mylife/blob/9c3566c61ae18c1c0884d07dff8aa48657bbd58a/docs/bazi/VALIDATION.md)에 근거한다. 출처는 공식 간지 자료와 고전 전사 확인 수준이며 영인 전면 교감 완료는 아니다. P1 weight=null, P2 양순음역·화토동궁, P3 신살 4종, P4 파 4쌍으로 제한한다. M3 최소 규칙표도 준비됐지만 M3 시간·팔자 계산은 미완료다. 미검증 계절표, M6/M7 세부 판정·수치와 M9 대운 계산은 각 후속 단계의 미완료 상태를 유지한다.

## M3 — 시간 보정 + 4주8자

- [x] Task 11 공급자·CalendarContext: moment-timezone 0.6.0/tzdb 2025b, astronomy-engine 2.1.19, korean-lunar-calendar 0.4.0 고정. 독립 자료 65행과 공급자 오류·재현성 검사, 1900~2026 각 해 12절 및 앞뒤 경계 확인. [자료·정밀도·범위](CALENDAR_SOURCES.md), [검증](https://github.com/Seong-Park/mylife/blob/9c3566c61ae18c1c0884d07dff8aa48657bbd58a/docs/bazi/VALIDATION.md).
- [x] Task 12 원본 역법 변환·알려진 시각의 UTC 후보: `resolveSolarDate`, `resolveBirthInstants`. 원본 보존, 평/윤달, 지원 범위, DST gap/overlap, 초 단위 offset 검산, 역사 전환 전후와 UTC 날짜 넘김, 호스트 TZ 불변 검증.
- [x] Task 13 진태양시·23:00 일계: `toTrueSolarTime`, `applyDayBoundary`. UTC 기준 경도·균시차 단일 적용, 월말/연말/윤일과 소수 초, 독립 EoT 비교, 오차 구간 양 끝 및 제약 보존. 신규 39개 테스트 통과.
- [x] Task 14 연주·월주: `calculateYearPillar`, `calculateMonthPillar`. UTC 절입 정각 포함, 1월 소한/입춘, 월두법 10연간×12개월과 60년 주기, 실제 독립 절입 36행 전후 검증. 신규 70개/엔진243개 통과.
- [x] Task 15 일주·시주: `calculateDayPillar`, `calculateHourPillar`. 독립 간지 기준일·Gregorian 날짜 서수·60일 순환, 12시진 및 23:00 변경 일간 사용, 10일간×12시진 표 검산. 신규79개/엔진322개 통과.
- [ ] 역사 EoT의 독립 수치 검증 확대. 현재 NAOJ 수치 표본은 2026에 한정하며 context에 제약을 보존한다. 절입 1800초/균시차 10초는 공학적 여유값이고 인증된 전 범위 정확도 상한이 아니다.
- [x] Task 16 `calculateFourPillars`: timezone·역사 DST·경도·균시차·절입·연월일시주 통합. 기둥별 후보 비교와 원시 UTC 후보 보존, unknown의 전환/절입/태양시 경계 분할·시주 unavailable, approximate 제약, 공급자 오차 반영. 신규47개 및 기존unknown 기대값 갱신, 엔진369개 통과.
- [x] Task 17 독립 명식 100건 전수 검증, legacy 엔진 비교 및 차이 근거: [PILLAR_COMPARISON](https://github.com/Seong-Park/mylife/blob/9c3566c61ae18c1c0884d07dff8aa48657bbd58a/docs/bazi/PILLAR_COMPARISON.md), [SOURCES](../../../../../packages/bazi-engine/tests/fixtures/SOURCES.md), 기준 101개 및 재현성 4개 테스트 통과. IDENTICAL 30, POLICY_DIFF 51, LEGACY_LIMITATION 19, DEFECT/UNRESOLVED 0.
- [x] Task 18 전체 순수 계산 coverage 100% 실측(18/18 소스 파일 전수), core-engine 전체 테스트(492건 통과), 두 Next.js 앱 빌드(0 Error/0 Warning), BirthProfile DB(13건 보존) 회귀 검증 완료: [검증 기록](https://github.com/Seong-Park/mylife/blob/9c3566c61ae18c1c0884d07dff8aa48657bbd58a/docs/bazi/VALIDATION.md).

수용 기준: 순수 입력→FourPillars. 20~100건으로 시작해 최종 100건 기준 명식 및 재현성 검증. DB는 불필요.

**M3 완료 (2026-09-23, Task 18).** 순수 계산 엔진(M3)이 완성되어 독립 100건 기준 명식(101개 테스트) 및 재현성 검증(4개 테스트), 전 파일 100% 커버리지 실측, 기존 코어 엔진 492개 테스트 통과, 두 Next.js 앱(web, bazi-web) 0 Error/0 Warning 빌드를 달성했다. 공통 출생 날짜 범위는 1900-01-01~2026-12-31이며, 전역 Delta-T 변경 금지 등 공급자 사용 계약을 유지한다. unknown은 전체 날짜의 실제 UTC 구간과 기둥별 후보를 보존한다. M3 완료는 순수 계산 엔진 완결을 뜻한다. 저장된 BirthProfile과의 계산 연결·영속화·API·첫 화면은 2026-09-24 M10/M11/M12/M14 선행 슬라이스로 구현했다. Task 13 리뷰의 P3 보류 사항은 일계 helper 단독 호출 시 0000년 허용·9999년 말 문자열 처리이며 기본 공급자 지원 범위 밖이다.

## M4 — 오행·지장간·십성·합충

- [ ] 음양·오행·일간·월령·지장간·십성.
- [ ] 천간합과 지지 육합/삼합/방합/충/형/파/해/자형.

수용 기준: 2자/3자 관계에 ruleCode와 members; 발생 탐지와 합화 판정 분리.

## M5 — 통근·투간

- [ ] 통근 존재/강도, 투간과 근거.

수용 기준: 원국 위치와 지장간 source 추적, 후속 점수의 중복 가산 방지.

## M6 — 신강신약·격국

- [ ] 월령·통근·생조 및 극·설·모를 분리한 명시적 판정 규칙·evidence; confidence/status 부여 조건 검토.
- [ ] ADR-004의 대표 9개 유형 fixture에 기대 판정과 기대 근거 기록·검증; diagnostics 가중치와 임계값은 검증 전 확정하지 않음.
- [ ] ADR-005의 투간/복수 투간/미투간 fallback 및 비겁 월령 후보 검증; preferred 선정 조건과 미평가 상태 명시.
- [ ] ADR-005의 13개 fixture 유형 및 API·UI·LLM의 candidate/preferred/confirmed 구분 계약 검증.
- [ ] 성격·파격·구제 미평가, 건록·월겁·양인 등 별도 구조 검토, 종격·화기격·전왕격·기타 외격 자동 확정 미지원 범위 검증.

수용 기준: ruleset/evidence 및 기준 사례 테스트. ADR-005의 승인 범위는 일반격 후보 탐색 구조와 상태 모델이므로 원본의 전체 격국 목표 충족 여부를 별도 확인.

## M7 — 용신·희신·기신

- [ ] 억부·조후·통관·병약의 독립 적용조건·규칙표·methodResults; 미지원/미평가/자료 부족/특수격 중단 구분.
- [ ] 검색 공간과 실제 후보 분리, 천간/오행 후보 및 희신·기신·neutral/conditional의 근거와 조건.
- [ ] aligned/conflict/resolved/unresolved 조정 규칙, 합치·충돌 보존 및 검증된 주용신 선택 규칙; 전역 우선순위 없음.
- [ ] ADR-006의 13개 fixture 유형과 방법별 상태·부분 입력·LLM 비확정 표현 계약 검증.

수용 기준: 승인된 범위의 기준 사례를 만족. 후보 반환만으로 전체 용희기 판정 구현 완료를 선언하지 않음.

## M8 — 십이운성·신살·육친·궁성

- [ ] 4개 보조 계산과 버전/근거.

수용 기준: 결정적 fixture와 미지원/불확실성 상태.

## M9 — 대운·세운

- [ ] 방향·시작 나이/날짜·대운 배열·세운 배열.
- [ ] ADR-003 원시 소수값 보존 및 별도 달력 매핑·정밀도·월말·범위/후보 fixture.
- [ ] 원국×대운×세운 상호작용.

수용 기준: 명시 연도 범위, 시간대와 경계 fixture, 현재 시각에 암묵적으로 의존하지 않음.

## M10 — DB schema + repositories

- [x] 첫 탄생 기록 슬라이스: `0004_birth_record_runs.sql`과 repository. 원본 입력·M3 결과·버전·실패 기록을 JSONB snapshot으로 보존하고, profile/Principal FK·멱등 키·프로필별 성공 current 하나를 제약한다. 실제 PostgreSQL round-trip·동시 요청·실패 보존 테스트는 [검증](https://github.com/Seong-Park/mylife/blob/9c3566c61ae18c1c0884d07dff8aa48657bbd58a/docs/bazi/VALIDATION.md)을 참조한다.
- [ ] [DB 보완 목록](https://github.com/Seong-Park/mylife/blob/9c3566c61ae18c1c0884d07dff8aa48657bbd58a/docs/bazi/DB_SCHEMA.md)의 소유권·제약·정밀도·결과 복원 계약.
- [ ] Drizzle schema·migration·repository·원본 데이터 이관 검증.

수용 기준: 실제 PostgreSQL 트랜잭션·제약·실패/rollback 테스트. 설계 SQL 파일 존재만으로 완료 아님.

## M11 — Application pipeline

- [x] 저장된 BirthProfile → M3 `calculateFourPillars` → run 저장 → 현재 기록 조회와 `birth-record-v1` 고정 ViewModel. unknown·ambiguous·approximate를 보존한다.
- [ ] 생성·계산·재계산 commands, 결과·구조·timeline queries.
- [ ] idempotency·current 전환·실패 보존·ViewModel.

수용 기준: 입력 저장→계산→결과 저장→조회가 원본 결과와 동일. 이전 run과 실패 시 기존 current 보존.

## M12 — API

- [x] 첫 탄생 기록 슬라이스: owner-checked `POST /api/bazi/birth-profiles/:id/calculate`, `GET /api/bazi/birth-profiles/:id/result`; Origin·세션·UUID·멱등·오류·캐시 계약 테스트.
- [ ] profile 생성·calculate·result·timeline·interpret 계약.
- [ ] DTO·UUID·소유권·오류 코드 테스트.

수용 기준: API가 Application을 호출하고 계산을 중복 구현하지 않음. Narrative 연동은 M13에서 완성.

## M13 — LLM Narrative

- [ ] facts schema/hash, 7개 영역 prompt, prompt/model 버전, 결과 검증.

수용 기준: 원본 facts 불변, 근거 추적, LLM 실패 격리, partial/보류 결과의 과장 금지.

## M14 — UI

- [x] BirthProfile 저장 완료 → 환영 → 원본 기록 → 사주 네 기둥 → 팔자 여덟 글자(각 음양·오행) → 확정 일간의 버튼 진행형 여정. 다시 보기·건너뛰기·불확실성·모바일·동작 줄이기 검증.
- [ ] 출생정보·팔자·오행/십성·관계·균형·timeline·narrative 화면.

수용 기준: ViewModel 기반 렌더링/상호작용/CSS 테스트. 인게임 UI 작업 시 프로젝트의 UI master spec 적용.

## 다음 작업

### 탄생 기록 여정 1차 수직 슬라이스

2026-09-24 승인된 [설계](https://github.com/Seong-Park/mylife/blob/9c3566c61ae18c1c0884d07dff8aa48657bbd58a/docs/superpowers/specs/2026-09-24-birth-record-journey-design.md)와 [실행 계획](https://github.com/Seong-Park/mylife/blob/9c3566c61ae18c1c0884d07dff8aa48657bbd58a/docs/superpowers/plans/2026-09-24-birth-record-journey.md)에 따라 M10/M11/M12/M14의 첫 결과 흐름을 연결했다. 고정 문장은 원본 날짜·도시·M3 기둥·일간 사실만 표현한다. M4~M9 계산, M13 LLM, timeline·해석 API와 운영 계정 정책은 해당 마일스톤에 남는다.

### 출생정보 입력·저장 1차 구현 계획

2026-09-23 사용자 요청에 따라 M1/M10/M11/M12/M14의 필요한 일부를 먼저 연결한다. 기존 마일스톤 번호와 미완료 항목은 유지한다. 이 선행 구현과 별개로 ADR-001~007의 승인을 확인하고 M0 문서 정합화를 완료했다.

- [x] 첫 구현은 비회원 입력·검증·DB 저장·재조회로 진행하는 사용자 결정 확인.
- [x] [ADR-007](adr/ADR-007-guest-session-and-account-login.md) 승인 상태 확인 (`accepted`); Principal/Session 분리·토큰 교체/폐기 계약 반영.
- [x] UI 방향 확인: 따뜻한 색감의 단계형 입력, 날짜·시간 휠, 대한민국 시·도와 시·군·구 연동 휠. 레퍼런스: `ui-ux-references/v2_mobile-ref/starting`.
- [x] 30일 고정 세션, Principal 소유권 FK, Principal별 멱등 저장, 원본 snapshot 저장 구현.
- [x] 양력/음력·윤달 지원, 1900년~오늘, 등록 시 sexForBazi 필수, 기상청 2026-07 지역 데이터.
- [x] [설계](https://github.com/Seong-Park/mylife/blob/9c3566c61ae18c1c0884d07dff8aa48657bbd58a/docs/superpowers/specs/2026-09-23-birth-profile-slice-design.md)와 [구현 계획/실행 기록](https://github.com/Seong-Park/mylife/blob/9c3566c61ae18c1c0884d07dff8aa48657bbd58a/docs/superpowers/plans/2026-09-23-birth-profile-slice.md) 작성.
- [x] 입력 → API → Application → PostgreSQL → 재조회 구현, 브라우저 8개 시나리오 검증. [검증 기록](https://github.com/Seong-Park/mylife/blob/9c3566c61ae18c1c0884d07dff8aa48657bbd58a/docs/bazi/VALIDATION.md).
- [ ] 운영 전 비회원 데이터 보존·삭제 기간 및 실행 정책 확정. 세션 만료는 데이터 자동 삭제가 아님.
- [ ] 후속 로그인 제공자·계정 모델·비회원 데이터 연결 정책 설계 및 구현.

ADR-001~006은 accepted이며 ADR-004~006의 세부 판정 규칙 검증은 계속 남아 있다. 첫 입력·저장 기능의 완료는 계산 엔진, 로그인, M1~M14 전체 완료를 뜻하지 않는다.
