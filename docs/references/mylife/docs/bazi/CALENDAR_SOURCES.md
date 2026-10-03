# Task 11 — 시간·천문·음력 공급자와 검증 범위

기준일 2026-09-23. Task 11은 계산 context와 공급자 어댑터의 준비 단계다. 실제 팔자 계산, unknown 구간 구성, API/DB 연결 완료가 아니다. 고정 수치 fixture는 `packages/bazi-engine/tests/fixtures/calendar-reference.json`이며 공급자 출력으로 기대값을 만들지 않았다. 자료의 ISO 날짜를 UTC epoch milliseconds로 직렬화하는 변환만 수행했다.

## 채택한 버전

| 공급자 | 정확한 버전·자료 | 채택 근거 |
| --- | --- | --- |
| 시간대 | `moment-timezone@0.6.0`, 전 범위 packed tzdb `2025b`, lock의 `moment@2.31.0` | 배포물에 역사적 전환·초 단위 offset 포함. 호스트 ICU/tzdb와 독립 |
| 천문 | `astronomy-engine@2.1.19`, Espenak–Meeus Delta-T, 어댑터 v1 | 순수 JS·MIT, 네트워크/WASM/별도 ephemeris 파일 초기화 없음 |
| 한국 음력 | `korean-lunar-calendar@0.4.0` | 기존 입력 검증과 동일 버전·MIT. 명시적인 실패 반환·윤달 확인 |

