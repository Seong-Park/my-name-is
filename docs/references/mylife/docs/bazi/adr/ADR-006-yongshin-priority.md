---
status: accepted
---

# ADR-006 — 용신·희신·기신 판정 및 조정

작성: 2026-09-23.

본 ADR은 MyLife Standard Ruleset에서 **균형 관점의 용신·희신·기신**을 어떤 방법으로 탐색하고, 서로 다른 취용 방법의 결과를 어떻게 보존·조정할 것인지 정의한다.

ADR-005의 격국 판정에서 사용되는 `patternBasis`와 본 ADR의 `balanceYongshin`은 서로 다른 개념으로 관리한다.

명리학에는 억부·조후·통관·병약 등 서로 다른 취용 방법이 존재하며 그 적용과 우선순위에는 학파별 차이가 있으므로, MyLife v1은 근거 없이 하나의 절대 용신을 강제하지 않는다.

## 결정

MyLife v1에서는 다음 방법을 독립적인 분석 모듈로 취급한다.

```text
調候  johu
抑扶  eokbu
通關  tonggwan
病藥  byeongyak
```

각 방법은 자신의 적용 조건을 독립적으로 평가한다.

```text
원국
 │
 ├─ Johu Analysis
 ├─ Eokbu Analysis
 ├─ Tonggwan Analysis
 └─ Byeongyak Analysis
        │
        ▼
 Balance Resolution
        │
        ├─ resolved
        ├─ aligned
        ├─ conflict
        └─ unresolved
```

고정된 전역 우선순위만으로 다른 방법의 결과를 제거하지 않는다.

## 1. 방법별 적용 상태

각 분석 방법은 최소 다음 상태 중 하나를 반환한다.

```text
applicable
not_applicable
insufficient_data
unsupported
not_evaluated
```

`applicable`인 경우에만 해당 방법의 용신 후보를 생성한다.

규칙이 구현되지 않았거나 검증되지 않은 방법을 임의로 적용하지 않는다.

## 2. 조후

조후는 일간·월령·원국 조건을 이용한 **검증된 조후 ruleset**이 존재하고 해당 적용조건을 충족할 때만 평가한다.

단순히 겨울이라는 이유로 火를, 여름이라는 이유로 水를 자동 용신으로 지정하지 않는다.

조후 규칙은 필요할 경우 특정 오행뿐 아니라 특정 천간을 요구할 수 있다.

따라서 후보 모델은 다음을 지원한다.

```text
targetElement
targetStem?        // optional
reason
conditions[]
```

예:

```text
method: johu
targetElement: fire
targetStem: 丁
```

검증된 조후 규칙표가 존재하지 않는 일간·월령·조건 조합은 `unsupported` 또는 `not_evaluated`로 반환한다.

## 3. 억부

억부 분석은 ADR-004의 신강·신약 판정이 충분히 확정된 경우에 평가한다.

### 일간이 약한 경우

기본 검토 방향:

```text
印 → 生扶
比劫 → 幫扶
```

이를 억부 후보의 **검색 공간(search space)**으로 사용한다.

### 일간이 강한 경우

기본 검토 방향:

```text
食傷 → 泄
財   → 耗
官殺 → 克
```

역시 후보 검색 공간으로 사용한다.

이 분류만으로 특정 오행을 최종 용신으로 선택하지 않는다.

실제 후보 선택에서는 최소 다음을 추가 검토한다.

```text
원국에 해당 기운이 존재하는가
계절적으로 기능할 수 있는가
다른 강한 기운과 충돌하는가
이미 과도한 세력인가
통근·투간 상태는 어떠한가
```

`balanced_or_uncertain`인 경우 억부만으로 단일 용신을 강제하지 않는다.

## 4. 통관

통관은 두 세력이 실제로 대립하고 있고, 그 사이를 이어주는 오행이 구조적으로 의미가 있다는 **검증된 진단 규칙**을 만족할 때만 평가한다.

