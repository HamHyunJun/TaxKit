<template>
  <div class="app">
    <a
      class="app__skip-link"
      href="#main"
    >본문 바로가기</a>
    <AppHeader />
    <NuxtPage />
    <AppFooter />
  </div>
</template>

<style scoped lang="scss">
.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;

  &__skip-link {
    position: absolute;
    top: $space-2;
    left: $space-2;
    z-index: 100;
    padding: $space-2 $space-4;
    border-radius: $radius-md;
    background: var(--tk-accent);
    color: var(--tk-bg);
    font-weight: 600;
    transform: translateY(-200%);
    transition: transform $duration-base $ease-out-quint;

    @include focus-ring;

    &:focus {
      transform: translateY(0);
    }

    @include reduced-motion {
      transition: none;
    }
  }
}
</style>