설치: `corepack pnpm install --filter @mylife/bazi-engine... --ignore-scripts --offline=false` (저장소 pnpm 9.0.0). 정확한 의존 버전과 integrity는 `packages/bazi-engine/package.json`, `pnpm-lock.yaml`에 고정했다. 신규 외부 패키지는 MIT이며 [Moment 라이선스 안내](https://momentjs.com/timezone/), [Astronomy Engine MIT](https://github.com/cosinekitty/astronomy/blob/v2.1.19/LICENSE), [음력 공급자](https://github.com/usingsky/korean_lunar_calendar_js)를 따른다. 배포 시 해당 저작권·허가 고지를 보존한다.

기존 `sweph-wasm@1.2.12`는 별도로 조사했다. Swiss의 AGPL/상용 라이선스 선택, 비동기 WASM 초기화, 실제 ephemeris 파일 및 fallback 식별이 필요하다. 기존 설치만으로 이번 서비스의 이용 조건이 확정되었다고 가정하지 않고 MIT 공급자를 선택했다. 기존 게임의 Swiss 사용은 변경하지 않았다. [천문 조사](https://github.com/Seong-Park/mylife/blob/9c3566c61ae18c1c0884d07dff8aa48657bbd58a/docs/bazi/research/2026-09-23-calendar-astronomy.md)에 1차 문서와 검토 근거가 있다.

## 시간대: 출생 민간 시각에서 모든 instant 후보 열거

`possibleInstants(local, zone)`은 timezone 없는 ISO 좌표를 받아 정상이면 1개, gap이면 0개, overlap이면 모든 후보를 UTC ms 오름차순으로 반환한다. offset은 `민간 시각 = UTC + offsetSeconds` 부호다. moment의 자동 gap 보정이나 overlap 한쪽 선택 파서를 쓰지 않고, private packed snapshot의 각 고유 offset 후보를 해당 UTC 구간과 검산한다. 로컬 시간 문자열에 `Z`/offset을 섞거나 존재하지 않는 날짜를 입력하면 `INVALID_INPUT`이다.

기준값은 [IANA 2025b asia](https://data.iana.org/time-zones/tzdb-2025b/asia)의 `Asia/Seoul`·`ROK` 행, [northamerica](https://data.iana.org/time-zones/tzdb-2025b/northamerica)의 US 2007+ 규칙, [australasia](https://data.iana.org/time-zones/tzdb-2025b/australasia)의 Lord Howe/Apia 행을 따로 읽어 기록했다. 같은 tzdb 원전을 사용하는 compiled 자료와 수기 기대값의 교차검사이며 역사 기록 자체의 완전성을 독립 인증한 것은 아니다. IANA 파일은 public domain을 명시한다.

14개 fixture에는 서울 1900 LMT +08:27:52, 1908 +08:30 전환 전/후와 gap, 1912 gap, 1954 overlap, 1961 gap, 1988 DST gap/overlap, 뉴욕 gap/overlap, 카트만두 +05:45, Lord Howe 30분 overlap, Apia 날짜 건너뜀을 포함한다. 자료가 공개된 초 단위를 유지하며 분 단위로 반올림하지 않는다. tzdb는 수정될 수 있는 역사 자료이며 2025b 이후 법령 변경을 자동 반영하지 않는다.

## 천문: 12절과 균시차

12절은 지구 중심에서 본 날짜 기준 겉보기 태양 황경 285°부터 30° 간격의 교차점이다. `SearchSunLongitude`의 월초~20일 검색 창은 해를 찾는 구간일 뿐 근사 날짜표가 아니다. 각 해 12개 경계를 계산하고 `jieInstants(from, to)`는 내부 경계와 직전/직후 절을 함께 반환한다. 정각의 중복은 없다. 반환 객체 수정으로 내부 캐시가 바뀌지 않는다. [API 원문](https://github.com/cosinekitty/astronomy/tree/v2.1.19/source/js), [HKO 절기 정의](https://www.hko.gov.hk/en/gts/time/24solarterms.htm).

균시차는 태양의 지구 중심 겉보기 적경과 Greenwich apparent sidereal time으로 구한 `겉보기 태양시 − 평균 태양시`다. 따라서 후속 진태양시 좌표는 `UTC + 동경×240초 + 균시차`이며 topocentric 관측자 시차를 섞지 않는다. 구체 식과 부호 근거는 천문 조사에 기록했다.

시간척도는 공급자의 UT1≈UTC 근사와 Espenak–Meeus TT 변환을 사용한다. 1900처럼 UTC 제도 이전의 값은 역산 Gregorian UT를 JS UTC 좌표로 표현한 것이며 역사적으로 UTC가 존재했다는 주장이 아니다. leap-second 정밀도는 제공하지 않는다. **같은 프로세스에서 Astronomy Engine의 `SetDeltaTFunction` 등 전역 설정을 변경하지 않는다.** 현 저장소에는 해당 호출이 없으며, 변경하면 고정 `calendarVersion`과 실제 계산의 일치가 깨진다.

## 독립 자료의 정밀도와 오차 정책

| 자료 | 고정 표본 | 공표 해상도 | 이번 비교 허용치 |
| --- | --- | --- | --- |
| NAOJ 절입 | 1900·2000·2026 각 12절 + 1899 대설/2027 소한 = 38 | 분 (60초) | 120초 |
| NAOJ 균시차 | 2026-02-11, 11-03, 04-15 12 UT: 음·양·영점 부근 = 3 | 0.1초 | 10초 |
| KASI/HKO 음력 | 1900 하한 부근, 2023 평/윤2월, 2026 명절, 2050 상한 = 10 | 민간 날짜 1일 | 날짜 완전 일치 |

절입 출처: [NAOJ 1900](https://eco.mtk.nao.ac.jp/cgi-bin/koyomi/cande/phenomena_sy_en.cgi?year=1900&lst=0), [2000](https://eco.mtk.nao.ac.jp/cgi-bin/koyomi/cande/phenomena_sy_en.cgi?year=2000&lst=0), [2026](https://eco.mtk.nao.ac.jp/koyomi/yoko/2026/rekiyou262.html). 일본 표준시 표는 UTC로 9시간 차감했다. 균시차는 [NAOJ GST 계산기](https://eco.mtk.nao.ac.jp/cgi-bin/koyomi/cande/gst_en.cgi)의 고정 query 값이며 전체 URL은 fixture에 있다. **(c) NAOJ**. [NAOJ 이용 조건](https://eco.mtk.nao.ac.jp/koyomi/site/index.html.en)에 따라 출처를 명시하여 작은 수치 snapshot만 보존한다. 실시간 웹 호출은 없다.

관측된 38개 절입 최대 잔차는 59.457초, 3개 균시차 최대 절대 잔차는 약 0.073초다. 이는 선택한 표본의 결과이며 전 범위 정확도 보증이 아니다. 공급자의 root solver 0.01초 수렴과 NAOJ의 공표 해상도는 천문학적 정확도와 구별한다. `uncertaintySeconds=1800` (절입), context의 `equationOfTimeSeconds=10`은 공개 ±1 arcminute 정확도 등급 및 UT 근사를 고려한 **공학적 여유값**이며 인증된 최대 오차·통계 신뢰구간이 아니다. 실제 경계 후보 판단에서 이 한계를 보존해야 한다.

NAOJ GST 수치 서비스의 지원 연도는 2009~2027이고 1900/2000 요청은 No Data였다. 따라서 역사 연도 EoT의 독립 수치 검증은 미완료다. 1900~2026년 모두의 절입 수·순서는 검사했지만 모든 날의 EoT와 127개 연도 모든 절입의 외부 대조를 완료한 것은 아니다.

## 음력: 범위와 실패 상태

라이브러리 범위는 음력 1000-01-01~2050-11-18, 대응 양력 1000-02-13~2050-12-31이다. 2050년 전체 음력 날짜를 지원한다고 표시하지 않는다. 어댑터의 원시 범위는 이 라이브러리 범위이며, context의 공통 출생 날짜 범위 1900~2026은 후속 입력 해석에서 별도로 적용한다. 1899 음력 fixture는 양력 1900 하한의 검증용이다.

라이브러리 생성자는 현재 날짜를 읽으므로 **호출자가 계산 시작 전에 생성하고** `createCalendarContext(calendar)`에 주입한다. 엔진은 생성자를 호출하지 않고 매번 요청 날짜·윤달을 명시한다. setter가 false이면 이전 결과를 읽지 않고 오류를 반환한다. 입력 날짜는 문자열과 boolean으로 받아 원본을 바꾸지 않으며, 성공 후 역방향 identity와 반환 양력 날짜도 확인한다.

KASI 1900 역사 자료의 날짜 열과 2026 월력요항을 사용했다. HKO 2023 평/윤2월·2050 상한은 해당 행의 중국력 교차검증이며 한국력 전체의 동일성 근거가 아니다. 원본 자료 전체를 복제하지 않고 출처 있는 작은 수치 사실만 기록했다. [음력 조사](https://github.com/Seong-Park/mylife/blob/9c3566c61ae18c1c0884d07dff8aa48657bbd58a/docs/bazi/research/2026-09-23-calendar-lunar.md)에 각 행 위치·이용 조건·상한과 API 실패 동작을 기록했다.

## context·오류·후속 연결

Task 16 연결: 기본 시간대 공급자는 같은 private tzdb snapshot의 모든 `untils`/offset 구간을 민간 날짜 역상과 교차해 전체 날짜를 열거한다. unknown에 요구되는 완전한 구간 기능과 물리적 EoT의 연속·단조 증가 조건을 공급자 계약에 추가했다. 절입 오차는 context/각 절입에서 각각 최대86400초까지만 통합 엔진이 지원하며 초과는 PROVIDER_FAILURE다. 기본1800초를 정확도 인증값으로 바꾸지 않는다. 기존 gap/overlap과 offset 해석은 그대로 사용한다. 태양시 경계는 실제 EoT 재평가로 풀고 반열린 끝점·소수ms 후보를 보존한다. 통합 결과의 limitations에 실제 사용한 여유값과 기존 한계를 남기며 상세 계약은 [엔진 README](../../../../../packages/bazi-engine/README.md)를 따른다.

Task 15 일주시주 검산(2026-09-23): [HKO 2026년 역서](https://www.hko.gov.hk/tc/gts/astron2026/files/HKO_almanac_2026.pdf)의 1월 1~3일(인쇄 5~6쪽: 乙亥/丙子/丁丑), 3월 1~3일(9~10쪽: 甲戌/乙亥/丙子)을 `day-reference.json`의 날짜·간지 6행으로 고정했다. 직접 PDF 열기는 용량 제한이 있었고 공식 PDF의 검색 색인 텍스트와 [월별 PDF 링크](https://www.hko.gov.hk/tc/gts/astron2026/almanac2026_index.htm)로 교차 확인했다. 화면 원본 육안 판독 완료로 주장하지 않는다. 2026-01-02 丙子를 계산 기준으로 사용하며 60일 뒤 3월 3일을 별도 공표값과 대조한다. [HKO 표五](https://www.hko.gov.hk/tc/gts/time/stemsandbranches.htm)의 5개 일간 그룹×12시진 기대값을 고정하고 두 일간씩 총120셀을 검증했다. 기관 역서의 날짜 이름과 제품의 진태양시 23:00 일계는 별개이며 helper에는 이미 일계가 적용된 날짜를 전달한다. 윤일/세기/연말 검사는 Gregorian 연속성 검사이며 추가 독립 역서 표본 수에 포함하지 않는다.

Task 14 연월주 검산(2026-09-23): [HKO 천간지지 표四](https://www.hko.gov.hk/tc/gts/time/stemsandbranches.htm)와 [NAOJ 干支의 월 표](https://eco.mtk.nao.ac.jp/koyomi/wiki/B4B3BBD9.html)를 대조해 5개 연간 그룹×12개월의 고정 기대값을 작성했다. [HKO 1924년 갑자 표](https://www.weather.gov.hk/tc/gts/time/calendar/pdf/files/1924.pdf)를 60년 주기 기준과 교차 확인했다. 기관의 역월·농력 연도 경계를 그대로 채택한 것이 아니라 기존 계획의 입춘·12절 정책에 간지 순환과 월두법 표를 적용한다. `year-month.test.ts`는 Task 11 절입 fixture의 1900/2000/2026년 36행 전후를 공학적 오차 여유값 밖에서 검사한다. 가짜 공급자의 정확한 1초/1ms 경계 테스트와 실제 자료의 공표 정밀도를 구분한다. 이는 독립 완성 명식 100건 검증을 대체하지 않는다.

공통 출생 민간 날짜 범위는 **1900-01-01~2026-12-31**. timezone offset/천문 query는 UTC 변환 경계 보조용으로 `[1899-12-30, 2027-01-03)`을 허용하고, 절입 검색 자료는 앞뒤 1899/2027년을 계산한다. 연도 확장은 현재 날짜 읽기가 아니라 버전/자료/fixture 갱신으로 수행한다.

`CalendarContext`는 timezone/astronomy/lunar, versions, supportedRange, uncertainty, limitations를 공개한다. metadata는 runtime freeze다. 오류는 domain의 `CalculationError`에 맞춰 `INVALID_INPUT`, `UNSUPPORTED_DATE`, `UNSUPPORTED_TIMEZONE`, `PROVIDER_FAILURE`를 구분한다. timezone 공급자의 gap=[]은 Task 12 입력 해석 단계에서 `DST_GAP`으로 처리한다. Task 11은 후보 선택·진태양시·팔자·대운 계산을 하지 않는다.

재현성 검증: 초기화 후 서로 다른 시스템 날짜와 호출 순서, UTC 및 America/New_York 호스트 TZ에서 같은 고정 기대값을 만족한다. 네트워크·DB·기존 core-engine import는 계산 경로에 없다. Task 12 이후에는 공통 날짜 범위와 limitations/uncertainty를 소비해야 하며, 실제 역사 EoT 정확도가 추가로 필요한 사용 범위는 독립 자료를 더 확보해 검증해야 한다.
