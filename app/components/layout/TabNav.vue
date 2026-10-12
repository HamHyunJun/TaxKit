<template>
  <nav
    class="tab-nav"
    aria-label="주요 기능"
  >
    <div class="tab-nav__inner">
      <div
        ref="listRef"
        class="tab-nav__list"
        role="tablist"
        aria-orientation="horizontal"
        @keydown="handleKeydown"
      >
        <button
          v-for="(tab, index) in TABS"
          :id="`tab-${tab.id}`"
          :key="tab.id"
          type="button"
          role="tab"
          class="tab-nav__tab"
          :class="{ 'is-active': tab.id === model }"
          :aria-selected="tab.id === model"
          :aria-controls="`panel-${tab.id}`"
          :tabindex="tab.id === model ? 0 : -1"
          @click="model = tab.id"
        >
          <span
            class="tab-nav__step"
            aria-hidden="true"
          >{{ index + 1 }}</span>
          <span class="tab-nav__label">{{ tab.label }}</span>
        </button>
        <span
          class="tab-nav__indicator"
          :class="{ 'is-ready': isReady }"
          :style="indicatorStyle"
          aria-hidden="true"
        />
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import type { TabId } from '~/types/tab'

const model = defineModel<TabId>({ required: true })

const listRef = ref<HTMLElement | null>(null)
const indicator = ref<{ x: number, width: number }>({ x: 0, width: 0 })
// 첫 위치 측정 후에만 이동 애니메이션을 켠다 (최초 렌더에서 미끄러지지 않도록)
const isReady = ref<boolean>(false)

// 인디케이터는 폭 1px 요소를 translateX + scaleX로 늘려 활성 탭에 맞춘다
const indicatorStyle = computed<{ transform: string }>(() => ({
  transform: `translateX(${indicator.value.x}px) scaleX(${indicator.value.width})`,
}))

const updateIndicator = (): void => {
  const active = listRef.value?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
  if (!active) return
  indicator.value = { x: active.offsetLeft, width: active.offsetWidth }
}

// 좌우 화살표·Home·End로 탭을 이동하고 포커스를 따라가게 한다
const handleKeydown = (event: KeyboardEvent): void => {
  const last = TABS.length - 1
  const current = TABS.findIndex(tab => tab.id === model.value)
  const nextIndexByKey: Record<string, number> = {
    ArrowRight: current === last ? 0 : current + 1,
    ArrowLeft: current === 0 ? last : current - 1,
    Home: 0,
    End: last,
  }
  const nextIndex = nextIndexByKey[event.key]
  if (nextIndex === undefined) return
  const nextTab = TABS[nextIndex]
  if (!nextTab) return
  event.preventDefault()
  model.value = nextTab.id
  document.getElementById(`tab-${nextTab.id}`)?.focus()
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  updateIndicator()
  requestAnimationFrame(() => {
    isReady.value = true
  })
  if (listRef.value) {
    resizeObserver = new ResizeObserver(updateIndicator)
    resizeObserver.observe(listRef.value)
  }
})
onBeforeUnmount(() => resizeObserver?.disconnect())

// aria-selected가 DOM에 반영된 뒤 측정한다
watch(model, updateIndicator, { flush: 'post' })
</script>

<style scoped lang="scss">
.tab-nav {
  background: var(--tk-card);
  border-bottom: 1px solid var(--tk-border);
  box-shadow: var(--tk-shadow-sm);

  &__inner {
    max-width: $container-max;
    margin: 0 auto;
    padding-inline: $space-2;

    @include respond-to(md) {
      padding-inline: $space-4;
    }
  }

  &__list {
    position: relative;
    display: flex;
    gap: $space-1;
    overflow-x: auto;
  }

  &__tab {
    display: inline-flex;
    flex: none;
    align-items: center;
    gap: $space-2;
    padding: $space-4 $space-4;
    color: var(--tk-muted);
    font-size: $font-sm;
    font-weight: 600;
    letter-spacing: $tracking-snug;
    white-space: nowrap;
    transition:
      color $duration-medium $ease-out-quint,
      transform $duration-fast $ease-out-quint;

    @include focus-ring;

    &:hover {
      color: var(--tk-text-strong);
    }

    &.is-active {
      color: var(--tk-text-strong);
    }

    &:active {
      transform: scale(0.97);
    }

    @include reduced-motion {
      transition: none;
    }
  }

  &__step {
    display: inline-grid;
    place-content: center;
    width: 1.375rem;
    height: 1.375rem;
    border-radius: 50%;
    background: var(--tk-surface-strong);
    color: $color-slate-600;
    font-size: $font-xs;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    transition:
      background-color $duration-base $ease-out-quint,
      color $duration-base $ease-out-quint;

    @include reduced-motion {
      transition: none;
    }
  }

  &__tab.is-active &__step {
    background: var(--tk-accent-text);
    color: $color-white;
  }

  &__indicator {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 1px;
    height: 3px;
    border-radius: 3px 3px 0 0;
    background: var(--tk-accent-text);
    transform-origin: left;

    &.is-ready {
      transition: transform $duration-indicator $ease-out-quint;
    }

    @include reduced-motion {
      &.is-ready {
        transition: none;
      }
    }
  }
}
</style>
