# CLAUDE.md — TaxKit 작업 규칙

이 파일은 Claude Code가 TaxKit 저장소에서 작업할 때 **항상** 지켜야 할 규칙이다. 기능 스펙은 `PRD.md`를 기준으로 한다. 규칙과 PRD가 충돌하면 작업을 멈추고 사용자에게 확인한다.

## 0. 프로젝트 요약
- 세무사 사무실 실무 직원용 엑셀 자동화 SPA (탭 3개: 대사기 / 법인카드 스캐너 / 독촉 메시지 생성기)
- **100% 클라이언트 측 처리**: 업로드한 엑셀 데이터는 브라우저 메모리에서만 다룬다. 네트워크 전송 0 byte.
- Nuxt 4 (Vue 3 Composition API) · TypeScript strict · **SCSS (Tailwind 미사용)** · `xlsx`(SheetJS) · `lucide-vue-next`
- 배포: `nuxi generate`(SPA, `ssr: false`) → Vercel 정적 호스팅

## 1. 언어
- 모든 문서, 코드 주석, 커밋 메시지 본문, PR 설명, UI 문구는 **한국어**로 작성한다.
- 식별자(변수·함수·타입명)는 영어로 작성한다.

## 2. 명령어
```bash
pnpm install         # 의존성 설치 (postinstall에서 nuxt prepare 실행)
pnpm dev             # 개발 서버 http://localhost:3000
pnpm typecheck       # vue-tsc 타입 검사 — 커밋 전 반드시 통과
pnpm lint            # ESLint — 커밋 전 반드시 통과
pnpm generate        # 정적 빌드 (.output/public)
pnpm preview         # 빌드 결과 미리보기
```
- 패키지 매니저는 **pnpm만** 사용한다(`package.json`의 `packageManager` 필드로 버전 고정, `corepack enable` 권장). `npm`·`yarn` 명령과 `package-lock.json`·`yarn.lock`을 만들지 않는다.
- 의존성 추가는 `pnpm add <pkg>` / `pnpm add -D <pkg>`, 일회성 실행은 `pnpm dlx`, 로컬 바이너리 실행은 `pnpm exec`를 쓴다.
- `pnpm-lock.yaml`은 반드시 커밋한다. 빌드 스크립트 실행이 필요한 의존성은 `package.json`의 `pnpm.onlyBuiltDependencies`에 등록한다.

## 3. 절대 규칙 (보안)
1. `fetch`, `$fetch`, `useFetch`, `useAsyncData`, `XMLHttpRequest`, `WebSocket`, `navigator.sendBeacon`, axios 등 **네트워크 요청 코드를 작성하지 않는다.**
2. 서버 코드(`server/` 디렉터리, API 라우트, 미들웨어)를 만들지 않는다.
3. 외부 CDN·Google Fonts·애널리틱스·에러 리포팅 스크립트를 추가하지 않는다. 폰트는 `pretendard` npm 패키지로 셀프 호스팅한다.
4. 업로드된 행 데이터를 `localStorage`/`sessionStorage`/IndexedDB에 저장하지 않는다. 저장 허용 대상: 템플릿 문구, 사무소명·담당자, 임계값 옵션, 컬럼 매핑 시그니처.
5. 행 데이터를 `console.*`로 출력하지 않는다. 디버그가 필요하면 건수·소요시간만 출력하고 커밋 전에 제거한다.
6. 새 의존성을 추가하기 전에 그 패키지가 런타임에 네트워크 요청을 하지 않는지 확인하고, 사용자에게 먼저 묻는다.

## 4. 디렉터리 규약 (Nuxt 4)
- 소스는 모두 `app/` 아래에 둔다: `app/pages`, `app/components`, `app/composables`, `app/utils`, `app/types`, `app/assets`.
- 컴포넌트는 기능별 폴더로 묶는다: `components/layout`, `components/common`, `components/reconcile`, `components/scanner`, `components/message`.
- 비즈니스 로직(파싱·스코어링·규칙·그룹화)은 **컴포넌트 밖** `composables/` 또는 `utils/`의 순수 함수로 작성한다. 컴포넌트는 표시와 이벤트 연결만 담당한다.
- 타입은 `app/types/*.ts`에 모으고 `export type`으로 내보낸다.

