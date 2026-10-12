const LEGAL_FORMS = /\(\s*주\s*\)|\(\s*유\s*\)|\(\s*사\s*\)|주식회사|유한회사/g

// 거래처 비교용 키: 법인 형태 표기·공백·특수문자를 지우고 소문자로 맞춘다
export const normalizeCompanyName = (name: string): string =>
  name
    .normalize('NFKC') // ㈜ → (주)
    .replace(LEGAL_FORMS, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .toLowerCase()
