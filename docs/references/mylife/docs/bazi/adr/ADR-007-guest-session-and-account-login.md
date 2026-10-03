---
status: accepted
---

# ADR-007 — 비회원 출생정보 저장과 향후 계정 로그인

작성: 2026-09-23.

## 배경과 확정된 방향

MyLife Bazi의 첫 입력·저장 구현은 로그인을 요구하지 않는 비회원 흐름으로 시작한다.

첫 구현 목표는 다음과 같다.

```text
출생정보 입력
→ 검증
→ 서버가 비회원 소유자 확인
→ DB 저장
→ 같은 비회원이 재조회
```

회원가입·로그인 제공자 연동은 후속 단계로 둔다.

향후 로그인 기능이 추가되더라도 현재의 BirthProfile 입력·검증·저장 use case와 명리 계산 엔진은 재사용할 수 있어야 한다.

인증과 소유권은 명리 도메인과 분리한다.

---

## 1. 핵심 원칙

비회원 데이터도 명시적인 소유 주체를 가진다.

다음 세 개념을 구분한다.

```text
Principal
= 데이터의 소유 주체

Session
= 현재 요청자가 그 Principal임을 증명하는 자격증명

BirthProfile
= Principal이 소유한 출생정보
```

세션 자체를 BirthProfile의 영속적인 소유자로 사용하지 않는다.

---

## 2. 비회원 Principal

최초 비회원 세션을 생성할 때 서버는 새로운 Guest Principal을 생성한다.

예:

```text
principal
├─ id
└─ kind = guest
```

모든 비회원이 공유하는 guest user 또는 공용 guest owner를 사용하지 않는다.

BirthProfile은 이 Principal을 소유자로 참조한다.

```text
birth_profiles.owner_principal_id
```

이를 통해 세션 토큰이 갱신되거나 교체되어도 BirthProfile의 소유권은 유지된다.

---

## 3. 비회원 Session

Guest Principal에 접근하기 위한 세션은 서버가 생성하고 검증한다.

브라우저에는 예측하기 어려운 opaque session credential만 전달한다.

쿠키에는 다음 데이터를 넣지 않는다.

```text
생년월일
출생시간
출생도시
BirthProfile
ownerPrincipalId
```

브라우저 cookie에는 세션 credential만 저장한다.

운영 HTTPS 환경에서는 최소 다음 속성을 사용한다.

```text
Secure
HttpOnly
SameSite=Lax 또는 Strict (배포 구조에 맞춰 명시)
Path=/
```

가능하면 `__Host-` cookie prefix를 사용하며 `Domain` attribute를 지정하지 않는다.

---

## 4. Session Credential 저장

세션 credential 원문을 DB에 그대로 저장하지 않는다.

개념적으로:

```text
Browser
↓
opaque random session token

Server
↓
hash(token)

DB
↓
guest_sessions.token_hash
```

형태로 관리한다.

DB에는 최소 다음 정보를 둘 수 있다.

```text
guest_sessions
├─ id
├─ principal_id
├─ token_hash
├─ created_at
├─ last_seen_at
├─ expires_at
└─ revoked_at
```

구체적인 token format, entropy, hash 방식, idle timeout 및 absolute timeout은 인증 구현 SPEC에서 확정한다.

---

## 5. 서버가 소유자를 결정한다

BirthProfile 생성·조회·수정·삭제 시 요청 body의 다음 값을 소유권 근거로 사용하지 않는다.

```text
userId
ownerId
principalId
```

서버가 검증된 세션으로부터 Principal을 결정한다.

예:

```text
request
↓
session credential
↓
session validation
↓
principalId
↓
Application Use Case
```

API 사용자가 임의의 Principal ID를 보내 다른 사용자 데이터를 생성하거나 조회할 수 없어야 한다.

---

## 6. 조회 권한

BirthProfile 조회는 ID만으로 수행하지 않는다.

개념적으로:

```text
WHERE
  birth_profile.id = requestedId
AND
  birth_profile.owner_principal_id = currentPrincipalId
```

조건을 만족하는 경우에만 반환한다.

다른 Principal이 profile ID를 알고 있더라도 접근할 수 없어야 한다.

