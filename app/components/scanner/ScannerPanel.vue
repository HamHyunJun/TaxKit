<template>
  <section class="panel">
    <h1 class="panel__title">
      법인카드 스캐너
    </h1>
    <p class="panel__desc">
      법인카드 승인내역에서 이상 징후를 찾습니다.
    </p>
    <p class="panel__todo">
      기능 구현 예정입니다.
    </p>
  </section>
</template>

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
