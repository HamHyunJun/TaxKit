// 정보 아이콘(InfoTip)에 보여줄 설명: 무엇을 하는지 + 왜 필요한지
export type HelpEntry = {
  title: string
  what: string
  why: string
}

export type HelpTopic
  = | 'reconcilePage' | 'bankFile' | 'invoiceFile' | 'ourBizNo' | 'dateWindow' | 'amountTolerance' | 'autoExclude'
    | 'resultFilters' | 'matchScore' | 'downloadResult' | 'handoff'
    | 'scannerPage' | 'cardFile' | 'ruleSet' | 'riskLevel' | 'explanation' | 'downloadReport'
    | 'messagePage' | 'messageSource' | 'messageChannel' | 'templateEdit' | 'dueDate' | 'partnerGroups' | 'copyAll'
