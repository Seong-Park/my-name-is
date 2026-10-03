---
status: accepted
---

# ADR-005 — 격국 판정

작성: 2026-09-23.

본 ADR은 MyLife Standard Ruleset에서 **월령을 중심으로 격국 후보를 발견하고, 그 판정 상태를 표현하는 방식**을 정의한다.

격국의 취법·성격·파격·변격에는 학파별 차이가 존재하므로, MyLife v1에서는 일반격 후보의 근거를 명확히 계산하는 것을 우선하며 지원하지 않는 특수격을 임의로 확정하지 않는다.

또한 본 ADR에서 다루는 `격국의 기준이 되는 기운`과 ADR-006에서 다루는 `균형 용신`은 서로 다른 개념으로 분리한다.

## 결정

격국 판정은 다음 단계로 분리한다.

```text
월령 확인
   ↓
월지 지장간 확인
   ↓
투간 / 회지 등 후보 근거 확인
   ↓
Pattern Candidate 생성
   ↓
후보 우선순위 검토
   ↓
성격 / 파격 / 구제 조건 검토
   ↓
Pattern Status
```

MyLife v1에서는 **후보 발견과 제한적인 primary 후보 선정**까지만 자동화한다.

성격·파격·구제 조건이 충분히 구현되지 않은 경우 `confirmed` 격국으로 승격하지 않는다.

## 1. 월령 우선

격국 후보 탐색은 월지(月支)를 기준으로 시작한다.

월지의 지장간을 일간과 비교하여 십성 관계를 계산하고 격국 후보를 만든다.

일반격 후보는 다음 여덟 종류를 지원한다.

```text
正官
偏官 / 七殺

正財
偏財

正印
偏印

食神
傷官
```

## 2. 월지 지장간과 투간

월지 지장간 가운데 원국 천간에 투출한 기운을 우선적인 격국 후보로 등록한다.

각 후보에는 최소 다음 근거를 기록한다.

```text
hiddenStem
hiddenStemRole
tenGod

exposedAt:
- year
- month
- day 제외
- hour

isMainQi
isMiddleQi
isResidualQi
```

지장간의 본기·중기·여기 구분은 배열 위치에 의존하지 않고 `bazi-rules`의 명시적인 role을 사용한다.

## 3. 복수 투간

월지의 지장간 두 개 이상이 천간에 투출된 경우 후보를 임의로 하나만 남기지 않는다.

모든 후보를 보존한다.

예:

```text
patternCandidates:
- tenGod: 正財
  source: mainQi
  exposed: true

- tenGod: 傷官
  source: middleQi
  exposed: true
```

본기가 투출되어 있고 다른 명백한 변격 조건이 없는 경우 본기 후보를 `preferredCandidate`로 표시할 수 있다.

그러나 단순히:

```text
본기 > 중기 > 여기
```

라는 순서만으로 다른 후보를 제거하거나 격국을 확정하지 않는다.

향후 다음 요소를 이용한 우선순위 판정은 별도 ruleset으로 확장할 수 있다.

```text
투간
회지
극
합
청순
유력 여부
```

## 4. 투간이 없는 경우

월지 지장간이 천간에 하나도 투출되지 않은 경우 월지 본기를 `fallbackCandidate`로 등록한다.

이는 격국의 완전 성립을 의미하지 않는다.

결과 예:

```text
candidateSource:
month-main-qi-fallback

status:
candidate
```

월지의 회합 또는 다른 구조로 인해 후보가 변화할 수 있는 사례는 limitation 또는 별도 interaction evidence로 기록한다.

## 5. 비견·겁재 월령

월령의 기준 기운이 일간과 같은 오행인 비견·겁재인 경우 이를 일반 8격 중 하나로 억지 변환하지 않는다.

다음과 같은 별도 월령 구조 가능성을 표시한다.

```text
建祿
月劫
羊刃 등
```

다만 MyLife Standard v1에서는 이들 구조의 최종 성격·파격을 자동 확정하지 않는다.

결과는 예를 들어:

```text
patternFamily:
special-month-structure

specialReview:
true
```

로 반환한다.

이 경우 원국의 재·관·살·식상 등의 투간 또는 회지를 추가로 검토할 수 있도록 evidence를 보존한다.

## 6. 후보와 성립의 분리

다음 세 개념을 반드시 구분한다.

```text
Pattern Candidate
→ 월령 구조상 격국 후보가 존재함

Preferred Candidate
→ 현재 ruleset에서 우선적으로 검토할 후보

Confirmed Pattern
→ 성격·파격·구제까지 검토하여 실제 격국이 성립함
```

v1에서 성격·파격·구제 조건을 충분히 구현하지 않았다면 `Confirmed Pattern`을 생성하지 않는다.

예:

```text
patternCandidate:
正官格

candidateStatus:
preferred

formationStatus:
not_evaluated
```

를 허용한다.

UI와 LLM은 이를:

> "정관격입니다."

라고 표현해서는 안 되고,

> "월령을 기준으로 정관격 후보가 우선적으로 나타납니다."

처럼 상태를 보존해야 한다.

## 7. 성격·파격·구제

격국 후보의 존재만으로 격국의 성립을 확정하지 않는다.

