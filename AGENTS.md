# TaxKit

**Generated:** 2026-10-12 · **Updated:** 2026-10-12

## Purpose
세무사 사무실 실무 직원용 엑셀 자동화 SPA. 탭 3개(대사기 / 법인카드 스캐너 / 독촉 메시지 생성기)로 구성되며, 업로드한 엑셀은 브라우저 메모리에서만 처리한다(네트워크 전송 0 byte). Nuxt 4(`ssr: false`) · TypeScript strict · SCSS · `xlsx` · `lucide-vue-next`. 세 탭 구현이 모두 끝났고, 남은 일은 PRD 9장 Phase 5(접근성 점검, Lighthouse, Vercel 배포)다.

## Key Files
| File | Description |
|------|-------------|
| `CLAUDE.md` | 작업 규칙(보안·SFC·TS·SCSS·접근성·Git). **항상 먼저 읽고 따른다** |
| `PRD.md` | 기능 스펙·타입 스키마·와이어프레임·단계별 체크리스트(9장). 규칙과 충돌하면 작업을 멈추고 사용자에게 확인 |
| `nuxt.config.ts` | SPA 설정, 운영 CSP, SCSS `abstracts` 자동 주입, 컴포넌트 폴더 접두사 제거, 텔레메트리 off |
| `eslint.config.mjs` | `no-explicit-any`·`func-style`·`vue/block-order` 등 프로젝트 규칙 |
| `tsconfig.json` | Nuxt 4 프로젝트 참조 (`pnpm typecheck`에 필요) |
| `package.json` | pnpm 10 고정, 스크립트(`dev`/`typecheck`/`lint`/`generate`) |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `app/pages/` | `index.vue` 탭 컨테이너. `?tab=` 쿼리로 현재 탭을 유지하고 패널을 `KeepAlive`로 보존한다 |
| `app/components/layout/` | 헤더(sticky)·보안 뱃지 팝오버·탭 내비게이션·푸터 |
| `app/components/common/` | `DropZone`·`ColumnMapModal`·`CopyButton`·`ToastHost` (탭 공용) |
| `app/components/reconcile/` | Tab 1 대사기 화면 |
| `app/components/scanner/` | Tab 2 법인카드 스캐너 화면 |
| `app/components/message/` | Tab 3 독촉 메시지 화면 |
| `app/composables/` | 상태·입출력: `useExcelReader/Writer`, `useColumnMapping`, `useReconcile`, `useRiskScanner`, `useMessageBuilder`, `useHandoff`(Tab 1→3 전달), `useToast`, `useClipboard` |
| `app/utils/` | 순수 함수: 값 정규화(`amount`·`date`·`bizNo`·`companyName`), 대사 엔진(`reconcile`·`similarity`), 위험 규칙(`riskRules`·`holidays`), 메시지(`messageGroups`·`messageTemplate`), 탭별 별칭 사전(`*Specs`), 엑셀 내보내기(`*Export`) |
| `app/types/` | 도메인 타입 (`excel`·`bank`·`invoice`·`reconcile`·`card`·`risk`·`message`·`tab`·`toast`) |
| `app/assets/scss/` | `abstracts/`(변수·믹스인·함수, 모든 SFC에 자동 주입) + `base/`(전역 CSS) |

## For AI Agents

### Working In This Directory
- 패키지 매니저는 pnpm만 사용한다. 새 의존성은 런타임 네트워크 요청 여부를 확인하고 사용자에게 먼저 묻는다.
- `fetch`/`$fetch`/`useFetch`, `server/` 디렉터리, 외부 CDN·애널리틱스, 행 데이터의 `localStorage` 저장, 행 데이터 `console.*` 출력은 금지. `localStorage`는 컬럼 매핑 시그니처와 메시지 설정(템플릿·사무소명·담당자)만 쓴다.
- 모든 함수는 반환 타입을 명시한 화살표 함수, `any`·`enum`·`function` 선언 금지. 비즈니스 로직은 `composables/`·`utils/`의 순수 함수로 작성하고, 컴포넌트는 표시와 이벤트 연결만 맡는다.
- SFC 블록 순서는 `<template>` → `<script setup lang="ts">` → `<style scoped lang="scss">`. Tailwind 금지, 컴포넌트에 HEX·`rgb()`를 직접 쓰지 않는다(`var(--tk-*)`, SCSS 변수, `tint()`). SCSS 변수는 자동 주입되므로 `@use` 하지 않는다.
- 새 탭 데이터 흐름의 공통 패턴: `useExcelReader`로 읽기 → `detectColumns`(별칭 사전) → 필수 열 누락 시 `ColumnMapModal` → `parseSheet`(정규화, 문제 행은 `ParseIssue`) → 탭별 변환 함수 → 순수 엔진.
- 브랜치는 영어 소문자 한 단어(`init`/`reconcile`/`scanner`/`message`/`release`), 커밋은 Conventional Commits + 한국어, `main` 직접 커밋 금지.
- 개발 서버(`pnpm dev`)를 띄웠다면 작업 후 종료한다. 남아 있으면 브랜치 전환 시 기본 `eslint.config.mjs`가 자동 생성되어 충돌한다.

### Testing Requirements
- 커밋 전 `pnpm typecheck && pnpm lint` 통과. 배포 전 `pnpm generate`(정적 빌드)도 확인한다.
- 테스트 러너는 도입하지 않았다(Ponytail). 로직을 바꿨다면 저장소 밖 임시 스크립트로 순수 함수를 직접 실행해 검증한다.
- 화면 동작은 정적 빌드(`.output/public`)를 로컬 서버로 띄우고 Chrome 원격 디버깅으로 클릭·키보드·네트워크를 측정해 확인할 수 있다. 외부 요청 0건과 콘솔 오류 0건을 함께 본다.
- 테스트 픽스처는 익명화 샘플만 사용하고 실제 고객 엑셀은 커밋하지 않는다(`.gitignore`가 `*.xlsx`·`*.csv`를 막는다).
- 완료한 항목은 `PRD.md` 체크리스트에서 `[x]`로 갱신한다.

### Common Patterns
- 탭 간 공유는 `useState('taxkit:…')`를 `composables/useHandoff.ts` 한 곳으로 감싼다. 그 밖의 탭 상태는 `KeepAlive`가 컴포넌트와 함께 유지한다.
- 엑셀 셀 값은 `unknown`으로 받아 `utils/` 파서로만 변환하고, 파싱 실패는 예외 대신 `ParseIssue`로 수집한다.
- 규칙·점수·그룹화는 부수 효과 없는 순수 함수로 작성하고, 결과 설명 문장(`reason`)을 함께 만든다.

## Dependencies

### External
- `nuxt` 4 / `vue` 3 — SPA 프레임워크
- `xlsx`(SheetJS, 공식 tgz) — 엑셀 읽기/쓰기
- `lucide-vue-next` — 아이콘
- `pretendard` — 셀프 호스팅 폰트
- `sass`, `@nuxt/eslint`, `vue-tsc` — 개발 도구

## Manual Notes

Notes under this heading are written by humans and preserved on regeneration.