---

## 7. CSRF 및 상태 변경 요청

Session cookie의 `SameSite` 속성은 방어 계층 중 하나로 사용하지만 유일한 CSRF 방어 수단으로 간주하지 않는다.

상태 변경 요청:

```text
POST
PUT
PATCH
DELETE
```

에서는 서버가 Origin을 검증한다.

지원 가능한 환경에서는 Fetch Metadata (`Sec-Fetch-Site` 등)를 추가 방어 신호로 사용할 수 있다.

`GET`, `HEAD` 등의 safe method는 서버 상태를 변경해서는 안 된다.

CSRF token 도입 여부는 실제 deployment 구조와 authentication implementation에 따라 후속 보안 SPEC에서 확정한다.

---

## 8. 비회원 데이터 접근 범위

유효한 Guest Session을 가진 브라우저에서는 저장된 BirthProfile을 재조회할 수 있다.

다음 경우 기존 비회원 데이터에 접근할 수 없을 수 있다.

```text
session cookie 삭제
session 만료
session 폐기
다른 브라우저
다른 기기
```

생년월일·출생도시·이름 등의 값이 동일하다는 이유로 기존 데이터의 소유권을 복구하지 않는다.

로그인 계정으로 연결되지 않은 비회원 데이터는 계정 기반 복구를 지원하지 않는다.

UI는 이 제한을 사용자에게 오해 없이 안내해야 한다.

---

## 9. 저장 실패

다음 상황을 저장 성공으로 표시하지 않는다.

```text
session validation 실패
DB transaction 실패
database unavailable
ownership resolution 실패
```

저장 실패 시 화면은 가능한 한 사용자의 입력값을 유지하고 재시도를 제공한다.

공용 guest profile이나 다른 Principal의 데이터로 fallback하지 않는다.

---

## 10. 중복 요청과 Idempotency

네트워크 오류 또는 DB 응답 손실 후 같은 생성 요청이 재전송될 수 있다.

BirthProfile의 생년월일·출생도시 등의 내용이 동일하다는 이유로 중복 여부를 판단하지 않는다.

생성 요청의 재시도를 식별하기 위해:

```text
Idempotency-Key
```

또는 동등한 client operation identifier를 사용한다.

같은 Principal에서 같은 생성 operation의 재시도는 하나의 생성 결과로 수렴해야 한다.

서로 다른 정상적인 BirthProfile은 동일한 출생정보를 가지고 있어도 별개의 데이터로 저장할 수 있다.

---

## 11. 도메인 경계

BirthProfile의 명리 입력 데이터와 인증·소유권을 분리한다.

```text
bazi-domain
bazi-engine
```

은 다음 개념을 알 필요가 없다.

```text
OAuth provider
social login
guest session token
cookie
JWT
authentication library
```

소유권과 인증은 Application / Web / DB 경계에서 처리한다.

명리 엔진은 정규화된 BirthProfile만 입력받는다.

---

## 12. 향후 로그인

향후 로그인 도입 후 목표 흐름은:

```text
로그인
→ Account Principal 확인
→ BirthProfile 입력
→ Account Principal 소유로 저장
→ 다른 기기에서도 동일 계정으로 조회
```

이다.

로그인 provider, 인증 library 및 기존 MyLife 계정 재사용 여부는 별도 ADR에서 결정한다.

---

## 13. Guest → Account 연결

기존 Guest Principal의 BirthProfile을 로그인 계정으로 연결하는 기능은 후속 구현 대상으로 둔다.

연결 시 최소 다음 조건을 만족해야 한다.

1. 현재 Guest Session이 유효해야 한다.
2. 로그인 Account 인증 역시 유효해야 한다.
3. 사용자가 이전할 BirthProfile을 명시적으로 확인해야 한다.
4. 소유권 이전은 transaction으로 처리한다.
5. 실패하면 기존 Guest 소유권을 유지한다.
6. 동일 요청의 재시도는 중복 BirthProfile을 만들지 않는다.
7. 동시 소유권 이전 요청에서는 하나만 성공해야 한다.
8. 연결 완료 후 이전 Guest credential로 이전된 데이터에 접근할 수 없어야 한다.

