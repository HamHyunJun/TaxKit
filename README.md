# TaxKit — 세무 마감 업무 자동화 헬퍼

세무사 사무실 실무 직원이 엑셀 파일 몇 개로 반복 업무를 끝낼 수 있게 돕는 웹 도구입니다.
**업로드한 엑셀은 브라우저 메모리에서만 처리하고, 서버로 한 바이트도 보내지 않습니다.**

- 서비스: https://taxkit-wine.vercel.app
- 기능 스펙: [`PRD.md`](./PRD.md) · 작업 규칙: [`CLAUDE.md`](./CLAUDE.md) · AI 에이전트용 안내: [`AGENTS.md`](./AGENTS.md)
- 샘플 엑셀과 예상 결과: [`test/fixtures/README.md`](./test/fixtures/README.md)

## 기능

세 개의 탭으로 이루어져 있고, 각 탭은 독립된 도구입니다.

| 탭 | 하는 일 | 입력 | 출력 |
| --- | --- | --- | --- |
| **계좌·세금계산서 대사** | 통장 거래와 세금계산서를 금액·날짜·상호로 짝지어 세금계산서가 누락된 것으로 의심되는 건을 찾는다 | 통장 거래내역, 홈택스 세금계산서 | 일치·누락 의심·금액 불일치 3개 필터와 결과 엑셀 |
| **법인카드 스캐너** | 카드 승인내역에서 소명이 필요한 건(심야, 주말·공휴일, 사적 의심 업종, 분할 결제)을 찾는다 | 법인카드 승인내역 | 위험도별 목록, 소명 입력, 소명 대상 엑셀 |
| **독촉 메시지 생성기** | 누락 건을 거래처별로 묶어 카카오톡·문자용 안내 문구를 만든다 | 대사 탭에서 전달된 누락 건 또는 직접 올린 엑셀 | 거래처별 문구, 한 번에 복사 |

### 대사 알고리즘 (탭 1)
- 통장 금액이 같은 세금계산서만 후보로 삼고(허용오차 옵션), 작성일과의 차이가 날짜 윈도우(기본 ±5일) 안인 것만 남깁니다.
- 점수 = 금액 0.5 + 날짜 0.3 + 상호 유사도 0.2. 0.8 이상은 **일치**, 0.5~0.8은 **검토 필요**, 그 미만은 **누락 의심**입니다.
- 상호 유사도는 정규화한 이름의 포함 관계, 문자 bigram Dice, Jaro-Winkler 중 큰 값입니다.
- 통장 한 건당 상위 16개 후보만 비교하고 유사도는 캐시하며, 점수 순으로 1:1 배정한 뒤 남은 건은 폴백 단계에서 한 번 더 짝을 찾습니다. 같은 금액 3,000건이 몰려도 3초 안에 끝나는 것을 테스트로 고정했습니다.
- 이자·수수료·급여·국세·4대보험·카드대금 등은 자동 제외합니다(옵션).
- 우리 회사 사업자번호는 세금계산서에서 가장 많이 나오는 번호로 추정하거나 직접 입력합니다. 이를 바탕으로 입금(매출)·출금(매입)의 방향을 나눕니다.

### 위험 규칙 (탭 2)
| 규칙 | 조건 | 점수 |
| --- | --- | --- |
| 심야 사용 | 23:00~다음 날 05:59 승인 | 2 |
| 주말 사용 | 토·일요일 | 1 |
| 공휴일 사용 | 법정·대체공휴일 (내장 표, 2025~2027년) | 2 |
| 사적 의심 업종 | 골프, 병원, 노래방, 상품권 등 가맹점·업종 키워드 | 3 |
| 연속 분할 결제 | 같은 카드·가맹점에서 60분 안에 2건 이상, 또는 같은 날 합계가 한도 초과 | 3 |
| 딱 떨어지는 고액 | 10만 원 이상이면서 1만 원 단위 (기본 꺼짐) | 1 |

점수 합이 3점 이상이면 **High**, 미만이면 **Medium**입니다. 취소 건은 같은 카드·가맹점·금액의 원 승인과 짝지어 둘 다 뺍니다.

### 엑셀 읽기 (공통)
- `.xlsx` `.xls` `.csv`(CP949 포함)를 읽고, 위쪽 제목 행을 건너뛰어 헤더 행을 자동으로 찾습니다.
- 헤더 이름을 별칭 사전으로 대조해 열을 자동 매핑합니다. 못 찾은 필수 열이 있으면 **컬럼 매핑 창**이 열리고, 같은 양식이면 지정한 매핑을 기억합니다(열 이름 조합만 저장하고 데이터는 저장하지 않음).
- 금액(`'275,000'`, 음수 괄호), 날짜(`2026.09.31`처럼 잘못된 값 포함), 사업자번호, 상호(`(주)` 표기 차이)는 파서가 정규화하고, 읽지 못한 행은 예외 대신 "확인 필요"로 모아 보여줍니다.

