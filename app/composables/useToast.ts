import type { Toast } from '~/types/toast'

const TOAST_DURATION_MS = 2000

type UseToastReturn = {
  toasts: Readonly<Ref<readonly Toast[]>>
  showToast: (message: string) => void
}

export const useToast = (): UseToastReturn => {
  const toasts = useState<Toast[]>('taxkit:toasts', () => [])

  // 2초 뒤 스스로 사라지는 토스트를 쌓는다
  const showToast = (message: string): void => {
    const id = crypto.randomUUID()
    toasts.value = [...toasts.value, { id, message }]
    setTimeout(() => {
      toasts.value = toasts.value.filter(toast => toast.id !== id)
    }, TOAST_DURATION_MS)
  }

  return { toasts, showToast }
}
