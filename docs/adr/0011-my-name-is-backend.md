---
status: accepted
---

# 나의 이름은: 서버 계산과 개인정보 없는 운영 원장

승인 근거: 2026-09-29 사용자의 추가 승인 없는 자율 확정 위임에 따라 채택했다. GPT-6-Astra medium의 제품·도메인·API·ADR 교차 리뷰와 발견 사항 수정을 완료했다. 실제 제품 구현·배포 완료를 뜻하지 않는다.

2026-09-29. `apps/name-web`의 TypeScript Route Handler를 Node 런타임으로 실행하고, 명리·한자·추천과 DeepSeek 호출을 서버에 둔다. 분석은 서버에서 결정적으로 계산하며 회상문 요청 때 입력을 다시 검증·계산한다. Vercel Hobby와 별도 Neon PostgreSQL을 비상업 실험의 배포 대상으로 정하되 DB에는 비용·요청 상태만 저장한다.

## 결정과 대안

- **한 배포, 외부 큐 없음:** Next.js와 같은 origin의 JSON API를 사용한다. 약 120~300자 회상문에는 SSE·WebSocket·백그라운드 작업 큐가 필요하지 않다. 추천 완료와 회상문 호출을 분리해 AI 장애가 분석 저장을 막지 않게 한다.
- **서버 재계산:** 브라우저가 돌려준 이름·목표 오행·근거·평가를 신뢰하지 않는다. 작은 서명 receipt는 입력 HMAC·분석 ID·버전·공개 설정·만료를 결합하고, 회상문에서 원본 입력으로 재계산한 공개 후보를 선택한다. 전체 분석을 서명해 전달하는 대안은 서명해도 내용이 숨겨지지 않고 payload·민감정보·버전 유지 부담이 커서 채택하지 않는다. 재계산 CPU 비용을 감수하며 출시 전 상한 입력의 계산 시간을 측정한다.
- **기존 코드의 선별 재사용:** `packages/bazi-domain`, `bazi-engine`, `bazi-rules`의 검증된 입력·원국 계산을 서버에서 재사용한다. `bazi-application`의 저장 use case나 `bazi-db`의 개인 기록 테이블을 호출하지 않는다. 기존 `core-engine/src/naming`의 발음 계산 등은 승인 규칙과 맞는 순수 함수만 검증 후 가져온다. 성씨 金·알 수 없는 오행 wood 등의 fallback, 기존 후보 점수와 미검토 전체 한자 데이터는 새 정책으로 자동 승계하지 않는다.
- **앱 안의 작은 서버 모듈:** 새 명리 구조 판정·이름 선정은 우선 `lib/server`에서 조합한다. M3 이후의 판정 규칙·원국 후보 포괄성·검토 한자 자료가 갖춰져야 실제 추천이 가능하다. 구조 판정에 필요한 순수 엔진 기능만 해당 기존 패키지로 확장하며 미지원은 보류로 보존한다.
- **PostgreSQL 운영 원장:** 저장소에 이미 있는 `postgres` 패키지를 새 앱의 직접 의존성으로 선언하고 필요한 SQL·migration만 만든다. 기존 `packages/database` 진입점과 개인 기록 스키마를 통째로 import하지 않는다. 새 Neon 프로젝트의 별도 DB 자격증명으로 운영 집계·요청 예약 두 테이블만 접근한다. Redis·ORM 추가·일반 작업 플랫폼을 만들지 않는다.
- **예산 우선 가용성:** 모든 인스턴스가 하나의 PostgreSQL transaction advisory lock으로 예약·정산한다. 월 $55, 일 $3, 진행·전송 불명 포함 동시 호출 4를 함께 검사한다. DB 장애·요금 버전 불명·토큰 상한 검증 불가는 새 AI 호출을 막는다. 이름 분석은 운영 원장에 의존하지 않는다.

## 개인정보와 기존 Bazi 경계

[Bazi ADR-007](../references/mylife/docs/bazi/adr/ADR-007-guest-session-and-account-login.md)의 Principal·BirthProfile 서버 저장은 기존 Bazi 서비스의 정책이다. 새 서비스의 무작위 브라우저 cookie는 비용 남용·중복 방지 보조 수단이며 계정·소유자·기록 복구 자격증명이 아니다. 기존 세션·쿠키·DB를 공유하지 않는다. 신규 익명 서비스에 ADR-007의 저장 테이블을 만들지 않으면서도 요청 검증·Origin 검증·비밀 보호의 원칙은 유지한다.

[ADR-0002](https://github.com/Seong-Park/mylife/blob/9c3566c61ae18c1c0884d07dff8aa48657bbd58a/docs/adr/0002-forge-of-names-and-81-suri-engine.md)와 [ADR-0003](https://github.com/Seong-Park/mylife/blob/9c3566c61ae18c1c0884d07dff8aa48657bbd58a/docs/adr/0003-two-track-name-forge-and-daily-fate-nickname.md)는 기존 `/world/forge` 게임의 결정이다. 그 문서의 클라이언트 전체 한자·가상 게스트·한글 획수 fallback·81 대길 필터·Keys 정책은 `apps/name-web`에 적용하지 않는다. 이 결정은 기존 게임 ADR을 저장소 전체에서 폐기하거나 기존 게임 동작을 변경하지 않는다.

원본 입력·프롬프트·모델 응답·회상문은 서버 로그, 캐시, DB와 백업에 기록하지 않는다. 요청 처리 메모리에서만 사용한다. 외부 DeepSeek에는 검증한 추천 이름·뜻·분석 요약·연령대만 전송하며 실제 출생일시·지역·현재 이름 원문·브라우저 식별자를 보내지 않는다. ‘자체 서버에 개인 기록을 저장하지 않음’과 외부 제공자의 보관 정책은 구분해 설명하며 제공자 보관·삭제 정책 확인은 공개 전 조건이다.

## 운영 조건과 비용

[Vercel Hobby](https://vercel.com/docs/plans/hobby)는 개인·비상업 사용 범위에서만 사용한다. [Neon](https://neon.com/pricing)의 무료 한도·복원 정책, Vercel의 실행 시간·리전·출력 크기와 공급자 연결 조건은 배포 때 확인한다. 무료 사용량 초과 시 결제 업그레이드를 자동 승인하지 않고 서비스 제한을 유지한다. AI 예산은 호스팅 비용·환율·세금을 포함한 원화 확정 지출 한도가 아니다.

개인정보를 저장하지 않으므로 성공 응답 유실 후 원문 재전송은 불가능하다. 동일 작업의 중복 과금은 막고, 사용자가 원할 때 허용된 한 번의 새 시도로 문장을 다시 만든다. 불확실한 과금은 상한으로 계상해 예산을 보수적으로 보호한다. 세부 DTO·원장·만료·실패·복구는 [API 및 운영 계약](../specs/2026-09-29-my-name-is-api-contract.md)에 한 번만 정의한다. 이 ADR은 아키텍처 결정이며 구현·마이그레이션·배포 기록이 아니다.
