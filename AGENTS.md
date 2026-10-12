# TaxKit

**Generated:** 2026-10-12 · **Updated:** 2026-10-12

## Purpose
세무사 사무실 실무 직원용 엑셀 자동화 SPA. 탭 3개(대사기 / 법인카드 스캐너 / 독촉 메시지 생성기)로 구성되며, 업로드한 엑셀은 브라우저 메모리에서만 처리한다(네트워크 전송 0 byte). Nuxt 4(`ssr: false`) · TypeScript strict · SCSS · `xlsx` · `lucide-vue-next`. 현재는 초기 설정 단계(`init` 브랜치)라 `app/` 소스가 아직 없다.

## Key Files
| File | Description |
|------|-------------|
| `CLAUDE.md` | 작업 규칙(보안·SFC·TS·SCSS·접근성·Git). **항상 먼저 읽고 따른다** |
| `PRD.md` | 기능 스펙·타입 스키마·와이어프레임·단계별 체크리스트(9장). 규칙과 충돌하면 작업을 멈추고 사용자에게 확인 |
| `nuxt.config.ts` | SPA 설정, 운영 CSP, SCSS `abstracts` 자동 주입(`additionalData`), 텔레메트리 off |
| `package.json` | pnpm 10 고정, 스크립트(`dev`/`typecheck`/`lint`/`generate`) |
| `.gitignore` | 빌드 산출물·`.env`·다른 lock 파일·`*.xlsx`/`*.csv`(고객 데이터 커밋 방지) 제외 |

## Subdirectories
아직 없음. PRD 8장 기준 예정 구조: `app/`(pages, components, composables, utils, types, assets/scss), `public/`, `test/fixtures/`. 디렉터리가 생기면 `/deepinit`을 다시 실행해 하위 AGENTS.md를 추가한다.

## For AI Agents

### Working In This Directory
- 패키지 매니저는 pnpm만 사용한다. 새 의존성은 런타임 네트워크 요청 여부를 확인하고 사용자에게 먼저 묻는다.
- `fetch`/`$fetch`/`useFetch`, `server/` 디렉터리, 외부 CDN·애널리틱스, 행 데이터의 `localStorage` 저장, 행 데이터 `console.*` 출력은 금지.
- 모든 함수는 반환 타입을 명시한 화살표 함수, `any`·`enum`·`function` 선언 금지. 비즈니스 로직은 `composables/`·`utils/`의 순수 함수로 작성한다.
- SFC 블록 순서는 `<template>` → `<script setup lang="ts">` → `<style scoped lang="scss">`. Tailwind 금지, SCSS 변수는 자동 주입되므로 `@use` 하지 않는다.
- 브랜치는 영어 소문자 한 단어(`init`/`reconcile`/`scanner`/`message`/`release`), 커밋은 Conventional Commits + 한국어, `main` 직접 커밋 금지.

### Testing Requirements
- 커밋 전 `pnpm typecheck && pnpm lint` 통과.
- 개발자도구 네트워크 탭에서 외부 요청이 없는지 확인. 테스트 픽스처는 `test/fixtures`의 익명화 샘플만 사용.
- 완료한 항목은 `PRD.md` 체크리스트에서 `[x]`로 갱신한다.

### Common Patterns
- 탭 간 공유는 `useState('taxkit:…')`를 `composables/useHandoff.ts` 한 곳으로 감싼다.
- 엑셀 셀 값은 `unknown`으로 받아 `utils/` 파서로만 변환하고, 파싱 실패는 `ParseIssue`로 수집한다.

## Dependencies

### External
- `nuxt` 4 / `vue` 3 — SPA 프레임워크
- `xlsx`(SheetJS, 공식 tgz) — 엑셀 읽기/쓰기
- `lucide-vue-next` — 아이콘
- `pretendard` — 셀프 호스팅 폰트
- `sass`, `@nuxt/eslint`, `vue-tsc` — 개발 도구

## Manual Notes

Notes under this heading are written by humans and preserved on regeneration.
