# @mylife/bazi-rules

책임: 고정 규칙표와 버전별 정책.

공개 export: STEMS 10개, BRANCHES 12개, GANZHI_CYCLE 60개, HIDDEN_STEMS 12지지/28장간, TEN_GODS 100셀 및 공통 출처 TEN_GODS_SOURCE. 각 표는 TypeScript readonly 계약이며 런타임 freeze는 하지 않는다. 지장간 weight는 전부 null이다.

구현 단계: **M2 Task 7~10 완료 (2026-09-23, 채택된 고정표·정책 범위).** 출처 타입(`src/types.ts`), 출처 등록부와 독립 기대값 표본 38개(`tests/fixtures/rules-reference.json`), 전체 표 fixture, 행별 출처·정책 상태 검사와 타입 검증을 갖춘다. 38개 표본 전 행을 실제 버전 규칙표와 의미 대조했다.

`npm --prefix packages/bazi-rules test`는 출처·전체 표·버전 정책·독립 표본 검사 98개를, `npm --prefix packages/bazi-rules run typecheck`는 공개 타입과 테스트의 TypeScript 검사를 수행한다. Vitest 1.6.1은 저장소의 기존 개발 의존성 버전을 재사용한다. 설치는 루트의 `packageManager`에 맞춰 `corepack pnpm`을 사용한다.

표본은 구현표에서 생성하지 않는다. 출처 검사를 통과했다고 실제 규칙 정확성이나 정책 채택이 승인된 것은 아니다. [출처·정책 제안](../../docs/references/mylife/docs/bazi/RULE_SOURCES.md)에 1차 자료, 권리 고지, 대안, 적용 범위와 미검증 사항을 기록한다.

내부 의존: bazi-domain의 타입만 사용한다. 외부 런타임 의존성은 없다.

금지: 계산 흐름/DB/UI/LLM.

세부 계획과 검토 상태: [Bazi 문서](../../docs/references/mylife/docs/bazi/README.md), [트래커](../../docs/references/mylife/docs/bazi/IMPLEMENTATION_TRACKER.md). 향후 소스 파일 배치는 [목표 트리](https://github.com/Seong-Park/mylife/blob/9c3566c61ae18c1c0884d07dff8aa48657bbd58a/docs/v2/v2_folder_tree.md)를 따른다.

Task 9 공개 표: `STEM_RELATIONS` 5행, `BRANCH_RELATIONS` 43행, `TWELVE_STAGES` 120셀과 `TWELVE_STAGES_SOURCE`, `SHINSAL_RULES` 4종과 `SHINSAL_SUPPORT`. 관계는 순서 무관·서로 다른 위치라는 조건을 가지며 형의 원문 방향도 보존한다. 합화는 미평가다. 십이운성은 일간 기준의 P2, 신살은 연지 기준·월일시지 대상의 P3를 따른다. 미상 대상은 unavailable, 지원 목록 밖은 unsupported이며 탐지·활성·길흉 계산 함수는 아직 없다. 파는 P4의 4쌍만 지원한다.

Task 10 공개 정책: `MYLIFE_STANDARD_V1` (`src/rulesets/mylife-standard-v1.ts`). `version`은 `mylife-standard-v1`이며 `tables`는 위 채택 표를 참조한다. 일계·자시 경계는 각각 진태양시 23:00과 [23:00, 01:00), 자시 분할 없음, 변경된 일간을 시주에 사용한다. ADR-002의 연간/성별 방향표·월주 출발점·원국 월주 제외, ADR-003의 12절·UTC 비교·경계 포함·259200초/년·720초/상징일·비정수 나이·최소 나이 강제 없음(`null`)과 별도 `calendarMapping` 버전을 담는다.

```ts
import { MYLIFE_STANDARD_V1 } from '@mylife/bazi-rules';
const policy = MYLIFE_STANDARD_V1;
// policy.version, policy.dayBoundary, policy.tables.ganzhiCycle
```

v1의 정책/표 의미를 바꾸는 변경은 새 ruleset 버전으로 분리한다. readonly는 TypeScript 계약이며 런타임 freeze는 아니다. M2 완료는 승인된 고정 자료의 완료다. M3 최소 입력표 준비와 실제 시간·팔자 계산 완료는 구분하며, M6/M7 미승인 가중치·격국·용신 규칙과 미검증 계절표는 포함하지 않는다. 원전 영인본 전면 교감, 실제 탐지기, 대운 계산·달력 매핑 구현도 이 완료 범위가 아니다.
