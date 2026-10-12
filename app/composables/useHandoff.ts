import type { MissingEvidenceRow } from '~/types/message'

type UseHandoffReturn = {
  rows: Readonly<Ref<readonly MissingEvidenceRow[]>>
  setHandoff: (rows: MissingEvidenceRow[]) => void
}

// Tab 1 → Tab 3 전달 상태 (메모리에만 있고 새로고침하면 사라진다)
export const useHandoff = (): UseHandoffReturn => {
  const rows = useState<MissingEvidenceRow[]>('taxkit:handoff', () => [])

  const setHandoff = (next: MissingEvidenceRow[]): void => {
    rows.value = next
  }

  return { rows, setHandoff }
}