단순히 상극 관계 두 오행이 존재한다는 이유만으로 통관 용신을 생성하지 않는다.

결과에는 최소 다음 근거를 남긴다.

```text
conflictingForces[]
bridgeElement
ruleCode
evidence[]
```

## 5. 병약

병약은 원국에서 명시적으로 정의된 `病` 구조와 이를 제거하거나 완화하는 `藥`의 대응 규칙이 구현되어 있을 때만 평가한다.

병약 규칙이 구현되지 않은 사례는 임의 판단하지 않는다.

```text
disease
remedy
evidence
```

를 각각 구조화하여 보존한다.

## 6. 특수격

ADR-005에서 다음 상태인 경우:

```text
special_review
unsupported_special_pattern
```

일반 억부 결과만을 이용하여 최종 용신·희신·기신을 확정하지 않는다.

단, 조후 등 독립적으로 계산 가능한 방법별 진단 자체는 보존할 수 있다.

예:

```text
johu:
  status: applicable

eokbu:
  status: suspended_due_to_special_pattern

resolution:
  unresolved
```

## 7. 방법 간 조정

각 방법의 결과를 별도로 보존한 뒤 `Balance Resolution` 단계에서 비교한다.

### Aligned

여러 적용 가능한 방법이 동일하거나 양립 가능한 기운을 지지한다.

```text
조후 → 火
억부 → 火

resolution:
aligned
```

### Conflict

적용 가능한 방법들이 서로 다른 방향을 요구한다.

```text
조후 → 火
억부 → 金

resolution:
conflict
```

충돌을 숨기거나 임의의 전역 우선순위로 한쪽 결과를 삭제하지 않는다.

### Resolved

검증된 ruleset에 의해 하나의 주용신을 선택할 충분한 근거가 있는 경우다.

### Unresolved

후보는 존재하지만 현재 ruleset으로 하나를 선택할 근거가 충분하지 않은 경우다.

## 8. 주용신

단일 주용신은 검증된 선택 규칙이 있을 때만 생성한다.

```text
primaryYongshin:
{
  element,
  stem?,
  method,
  ruleCode,
  evidence
}
```

선택 규칙이 없으면:

```text
primaryYongshin: null
resolutionStatus: unresolved
```

로 반환한다.

`shiksang_or_jaeseong`과 같은 범주 문자열을 오행 값에 저장하지 않는다.

## 9. 희신

희신은 최종 용신을 단순히 생하는 오행이라는 이유만으로 자동 지정하지 않는다.

각 method 또는 최종 resolution의 규칙에 따라:

```text
왜 도움이 되는가
어떤 용신 또는 구조를 보조하는가
어떤 조건에서 유효한가
```

를 명시할 수 있어야 한다.

희신은 하나 이상일 수 있다.

## 10. 기신

기신 역시 용신을 극한다는 이유만으로 자동 지정하지 않는다.

해당 원국에서 실제로 어떤 구조를 악화시키는지 근거가 있어야 한다.

기신은 하나 이상일 수 있다.

필요한 경우 다음 역할도 허용한다.

```text
neutral
conditional
```

따라서 모든 오행을 반드시 용신·희신·기신 중 하나에 강제 배정하지 않는다.

## 11. 후보 표현

용신 후보는 최소 다음 구조를 지원한다.

```text
method

target:
  element
  stem?

role:
  yongshin_candidate
  heeshin_candidate
  gishin_candidate

status:
  candidate
  selected
  rejected

priority?
ruleCode
rulesetVersion

supportingEvidence[]
conflictingEvidence[]
conditions[]
limitations[]
```

`priority`는 실제 ruleset에서 근거가 확정된 경우에만 기록한다.

## 12. 신강·신약 불확실성

ADR-004 결과가 다음과 같은 경우:

```text
partial
provisional
balanced_or_uncertain
```

억부 결과 역시 그 불확실성을 상속한다.

예:

```text
eokbu.status:
insufficient_data
```