## 5. Vue SFC 규칙

### 5.1 블록 순서 (필수)
반드시 `<template>` → `<script setup lang="ts">` → `<style scoped lang="scss">` 순서로 작성한다. Options API, `<script>`(setup 없음), 비-scoped 스타일은 쓰지 않는다(전역 스타일은 `app/assets`에만).

```vue
<template>
  <button
    type="button"
    class="copy-button"
    :class="{ 'is-copied': isCopied }"
    :aria-label="`${label} 복사`"
    @click="handleClick"
  >
    <component :is="isCopied ? Check : Copy" class="copy-button__icon" aria-hidden="true" />
    <span>{{ isCopied ? '복사됨' : '복사' }}</span>
  </button>
</template>

<script setup lang="ts">
import { Check, Copy } from 'lucide-vue-next'

type Props = {
  label: string
  text: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  copied: [label: string]
}>()

const { copyText } = useClipboard()
const isCopied = ref<boolean>(false)

// 클립보드 복사 후 아이콘을 체크로 바꾸고 부모에 알린다
const handleClick = async (): Promise<void> => {
  const ok = await copyText(props.text)
  if (!ok) return
  isCopied.value = true
  emit('copied', props.label)
}
</script>

<style scoped lang="scss">
// abstracts(변수·믹스인)는 nuxt.config.ts에서 자동 주입되므로 @use 하지 않는다
.copy-button {
  display: inline-flex;
  align-items: center;
  gap: $space-1-5;
  padding: $space-1-5 $space-3;
  border-radius: $radius-md;
  font-size: $font-sm;
  font-weight: 500;
  color: var(--tk-text);
  transition: transform $duration-fast $ease-out-quint;

  @include focus-ring;

  &:active {
    transform: scale(0.96);
  }

  &__icon {
    width: 1rem;
    height: 1rem;
  }

  &.is-copied &__icon {
    animation: spring-pop $duration-slow $spring;
  }

  @include reduced-motion {
    transition: none;

    &.is-copied &__icon {
      animation: none;
    }
  }
}
</style>
```

### 5.2 Props / Emits / 상태
- `defineProps<Props>()`, `defineEmits<{ ... }>()` 타입 기반 선언만 사용한다. 기본값은 반응형 props 구조 분해(`const { size = 'md' } = defineProps<Props>()`) 또는 `withDefaults`.
- `v-model`은 `defineModel<T>()`을 사용한다.
- `ref`/`computed`에는 추론이 명확하지 않으면 제네릭 타입을 적는다: `ref<BankTransaction[]>([])`.
- 템플릿 안에 복잡한 표현식을 쓰지 않는다. `computed`로 뺀다.

## 6. TypeScript 규칙
- `strict: true`. **`any` 금지** (`as any`, `: any`, `any[]`, 암묵적 any 모두). 알 수 없는 값은 `unknown`으로 받고 타입 가드로 좁힌다.
- `// @ts-ignore`, `// @ts-expect-error`, `!`(non-null 단언)은 쓰지 않는다. 꼭 필요하면 이유를 주석으로 남기고 사용자에게 알린다.
- 엑셀 셀 값은 `unknown`으로 받아 `utils/`의 파서(`parseAmount`, `parseDate`, `normalizeBizNo` 등)로만 변환한다. 파싱 실패는 예외 대신 `ParseIssue`로 수집한다.
- 객체 모양은 `type`으로 선언한다(확장이 필요한 공개 계약만 `interface`). 문자열 상태는 유니온 리터럴로 정의하고 `enum`은 쓰지 않는다.
- 도메인 모델(`BankTransaction`, `TaxInvoice`, `CardApproval`, `ReconcileResult`, `RiskFinding`, `MissingEvidenceRow` 등)은 `PRD.md` 4~5장의 스키마를 따른다. 스키마를 바꾸면 PRD도 함께 고친다.

