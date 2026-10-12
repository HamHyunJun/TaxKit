<template>
  <section class="panel">
    <h1 class="panel__title">
      계좌·세금계산서 대사
    </h1>
    <p class="panel__desc">
      통장 거래내역과 홈택스 세금계산서를 대사합니다.
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
