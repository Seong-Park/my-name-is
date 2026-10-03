# @mylife/bazi-domain

책임: 출생정보·간지·원국·판정 결과 타입.

구현: BirthProfileInput, BirthProfile, BirthLocation의 기존 저장 계약을 `src/birth/profile.ts`에 보존하고 `src/index.ts`에서 공개한다. 원본 날짜·달력·윤달·시간 정확도와 지역 snapshot을 표현한다.

`src/birth/input.ts`는 계산 전용 BirthTimeInput, NatalBirthInput, LuckBirthInput을 제공한다. 원국은 sexForBazi가 선택이고 대운은 필수다. unknown은 birthTime: null, exact/approximate는 문자열 시각을 요구한다. utcOffsetSeconds는 동쪽이 양수인 초 단위 선택 입력이다. 날짜·시각 형식/범위와 offset/timezone 일치의 런타임 검증은 M3에서 구현하며 이 타입만으로 보장하지 않는다. 등록 UI/DTO의 성별 필수 정책은 유지한다.

`src/ganzhi/types.ts`는 천간·지지·오행·음양과 0~59 정수 인덱스의 Ganzhi를 제공한다. 천간·지지·인덱스의 상호 대응 검증은 M2/M3 대상이다. `src/chart/pillars.ts`의 FourPillars는 연·월·일 필수, 시주 nullable이며 불확실한 연·월·일은 FieldResolution으로 표현한다.

`src/chart/evidence.ts`는 규칙·버전·입력/원국 위치 참조와 공통 JudgmentMeta를 제공한다. 숫자형 NumericJudgmentMeta와 high/medium/low의 QualitativeJudgmentMeta는 별도 계약이다. 근거 배열 필드는 필수이며 판정별 근거 충분성은 후속 계약에서 검증한다.

`src/birth/normalization.ts`는 UTC 후보/구간과 보정된 태양시 좌표·보정값·근거를 표현한다. `src/chart/calculation.ts`는 항목별 확정/후보/계산 불가, 재현 버전, 오류 인터페이스와 M3 결과를 정의한다. 시간 미상은 구간·partial·시주 unavailable, 추정 입력은 대표시각·제한을 보존한다. 기둥이 확정돼도 UTC 후보가 하나로 확정된 것은 아니다. 후보 유일성·구간 순서·보정 정확성은 런타임 계산 단계에서 검증한다.

검증: `pnpm --filter @mylife/bazi-domain test:types`는 공개 export의 양성/음성 계약을 TypeScript로 검사한다. `typecheck`는 소스 타입 검사다. 두 명령은 workspace 루트의 기존 TypeScript 개발 의존성을 사용하며 새 런타임 의존성은 없다.

Task 5는 `chart/analysis.ts`, `ten-gods/`, `relations/`, `structure/`, `balance/`, `auxiliary/`에서 M4~M8 결과 타입을 제공한다. evaluated/partial의 실제 관측값과 unsupported/not_evaluated/insufficient_data의 null을 구분한다. 강약의 계절·통근·생조·극설모, 격국의 후보·우선 후보·미평가 성립, 용희기의 방법별 적용·후보·최종 조정 상태를 분리한다. BalanceMethodResults의 네 방법 고정 순서는 직렬화 순서이며 우선순위가 아니다. 실제 규칙·계산·데이터 정합성은 후속 엔진에서 검증한다. Task 6에서 운·전체 결과 조합도 완료했다.

Task 6은 `luck/types.ts`의 원시 간격·상징 나이·민간 날짜 매핑, 독립적인 방향/시작값 상태, 대운·세운과 계층별 상호작용을 추가했다. `chart/result.ts`는 M3 결과의 불확실성을 보존하면서 전체 분석을 조합한다. 배열 구획은 AnalysisResult로 감싸 미평가와 평가 후 빈 배열을 구별한다. M1 타입 정의는 완료했으며 실제 계산·런타임 정합성 검증은 미구현이다. 공개 계약은 `tests/luck.test-d.ts`에서 검증한다.

허용 내부 의존: 없음. 실제 의존성은 기능 구현 시 추가한다.

금지: 규칙표/계산/DB/LLM.

세부 계획과 검토 상태: [Bazi 문서](../../docs/references/mylife/docs/bazi/README.md), [트래커](../../docs/references/mylife/docs/bazi/IMPLEMENTATION_TRACKER.md). 향후 소스 파일 배치는 [목표 트리](https://github.com/Seong-Park/mylife/blob/9c3566c61ae18c1c0884d07dff8aa48657bbd58a/docs/v2/v2_folder_tree.md)를 따른다.