## 7. 함수 작성 규칙
- **모든 함수는 명시적 반환 타입을 가진 화살표 함수**로 작성한다. `function` 선언은 쓰지 않는다.
```ts
// ✅ 좋음
const parseAmount = (raw: unknown): number | null => { /* ... */ }
const formatWon = (value: number): string => value.toLocaleString('ko-KR')
const handleDrop = (event: DragEvent): void => { /* ... */ }
const readWorkbook = async (file: File): Promise<WorkBook> => { /* ... */ }

// ❌ 금지
function parseAmount(raw) { /* ... */ }
const formatWon = (value: number) => value.toLocaleString('ko-KR') // 반환 타입 누락
```
- composable도 같은 규칙을 따르고 반환 객체 타입을 명시한다.
```ts
type UseToastReturn = {
  toasts: Readonly<Ref<readonly Toast[]>>
  showToast: (message: string) => void
}

export const useToast = (): UseToastReturn => { /* ... */ }
```
- 콜백(`map`, `filter`, `sort`)의 짧은 인라인 화살표 함수는 반환 타입이 명확하면 생략해도 된다. 단, 이름을 붙여 변수에 담는 함수는 예외 없이 반환 타입을 적는다.
- 스코어링·규칙·그룹화 함수는 부수 효과 없는 순수 함수로 작성해 단위 테스트가 가능하게 한다.

## 8. 상태 관리 (Ponytail 원칙)
- Pinia, Vuex 등 **전역 상태 관리 라이브러리를 설치하지 않는다.**
- 컴포넌트 지역 상태: `ref`, `reactive`, `computed`.
- 탭 간 공유: Nuxt 내장 `useState`만 사용하고, 키는 `taxkit:` 접두사를 붙인다(예: `useState<MissingEvidenceRow[]>('taxkit:handoff', () => [])`). 사용처는 `composables/useHandoff.ts` 한 곳으로 감싼다.
- 표준 Web API를 먼저 쓴다: `File`/`FileReader`/`Blob`/`URL.createObjectURL`, `navigator.clipboard`, `Intl.NumberFormat`/`Intl.DateTimeFormat`, `structuredClone`, `crypto.randomUUID`. lodash·dayjs·fuse.js 같은 유틸 라이브러리는 추가하지 않는다(유사도 계산도 `utils/similarity.ts`에서 직접 구현).
- 큰 파일 파싱이 UI를 멈추면 `Web Worker`(`new Worker(new URL('...', import.meta.url), { type: 'module' })`)로 옮긴다.

