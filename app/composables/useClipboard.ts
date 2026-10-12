type UseClipboardReturn = {
  copyText: (text: string) => Promise<boolean>
}

export const useClipboard = (): UseClipboardReturn => {
  // 권한 거부·비보안 컨텍스트에서는 false를 돌려준다
  const copyText = async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text)
      return true
    }
    catch {
      return false
    }
  }

  return { copyText }
}
