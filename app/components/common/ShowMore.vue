<template>
  <div
    v-if="hiddenCount > 0"
    class="show-more"
  >
    <button
      type="button"
      class="tk-btn tk-btn--sm"
      @click="emit('more')"
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

defineProps<Props>()
const emit = defineEmits<{
  more: []
}>()
</script>

<style scoped lang="scss">
.show-more {
  padding: $space-3;
  border-top: 1px solid var(--tk-border);
  text-align: center;
}
</style>
