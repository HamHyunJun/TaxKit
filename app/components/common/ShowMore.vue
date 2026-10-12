<template>
  <div
    v-if="hiddenCount > 0"
    class="show-more"
  >
    <button
      type="button"
      class="tk-btn tk-btn--sm"
      @click="handleMore"
    >
      {{ nextCount.toLocaleString('ko-KR') }}건 더 보기 (남은 {{ hiddenCount.toLocaleString('ko-KR') }}건)
    </button>
  </div>
</template>

<script setup lang="ts">
type Props = {
  hiddenCount: number
  nextCount: number
}

const { hiddenCount, nextCount } = defineProps<Props>()
const emit = defineEmits<{
  more: []
}>()

// 마지막 묶음을 열면 이 버튼이 사라지므로, 키보드 포커스를 바로 앞의 표 영역(tabindex=0)으로 넘겨 위치를 잃지 않게 한다
const handleMore = (event: MouseEvent): void => {
  const region = event.currentTarget instanceof HTMLElement ? event.currentTarget.closest('.show-more')?.previousElementSibling : null
  emit('more')
  if (hiddenCount <= nextCount && region instanceof HTMLElement) region.focus({ preventScroll: true })
}
</script>

<style scoped lang="scss">
.show-more {
  padding: $space-3;
  border-top: 1px solid var(--tk-border);
  text-align: center;
}
</style>