다른 방법이 계산 가능하더라도 전체 `Balance Resolution`은 별도로 판정한다.

## 13. 시간 미상

출생시간 미상으로 조후·억부·통관·병약 결과가 달라질 수 있다면 가능한 후보를 보존한다.

임의의 시주를 생성하여 용신을 확정하지 않는다.

후보 전체에서 동일하게 유지되는 결과가 있더라도 원국이 불완전하다는 `partial` 상태를 보존한다.

## 14. LLM 계약

LLM은 `candidate`, `conflict`, `unresolved` 결과를 확정값으로 표현해서는 안 된다.

예:

```text
resolutionStatus: unresolved
```

이면 금지:

"당신의 용신은 火입니다."

허용:

```text
"조후 관점에서는 火가 후보로 나타나지만,
현재 ruleset에서는 이를 최종 용신으로
확정할 근거가 충분하지 않습니다."
```

## 15. Evidence

최종 결과에는 최소 다음을 보존한다.

```text
rulesetVersion

methodResults[]
resolutionStatus

primaryYongshin?

heeshinCandidates[]
gishinCandidates[]

supportingEvidence[]
conflictingEvidence[]
limitations[]
```

각 method result에는 자신이 사용한 `ruleCode`를 별도로 보존한다.

## 채택하지 않은 대안

### Alternative A — 조후 절대 우선

조후 후보가 존재하면 다른 방법의 결과와 무관하게 이를 최종 용신으로 확정한다.

극단적 한난조습에서 조후가 중요할 수 있으나 모든 명식에 적용 가능한 보편적 우선순위로 검증되지 않았으므로 MyLife Standard v1에서는 채택하지 않는다.

### Alternative B — 억부 단일 모델

신강이면 설·모·극, 신약이면 생·부만으로 모든 용신을 결정한다.

구현은 단순하지만 조후·통관·병약 등의 구조를 표현하지 못하므로 채택하지 않는다.

### Alternative C — 모든 오행 강제 분류

木·火·土·金·水를 반드시 용신·희신·기신 중 하나로 분류한다.

근거 없는 역할 배정을 발생시킬 수 있으므로 채택하지 않는다.

## 수용 테스트

최소 다음 fixture를 구축한다.

* 조후만 적용 가능한 명식
* 억부만 명확한 명식
* 조후와 억부가 동일한 오행을 지지하는 사례
* 조후와 억부가 충돌하는 사례
* 통관 조건이 명확한 사례
* 통관처럼 보이지만 조건을 충족하지 않는 사례
* 병약 조건이 명확한 사례
* balanced_or_uncertain
* 특수격 검토 대상
* 시간 미상
* 후보는 있으나 주용신을 선택할 규칙이 없는 사례
* 특정 천간과 동일 오행을 구별해야 하는 조후 사례
* LLM이 candidate를 확정값으로 표현하지 않는지

## 구현 원칙

```text
ruleset:
mylife-standard-v1

balanceModel:
multi-method-resolution-v1

methods:
- johu
- eokbu
- tonggwan
- byeongyak

globalMethodPriority:
none

preserveMethodResults:
true

allowConflict:
true

requireRuleForPrimaryYongshin:
true

autoAssignHeeshin:
false

autoAssignGishin:
false

supportStemSpecificCandidate:
true
```

## 결정 상태

본 ADR의 **다중 방법 분석 구조와 resolution 상태 모델**은 2026-09-23 사용자 요청으로 승인했다 (`status: accepted`).

각 조후·억부·통관·병약의 세부 ruleset과 최종 주용신 선택 규칙은 검증된 fixture 및 출처가 준비될 때까지 별도로 `proposed` 상태로 관리한다.

본 ADR의 채택만으로 특정 명식의 용신·희신·기신 판정이 구현 완료된 것으로 간주하지 않는다.

구현 및 검증 상태는 [IMPLEMENTATION_TRACKER.md](../IMPLEMENTATION_TRACKER.md)에서 별도로 관리한다.
