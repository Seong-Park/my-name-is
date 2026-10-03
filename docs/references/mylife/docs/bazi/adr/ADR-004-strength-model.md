---
status: accepted
---

# ADR-004 — 신강·신약 판정 모델

작성: 2026-09-23.

본 ADR은 MyLife Standard Ruleset에서 일간의 강약을 어떤 자료와 절차를 이용하여 판정할 것인지 정의한다.

신강·신약에는 학파별 판단 차이가 존재하므로 본 ADR은 명리학의 절대적 강도 수치를 정의하지 않는다.

MyLife v1에서는 **설명 가능한 다축 판정 모델**을 사용하며, 검증되지 않은 단일 점수나 확률을 사용자에게 제시하지 않는다.

## 결정

신강·신약을 하나의 임의 가중합으로 즉시 환산하지 않는다.

다음 세 축을 우선적으로 별도 계산한다.

```text
得時 / 月令
→ 계절적으로 일간이 힘을 얻는가

得地 / 通根
→ 지지에 실제 뿌리를 가지고 있는가

得勢 / 扶助
→ 비겁·인성 등 일간을 돕는 세력이 충분한가
```

여기에 일간의 힘을 밖으로 소모하거나 제어하는 요소를 별도로 계산한다.

```text
食傷 → 泄 / output

財 → 耗 / expenditure

官殺 → 克 / control
```

이 결과를 ruleset의 명시적인 판정 규칙으로 종합하여 `strengthClass`를 결정한다.

## 1. 월령 / 得時

월지는 단순히 네 지지 중 하나의 고정 점수로 취급하지 않는다.

월령은 일간과 각 오행이 태어난 계절에서 어느 정도 힘을 얻는지를 판단하는 전역 환경 조건으로 취급한다.

최소 다음 값을 별도로 반환한다.

```text
monthBranch
season

dayMasterSeasonalState

hasSeasonalSupport
seasonalEvidence
```

왕·상·휴·수·사 등 구체적인 계절 상태 표는 `bazi-rules`에서 별도 버전 관리한다.

## 2. 통근 / 得地

일간이 네 지지의 지장간에 뿌리를 가지고 있는지 계산한다.

최소 다음을 구분한다.

```text
rootBranch
rootHiddenStem
rootType
rootDepth
```

지장간의 본기·중기·여기와 통근 강도의 대응 규칙은 별도의 ruleset으로 관리한다.

월령과 통근은 서로 다른 근거이므로 둘을 하나의 점수로 중복 표현하지 않는다.

## 3. 생조 및 동당 / 得勢

일간과 같은 오행인 비겁과 일간을 생하는 인성을 일간을 돕는 요소로 분석한다.

내부적으로 다음 값을 분리한다.

```text
peerSupport
resourceSupport
```

둘을 필요할 경우 `totalSupport`로 합산할 수 있으나 원시 기여값은 유지한다.

## 4. 극·설·모

일간의 힘을 감소시키거나 제약하는 관계 역시 하나의 `drain` 값으로 평탄화하지 않는다.

다음 세 종류를 별도로 계산한다.

```text
outputDrain
→ 식상 / 일간이 생하는 기운

wealthExpenditure
→ 재성 / 일간이 극하는 기운

controlPressure
→ 관살 / 일간을 극하는 기운
```

필요한 경우 UI 또는 상위 판정에서 종합값을 만들 수 있으나 원시 분류를 보존한다.

## 5. 지장간

지지의 지장간은 `bazi-rules`에 정의된 구조를 사용한다.

본기·중기·여기 등의 기여 차이는 ruleset으로 명시적으로 관리한다.

검증 전 임의의 정규화 weight를 신강·신약의 절대 가중치로 사용하지 않는다.

## 6. 판정 결과

최종 판정은 최소 다음 등급을 지원한다.

```text
very_weak
weak
balanced_or_uncertain
strong
very_strong
```

`balanced_or_uncertain`은 명리학적으로 완전한 중화를 뜻하는 값이 아니라, 현재 ruleset으로 strong 또는 weak를 확정하기 어려운 상태도 포함할 수 있다.

따라서 별도의 `confidence`와 `status`를 함께 반환한다.

예:

```text
status:
confirmed | provisional | partial | unsupported

strengthClass:
strong

confidence:
high | medium | low
```

## 7. Evidence

모든 판정에는 판정 근거를 함께 반환한다.

예:

```text
dayMaster = 甲

seasonal:
- 卯월
- 木이 계절의 힘을 얻음

roots:
- 일지 寅의 본기 甲에 통근
- 시지 卯에 통근

support:
- 월간 壬의 생조

pressure:
- 연간 庚의 극
- 시간 丙의 설

result:
strong
```

사용자는 최종 등급뿐 아니라 왜 해당 등급이 나왔는지 추적할 수 있어야 한다.

## 8. Diagnostic values

엔진 개발과 fixture 비교를 위해 내부 diagnostic 수치를 둘 수 있다.

```text
seasonalSupport
rootSupport
peerSupport
resourceSupport

outputPressure
wealthPressure
controlPressure
```

