# My Name Is

독립형 이름 탐색 웹 앱과 제한된 명리 계산 workspace입니다. 제품 흐름과 지원 범위는 [PRD](docs/PRD.md), 화면·입력 정책은 [디자인 명세](docs/specs/2026-09-29-my-name-is-mvp-design.md)를 기준으로 합니다.

## 실행

Node.js와 pnpm을 설치한 뒤 저장소 루트에서 의존성을 설치합니다.

```powershell
pnpm install
Copy-Item apps/name-web/.env.example apps/name-web/.env.local
pnpm --filter @my-name-is/name-web dev
```

웹 앱은 http://127.0.0.1:3100 에서 열립니다. `.env.local`에 DeepSeek 키, Supabase PostgreSQL 연결 문자열, `NAME_RECEIPT_SECRET`을 설정해야 실제 분석·회상문 API를 사용할 수 있습니다. 이 파일은 Git에서 제외됩니다. 자세한 운영과 교체 지점은 [웹 앱 안내](apps/name-web/README.md)를 참고하세요.

## 구현 범위

- Figma 4개 페이지의 토큰·공통 컴포넌트·화면 상태를 모바일 우선 입력과 결과 흐름으로 구성했습니다.
- 날짜·지역·한자 선택에 공통 휠을 사용하고 키보드 조작, 포커스, 오류 상태와 dialog 동작을 지원합니다.
- 분석 API는 검증된 역법 계산과 제한된 추천 규칙을 적용합니다. 현재 확인된 지원 구조 밖에서는 추천을 보류합니다.
- 회상문 API는 서버에서 DeepSeek 호출과 Supabase 비용 원장을 처리합니다. AI 응답이 무효이거나 전송 상태를 확인할 수 없을 때 성공 본문을 꾸며내지 않습니다.
- 분석·회상문 결과는 익명 브라우저에 보관됩니다. 계정, 배포, MyLife 광장 연동은 포함하지 않습니다.

현재 추천 범위와 근거·검증 한계는 [앱 안내](apps/name-web/README.md)와 [검증 기록](docs/verification/2026-10-01-name-web.md)에 정리했습니다. 검토되지 않은 명리 구조는 규칙으로 추정하지 않고 보류합니다.

## 검증

```powershell
pnpm test
pnpm --filter @my-name-is/name-web test
pnpm --filter @my-name-is/name-web typecheck
pnpm --filter @my-name-is/name-web build
pnpm --filter @mylife/bazi-engine typecheck
```

연구 자료 검사에는 Python이 필요하며 `pnpm verify:research`로 실행합니다. 날짜 대응 연구는 `pnpm check:calendar`로 확인할 수 있습니다.

## 프로젝트 경계와 출처

이 저장소는 [분리 계획](docs/plans/2026-09-30-project-separation.md)에 따라 `C:\workspace\my-name-is`에 따로 보관됩니다. 계산 패키지·연구 자료의 출처와 복사 이력은 [copy-manifest.json](copy-manifest.json)과 각 자료의 출처 문서에서 확인할 수 있습니다. 한자 사전은 스냅샷이며 전체 뜻·독음·원획·오행의 검증 완료를 뜻하지 않습니다.