Guest Principal과 Account Principal이 별도로 존재하는 경우 BirthProfile의 `owner_principal_id`를 Account Principal로 이전한다.

BirthProfile의 ID와 원본 출생정보는 유지한다.

필요하면 소유권 이전 감사 기록을 별도 보존한다.

---

## 14. 로그인 시 Session Rotation

비회원 상태에서 로그인에 성공하면 기존 Guest Session credential을 그대로 인증된 계정 세션으로 승격하지 않는다.

```text
Guest Session
↓
로그인 성공
↓
새 Authenticated Session 생성
↓
필요한 소유권 연결
↓
기존 Guest Session 폐기
```

인증 수준이 바뀔 때 session identifier를 교체한다.

로그아웃하면 Account Session을 폐기한다.

---

## 15. 계정에 기존 Profile이 있는 경우

로그인 계정에 이미 BirthProfile이 있더라도 다음을 자동 수행하지 않는다.

```text
생년월일 기반 병합
자동 overwrite
자동 deduplication
```

계정당 복수 BirthProfile 허용 여부와 대표 Profile 정책은 별도 제품 결정으로 관리한다.

---

## 16. Guest 데이터 보존

Guest Session을 잃은 사용자는 기존 Guest Principal의 BirthProfile에 다시 접근하지 못할 수 있다.

따라서 접근 불가능한 Guest 데이터가 무기한 저장되지 않도록 별도의 retention policy를 운영 전에 정의한다.

향후 정책은 다음 상태를 고려한다.

```text
active guest
expired guest
linked account
orphaned guest
scheduled deletion
deleted
```

정확한 보존 기간은 본 ADR에서 확정하지 않는다.

---

## 17. 기존 서비스와의 경계

기존 MyLife 서비스의 `users` 테이블, guest provider, JWT utility가 존재한다는 이유만으로 신규 Bazi 서비스의 인증 계약으로 자동 채택하지 않는다.

다음 사항을 로그인 구현 전에 별도로 검토한다.

```text
기존 계정 재사용 여부
독립 계정 여부
Principal ID 호환성
cookie scope
session 검증 방식
provider mapping
```

기존 JWT utility의 fallback secret 등 검증되지 않은 인증 구현을 신규 서비스로 복사하지 않는다.

---

## 18. 최소 DB 구조

최초 비회원 BirthProfile 구현에는 최소 다음 데이터 구조가 필요하다.

```text
principals
guest_sessions
birth_profiles
```

개념 관계:

```text
Principal
    │
    ├── Guest Session
    │
    └── Birth Profiles
```

`principals`는 최소 `id`, `kind (guest | account)`, `created_at`을 가지며, `guest_sessions.principal_id`와 `birth_profiles.owner_principal_id`는 해당 Principal을 참조한다. 한 Principal은 여러 Session과 BirthProfile을 가질 수 있고, Session rotation만으로 소유자 ID가 변경되지 않는다.