## 9. 스타일 규칙 (SCSS 전용)
- **Tailwind, UnoCSS 등 유틸리티 CSS 프레임워크를 쓰지 않는다.** 스타일은 모두 SCSS로 작성한다.
- 컴포넌트 스타일은 `<style scoped lang="scss">`에 작성하고, 클래스명은 BEM(`block__element--modifier`)을 따른다. 상태 클래스는 `is-*`(`.is-dragging`, `.is-copied`, `.is-active`)를 쓴다.
- SCSS 구조:
```
app/assets/scss/
├─ main.scss          # 전역 진입점 (nuxt.config.ts의 css 배열에 등록)
├─ abstracts/         # CSS를 출력하지 않는 것만: 변수·믹스인·함수·%placeholder
│  ├─ _index.scss     # @forward 'tokens'; @forward 'motion'; @forward 'mixins';
│  ├─ _tokens.scss    # $color-*, $space-*, $radius-*, $font-*, $breakpoint-*
│  ├─ _motion.scss    # $ease-out-quint, $spring, $duration-*, @mixin reduced-motion
│  └─ _mixins.scss    # @mixin focus-ring, visually-hidden, respond-to($bp), card-surface
└─ base/              # 전역 CSS 출력: _reset, _root(:root CSS 변수 --tk-*), _typography, _utilities, 공통 @keyframes
```
- `abstracts`는 `nuxt.config.ts`의 `additionalData`로 **모든 SFC에 자동 주입**된다. 그래서 컴포넌트에서 `@use 'abstracts'`를 다시 쓰지 않으며, `abstracts/` 안에는 실제 CSS 규칙을 출력하는 코드를 넣지 않는다(넣으면 모든 컴포넌트에 중복 출력된다).
- `@import`는 쓰지 않는다(Dart Sass에서 폐기 예정). `@use`/`@forward`만 사용하고, 색상 계산은 `sass:color` 모듈(`color.adjust`, `color.mix`)을 쓴다.
- 색상: 컴포넌트에 HEX 값을 직접 쓰지 않는다. 런타임 테마 값은 CSS 변수(`var(--tk-accent)`), 컴파일 타임 계산이 필요한 값은 SCSS 변수(`$color-emerald-500`)를 쓴다.
  - 기본 팔레트: Slate-900 `#0f172a`(헤더/다크 표면), Slate-50 `#f8fafc`(배경), Emerald-500 `#10b981`/600 `#059669`(포인트), Rose-600 `#e11d48`(위험), Amber-500 `#f59e0b`(주의)
  - 글자색은 배경(흰색·연한 틴트)과 4.5:1 이상이어야 한다. 초록·빨강 글자는 `$color-emerald-700`(`--tk-accent-text`)·`$color-rose-700`(`--tk-danger-text`)을 쓰고, 연한 회색 면 위 보조 글자는 `--tk-muted-strong`을 쓴다. 500·600은 아이콘·장식에만 쓰고 주요 버튼 배경은 Emerald-700이다.
- 공용 UI는 새로 스타일링하지 않고 재사용한다: 버튼은 `.tk-btn`(+`--primary`·`--ghost`·`--sm`), 입력·셀렉트·체크박스·라디오·슬라이더는 `base/_forms.scss` 전역 스타일, 택1은 `.segmented`, 다중 선택은 `.chip-toggle`, 카드는 `@include card-surface`, 표는 `@include data-table`.
- 사용자가 처음 보는 설정·표 헤더·주요 버튼을 추가하면 `InfoTip`으로 "하는 일 / 왜 필요한가요?"를 붙인다(문구는 `utils/helpTexts.ts`, 규칙별 설명은 `RISK_RULES[].help`). 표는 열을 늘리지 말고 합쳐서 6열 안팎으로 유지한다.
- 간격은 4px 기반 스케일 변수(`$space-1` = 4px, `$space-2` = 8px …)만 쓴다. 매직 넘버 금지.
- 중첩은 3단계까지만 허용한다. `!important`는 쓰지 않는다. 자식 컴포넌트 스타일 덮어쓰기는 `:deep()`으로 최소화한다.
- 상단 헤더의 `🔒 100% 로컬 연산 (데이터 외부 전송 0 byte)` 보안 뱃지는 모든 화면에서 고정 노출한다(`position: sticky`).
- 모션: `transform`, `opacity`가 기본이다. 호버·선택·포커스 같은 상태 표시에 한해 색상 전환(`color`, `background-color`, `border-color`, `box-shadow`)도 쓸 수 있고, 레이아웃 속성(`width`, `height`, `top`, `left`, `margin`)은 애니메이션하지 않는다. 지속시간·이징은 토큰만 쓴다(`$duration-*`, `$ease-out-quint`). 이징은 `$ease-out-quint: cubic-bezier(0.32, 0.72, 0, 1)`, `$spring: cubic-bezier(0.34, 1.56, 0.64, 1)`, 지속시간은 `$duration-fast`(120ms)~`$duration-slow`(350ms). `@include reduced-motion { ... }`으로 `prefers-reduced-motion: reduce`에서 애니메이션을 끈다.
- 숫자 컬럼은 `font-variant-numeric: tabular-nums`, 오른쪽 정렬.

