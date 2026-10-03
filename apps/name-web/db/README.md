# 개발 비용 원장

Supabase PostgreSQL의 `name_private` 스키마에 운영 테이블 두 개만 만든다. 출생정보·이름·프롬프트·출력 본문을 저장하지 않는다. 이 스키마를 Data API 공개 스키마 목록에 추가하지 않는다.

앱 디렉터리에서 실행한다. 명령은 `.env.local`의 연결 문자열을 로드하며 비밀값이나 원본 드라이버 예외를 출력하지 않는다.

```powershell
pnpm exec tsx scripts/database.ts check
pnpm exec tsx scripts/database.ts migrate
pnpm exec tsx scripts/test-ledger.ts
```

`migrate`는 기존 `name_private`가 있으면 중단한다. 재실행으로 기존 스키마를 덮어쓰지 않는다. `test-ledger`는 실제 유료 호출을 활성화하기 전의 빈 개발 원장에서만 실행한다. 가상 운영 ID로 동시 예약·중복·정산·불확실성·재시도를 검증하고 해당 검증 데이터를 정리한다. 다른 쓰기 작업을 감지하면 정리를 중단한다. 이 스크립트는 DeepSeek를 호출하지 않는다. 실제 DB에서 실행 전에는 이 항목들이 검증 완료된 것이 아니다.

`ledger.ts`는 하나의 트랜잭션 advisory lock을 공유하며 외부 호출 중에는 연결을 점유하지 않는다. `dispatchStory`가 true를 반환한 경우에만 공급자를 호출해야 한다. `settleStory`의 확정 성공/실패는 공급자 실행 종료와 사용량·가격을 확인한 경우에만 사용한다. 이 조건을 충족하지 못하면 uncertain으로 남긴다. uncertain은 전체 예약액을 비용으로 한 번 옮기며 종료가 확인되지 않은 동시 슬롯을 시간만으로 해제하지 않는다.

주의: 현재 라우트 연결, 실제 DB 동시성/장애/날짜 경계 검증, 보존 기간 정리, 운영자 대조 runbook은 아직 미완료다. 원장 모듈 존재만으로 유료 호출을 활성화하지 않는다.

2026-10-01 진행: 개발 Supabase에 001 적용 완료. 실제 DB에서 동시 4개 예약 한도, 중복 키/시도, 중복 dispatch/정산, uncertain 비용 이동과 슬롯 유지, 1회 재시도, 일·월 예산, 예약 만료, 비용 초과 시 중단 검사가 통과했다. 검증 행은 정리했다. 위 미완료 항목 중 동시성과 스크립트가 재현한 장애 상태는 검증됐으며, 날짜 경계·실제 프로세스 crash 전 구간·운영 보존/대조·공급자 연결은 남아 있다.

## TLS 인증서

`supabase-ca.crt`는 비밀키가 아닌 공개 CA 인증서다. 2026-10-01에 [Supabase 공식 Studio 설정 소스](https://github.com/supabase/supabase/blob/master/apps/studio/hooks/custom-content/custom-content.json)의 `ssl:certificate_url`을 확인하고 [공식 배포 URL](https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt)에서 HTTPS로 받았다. 앱의 Supabase PostgreSQL 연결에만 적용하며 시스템 신뢰 저장소는 변경하지 않는다. 서버 인증서와 호스트 이름 검증을 유지한다. [공식 TLS 설명](https://supabase.com/docs/guides/platform/ssl-enforcement).

- Subject/Issuer: Supabase Root 2021 CA
- 만료: 2031-04-26 10:56:53 GMT
- SHA-256: `80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA`

2026-10-01 공식 DeepSeek peak/cache-miss 요금은 입력 $0.30/백만, 출력 $1.20/백만이었다. 3,000+1,024 토큰 예약은 2,128,800 nano-USD다. 실제 사용량과 시간대별 적용 요금 정산은 공급자 연결 단계에서 확인해야 한다. [공식 요금](https://api-docs.deepseek.com/quick_start/pricing/).
