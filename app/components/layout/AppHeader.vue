<template>
  <header class="app-header">
    <div class="app-header__inner">
      <p class="app-header__brand">
        <span
          class="app-header__logo"
          aria-hidden="true"
        >◆</span>
        <span class="app-header__name">TaxKit</span>
        <span class="app-header__tagline">세무 마감 헬퍼</span>
      </p>
      <SecurityBadge />
    </div>
  </header>
</template>

<style scoped lang="scss">
.app-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--tk-bg);
  color: $color-white;

  &__inner {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: $space-3;
    max-width: $container-max;
    margin: 0 auto;
    padding: $space-3 $space-4;

    @include respond-to(md) {
      padding-inline: $space-6;
    }
  }

  &__brand {
    display: flex;
    align-items: baseline;
    gap: $space-2;
  }

  &__logo {
    color: var(--tk-accent);
  }

  &__name {
    font-size: $font-lg;
    font-weight: 700;
  }

  &__tagline {
    font-size: $font-sm;
    color: $color-slate-200;
  }
}
</style>
