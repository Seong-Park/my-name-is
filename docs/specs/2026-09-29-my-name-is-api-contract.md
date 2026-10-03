# 나의 이름은 — API 및 운영 계약

작성: 2026-09-29. 상태: 사용자 자율 확정 위임과 GPT-6-Astra medium 교차 리뷰를 반영한 확정 구현 계약. 실제 제품 코드는 미구현이다. [기획](2026-09-29-my-name-is-mvp-design.md), [핵심 규칙](2026-09-29-my-name-is-core-rules-proposal.md), [FE ADR](../adr/0010-my-name-is-frontend.md), [BE ADR](../adr/0011-my-name-is-backend.md)을 구체화한다.

## 1. 공통 입력과 결과

API는 같은 origin의 `/api/name/v1`에 둔다. 개인정보 입력은 POST JSON body만 사용한다. JSON 외 형식·추가 키·16 KiB를 넘는 body를 거절하며 Content-Length뿐 아니라 실제 읽은 바이트도 제한한다. 응답은 `Cache-Control: private, no-store`, `Referrer-Policy: no-referrer`로 제공하고 프레임워크·CDN 캐시를 우회한다. 상태 변경 요청의 정확한 Origin을 검증하고 교차 origin CORS를 열지 않는다.

분석 입력은 아래 필드로 한정한다. `schemaVersion=1`이며 날짜·지역 상세 지원 계약은 기획의 입력 명세를 따른다.

| 필드 | 계약 |
| --- | --- |
| `birthDate` | 원본 역법의 `YYYY-MM-DD`; 서버가 음력 변환·윤달·실재일·양력 환산 지원 범위·한국시간 오늘을 검사 |
| `calendarType`, `isLeapMonth` | `solar / lunar`, boolean. 양력에 윤달 true 거절 |
| `timeAccuracy`, `birthTime` | `exact`와 `HH:mm`, 또는 `unknown`과 null. approximate 거절 |
| `birthCityId` | 공개된 국내 목록 ID. 좌표·시간대는 서버 자료로 결정하며 클라이언트 좌표를 받지 않음 |
| `surname`, `givenName` | trim·한글 NFC 후 완성형 한글 음절 각각 1~2, 1~5. 그 외 문자 거절 |
| `surnameHanja`, `givenNameHanja` | 각 음절 수와 같은 배열; 값은 선택한 자형·독음 행 ID 또는 null. 독음이 해당 한글 음절과 일치하는지 서버 대조 |
| `mood` | `masculine / feminine / neutral / any`; 기본 any |

대운을 계산하지 않으므로 계산용 성별을 입력받지 않는다. 자형은 한글 NFC와 달리 임의로 정규화·이체자 치환하지 않는다. 한자 행 ID는 영속 데이터 버전 내 안정된 ID다. 현재 이름의 미검토 한자도 입력받되 검토한 필드만 설명한다. 임의 한자 문자열·프롬프트·AI용 근거 문자열은 받지 않는다.

이름 분위기를 `sexForBazi`로 변환하지 않는다. 기존 `BirthProfileInput` 저장 DTO 대신 이 입력을 `NatalBirthInput` 계산 경계로 변환한다. 정확한 시각이 오늘의 한국시간보다 미래이면 거절한다. 기존 역법·시간대 공급자의 검증 상한 2026-12-31을 넘어가는 입력은 공급자 범위와 경계 검증이 완료되기 전 지원한다고 표시하지 않는다.

공개 분석 DTO는 `{schemaVersion, analysisId, computedAt, versions, inputSnapshot, currentName, recommendations, receipt}`다. `versions`는 계산 규칙·한자·이름 검토 목록·지역·역법·공개 설정 버전을 명시한다. `currentName`은 `rated | partial` 상태, 등급 nullable, 확인된 풀이와 보류 코드를 갖는다. `recommendations.balance`와 `.amplify`는 각각 `available | withheld`, 공개 candidates 배열과 이유 코드를 갖는다. 정상 보류는 HTTP 200이며 실패를 보류로 바꾸지 않는다.

