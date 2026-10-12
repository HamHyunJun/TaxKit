import type { MessageChannel, MessageSettings, PartnerGroup } from '~/types/message'

export const TEMPLATE_VARIABLES: readonly string[] = ['거래처명', '건수', '합계금액', '기간', '목록', '회신기한', '사무소명', '담당자']

export const DEFAULT_TEMPLATES: Record<MessageChannel, string> = {
  kakao: `안녕하세요, {사무소명} {담당자}입니다.
{거래처명} 귀하와의 {기간} 거래 중 세금계산서(증빙) 확인이 되지 않는 건이 {건수}건(합계 {합계금액}원) 있어 안내드립니다.

{목록}

번거로우시겠지만 {회신기한}까지 세금계산서 발행 또는 증빙 자료 회신 부탁드립니다.
감사합니다.`,
  sms: '[{사무소명}] {거래처명}님, 세금계산서 확인이 안 되는 {건수}건({합계금액}원)이 있습니다. {회신기한}까지 발행 또는 증빙 회신 부탁드립니다. 담당 {담당자}',
}

export const CHANNEL_LABELS: Record<MessageChannel, string> = { kakao: '카카오톡', sms: '문자' }

const MAX_LIST_ITEMS = 10
const SEPARATOR = '\n\n──────────\n\n'

const dotDate = (date: Date): string => formatDate(date).replaceAll('-', '.')

// 오늘 + N일 (input[type=date] 값 형식)
export const defaultDueDate = (daysFromToday = 7): string => {
  const date = new Date()
  date.setDate(date.getDate() + daysFromToday)
  return formatDate(date)
}

// "- 2026.09.03  1,100,000원  (적요)" 한 줄씩. 10건을 넘으면 앞 10건과 "외 n건"
const buildList = (group: PartnerGroup): string => {
  const lines = group.rows.slice(0, MAX_LIST_ITEMS).map((row) => {
    const description = row.description ? `  (${row.description})` : ''
    return `- ${dotDate(row.date)}  ${formatWon(row.amount)}원${description}`
  })
  if (group.count > MAX_LIST_ITEMS) lines.push(`외 ${group.count - MAX_LIST_ITEMS}건`)
  return lines.join('\n')
}

const buildPeriod = (group: PartnerGroup): string =>
  formatDate(group.firstDate) === formatDate(group.lastDate)
    ? dotDate(group.firstDate)
    : `${dotDate(group.firstDate)}~${dotDate(group.lastDate)}`

// 템플릿의 {변수}를 거래처·설정 값으로 바꾼다. 비워 둔 설정은 자리표시 문구로, 모르는 변수는 그대로 둔다
export const renderMessage = (template: string, group: PartnerGroup, settings: MessageSettings): string => {
  const values: Record<string, string> = {
    거래처명: group.name,
    건수: String(group.count),
    합계금액: formatWon(group.total),
    기간: buildPeriod(group),
    목록: buildList(group),
    회신기한: settings.dueDate ? dotDate(new Date(`${settings.dueDate}T00:00:00`)) : '○월 ○일',
    사무소명: settings.officeName.trim() || '○○세무회계',
    담당자: settings.manager.trim() || '담당자',
  }
  return template.replace(/\{([^{}]+)\}/g, (match, key: string) => values[key] ?? match)
}

// 모든 거래처 문구를 구분선으로 이어 붙인다
export const joinMessages = (messages: readonly string[]): string => messages.join(SEPARATOR)
