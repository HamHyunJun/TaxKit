// TaxKit Nuxt 4 설정
// 원칙: 서버 없이 정적 SPA로 배포하고, 업로드 데이터는 브라우저 밖으로 나가지 않는다.
const isProduction: boolean = process.env.NODE_ENV === 'production'

// 운영 빌드용 CSP: 같은 출처의 정적 자산 외 모든 외부 요청을 차단한다
// (개발 서버는 HMR 웹소켓이 필요하므로 운영 빌드에만 적용)
const contentSecurityPolicy: string = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ')

export default defineNuxtConfig({

  modules: ['@nuxt/eslint'],

  // 순수 클라이언트 렌더링: nuxi generate 시 정적 SPA 산출물 생성 (Vercel 정적 배포)
  ssr: false,

  // 폴더 접두사 없이 컴포넌트를 쓴다 (components/layout/AppHeader.vue → <AppHeader />)
  components: [{ path: '~/components', pathPrefix: false }],

  devtools: { enabled: true },

  app: {
    head: {
      htmlAttrs: { lang: 'ko' },
      title: 'TaxKit · 세무 마감 헬퍼',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: '엑셀 데이터를 외부로 보내지 않고 브라우저에서만 처리하는 세무 마감 자동화 도구' },
        { name: 'theme-color', content: '#1b2a41' },
        // 리퍼러로 어떤 정보도 외부에 흘리지 않는다
        { name: 'referrer', content: 'no-referrer' },
        ...(isProduction ? [{ 'http-equiv': 'Content-Security-Policy', 'content': contentSecurityPolicy }] : []),
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },

  // 셀프 호스팅 Pretendard 폰트 + 전역 SCSS 진입점 (외부 폰트 CDN 사용 금지, Tailwind 미사용)
  css: ['pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css', '~/assets/scss/main.scss'],

  experimental: {
    // 빌드 매니페스트를 런타임에 fetch하지 않도록 끈다 (네트워크 요청 최소화)
    appManifest: false,
  },
  compatibilityDate: '2026-10-01',

  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          // 모든 SFC에 변수·믹스인·함수만 주입한다 (abstracts는 CSS를 출력하지 않아야 중복 출력이 없다)
          additionalData: '@use "~/assets/scss/abstracts" as *;\n',
        },
      },
    },
    optimizeDeps: {
      include: ['xlsx', 'lucide-vue-next'],
    },
  },

  typescript: {
    strict: true,
    typeCheck: false, // 타입 검사는 npm run typecheck로 별도 실행
  },

  // Nuxt 내장 텔레메트리·외부 통신 기능 비활성화
  telemetry: false,

  eslint: {
    config: {
      stylistic: {
        semi: false,
        quotes: 'single',
        commaDangle: 'always-multiline',
      },
    },
  },
})