향후 다음 구조를 별도의 ruleset에서 판정한다.

```text
成格
破格
救應
相神
忌神
清濁
有情 / 無情
```

해당 규칙이 구현되지 않은 경우:

```text
formationStatus:
not_evaluated
```

를 반환한다.

## 8. 특수격

다음과 같은 특수격은 v1에서 자동 확정하지 않는다.

```text
從格
化氣格
專旺格
기타 외격
```

가능성을 탐지할 수 있는 경우:

```text
status:
special_review

suspectedPatterns:
[...]
```

로 반환한다.

신강·신약 수치나 특정 단일 조건만으로 종격·화기격을 자동 확정하지 않는다.

미지원 범위는 [IMPLEMENTATION_TRACKER.md](../IMPLEMENTATION_TRACKER.md)에 명시한다.

## 9. 신강·신약과의 경계

ADR-004의 신강·신약 결과는 격국 분석에 참고 자료로 사용할 수 있으나:

```text
strengthClass
→ pattern
```

을 단순 직접 변환하지 않는다.

예:

```text
very_weak
≠
從格 확정
```

격국은 별도의 구조 판정이다.

## 10. 격국과 균형 용신의 용어 분리

고전 명리 문헌의 `用神`이라는 용어는 격국 문맥과 현대적인 균형 용신 문맥에서 서로 다른 의미로 사용될 수 있다.

MyLife 내부 모델에서는 혼동을 방지하기 위해 다음과 같이 분리한다.

```text
ADR-005

patternBasis
patternCandidate
patternSupport
```

ADR-005 내부 API와 DB에서는 가능한 한 `yongshin`이라는 필드명을 사용하지 않는다.

ADR-006에서는 별도로:

```text
balanceYongshin
favorableElement
unfavorableElement
```

개념을 사용한다.

두 결과를 동일한 것으로 취급하지 않는다.

## 11. 시간 미상

출생시간이 없는 경우 시간의 천간이 월지 지장간의 투간 여부를 변경할 수 있다.

따라서 가능한 후보가 시간에 따라 달라질 수 있다면 확정값을 만들지 않는다.

예:

```text
status:
partial

possibleCandidates:
- 正財
- 傷官
```

시간을 몰라도 후보 결과가 동일한 경우에도 원국 자체가 불완전하다는 `partial` 상태는 보존한다.

임의의 confidence 숫자는 생성하지 않는다.

## 12. Evidence

각 후보에는 최소 다음 정보를 보존한다.

```text
monthBranch

hiddenStem
hiddenStemRole
tenGod

exposureStatus
exposedPillars

candidateSource

candidateStatus
formationStatus

supportingEvidence[]
conflictingEvidence[]
limitations[]

ruleCode
rulesetVersion
```

탈락한 후보 역시 필요하면 `rejectedCandidates`에 이유와 함께 보존한다.

## 채택하지 않은 대안

### Alternative A — 월지 본기만으로 격국 결정

월지의 본기 십성만 보고 격국을 즉시 확정한다.

월령 내 다른 지장간의 투간과 변화 가능성을 충분히 표현하지 못하므로 채택하지 않는다.

### Alternative B — 투간 후보 중 본기 → 중기 → 여기 순으로 무조건 하나 선택

구현은 단순하지만 복수 투간·회지·극합 등에 따른 구조적 차이를 잃을 수 있으므로 기본 확정 규칙으로 채택하지 않는다.

본기 투간은 `preferredCandidate`를 정하는 하나의 근거로 사용할 수 있다.

### Alternative C — v1에서 성격·파격·특수격까지 모두 구현

범위와 학파별 차이가 너무 커 초기 검증이 어려우므로 채택하지 않는다.

## 수용 테스트

최소 다음 fixture를 검증한다.

* 월지 본기만 투간
* 월지 중기만 투간
* 월지 여기만 투간
* 본기 + 중기 복수 투간
* 중기 + 여기 복수 투간
* 지장간 전부 미투간
* 비견 월령
* 겁재 월령
* 건록·월겁 가능 사례
* 시간 천간 때문에 후보가 달라지는 사례
* 시간 미상
* 특수격 의심 사례
* 신강·신약이 극단적이지만 종격을 자동 확정하지 않는 사례

또한 API·UI·LLM이 다음 세 상태를 혼동하지 않는지 검증한다.

```text
candidate
preferred
confirmed
```

## 구현 원칙

```text
ruleset:
mylife-standard-v1

patternModel:
month-command-pattern-v1

primaryBasis:
month-branch

preserveMultipleCandidates:
true

autoConfirmPattern:
false

specialPatternAutoConfirmation:
false

strengthImpliesSpecialPattern:
false
```

## 결정 상태

본 ADR의 **후보 탐색 구조와 상태 모델**은 2026-09-23 사용자 요청으로 승인했다 (`status: accepted`).

성격·파격·구제 및 특수격의 최종 판정 규칙이 구현되기 전까지 자동 `confirmedPattern` 생성은 금지한다.

구현 및 검증 상태는 [IMPLEMENTATION_TRACKER.md](../IMPLEMENTATION_TRACKER.md)에서 별도로 관리한다.