세부 schema와 FK·고유성 제약은 [DB_SCHEMA.md](https://github.com/Seong-Park/mylife/blob/9c3566c61ae18c1c0884d07dff8aa48657bbd58a/docs/bazi/DB_SCHEMA.md)에서 정의한다.

`birth_profiles` 단독 테이블만으로 소유권과 세션을 표현하지 않는다.

---

## 19. 검증 계약

최소 다음 테스트를 구현한다.

### Isolation

* Guest A의 BirthProfile은 A만 조회할 수 있다.
* Guest B가 A의 profile ID를 알아도 조회할 수 없다.

### Credential

* session 없음
* 위조 session
* 만료 session
* revoked session

에서 보호된 데이터에 접근할 수 없다.

### Ownership Injection

요청 body 또는 query에 임의의:

```text
ownerId
userId
principalId
```

를 넣어도 소유권을 변경할 수 없다.

### Session Rotation 및 CSRF

* Guest Session 토큰 교체 후에도 Principal ID와 BirthProfile 소유권이 유지된다.
* 폐기된 이전 토큰은 더 이상 인증에 사용할 수 없다.
* DB에는 세션 token 원문이 저장되지 않는다.
* 상태 변경 요청의 허용되지 않은 Origin은 거절한다.
* GET·HEAD는 사용자 데이터를 생성·수정·삭제하지 않는다.
* 향후 로그인 시 새로운 Account Session을 발급하고 기존 Guest credential을 승격하지 않는지 검증한다.

### Persistence

새로고침 및 재조회 이후에도 다음 원본 값이 유지된다.

```text
출생일
출생시간
timeAccuracy
unknown 시간의 null
출생도시 snapshot
calendar type
sexForBazi
```

### Failure

DB 저장 실패를 성공으로 표시하지 않는다.

### Retry

동일 생성 operation 재시도가 중복 BirthProfile을 생성하지 않는지 검증한다.

### Account Linking

향후 다음을 검증한다.

* Guest 인증 + Account 인증
* 사용자 확인
* transaction rollback
* idempotent retry
* concurrent linking
* 연결 후 Guest 접근 차단
* BirthProfile ID 유지

---

## 20. 아직 결정하지 않은 사항

다음 항목은 후속 ADR 또는 인증 SPEC에서 결정한다.

2026-09-26 [도입 경험 기획](https://github.com/Seong-Park/mylife/blob/9c3566c61ae18c1c0884d07dff8aa48657bbd58a/docs/superpowers/specs/2026-09-26-birth-entry-experience-design.md#6-가입-시점과-소셜-로그인)에서 가입 요청 시점과 로그인 provider의 제품 정책을 확정했다. 해당 정책은 도입 경험 기획을 기준으로 읽는다. 인증 구현과 상세 Guest → Account 연결 UX는 여전히 후속 범위다.

```text
인증 library
기존 MyLife 계정 재사용 여부
session token format
session idle timeout
session absolute timeout
Guest 데이터 retention 기간
계정당 BirthProfile 수
대표 BirthProfile 정책
Guest → Account 연결 UX
계정 삭제 시 데이터 보존 정책
CSRF token 필요 여부
```

## 결정 상태

2026-09-23 사용자 요청으로 승인했다 (`status: accepted`).

본 ADR의 채택은 **비회원 데이터의 소유권 모델과 향후 계정 전환을 고려한 인증 경계**를 승인하는 것이다.

2026-09-23의 본 ADR 채택은 특정 로그인 provider나 인증 library를 승인한 것이 아니다. 후속 제품 정책은 위 도입 경험 기획을 따르며, 이 결정만으로 로그인이나 계정 연결 구현이 완료된 것으로 간주하지 않는다.

구현 및 테스트 현황은 [IMPLEMENTATION_TRACKER.md](../IMPLEMENTATION_TRACKER.md), 저장 구조는 [DB_SCHEMA.md](https://github.com/Seong-Park/mylife/blob/9c3566c61ae18c1c0884d07dff8aa48657bbd58a/docs/bazi/DB_SCHEMA.md)에서 관리한다. 본 ADR의 승인은 구현이나 테스트 완료를 의미하지 않는다.

## M1 완료 조건과 후속 문서 반영

첫 vertical slice의 완료 조건은 다음 전체 흐름이다.

```text
Guest Principal 생성
→ Guest Session 발급
→ BirthProfile 입력·검증
→ 서버에서 검증된 Session으로 Principal 결정
→ BirthProfile 저장
→ 동일 Session으로 재조회
```

M1은 `birth_profiles` 단독 생성으로 완료되지 않는다. `principals`, `guest_sessions`, `birth_profiles`의 관계와 본 ADR의 비회원 검증 계약까지 구현·검증해야 한다.

[DB_SCHEMA.md](https://github.com/Seong-Park/mylife/blob/9c3566c61ae18c1c0884d07dff8aa48657bbd58a/docs/bazi/DB_SCHEMA.md)와 [IMPLEMENTATION_TRACKER.md](../IMPLEMENTATION_TRACKER.md)의 후속 갱신에서는 이 결정에 맞춰 스키마와 M1 범위를 반영한다. 본 문서의 승인만으로 해당 문서의 동기화나 migration 적용이 완료된 것으로 간주하지 않는다.