후보는 `{candidateId, hangul, hanja, meanings, targetElement, evidence, optionalNumerology}`다. ID는 분석 내 불투명 ID이며 rank 순서대로 전달한다. 균형형 최대 3개 확정→그 한글을 제외해 극대화형 최대 3개 확정→서버 `visibleCount` 1~3을 적용한다. 숨긴 후보의 ID·한글·한자·개수·근거는 DTO, HTML, RSC payload, source map 어디에도 싣지 않는다. 현재 이름 평가와 추천의 상세 판정 조건은 핵심 규칙을 따른다.

candidateId는 서버 키로 `analysisId + 유형 + 검증된 후보의 내부 정규 키`에 HMAC을 적용해 재계산 때 동일하게 얻는다. 원장만으로 이름을 사전 대입할 수 있는 단순 이름 hash를 쓰지 않는다.

## 2. 엔드포인트

| 요청 | 입력 | 정상 결과 |
| --- | --- | --- |
| `GET /config` | 없음 | 지원 날짜·국내 지역 목록 버전·UI에 필요한 옵션. 전체 한자·비공개 후보 제외 |
| `POST /hanja-search` | `{sound, cursor?}`; 한글 한 음절 | 최대 30개 자형·독음·확인된 뜻·검토 상태와 다음 cursor. 오행 미확인을 확정값처럼 반환하지 않음 |
| `POST /analyses` | 위 분석 입력 | 검증된 공개 분석 DTO. AI 호출 없음 |
| `POST /stories` | `{input, receipt, candidateId, attempt: 0\|1}` + `Idempotency-Key` UUID | `{analysisId, candidateId, attempt, story:{paragraphs:[string,string,string]}, promptVersion}` |

cursor는 서버에서 길이·형식·현재 사전 버전·독음과의 결합을 검증한다. 검색으로 공개 가능한 사전 행만 전달한다. 전체 파일 내려받기 엔드포인트는 없다. 한글당 페이지 검색을 반복하면 공개 행이 수집될 수 있다는 한계는 숨기지 않는다.

`/analyses`는 보안 난수 analysisId와 HttpOnly cookie를 발급한다. cookie는 256bit 난수, `__Host-name-browser; Secure; HttpOnly; SameSite=Strict; Path=/`, 30일 absolute expiry이고 DB에 원문을 보관하지 않는다. 개발 HTTP에서는 별도 이름을 쓴다. 영속 개인 기록의 소유자 인증이 아니므로 쿠키 삭제로 기존 브라우저 기록 읽기가 막히지는 않는다.

`receipt`는 버전 있는 JSON을 HMAC-SHA256으로 서명한 소형 토큰이며 최대 2 KiB다. 내용은 `{analysisId, inputMac, browserMac, versions, visibleCount, ageBand, issuedAt, expiresAt, keyId}`. `inputMac`은 서버 고정 필드 순서의 정규 입력에 대한 HMAC이며 단순 생년월일 hash를 쓰지 않는다. `browserMac`은 쿠키와 결합한다. 서명·입력 결합에는 별도 key purpose를 사용한다. 원본 입력·결과·숨긴 후보는 토큰에 넣지 않는다. 발급 후 24시간, 이후 story 생성만 만료된다.

회상문 서버는 서명·만료·현재 cookie·body 입력의 HMAC을 검사하고 같은 버전으로 다시 계산한다. 재계산한 공개 candidateId가 아니면 거절한다. 브라우저가 보낸 근거·등급은 사용하지 않는다. current 버전이나 공개 설정이 receipt와 다르면 `ANALYSIS_STALE`로 거절한다. 이전 버전 엔진을 유지하지 않는다. 만료·stale 시 저장된 내용은 계속 읽을 수 있지만 새 회상문에는 사용자 동작으로 새 분석을 받아야 한다. 새 분석 완료 때만 기존 기록을 교체한다. 과거 저장된 공개 후보를 새로운 비공개 정책으로 소급 삭제할 수는 없다.

## 3. 회상문과 재시도

DeepSeek `deepseek-flash`, `thinking:{type:"disabled"}`, JSON object mode, `max_tokens:1024`로 요청한다. 한 호출에는 후보 하나만 포함한다. 시스템 지시와 데이터 JSON을 분리하고 원본 출생정보·현재 이름 원문·쿠키를 보내지 않는다. 서버가 계산한 연령대는 한국시간 분석일과 환산 출생일의 만 나이로 `0–5 / 6–12 / 13–18 / 19+`를 구분해 receipt에 결합한다. 연령대에 맞지 않는 직장·결혼·긴 후회를 전제하지 않는다.

