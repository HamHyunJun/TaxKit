const SMS_MAX_BYTES = 90
const LMS_MAX_BYTES = 2000

// EUC-KR 기준 근사치: ASCII는 1바이트, 한글·기호·이모지 등은 2바이트로 센다
export const smsByteLength = (text: string): number =>
  [...text].reduce((bytes, char) => bytes + ((char.codePointAt(0) ?? 0) < 0x80 ? 1 : 2), 0)

export const smsKind = (bytes: number): 'SMS' | 'LMS' | 'OVER' =>
  bytes <= SMS_MAX_BYTES ? 'SMS' : bytes <= LMS_MAX_BYTES ? 'LMS' : 'OVER'