## 10. 접근성 규칙
- 시맨틱 태그 우선: `header`, `nav`, `main`, `section`, `footer`, `table`, `button`, `label`. 클릭 가능한 `div`를 만들지 않는다.
- 탭은 WAI-ARIA Tabs 패턴(`tablist`/`tab`/`tabpanel`, `aria-selected`, `aria-controls`, 화살표·Home·End 키, 로빙 tabindex)을 구현한다.
- 드롭존은 `<label>` + 숨김 `<input type="file">`로 만들어 키보드로도 파일을 고를 수 있게 한다.
- 비동기 결과(파싱 완료, 복사 완료, 오류)는 `aria-live="polite"` 영역으로 알린다.
- 아이콘 단독 버튼에는 `aria-label`, 장식 아이콘에는 `aria-hidden="true"`.
- 상태를 색으로만 구분하지 않는다(텍스트 라벨 병기). 명도 대비 4.5:1 이상, `:focus-visible` 포커스 링 유지.

## 11. Git 규칙

### 11.1 브랜치
- 브랜치명은 **영어 소문자 한 단어**로 짓는다. 하이픈·슬래시·접두사(`feature/`) 금지.
- 예약 브랜치: `init`(초기 설정·공통 기반), `reconcile`(Tab 1), `scanner`(Tab 2), `message`(Tab 3), `release`(마무리·배포). 그 외에는 `hotfix`, `docs`, `a11y`처럼 한 단어로 짓는다.
- `main`에 직접 커밋하지 않는다. 작업 브랜치에서 커밋 후 PR로 병합한다.

### 11.2 커밋 메시지
- 형식: Conventional Commits. 타입 태그는 영어, **제목과 본문은 한국어**.
```
feat: 대사 결과 스코어링 로직 추가

- 금액 버킷으로 후보를 좁힌 뒤 날짜·상호 점수를 가중합한다
- 점수 0.8 이상은 일치, 0.5~0.8은 검토 필요로 분류한다
```
- 사용 태그: `feat`(기능), `fix`(버그), `refactor`(동작 변화 없는 구조 개선), `style`(포맷·스타일), `docs`(문서), `test`(테스트), `chore`(설정·의존성), `perf`(성능).
- 제목은 50자 이내, 마침표 없이, "~추가/수정/제거" 같은 명사형 종결.
- 한 커밋에는 하나의 논리적 변경만 담는다. 커밋 전 `pnpm typecheck && pnpm lint`를 통과시킨다.

## 12. 작업 절차
1. 작업 시작 시 `PRD.md`의 해당 Phase 체크리스트를 확인한다.
2. 브랜치를 규칙에 맞게 만든다(이미 있으면 그 브랜치에서 계속).
3. 타입 → 유틸(순수 함수) → composable → 컴포넌트 순서로 구현한다.
4. 타입 검사와 린트를 통과시키고, 브라우저 개발자도구 네트워크 탭에서 외부 요청이 없는지 확인한다.
5. 완료한 체크리스트 항목을 `PRD.md`에서 `[x]`로 바꾼다.
6. 결정한 사항과 새로 생긴 규칙은 이 파일 또는 PRD에 반영한다.

## 13. 하지 말 것
- 전역 상태 라이브러리, UI 컴포넌트 라이브러리(Vuetify, Element 등), Tailwind 등 유틸리티 CSS 프레임워크, CSS-in-JS 추가
- `server/` 디렉터리 생성, SSR 활성화
- `any`, `function` 선언, 반환 타입 없는 이름 있는 함수
- 실제 고객 데이터가 담긴 엑셀을 저장소에 커밋 (`test/fixtures`에는 익명화된 샘플만)
- 사용자 확인 없이 의존성 추가·메이저 버전 업그레이드
