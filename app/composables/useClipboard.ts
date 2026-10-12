type UseClipboardReturn = {
  copyText: (text: string) => Promise<boolean>
}

// Clipboard API를 쓸 수 없을 때(권한 거부·비보안 컨텍스트)의 대체 수단: 숨은 textarea를 선택해 복사 명령을 보낸다
const copyWithSelection = (text: string): boolean => {
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.select()
  try {
    return document.execCommand('copy')
  }
  catch {
    return false
  }
  finally {
    area.remove()
  }
}

export const useClipboard = (): UseClipboardReturn => {
  const copyText = async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text)
      return true
    }
    catch {
      return copyWithSelection(text)
    }
  }

  return { copyText }
}