출력은 추가 키 없는 `{paragraphs:[문자열 3개]}`. NFC·trim 후 각 40~100, 합계 120~300 Unicode 코드 포인트, 내부 줄바꿈 불가. 코드·HTML로 해석하지 않는다. JSON·스키마·완료 상태·길이를 서버 검증하고 `finish_reason=length`나 잘린 출력을 실패 처리한다. 형식 검증이 실제 사건 비단정·연령 적합성·명리 근거 준수까지 보장하지 않으므로 대표 프롬프트 평가를 출시 조건에 둔다.

전체 시스템·사용자 메시지·채팅 형식 overhead를 포함한 입력 상한은 3,000토큰이다. [DeepSeek 토큰 안내](https://api-docs.deepseek.com/quick_start/token_usage/)의 공식 tokenizer를 모델 버전에 맞게 대조하고 한글·한자·메시지 포맷 기준 사례로 계수를 검증한다. 글자 수를 토큰 수로 대신하지 않는다. tokenizer가 정확한 채팅 overhead를 보장하지 못하면 검증된 보수 상한을 적용하며, 이를 확보하지 못하면 AI 기능을 켜지 않는다. 초과 입력을 임의 절단하지 않고 사전에 정의한 짧은 근거 요약으로 재구성하거나 `PROMPT_TOO_LARGE`로 거절한다.

운영 원장에 `(analysisId, candidateId, attempt)` unique와 `Idempotency-Key` unique를 둔다. 저장하는 candidateId는 무작위/불투명 식별자이며 이름을 포함하지 않는다. 같은 키를 다른 조합에 재사용하면 409다. 같은 조합에 새 키를 붙여도 호출을 추가하지 않는다. 원장 조회 전 receipt·cookie·입력 검증을 통과해야 한다.

- 최초는 attempt 0. 진행 중 중복 요청은 `STORY_IN_PROGRESS`와 Retry-After를 반환하고 재호출하지 않는다.
- 확정 실패, 또는 서버 완료 후 응답 유실이면 사용자가 ‘다시 불러오기’를 눌러 attempt 1을 한 번 허용한다. 응답 유실은 클라이언트 주장만으로 판별할 수 없으므로 완료된 attempt 0에도 attempt 1이 가능하다. UI는 이미 받은 성공 회상문에 재생성 버튼을 제공하지 않는다.
- 동일 완료 작업은 본문을 DB에 남기지 않아 `STORY_ALREADY_FINISHED`를 반환한다. 브라우저에 받은 문장이 있으면 그것을 사용한다. 없으면 남은 1회 시도만 가능하다. attempt 1 응답도 잃으면 이 분석에서 더 생성하지 않는다.
- timeout·전송 여부 불명 상태는 추가 호출 가능 여부가 확인되기 전 재시도하지 않는다. 자동 AI 재시도·SDK 재시도는 끈다. 비용 예약 전 거절은 attempt를 소모하지 않는다.
- 이름 분석을 새로 받으면 새 ID이므로 사람별 재시도 총량을 보장할 수 없다. 전체 일·월 한도가 최종 방어선이다.

외부 AI timeout은 30초, route 실행 한도는 최소 60초를 배포 설정에서 확보한다. 분석·DB·검증 시간을 포함해 이 범위를 넘으면 출시 전 조정하고 실제 환경에서 확인한다. 호출 중 트랜잭션·DB 연결을 붙잡지 않는다. 연결 종료와 AbortController는 최선의 취소 요청이며 공급자 실행 종료·무과금을 보장하지 않는다.

## 4. 원자 비용 원장

운영 테이블은 `name_ai_days`와 `name_ai_attempts` 두 개다. 비용은 USD의 10억분의 1 단위 정수 bigint로 저장한다. 일자는 예약 시점의 Asia/Seoul 날짜다. 월은 해당 날짜의 연월이며 자정·월말에 넘어가도 예약을 다른 달로 옮기지 않는다.

- days: 날짜 PK, 호출·성공·실패 횟수, 입력/출력 토큰, 확정 금액, 예약 금액.
- attempts: 무작위 operation ID, analysis/candidate ID, attempt, idempotency key, cookie HMAC, 요금·모델·prompt 버전, 예약 날짜·금액, 실제 usage·비용, 상태·오류 코드·시각, 공급자 실행 종료 확인 시각(nullable). 개인 입력의 HMAC은 DB에 저장하지 않는다.

상태는 `reserved → dispatching → succeeded | failed | uncertain`이다. 외부 전송 직전에 dispatching을 커밋한다. reserved에서만 죽은 경우에는 전송하지 않았음을 보장하므로 2분 후 예약을 취소할 수 있다. dispatching 이후 프로세스가 죽거나 timeout이면 uncertain이다. SQL 상태 전이는 조건부 갱신으로 한 번만 정산하며 중복 응답이 집계를 반복 변경하지 않는다.

예약·정산·복구마다 동일 PostgreSQL transaction advisory lock을 획득한다. 잠금 안에서 만료된 reserved를 정리하고 현재 일·월의 `확정 + 예약 + 새 최대 비용`과 reserved·dispatching 및 실행 종료가 확인되지 않은 uncertain 수를 확인한다. 월 $55, 일 $3, 동시 4 이하면 unique 예약과 집계를 함께 커밋한다. 이는 낮은 호출량에 맞춘 의도적인 전체 직렬화이며 DB transaction 시간만 잠근다. 외부 호출은 커밋 후 수행한다. 한도 변경은 동일 경로의 서버 설정만 사용한다.

현재 공식 혼잡·캐시 미적중 가격 입력 $0.30/백만·출력 $1.20/백만을 전제로 3,000 입력+1,024 출력 예약은 **$0.0021288 = 2,128,800 nano-USD**다. [공식 요금](https://api-docs.deepseek.com/quick_start/pricing/)을 배포 전 확인하고 요금 버전을 원장에 남긴다. 사용량 정산은 해당 호출에 적용된 공식 요금과 usage를 사용한다. 예상보다 큰 청구가 발견되면 실제 비용을 기록하고 신규 호출을 중단한다. 실제 요금 변경을 감지하지 못한 상태에서 절대 청구 상한을 보장한다고 주장하지 않는다.

공급자 실행 종료와 usage·적용 요금이 확인되면 실제 비용을 확정하고 남은 예약과 동시 슬롯을 해제한다. JSON·길이 등 응답 검증에 실패한 `STORY_INVALID`도 이 조건을 충족하면 `failed`로 정산하고 사용자 1회 재시도를 허용한다. 비용이 발생했다는 이유만으로 uncertain으로 두지 않는다. 실행 종료 또는 청구 여부가 불명인 경우에만 uncertain으로 남긴다. uncertain은 예약 상한 전액을 비용으로 보수 계상하며 실행 종료가 확인되지 않은 동안만 동시 슬롯을 차지한다. 시간 경과만으로 슬롯을 풀지 않는다. 공급자 종료·청구 내역을 확인한 운영자가 상태·비용을 대조한다. 실행 종료를 확인할 수 없는 4건이 쌓이면 신규 AI는 중단된 채로 유지한다. 자동으로 슬롯을 비워 실제 외부 실행 4개 초과 위험을 만들지 않는다. 운영자 화면은 만들지 않고 개인정보 없는 원장 점검·정산 SQL runbook으로 시작한다.

uncertain의 비용 보수 계상은 예약에서 확정 비용으로 상한 전액을 한 번 옮기는 상태 전이다. 예약과 확정 양쪽에 중복 더하지 않는다. 슬롯 해제와 금액 정산은 별도 판단이며 종료만 확인되고 실제 청구가 미확인이면 종료 확인 시각을 기록해 슬롯만 풀고 상한 비용은 유지한다.

짧은 브라우저/IP 제한은 보조다. 분석 10회/분, 검색 60회/분, 신규 story 6회/분의 인스턴스 메모리 제한을 둔다. 신뢰 가능한 배포 헤더의 IP만 사용하고 원문 IP를 로그·DB에 남기지 않는다. 재배포·다중 인스턴스·쿠키 삭제로 우회될 수 있으므로 이 제한을 비용 보호의 원자 한도로 설명하지 않는다. 추가 분산 rate-limit 저장소는 실제 남용이 확인될 때 검토한다.

## 5. 오류·보존·장애 복구

오류 DTO는 `{error:{code, message, retryable, retryAfterSeconds?}, requestId}`이며 검증 오류는 입력값을 되돌려 싣지 않는 field code만 추가한다.

| HTTP | 코드·처리 |
| --- | --- |
| 400 / 413 | `INVALID_INPUT / BODY_TOO_LARGE`; 필드 수정, 기존 결과 보존 |
| 403 | `ORIGIN_REJECTED / RECEIPT_INVALID`; AI 호출 없음 |
| 409 / 410 | `ANALYSIS_STALE / RECEIPT_EXPIRED`; 사용자 동작으로 새 분석 |
| 409 | `STORY_IN_PROGRESS / STORY_ALREADY_FINISHED / ATTEMPT_LIMIT / IDEMPOTENCY_CONFLICT`; 해당 작업 정책 적용 |
| 429 | `BUDGET_EXHAUSTED / AI_BUSY / RATE_LIMITED`; 신규 AI만 제한. 일·월 둘 다 걸리면 둘 다 풀리는 한국시간 시점을 안내 |
| 422 | `PROMPT_TOO_LARGE`; 회상문만 중단 |
| 502 / 504 | `STORY_INVALID / PROVIDER_FAILED / PROVIDER_UNCERTAIN`; 이름 결과 유지, 확정 여부에 따라 재시도 |
| 503 | `BUDGET_STORE_UNAVAILABLE / AI_DISABLED / CALCULATION_UNAVAILABLE`; DB 장애가 이름 계산 자체를 막지는 않음 |

보존 기간은 terminal attempts 7일, cookie HMAC 포함 비종결 상태는 대조 완료 때까지, days는 해당 월 종료 후 90일이다. 미종결 기록이 있으면 관련 days도 삭제하지 않는다. SQL 정리는 하루 한 번 및 운영 점검 시 수행한다. 오류 로그는 request ID·허용 코드·소요시간만 7일, 원장 외 로그에 cookie·입력·프롬프트·출력·전체 예외 메시지를 남기지 않는다. 호스팅의 접근 로그·외부 제공자 보관은 별도 정책으로 공개 전 실제 설정과 보존 기간을 확인한다.

DB 복원·복제·preview 환경에서 production AI 키를 사용하지 않는다. 원장을 과거 시점으로 복원하면 이미 쓴 비용이 사라질 수 있으므로 AI를 끄고 공급자 청구와 월 누계를 대조한 뒤 재개한다. 대조가 불가능하면 그 달 잔여 예산은 0으로 둔다. 운영 백업에도 두 운영 테이블만 포함하고 개인정보 테이블을 추가하지 않는다. 무료 플랜의 PITR/백업이 즉시 물리 삭제를 보장한다고 안내하지 않는다. 백업 만료 정책을 배포 때 기록하고 운영 DB 삭제는 논리 삭제·백업 만료를 구분한다.

브라우저 ‘전체 삭제’는 로컬 입력·결과·회상문·진행 요청을 지우고 revision을 바꾼다. 서버 운영 비용 기록과 제공자 보관까지 즉시 삭제하는 기능이라고 설명하지 않는다. 분석·회상문 응답을 받은 뒤 revision이 바뀌었으면 표시·저장을 모두 무시한다.

## 6. 구현 검증 조건

문서 작성만으로 아래를 통과했다고 보지 않는다. 이후 구현에서는 입력 경계·공개 후보 유출·서명/입력/후보 변조·만료·버전 변경·중복 키·서로 다른 키의 동일 attempt·1회 재시도·날짜/월 경계·동시 예약·프로세스 종료·불확실 과금·원장 복원·DB 장애를 자동 검증한다. 계산은 승인 규칙의 기준 사례와 보류 사례를 별도로 검증한다.

브라우저에서는 모바일 먼저 저장 실패·오염/이전 스키마·두 탭 경쟁·삭제 뒤 늦은 응답·새 분석 뒤 늦은 회상문·공유 URL 비식별을 확인하고 PC 배치를 확인한다. 개인정보와 전체 사전이 client bundle·RSC·로그·캐시·백업에 남지 않는지도 검사한다. 실제 API 사용료·토큰 계수·한국어 문체·호스팅 시간·국내 출생일 범위와 미상 시간 후보 포괄성을 확인하기 전 공개 준비 완료로 표시하지 않는다.
