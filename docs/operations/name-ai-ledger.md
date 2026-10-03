# 이름 회상문 비용 원장 운영

개발 DB는 Supabase PostgreSQL의 `name_private` 두 테이블이다. 개인정보·프롬프트·응답·cookie 원문을 추가로 보관하지 않는다. 운영 명령은 앱 디렉터리에서 실행한다. `.env.local`을 출력하거나 연결 문자열을 명령행 인자로 전달하지 않는다.

## 점검

```powershell
pnpm exec tsx scripts/database.ts check
```

아래 SQL은 처리 상태와 비용만 확인한다. `browser_mac`이나 입력 자료를 조회하지 않는다.

```sql
SELECT operation_id, state, model, pricing_version, prompt_version,
       day, reserved_nano, cost_nano, input_tokens, output_tokens,
       created_at, dispatched_at, settled_at, provider_finished_at
FROM name_private.name_ai_attempts
WHERE state IN ('reserved','dispatching','uncertain')
ORDER BY created_at;

SELECT day, call_count, success_count, failure_count,
       cost_nano, reserved_nano, ai_halted
FROM name_private.name_ai_days ORDER BY day DESC;
```

`uncertain`은 실패와 다르다. 시간 경과나 브라우저 오류만으로 실행 종료·무료 처리라고 판단하지 않는다. 공급자 요청 시간·모델·해당 청구 내역을 대조한다. 요청별 비용을 확정할 수 없으면 상한 비용을 유지한다. 월 총액만으로 개별 요청 비용을 임의 배분하지 않는다.

## 실행 종료만 확인한 경우

공급자의 실행 종료 근거를 확인한 운영자만 실행한다. 아래 UUID는 실제 점검 결과의 operation ID로 바꾼다.

```powershell
pnpm exec tsx scripts/maintain-ledger.ts finished OPERATION_UUID
```

기존 `settleStory`의 트랜잭션·잠금·조건부 갱신을 사용한다. 슬롯만 해제하고 `uncertain`과 상한 비용은 유지한다. 같은 요청에 반복 실행해도 비용을 다시 더하지 않는다. 종료 근거가 없으면 실행하지 않는다.

## 실행 종료와 청구·사용량을 모두 확인한 경우

```powershell
pnpm exec tsx scripts/maintain-ledger.ts failed OPERATION_UUID COST_NANO INPUT_TOKENS OUTPUT_TOKENS
```

비용은 USD × 1,000,000,000의 정수다. 실제 청구·usage를 확인한 값을 사용한다. 이 명령은 보관하지 않은 출력물을 성공으로 복구하지 않고 확정 실패로 정산한다. 기존 보수 계상액과 실제 비용의 차이만 일별 집계에 반영한다. 상한 초과 비용은 기록하고 AI 중단 상태를 남긴다. 이미 종결된 요청은 거절하며 다시 정산하지 않는다. 실제 비용 미확인이면 이 명령을 사용하지 않는다.

현재 개발 원장은 모두 종결되어 이 정산 명령을 실제 유료 기록에 실행하지 않았다. 단위 검사에서 기존 정산 경로의 금액 차이·슬롯·중복 처리를 확인한다. 배포 운영자의 공급자 청구 대조 자체는 별도 검증 대상이다.

## 보존 기간 정리

운영 점검 시 및 하루 한 번 다음 명령을 실행한다. 현재 작업은 배포하지 않으므로 외부 스케줄러를 설치하지 않았다. 배포 시 같은 명령을 서버의 일일 작업에 등록하고 성공/실패 종료 코드를 점검한다.

```powershell
pnpm exec tsx scripts/maintain-ledger.ts cleanup --apply
```

정리 SQL은 [attempts](../../apps/name-web/db/cleanup-ledger.sql)와 [days](../../apps/name-web/db/cleanup-days.sql)이며 동일 advisory lock `716240101`과 하나의 트랜잭션 안에서 실행한다. DB의 현재 시각을 사용하고 삭제 건수만 출력한다.

- `succeeded`/`failed`, 실행 종료 확인, 정산 후 7일 초과인 attempts만 삭제한다.
- `reserved`/`dispatching`/`uncertain`은 삭제하지 않는다. 실행 종료를 확인한 uncertain도 비용 대조가 끝나기 전까지 남긴다.
- days는 해당 월 종료 후 90일이 지나고 참조 attempts가 전혀 없을 때만 삭제한다. attempts 정리 시 월별 예산 집계를 차감하지 않는다.
- 어느 SQL이 실패해도 전체 롤백한다. DB 과거 복원이나 시계 오류가 의심되면 AI와 정리를 중단하고 먼저 대조한다.

실제 유료 원장을 건드리지 않는 PostgreSQL 검증:

```powershell
pnpm exec tsx scripts/test-ledger-retention.ts
```

세션 전용 임시 테이블에 합성 원장 행을 넣고 동일 SQL을 실행한 뒤 롤백한다. 7일 경계, 한국시간 월말+90일 경계, 비종결 보존, 외래키 참조, 두 번 실행을 검사한다. 기존 `test-ledger.ts`는 빈 전용 DB에만 쓰며 현재 유료 원장에는 실행하지 않는다.

## 복원·배포 전 확인

DB 복원·복제·preview에서는 production AI 키를 사용하지 않는다. 복원 후 AI를 끄고 공급자 청구와 해당 월 누계를 대조한다. 대조할 수 없으면 그 달 잔여 예산은 0으로 유지한다. `ai_halted` 해제나 과거 비용 재작성은 이 스크립트가 자동으로 수행하지 않는다.

호스팅 접근/오류 로그의 7일 보존, 프롬프트·응답 로깅 금지, 공급자 보관 설정, Supabase 백업 만료 정책은 배포 환경에서 확인해야 한다. SQL 삭제를 백업의 즉시 물리 삭제로 안내하지 않는다. 브라우저 기록 삭제와 운영 비용 원장 삭제는 다른 동작이다.
