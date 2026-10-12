<template>
  <section class="panel">
    <h1 class="panel__title">
      독촉 메시지
    </h1>
    <p class="panel__desc">
      증빙 누락 거래처별 안내 문구를 만듭니다.
    </p>
    <p
      class="panel__todo"
      role="status"
      aria-live="polite"
    >
      Tab 1에서 전달된 누락 건: {{ handoffRows.length.toLocaleString('ko-KR') }}건
    </p>
    <p class="panel__todo">
      메시지 생성 기능 구현 예정입니다.
    </p>
  </section>
</template>

<script setup lang="ts">
const { rows: handoffRows } = useHandoff()
</script>

<style scoped lang="scss">
.panel {
  @include card-surface;

  display: grid;
  gap: $space-2;
  padding: $space-6;

  &__title {
    font-size: $font-xl;
  }

  &__desc,
  &__todo {
    color: var(--tk-muted);
  }
}
</style>
