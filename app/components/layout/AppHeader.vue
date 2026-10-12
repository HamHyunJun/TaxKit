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
            rx="9"
          />
          <path
            class="app-header__mark-outer"
            d="M16 7.5 24.5 16 16 24.5 7.5 16z"
          />
          <path
            class="app-header__mark-inner"
            d="M16 12.2 19.8 16 16 19.8 12.2 16z"
          />
          <defs>
            <linearGradient
              id="brand-gradient"
              x1="4"
              y1="2"
              x2="28"
              y2="30"
              gradientUnits="userSpaceOnUse"
            >
              <stop class="app-header__stop-from" />
              <stop
                class="app-header__stop-to"
                offset="1"
              />
            </linearGradient>
          </defs>
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
    align-items: center;
    gap: 0.625rem;
  }

  &__mark-bg {
    fill: url('#brand-gradient');
  }

  &__mark-outer {
    fill: $color-white;
    fill-opacity: 0.95;
  }

  &__mark-inner {
    fill: $color-emerald-700;
  }

  &__stop-from {
    stop-color: $color-emerald-500;
  }

  &__stop-to {
    stop-color: $color-emerald-700;
  }

  &__mark {
    width: 1.875rem;
    height: 1.875rem;
    flex: none;
    filter: drop-shadow(0 2px 6px #{tint($color-emerald-500, 0.35)});
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