이 값들은 다음 용도로만 사용한다.

* 동일 ruleset의 재현성 검사
* fixture 비교
* 알고리즘 조정
* 전문가 검증

검증되지 않은 diagnostic 값을 명리학의 절대 강도, 확률 또는 사용자 점수로 표시하지 않는다.

v1의 가중치 및 임계값은 fixture 검증 전 ADR에서 확정하지 않는다.

## 9. 합·충·형·파·해

v1에서는 합·충 등의 관계가 탐지되었다는 이유만으로 오행을 자동 소멸·변환하거나 임의의 정량 감점을 적용하지 않는다.

예:

```text
子午沖 발견
≠
水 -30%, 火 -30%
```

대신 해당 관계를 `interactionEvidence` 및 `limitation`으로 보존한다.

합화 성립, 통근 손상 등 상호작용을 강약 판정에 반영하는 규칙은 별도의 ruleset 또는 후속 ADR에서 정의한다.

## 10. 격국 및 종격

신강·신약 판정만으로 격국이나 종격을 자동 결정하지 않는다.

특히 매우 낮은 support 상태라는 이유만으로 종격을 판정하지 않는다.

격국 및 특수격 판정은 ADR-005의 책임으로 분리한다.

## 11. 시간 미상

출생시간이 없는 경우 시간·시지·시지 지장간에서 발생할 수 있는 기여를 임의의 값으로 채우지 않는다.

알려진 정보만으로 관측값을 계산하고 누락된 영역을 명시한다.

가능한 후보 범위를 계산할 수 있다면 다음과 같이 반환할 수 있다.

```text
status: partial

possibleStrengthClasses:
- weak
- balanced_or_uncertain
```

후보 전체가 동일한 등급이더라도 원국 자체가 불완전하다는 `partial` 상태는 보존한다.

## 12. 초기 검증

본 ruleset을 Accepted 하기 전에 대표 명식 fixture를 구축한다.

fixture에는 최소 다음 유형을 포함한다.

* 득령하고 생조가 많은 경우
* 득령하지만 극·설이 매우 많은 경우
* 실령하지만 통근·비겁·인성이 많은 경우
* 무근에 가까운 경우
* 월령과 나머지 세력이 상반되는 경우
* 계절은 불리하지만 강한 근이 있는 경우
* 합충으로 해석이 논쟁적인 경우
* 특수격 가능성이 있는 경우
* 시간 미상 사례

각 fixture는 기대 판정뿐 아니라 기대 근거를 함께 기록한다.

## 채택하지 않은 대안

### Alternative A — 고정 100점 모델

천간·지지에 고정 점수를 배분하고 support 비율에 따라 신강·신약을 결정한다.

구현과 감사는 쉽지만 가중치와 임계값에 대한 충분한 명리적 근거가 확보되지 않았으므로 MyLife Standard v1의 기본 판정법으로 채택하지 않는다.

향후 fixture 검증 결과가 충분할 경우 diagnostic model로 재검토할 수 있다.

### Alternative B — 완전 비수치 결정 트리

모든 판단을 명시적인 조건문으로 처리한다.

설명 가능성은 높으나 경계 사례 처리와 상대적 강도 비교가 어려울 수 있어 다축 diagnostic model과 함께 검토한다.

### Alternative C — 상호작용 가중 모델

월령·통근·합충·지장간·투간 등 모든 상호작용을 처음부터 정량 모델에 포함한다.

v1에서 검증이 어렵고 복잡도가 높으므로 채택하지 않는다.

## 수용 테스트

최소 다음을 검증한다.

* 동일 입력 및 ruleset의 완전한 재현성
* 월령 판정의 독립성
* 통근 근거 추적 가능성
* 비겁과 인성의 분리
* 식상·재성·관살의 분리
* 같은 원시 관측값에서 동일한 판정
* 합충을 임의 정량 감점하지 않음
* 종격을 강약 점수만으로 결정하지 않음
* 시간 미상에서 임의 시주를 생성하지 않음
* 모든 최종 판정에 evidence가 존재함

## 구현 원칙

```text
ruleset:
mylife-standard-v1

strengthModel:
explainable-multiaxis-v1

primaryAxes:
- seasonal
- rooting
- support

pressureAxes:
- output
- wealth
- control

singleAbsoluteStrengthScore:
false

automaticCombinationTransformation:
false

specialPatternInferenceFromStrengthOnly:
false
```

## 결정 상태

2026-09-23 사용자 요청으로 구조와 원칙을 승인했다 (`status: accepted`). 대표 fixture와 세부 판정 규칙의 검증은 별도로 진행한다.

본 ADR을 Accepted 하는 것은 신강·신약 판단의 **구조와 원칙**을 승인하는 것이며, 향후 diagnostic 가중치 자체를 승인하는 것은 아니다.

구현 및 검증 상태는 [IMPLEMENTATION_TRACKER.md](../IMPLEMENTATION_TRACKER.md)에서 별도로 관리한다.
