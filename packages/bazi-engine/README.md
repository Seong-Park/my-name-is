# @mylife/bazi-engine

책임: 순수 명리 계산과 판정.

구현 단계: **M3 완료 (Task 18 검증 게이트 통과).** 순수 명리 계산 엔진(M3) 완결: 독립 기준 명식 100건 fixture, 101개 기준 테스트 통과, 재현성 검증 통과, 전 소스 파일 100% 커버리지 실측, 레거시 비교(`PILLAR_COMPARISON.md`), core-engine 492개 테스트 통과, 두 Next.js 앱 빌드 무결성 확인 완료. M4~M9 계산 및 애플리케이션/DB/UI 연결은 후속 마일스톤이다.

내부 의존: bazi-domain 타입, bazi-rules 버전. 외부 공급자: moment-timezone 0.6.0/tzdb 2025b, astronomy-engine 2.1.19, korean-lunar-calendar 0.4.0. lockfile과 자료 버전을 고정한다.

금지: DB/React/LLM 및 기존 core-engine import.

통합 결과는 각 기둥을 `confirmed`/`ambiguous`/`unavailable`로 구분한다. 서로 다른 UTC 후보가 같은 기둥을 만들면 그 기둥은 확정하되 원시 후보·offset·보정 근거는 유지한다. approximate는 대표시각 계산이고 오차 구간 미제공 제한을 남긴다. unknown은 정오를 만들지 않으며 모든 유효 민간 날짜 구간에서 같은 연·월·일만 확정하고 시주는 unavailable이다. complete는 네 기둥이 같다는 뜻이며 실제 출생 instant 확정이 아니다.

기본 시간대 공급자는 고정 tzdb의 모든 offset 전환 기록과 날짜의 UTC 역상을 교차해 `[start,end)` 구간을 반환한다. 주입 공급자의 `civilDateIntervals`는 exact 계산에는 선택, unknown에는 필수이며 완전한 날짜 구간을 제공해야 한다. 미상에서 명시 offset을 제공하면 해당 offset 구간만 남긴다. 날짜 전체가 건너뛰어졌으면 DST_GAP이다.

`candidateIntervals.ts`는 실제 EoT를 반복 평가해 진태양시 시진/일계 경계를 풀고 절입 경계에서도 구간을 나눈다. 주입 EoT는 UTC+EoT가 연속·단조 증가하는 물리적 태양시 계약을 지켜야 한다. 탐색은 double의 인접 표현값까지 수렴하며 제외 끝점 직전 0.5ms 후보도 보존한다. 이는 천문 정확도 보증이 아니다. normalization의 시각 문자열은 밀리초 표시이며 UTC 수치와 균시차에는 계산값을 유지한다. 전환 끝점의 offset은 해당 반열린 구간에서 접근한 쪽의 값이다.

공급자 오차 여유값으로 일계/시진/절입을 넘을 수 있으면 모든 관련 기둥 후보를 남긴다. 절입은 context/각 절입의 오차 중 큰 값을 적용하며 통합 엔진의 지원 한도는 각 값 0~86400초다. 이를 초과하는 공급자는 PROVIDER_FAILURE로 거절한다. 물리적인 약 한 달 간격의 12절을 전제로 인접 경계만 조회하는 계약이다. 실제 사용한 절입·EoT 여유값, 인증된 상한이 아니라는 제약과 기존 limitations를 결과에 보존한다.

Task 15 공개 함수 `calculateDayPillar(rolledSolarDate)`는 일계 적용이 끝난 Gregorian 날짜를 간지로 변환한다. HKO 2026-01-02 丙子 기준과 UTC 날짜 서수, 정규화 modulo를 사용한다. helper 입력은 `0001`~`9999`의 유효한 `YYYY-MM-DD`이고, 출생정보의 1900~2026 지원 범위를 확대하는 것은 아니다. `calculateHourPillar(dayPillar, solarSecondOfDay, policy)`는 일계 이후 일주와 같은 진태양시 초 좌표를 받아 시두법·12시진을 적용한다. 정책은 자시 `[23:00,01:00)`, 자시 분리 없음, 변경된 일간 사용으로 고정한다. 두 함수는 날짜·시간대·일계 보정을 재적용하지 않으며 날짜와 초 좌표의 대응은 호출자 책임이다. unknown 시주와 경계 후보 집계는 Task 16 통합 함수에서 처리한다.