## 개인정보 보호 설계

데이터가 브라우저 밖으로 나가지 않는다는 점이 이 도구의 핵심 요구사항입니다. 아래를 코드·배포 설정으로 강제합니다.

- `fetch`·`XMLHttpRequest`·`WebSocket` 등 네트워크 요청 코드와 `server/` 디렉터리가 없습니다(정적 SPA).
- 외부 CDN, Google Fonts, 애널리틱스, 에러 리포팅이 없습니다. 폰트는 `pretendard` 패키지로 셀프 호스팅합니다.
- 업로드한 행 데이터는 `localStorage` 등에 저장하지 않고 `console`에 출력하지 않습니다. 저장하는 것은 템플릿 문구, 사무소명·담당자, 옵션, 컬럼 매핑 시그니처뿐입니다.
- 운영 배포에는 보안 헤더를 붙입니다(`vercel.json`): `Content-Security-Policy`(같은 출처 외 모든 연결 차단, `frame-ancestors 'none'`), `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy`.
- `xlsx`(SheetJS) 공식 배포본은 npm 레지스트리가 아니라 `vendor/xlsx-0.20.3.tgz`로 저장소에 고정하고, 잠금 파일의 무결성 해시로 검증합니다.
- 헤더의 `100% 로컬 연산` 보안 뱃지는 모든 화면에서 고정 노출됩니다.

## 기술 스택

| 영역 | 선택 |
| --- | --- |
| 프레임워크 | Nuxt 4 (Vue 3 Composition API), `ssr: false` 정적 SPA |
| 언어 | TypeScript strict (`any`·`enum`·`function` 선언 금지) |
| 스타일 | SCSS 전용 (Tailwind 미사용), BEM, 디자인 토큰, `prefers-reduced-motion` 대응 |
| 엑셀 | `xlsx`(SheetJS) |
| 아이콘·폰트 | `lucide-vue-next`, `pretendard`(셀프 호스팅) |
| 상태 관리 | Pinia 등 없이 `ref`/`computed` + 탭 간 공유용 `useState` 한 곳(`useHandoff`) |
| 테스트 | Node 내장 `node --test` (러너 설치 없음) |
| 배포 | Vercel 정적 호스팅 |

## 시작하기

필요한 것: **Node.js 22.18 이상**, **pnpm 10** (`corepack enable` 권장). 패키지 매니저는 pnpm만 씁니다.

```bash
pnpm install     # 의존성 설치 (postinstall에서 nuxt prepare 실행)
pnpm dev         # 개발 서버 http://localhost:3000
pnpm test        # 단위 테스트 (node --test)
pnpm typecheck   # vue-tsc 타입 검사
pnpm lint        # ESLint
pnpm generate    # 정적 빌드 (.output/public)
pnpm preview     # 빌드 결과 미리보기
```

커밋 전에는 `pnpm typecheck && pnpm lint`가 통과해야 합니다.

## 디렉터리 구조

```
app/
├─ pages/index.vue            탭 컨테이너 (?tab= 쿼리, KeepAlive로 탭 상태 유지)
├─ components/
│  ├─ layout/                 헤더(sticky), 보안 뱃지, 탭 내비게이션, 푸터
│  ├─ common/                 DropZone, ColumnMapModal, InfoTip, CopyButton, ShowMore, ToastHost, PageHeader
│  ├─ reconcile/              탭 1 화면
│  ├─ scanner/                탭 2 화면
│  └─ message/                탭 3 화면
├─ composables/               상태·입출력 (useSheetSource, useReconcile, useRiskScanner, useMessageBuilder,
│                             useExcelReader/Writer, useColumnMapping, useHandoff, useToast, usePagedList …)
├─ utils/                     순수 함수: 값 정규화, 대사 엔진, 위험 규칙, 메시지 그룹화·템플릿, 컬럼 별칭 사전, 엑셀 내보내기, 도움말 문구
├─ types/                     도메인 타입
└─ assets/scss/               abstracts(토큰·모션·믹스인, 모든 SFC에 자동 주입) + base(리셋·변수·폼·버튼)
test/
├─ unit/                      node --test 단위 테스트
└─ fixtures/                  익명화한 샘플 엑셀(탭별)과 예상 결과
vendor/                       고정한 xlsx 배포본
vercel.json                   빌드 명령과 보안 헤더
```

## 설계 원칙

