# Reference Cases Sources & Policy Differences (SOURCES.md)

본 문서는 `packages/bazi-engine/tests/fixtures/reference-cases.json`에 수록된 100건(Step 1: 20건 선행 등록, Step 2: 100건 완성)의 독립 기준 명식에 대한 1차 출처 및 정책 차이를 명시한 SSOT 문서입니다.

---

## 1. 1차 출처 명세 (Primary Sources)

| 출처 ID | 명칭 및 서지 정보 | 신뢰 등급 | 주요 활용 분야 |
| --- | --- | --- | --- |
| **`HKO-ALMANAC-2026`** | Hong Kong Observatory Almanac 2026 (`HKO_almanac_2026.pdf`, ISBN / Official Astronomical Publication) | 최고 (공식 천문대) | 2026년 일진 60갑자 연속성, 연월주 월두법, 시두법 대조 |
| **`HKO-ALMANAC-1924`** | Hong Kong Observatory 1924 Almanac (60갑자 기준 주기 검증) | 최고 (공식 천문대) | 갑자년 시작 60년 주기 검증 |
| **`NAOJ-KOYOMI`** | National Astronomical Observatory of Japan (국립천문대력 계산소) 1900, 2000, 2026 절입 시각표 | 최고 (공식 천문대) | 12절 입절 시각(UTC) 및 연주/월주 교체 경계 검증 |
| **`KASI-ALMANAC`** | 한국천문연구원 역사 역서(1900년 음양력 대조표) 및 2026 월력요항 | 최고 (공식 연구원) | 한국 음양력 변환, 명절(설날/추석 등) 음력 기준일 대조 |
| **`IANA-TZDB-2025B`** | IANA Time Zone Database (2025b) - `Asia/Seoul`, `America/New_York`, `Pacific/Lord_Howe` | 최고 (국제 표준) | 역사적 시간대 전환(1908, 1912, 1954, 1961), 1987-1988 대한민국 서머타임 |
| **`CLASSICS-BAZI`** | 《淵海子平(연해자평)》, 《三命通會(삼명통회)》, 《子平眞詮(자평진전)》 | 학술/전통 기준 | 정통 간지 수학, 12시진 배속, 월두법/시두법 교차 검산 |

---

## 2. 외부 역법과 MyLife 표준 정책(`mylife-standard-v1`) 간의 정책 차이

1. **일계(Day Boundary) 기준 차이:**
   - **외부 민간 달력(HKO, KASI, NAOJ):** 표준시 기준 00:00(자정)에 날짜와 일진(Day Ganzhi)이 바뀝니다.
   - **MyLife 표준 엔진 (`mylife-standard-v1`, ADR-001):**
     - 경도(Longitude) 및 균시차(Equation of Time)가 적용된 **진태양시(True Solar Time) 23:00**에 다음 날의 일진으로 일계가 변경됩니다.
     - 외부 역서에서 특정 날짜로 표기되어 있어도, 진태양시 23:00 이후에 출생한 명식은 다음 날의 일진(Day Pillar)을 부여받습니다.
2. **자시(Zi Hour) 처리 및 롤링 일간(Rolled Day Master) 적용:**
   - **일부 민간 역학원 (조자시/야자시 분할설):** 23:00~24:00를 야자시(당일 일간 기준), 00:00~01:00를 조자시(다음 날 일간 기준)로 나누는 정책을 사용하기도 합니다.
   - **MyLife 표준 엔진 (`mylife-standard-v1`):**
     - `splitZiHour: false` (단일 자시). 진태양시 23:00~01:00 전체를 단일 자시(子時)로 보며,
     - `hourStemUsesRolledDayMaster: true` (이미 변경된 다음 날 일간을 기준으로 시두법을 적용).
3. **절입(Jie Solar Terms) 경계 처리:**
   - 외부 역서에 표기된 절입 시각(예: 2026-02-04 05:01:42 KST 입춘)은 관측지 표준시 표기이므로, 이를 UTC instant로 정밀 변환하여 출생 instant와의 전후 관계를 밀리초 단위로 엄밀하게 비교합니다.
4. **시간대(Timezone) 및 서머타임(DST):**
   - 1987~1988년 한국 하계표준시(서머타임, UTC+10) 및 1954~1961년 표준시(UTC+08:30) 등 역사적 변동을 tzdb 2025b에 따라 엄밀히 적용하여 진태양시를 도출합니다.
