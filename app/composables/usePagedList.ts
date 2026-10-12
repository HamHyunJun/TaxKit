type UsePagedListReturn<T> = {
  visible: ComputedRef<readonly T[]>
  hiddenCount: ComputedRef<number>
  nextCount: ComputedRef<number>
  showMore: () => void
}

// 긴 목록을 pageSize건씩 보여준다. 목록이 바뀌면(필터·정렬·새 결과) 처음 페이지부터 다시 보여준다
export const usePagedList = <T>(source: () => readonly T[], pageSize = 200): UsePagedListReturn<T> => {
  const shown = ref<number>(pageSize)
  watch(source, () => {
    shown.value = pageSize
  })

  const visible = computed<readonly T[]>(() => source().slice(0, shown.value))
  const hiddenCount = computed<number>(() => Math.max(0, source().length - shown.value))
  const nextCount = computed<number>(() => Math.min(pageSize, hiddenCount.value))
  const showMore = (): void => {
    shown.value += pageSize
  }

  return { visible, hiddenCount, nextCount, showMore }
}