- **로직과 화면의 분리**: 파싱·스코어링·규칙·그룹화는 부수 효과 없는 순수 함수(`utils/`)로 두고, 컴포넌트는 표시와 이벤트 연결만 맡습니다. 덕분에 브라우저 없이 `node --test`로 검증합니다.
- **세 탭이 같은 읽기 흐름을 씁니다**: `useSheetSource`가 파일 읽기 → 헤더 탐지 → (필요하면) 컬럼 매핑 창 → 정규화 → 행 변환을 한 곳에서 처리합니다.
- **파싱 실패는 예외가 아니라 데이터**: 읽지 못한 값은 `ParseIssue`로 모아 "확인 필요 N건"으로 보여줍니다.
- **ponytail(YAGNI)**: 요청하지 않은 추상화·라이브러리를 늘리지 않습니다. 표준 Web API를 먼저 쓰고, 유사도 계산도 직접 구현합니다.
- **접근성**: 시맨틱 태그, WAI-ARIA Tabs 패턴, 키보드 탐색, `aria-live` 알림, 4.5:1 이상 명도 대비, 색에만 의존하지 않는 상태 표시(텍스트 라벨·도장 표시).
- **디자인**: "장부·도장" 콘셉트. 잉크색 헤더, 종이색 배경, 장부 초록 포인트, 도장 빨강(누락 의심·High), 형광펜 노랑(주의). 호버·선택·포커스에 부드러운 전환을 쓰되 레이아웃 속성은 애니메이션하지 않습니다.

## 테스트와 검증

- `pnpm test`: 정규화·대사 엔진·위험 규칙·메시지·엑셀 쓰기·컬럼 다시 지정 흐름과, `test/fixtures` 샘플로 끝까지 돌리는 통합 테스트를 실행합니다.
- 화면 동작은 정적 빌드를 로컬 서버로 띄워 Chrome 원격 디버깅으로 클릭·키보드·네트워크를 점검하고, axe-core(접근성)와 Lighthouse를 함께 돌렸습니다. 외부 요청 0건과 콘솔 오류 0건을 기준으로 삼습니다.
- 샘플 엑셀은 모두 가상의 상호·사업자번호·금액입니다. 실제 고객 엑셀은 저장소에 올리지 않습니다(`*.xlsx`는 `.vercelignore`로 배포에서도 제외).

## 배포

`main`에 병합하면 Vercel이 `pnpm install --frozen-lockfile` 후 `NITRO_PRESET=static pnpm generate`를 실행하고 `.output/public`을 정적으로 서비스합니다. 브랜치 푸시마다 Preview 배포가 만들어집니다.

## 개발 흐름과 AI 도구

이 프로젝트는 [Claude Code](https://claude.com/claude-code)로 개발했습니다. 규칙은 문서로 고정해 두었고, 사람과 AI가 같은 기준을 따릅니다.

| 문서 | 역할 |
| --- | --- |
| `PRD.md` | 무엇을 만들지: 기능 스펙, 타입 스키마, 와이어프레임, 단계별 체크리스트 |
| `CLAUDE.md` | 어떻게 만들지: 보안·SFC·TypeScript·SCSS·접근성·Git 규칙. 규칙과 PRD가 충돌하면 작업을 멈추고 확인 |
| `AGENTS.md` | 디렉터리별 구조·작업 요령 (`deepinit`으로 생성, 에이전트가 먼저 읽음) |

작업에 쓴 Claude Code 스킬·플러그인은 다음과 같습니다.

| 도구 | 용도 |
| --- | --- |
| **oh-my-claudecode** (`autopilot`, `deepinit`, `code-reviewer` 에이전트) | 탭 단위 기능을 계획→구현→검증 순서로 자동 진행, `AGENTS.md` 생성, 독립 코드 리뷰 |
| **ponytail** (`ponytail`, `ponytail-audit`, `ponytail-review`) | 가장 작은 변경으로 짜게 하는 작성 규칙. `audit`는 저장소 전체 점검, `review`는 변경분 리뷰 |
| **frontend-design** | 디자인 개편(타이포그래피·팔레트·구조 요소를 의도적으로 선택) |
| **Vercel 연동** | 정적 배포 설정과 배포 상태 확인 |

### Git 규칙
- 브랜치명은 영어 소문자 한 단어(`init` `reconcile` `scanner` `message` `release` `docs` `test` …)이며 `main`에는 직접 커밋하지 않고 PR로 병합합니다.
- 커밋은 Conventional Commits 형식이고, 제목과 본문은 한국어입니다(`feat:` `fix:` `refactor:` `style:` `docs:` `test:` `chore:` `perf:`).
- 한 커밋에는 하나의 논리적 변경만 담습니다.

## 알려진 한계
- 공휴일 표는 2025~2027년만 들어 있어, 그 밖의 연도는 공휴일 규칙이 판정하지 못하고 화면에서 알립니다.
- 같은 금액의 세금계산서가 후보 제한(16개)보다 많이 몰리면(예: 고정 월세) 어떤 거래끼리 짝이 맺히는지가 전역 최적과 다를 수 있습니다(누락 건수는 대체로 같음).
- 취소 상계는 승인번호가 같아야 합니다. 취소 행이 새 승인번호를 쓰는 카드사 양식은 상계되지 않습니다.
- 스크린리더 실기 테스트는 하지 못했습니다.
