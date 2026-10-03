# MyLife Bazi

명리학 단일 도메인의 계산 → 근거 있는 판정 → 저장 → 해석 → UI를 같은 monorepo 안의 독립 서비스로 만든다. 기존 서비스는 보존한다.

상태: **ADR-001~007 accepted, M0·M1·M2·M3 완료, 비회원 BirthProfile과 첫 탄생 기록 수직 슬라이스 구현.** ADR-004~006의 승인은 구조·원칙·상태 모델에 한정하며 세부 판정 규칙 검증은 후속이다. M1 도메인 타입은 운·전체 결과 조합까지 완료했고 M2는 채택한 고정 규칙표·버전·정책표(Task 10)까지 완료했다. M3 순수 계산 엔진은 공급자·고정 CalendarContext(Task 11), 원본 역법·UTC 후보(Task 12), 진태양시·일계(Task 13), 연월일시주(Task 14~15), 불확실성 통합(Task 16), 독립 100건·레거시 비교(Task 17), 전 소스 100% 커버리지 및 검증 게이트(Task 18)를 통과했다. 2026-09-24에는 저장된 BirthProfile에서 M3 결과를 계산·보관하고 환영 → 사주·팔자·일간 이야기를 여는 M10/M11/M12/M14의 일부를 구현했다. M4~M9 계산과 M13 LLM은 후속이다. [앱 실행 안내](https://github.com/Seong-Park/mylife/blob/9c3566c61ae18c1c0884d07dff8aa48657bbd58a/apps/bazi-web/README.md).

## 읽는 순서

1. [PRD](https://github.com/Seong-Park/mylife/blob/9c3566c61ae18c1c0884d07dff8aa48657bbd58a/docs/bazi/PRD.md): 범위와 성공 조건.
2. [ENGINE_SPEC](ENGINE_SPEC.md): 순수 계산과 계약.
3. [DATA_FLOW](https://github.com/Seong-Park/mylife/blob/9c3566c61ae18c1c0884d07dff8aa48657bbd58a/docs/bazi/DATA_FLOW.md): application의 조율과 저장 매핑.
4. [DB_SCHEMA](https://github.com/Seong-Park/mylife/blob/9c3566c61ae18c1c0884d07dff8aa48657bbd58a/docs/bazi/DB_SCHEMA.md), [SQL 초안](https://github.com/Seong-Park/mylife/blob/9c3566c61ae18c1c0884d07dff8aa48657bbd58a/docs/bazi/bazi_schema.sql): M10 설계 입력.
5. [INTERPRETATION_SPEC](https://github.com/Seong-Park/mylife/blob/9c3566c61ae18c1c0884d07dff8aa48657bbd58a/docs/bazi/INTERPRETATION_SPEC.md): 계산과 표현의 경계.
6. [LEGACY_GAP](https://github.com/Seong-Park/mylife/blob/9c3566c61ae18c1c0884d07dff8aa48657bbd58a/docs/bazi/LEGACY_GAP.md): 기존 구현 및 원본과의 차이.
7. [IMPLEMENTATION_TRACKER](IMPLEMENTATION_TRACKER.md): M0~M14 현재 상태.
8. [VALIDATION](https://github.com/Seong-Park/mylife/blob/9c3566c61ae18c1c0884d07dff8aa48657bbd58a/docs/bazi/VALIDATION.md): 실행한 검증과 한계.
9. [RULE_SOURCES](RULE_SOURCES.md): M2 1차 자료·대안·독립 기대값과 채택 정책.

## 구조와 책임

| 경로 | 책임 | 금지 |
| --- | --- | --- |
| `packages/bazi-domain` | 출생정보·간지·원국·판정 결과 타입 | 계산, DB, LLM |
| `packages/bazi-rules` | 규칙표·버전별 정책 | DB, UI, LLM |
| `packages/bazi-engine` | 순수 계산·판정 | DB, React, LLM, 기존 core-engine 의존 |
| `packages/bazi-db` | schema·repository·migration | 명리 판단 |
| `packages/bazi-application` | use case·transaction·결과 DTO | 명리 알고리즘 직접 구현 |
| `packages/bazi-narrative` | 구조화 facts → 인간 경험 언어 | 명리 재계산, 직접 DB 조회 |
| `apps/bazi-web` | 입력·API·화면 | 명리 계산 |

허용 내부 의존: rules → domain; engine → domain/rules; db → domain; narrative → domain; application → domain/engine/db/narrative; web → application. 공개 ViewModel은 application 경유로 노출한다. 실제 의존성은 해당 기능을 구현하는 단계에 추가한다.

고정 규칙표는 rules가 소유한다. DB에 규칙을 복제할 경우 버전별 보관·감사용이며 엔진 계산 중 DB에서 규칙을 가져오지 않는다.

`docs/v2`는 사용자 제공 원본, `docs/bazi`는 정합화된 작업 문서다. 계산 정책은 아래 accepted ADR의 승인 범위 안에서 해당 ruleset에 적용한다. 신규 코드의 상세 파일은 [목표 트리](https://github.com/Seong-Park/mylife/blob/9c3566c61ae18c1c0884d07dff8aa48657bbd58a/docs/v2/v2_folder_tree.md)를 기준으로 각 마일스톤에서 생성한다. M0의 `src/.gitkeep`은 구현 완료 표시가 아니다.

## 검토할 ADR

### 공통 검토 원칙

ADR-002~006은 명리학의 보편적 정답을 찾는 문서가 아니라 **MyLife Standard v1이 어떤 학파 또는 구체적인 규칙을 선택하는지** 고정하는 문서다. 특정 학파의 명칭이나 출처가 확인되지 않았다면 임의로 귀속시키지 않고 제품의 운영 규칙임을 명시한다.

각 ADR은 다음을 분명히 기록한다.

1. 선택할 규칙과 적용 범위: 입력, 출력, 경계, 누락·불확실성 처리.
2. 선택 이유: 제품의 재현성·설명 가능성·일관성 및 감수할 제한.
3. 대안: 다른 규칙과 이번 ruleset에서 채택하지 않는 이유.
4. 테스트 가능한 조건: 기대값, 경계 사례, evidence, 버전 및 다른 ADR과의 책임 분리.

외부 자료와 기존 구현은 선택의 참고 근거이며 제품 규칙을 자동 확정하지 않는다. 문서의 승인 상태와 구현·테스트 상태는 별도로 관리한다. ADR-001~003은 계산 정책이 승인됐고, ADR-004~006은 구조·원칙·상태 모델이 승인됐다. 강약의 세부 판정·가중치, 격국 성립·특수격, 방법별 용신 규칙과 최종 선택 규칙은 별도 검증 대상이다. ADR-007은 비회원 소유권·세션 설계 승인으로 로그인 구현 완료를 뜻하지 않는다.

- [001 날짜 경계](https://github.com/Seong-Park/mylife/blob/9c3566c61ae18c1c0884d07dff8aa48657bbd58a/docs/bazi/adr/ADR-001-day-boundary.md)
- [002 대운 방향](https://github.com/Seong-Park/mylife/blob/9c3566c61ae18c1c0884d07dff8aa48657bbd58a/docs/bazi/adr/ADR-002-daeun-direction.md)
- [003 대운 시작](https://github.com/Seong-Park/mylife/blob/9c3566c61ae18c1c0884d07dff8aa48657bbd58a/docs/bazi/adr/ADR-003-daeun-start-age.md)
- [004 신강신약](adr/ADR-004-strength-model.md)
- [005 격국](adr/ADR-005-pattern-model.md)
- [006 용희기](adr/ADR-006-yongshin-priority.md)
- [007 비회원 세션과 향후 계정 로그인](adr/ADR-007-guest-session-and-account-login.md): 인증·소유권 설계이며 계산 ruleset과 별도다.

판정 근거와 버전을 저장하고 이전 Calculation Run을 보존한다. `my_characters`는 신규 서비스의 필수 입력이나 저장 중심이 아니다. 향후 연결이 필요하면 별도 legacy adapter의 요약 snapshot으로 취급한다.

## 범위

출생정보·역법·팔자·음양오행·월령·지장간·십성·관계·통근투간·구조·용희기·보조 분석·대운세운·근거·해석용 facts를 포함한다. 점성술, 성명학, 게임 경제, 웰니스, 출산 택일, 2인 궁합은 이번 범위에서 제외한다.

첫 순수 계산 성공은 M3의 BirthProfile → FourPillars다. 전체 제품 성공 조건은 [PRD](https://github.com/Seong-Park/mylife/blob/9c3566c61ae18c1c0884d07dff8aa48657bbd58a/docs/bazi/PRD.md)를 따른다. DB는 M10, application 통합은 M11, API는 M12, LLM은 M13, UI는 M14다.

2026-09-23 비회원 출생정보 입력·저장과 M3 계산을 완료했다. 2026-09-24 첫 결과 여정에서는 M3의 네 기둥·여덟 글자·확정 일간만 사실 기반 고정 문장으로 표현한다. 계산 run은 원본 입력과 전체 M3 결과·근거·버전을 보존한다. 전체 제품 분석과 timeline, 계정 연결, LLM narrative는 [Tracker](IMPLEMENTATION_TRACKER.md)의 미완료 항목을 따른다. 공급자 범위와 정밀도 제약은 [CALENDAR_SOURCES](CALENDAR_SOURCES.md)에 기록했다.
