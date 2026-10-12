<template>
  <section class="panel">
    <h1 class="panel__title">
      독촉 메시지
    </h1>
    <p class="panel__desc">
      증빙 누락 거래처별 안내 문구를 만듭니다.
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