Task 14 공개 함수 `calculateYearPillar(instantUtcMs, context)`는 입춘 기준 연주를, `calculateMonthPillar(instantUtcMs, yearPillar, context)`는 12절과 월두법 기준 월주를 반환한다. 두 함수는 UTC instant로 절입을 비교하며 정각은 새 구간에 포함한다. 소한은 전년도 연간으로 축월을 계산한다. 월주의 입력 연주는 같은 instant에서 계산한 값이어야 하며 함수는 간지/index의 내부 일치만 검증한다. 출력은 독립 `Ganzhi` 값이고 공급자 오차 주변 후보·근거의 최종 조합은 Task 16 통합 함수에서 처리한다. `pillars/jie.ts`는 두 함수가 공유하는 비공개 경계 선택·오류 처리다.

Task 13 공개 함수 `toTrueSolarTime(instantUtcMs, longitude, context)`는 UTC + 경도×240초 + 균시차로 날짜와 소수 초 좌표를 반환한다. 역사 offset/DST를 다시 적용하지 않는다. 보정값·ruleset evidence·공급자 제약과 균시차 오차 구간의 양 끝 좌표를 보존한다. `applyDayBoundary(solarDateTime, policy)`는 승인된 진태양시 23:00 정책으로 명리 날짜를 결정한다. 경계 후보의 실제 팔자 집계는 Task 16 통합 함수에서 처리한다.

리뷰 보류 사항(P3): `applyDayBoundary`를 단독으로 호출하면 0000년을 허용하고 9999-12-31 23:00 이후 확장 연도 문자열을 잘못 자른다. 기본 공급자의 지원 범위(1900~2026 및 경계 보조 범위)에서는 도달하지 않는다. 범용 연도 지원 확대 전에 검증을 통일해야 한다.

세부 계획과 검토 상태: [Bazi 문서](../../docs/references/mylife/docs/bazi/README.md), [트래커](../../docs/references/mylife/docs/bazi/IMPLEMENTATION_TRACKER.md). 향후 소스 파일 배치는 [목표 트리](https://github.com/Seong-Park/mylife/blob/9c3566c61ae18c1c0884d07dff8aa48657bbd58a/docs/v2/v2_folder_tree.md)를 따른다.

```ts
import KoreanLunarCalendar from 'korean-lunar-calendar';
import { createCalendarContext } from '@mylife/bazi-engine';

// 생성자의 현재 시각 읽기는 application 초기화 시점에 끝낸다.
const context = createCalendarContext(new KoreanLunarCalendar());
const candidates = context.timezone.possibleInstants('1988-10-09T02:30:00', 'Asia/Seoul');
const solar = context.lunar.toSolar('2023-02-01', true);
```

공개 export는 `src/index.ts`. `npm --prefix packages/bazi-engine test`, `npm --prefix packages/bazi-engine run typecheck`로 검사한다. 순수 계산에는 초기화된 context만 전달한다. 동일 프로세스에서 Astronomy Engine의 전역 Delta-T 설정을 바꾸면 안 된다.

공통 출생 날짜 범위 1900~2026과 공급자의 경계 보조 범위·음력 라이브러리 전체 범위는 별개다. `jieInstants`는 구간을 감싸는 직전/직후 절도 반환한다. context의 `uncertainty`·`limitations`는 후속 계산에 보존한다. 절입 1800초/균시차 10초는 인증된 오차 상한이 아닌 공학적 여유값이며 역사 EoT 독립 수치 검증은 남아 있다. [CALENDAR_SOURCES](../../docs/references/mylife/docs/bazi/CALENDAR_SOURCES.md)에 정확한 자료·시간척도·오차·재사용 조건·한계를 기록한다.

Task 12 공개 함수:

- `resolveSolarDate(input, context)`: 원본 역법 날짜·윤달·시간 정확도를 바꾸지 않고 양력 날짜만 반환한다. 원본 입력의 1900년 하한과 변환된 양력의 context 범위를 검사한다. 양력의 윤달 플래그·무효 날짜는 거절한다.
- `resolveBirthInstants(input, context)`: exact/approximate의 알려진 민간 시각을 `{ kind: 'instant', candidates }`로 해석한다. 각 후보는 UTC ms와 실제 역사적 offsetSeconds를 보존한다. overlap은 모두 남기고, 명시 offset이 있으면 일치하는 후보만 선택한다. gap은 `DST_GAP`, offset 불일치는 `OFFSET_MISMATCH`다. 정상 UTC offset은 `0`으로 정규화한다.

Task 16부터 `resolveBirthInstants`는 unknown에 `{ kind: 'interval', intervals }`를 반환한다. 반환 구간은 시간대 전환 기준이며 통합 함수에서 절입·태양시 경계로 추가 분할한다. approximate는 대표시각의 UTC 후보를 해석한 것이며 실제 시각 확정이나 오차 범위 보증을 뜻하지 않는다. 원본 정확도와 context 제약은 통합 결과에도 보존한다.
