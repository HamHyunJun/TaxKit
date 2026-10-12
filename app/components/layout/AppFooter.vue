<template>
  <footer class="app-footer">
    <p class="app-footer__line">
      <ShieldCheck
        class="app-footer__icon"
        aria-hidden="true"
      />
      새로고침하면 모든 데이터가 사라집니다. 처리 기록은 저장되지 않습니다
    </p>
  </footer>
</template>

<script setup lang="ts">
import { ShieldCheck } from 'lucide-vue-next'
</script>

<style scoped lang="scss">
.app-footer {
  margin-top: $space-8;
  padding: $space-6 $space-4 $space-8;
  border-top: 1px solid var(--tk-border);
  color: var(--tk-muted);
  font-size: $font-sm;
  text-align: center;

  &__line {
    display: inline-flex;
    align-items: center;
    gap: $space-2;
  }

  &__icon {
    width: 1rem;
    height: 1rem;
    color: var(--tk-accent-hover);
  }
}
</style>
