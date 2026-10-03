# 나의 이름은 Figma 프런트엔드 구현 계획

**Goal:** Figma의 네 페이지·41개 예시를 공통 화면과 상태로 구현한다.
**Architecture:** 승인된 ADR의 apps/name-web Next.js 앱, CSS 토큰, React 상태, same-origin API 어댑터, Web Locks로 보호하는 단일 브라우저 기록. 제품 API는 아직 없으므로 정상 경로에서 실패를 가짜 결과로 대체하지 않는다. 개발 전용 /dev에서만 명시적 mock을 제공한다.
**Spec:** docs/PRD.md, docs/specs/2026-09-29-my-name-is-mvp-design.md, docs/specs/2026-09-29-my-name-is-api-contract.md, Figma mUsrQkJO2nnNEDLUbwKM3R.

## 제약과 결정
- 사용자 지정 대상 C:/workspace/my-name-is. 기존 master(커밋 없음)와 모든 기존 파일 보존, 커밋·배포·병합 없음.
- 기존 제품 앱/API/공통 UI 없음. 계산 패키지와 국내 지역 자료는 유지. 전체 사전을 브라우저에 싣지 않는다.
- 시스템 글꼴, 본문 16px, 44px 터치, 320px 여백 16px/390px 여백 24px, PC 본문 최대 720px.
- Figma의 Noto와 입력값·추천·회상문 위치표시자는 제품 데이터로 복제하지 않는다. 잘리는 고정 높이는 스크롤로 구현.
- API 계약의 세부 DTO 미정 필드는 공개 어댑터 타입으로 명시하고 백엔드 인계 목록에 남긴다.
- 현재 npm 최신 Next 16.3.7. 공식 9월 공지는 16.3.8 보안 수정 예정. 로컬 전용 실행, 배포 전 패치 필요.

## 실행 순서와 검증 경계
- [x] 1. apps/name-web/package.json·app/layout.tsx·app/globals.css: Next/React 고정, Figma 토큰과 공통 Button/Field/Choice/Progress/Dialog 구성.
- [x] 2. lib/contracts.ts·lib/client/api.ts: 입력/공개 응답 검증과 API 오류 테스트를 먼저 실패 확인, 최소 구현. config/hanja-search/analyses/stories 계약을 fetch로 호출하며 자동 재시도하지 않는다.
- [x] 3. lib/client/record.ts: 손상 기록 보존, 저장 실패, revision 비교, 삭제·다른 탭 변경·늦은 응답 검증 후 구현. 마지막 완료 기록만 저장한다.
- [x] 4. components/NameApp.tsx·BirthForm.tsx·HanjaPicker.tsx·Results.tsx: 시작→입력→확인→현재→유형별 후보→회상문, 공유/삭제와 보류/실패를 연결. native dialog로 Esc·포커스 가두기·복귀.
- [x] 5. app/dev/page.tsx·lib/dev/mock.ts: NODE_ENV=development에서만 켜는 시연. 개발 표시, 별도 저장 키, 수동 시나리오 선택. 제품 API 미구현은 503 안내, 성공으로 보이지 않도록 한다.
- [x] 6. tests: Node test/tsx로 계약·저장 경계 검증, 브라우저 흐름·실패·키보드 확인. 320/390/1440 screenshot 비교 후 CSS 보정. typecheck/build.
- [x] 7. README와 검증 보고서: 실행 주소, 실제/시연 경계, Figma 매핑, 미연결 API·실기기 미검증을 기록.

## 진행 기록
- PRD·화면 입력 정책·API 계약·FE ADR 확인. Figma 4개 페이지와 41개 화면 확인. 시작/출생/이름/추천의 고해상도 디자인 컨텍스트·스크린샷 확보.

- 완료 기록: docs/verification/2026-10-01-name-web.md. 프런트엔드 검증 6 tests/typecheck/build 통과. 미연결 API와 실기기 미검증은 별도 명시.
- 판단: 커밋 없는 기존 master를 보존하라는 사용자 지시에 따라 브랜치 전환/초기 커밋 없이 작업. 제품 API를 추측 구현하지 않고 503 경계와 개발 시연을 제공.
