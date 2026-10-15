<template>
  <header class="app-header">
    <div class="app-header__inner">
      <p class="app-header__brand">
        <svg
          class="app-header__mark"
          viewBox="0 0 32 32"
          aria-hidden="true"
        >
          <rect
            class="app-header__mark-bg"
            width="32"
            height="32"
            rx="7"
          />
          <path
            class="app-header__mark-lines"
            d="M8 10.5h16M8 16h16M8 21.5h8"
          />
          <circle
            class="app-header__mark-stamp"
            cx="23"
            cy="22"
            r="4.5"
          />
        </svg>
        <span class="app-header__name">TaxKit</span>
        <span
          class="app-header__divider"
          aria-hidden="true"
        />
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
  background:
    linear-gradient(180deg, #{tint($color-white, 0.04)}, transparent),
    var(--tk-bg);
  border-bottom: 1px solid #{tint($color-white, 0.08)};
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
    flex-wrap: wrap;
    align-items: center;
    gap: $space-2-5;
  }

  &__mark-bg {
    fill: $color-ledger-700;
  }

  &__mark-lines {
    fill: none;
    stroke: $color-white;
    stroke-width: 2;
    stroke-linecap: round;
    opacity: 0.92;
  }

  &__mark-stamp {
    fill: $color-stamp-600;
    stroke: $color-ledger-700;
    stroke-width: 1.5;
  }

  &__mark {
    width: 1.875rem;
    height: 1.875rem;
    flex: none;
  }

  &__name {
    font-size: $font-lg;
    font-weight: 700;
    letter-spacing: $tracking-tight;
  }

  &__divider {
    width: 1px;
    height: 1rem;
    background: #{tint($color-white, 0.22)};
  }

  &__tagline {
    color: $color-slate-300;
    font-size: $font-sm;
    font-weight: 500;
  }
}
</style>
