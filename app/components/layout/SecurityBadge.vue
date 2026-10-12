<template>
  <div
    ref="rootRef"
    class="security-badge"
  >
    <button
      ref="buttonRef"
      type="button"
      class="security-badge__button"
      :aria-expanded="isOpen"
      aria-controls="security-popover"
      @click="isOpen = !isOpen"
    >
      <span class="security-badge__lock">
        <Lock
          class="security-badge__icon"
          aria-hidden="true"
        />
      </span>
      <span>100% 로컬 연산 (데이터 외부 전송 0 byte)</span>
      <ChevronDown
        class="security-badge__chevron"
        :class="{ 'is-open': isOpen }"
        aria-hidden="true"
      />
    </button>
    <Transition name="popover">
      <div
        v-if="isOpen"
        id="security-popover"
        class="security-badge__popover"
        role="region"
        aria-label="로컬 처리 안내"
      >
        <h2 class="security-badge__title">
          어떻게 로컬에서만 처리되나요?
        </h2>
        <p>
          업로드한 엑셀은 서버로 전송되지 않고 이 브라우저의 메모리에서만 처리됩니다.
          새로고침하면 데이터가 사라지고 처리 기록은 저장되지 않습니다.
        </p>
        <div class="security-badge__howto">
          <p class="security-badge__howto-title">
            직접 확인하는 방법
          </p>
          <p>
            <kbd>F12</kbd>로 개발자도구를 열고 <strong>네트워크</strong> 탭을 본 상태에서 파일을 올려 보세요.
            새 요청이 생기지 않습니다.
          </p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ChevronDown, Lock } from 'lucide-vue-next'

const isOpen = ref<boolean>(false)
const rootRef = ref<HTMLElement | null>(null)
const buttonRef = ref<HTMLButtonElement | null>(null)

// 닫을 때 포커스를 버튼으로 되돌린다
const close = (): void => {
  isOpen.value = false
  buttonRef.value?.focus()
}

const handleOutsidePointerDown = (event: PointerEvent): void => {
  if (!isOpen.value) return
  if (event.target instanceof Node && rootRef.value?.contains(event.target)) return
  isOpen.value = false
}

// 팝오버 바깥을 누르거나 어디서든 Esc를 누르면 닫는다
// (Safari는 버튼 클릭에 포커스를 주지 않아 요소 단위 keydown만으로는 Esc가 먹지 않는다)
const handleEscape = (event: KeyboardEvent): void => {
  if (event.key === 'Escape' && isOpen.value) close()
}

onMounted(() => {
  document.addEventListener('pointerdown', handleOutsidePointerDown)
  document.addEventListener('keydown', handleEscape)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutsidePointerDown)
  document.removeEventListener('keydown', handleEscape)
})
</script>

<style scoped lang="scss">
.security-badge {
  position: relative;

  &__button {
    display: inline-flex;
    align-items: center;
    gap: $space-2;
    padding: $space-1 $space-3 $space-1 $space-1;
    border: 1px solid #{tint($color-emerald-500, 0.45)};
    border-radius: $radius-full;
    background: #{tint($color-emerald-500, 0.12)};
    color: $color-emerald-100;
    font-size: $font-sm;
    font-weight: 600;
    transition:
      transform 120ms $ease-out-quint,
      background-color 160ms $ease-out-quint,
      border-color 160ms $ease-out-quint;

    @include focus-ring;

    &:hover {
      border-color: #{tint($color-emerald-500, 0.7)};
      background: #{tint($color-emerald-500, 0.2)};
    }

    &:active {
      transform: scale(0.97);
    }

    @include reduced-motion {
      transition: none;
    }
  }

  &__lock {
    display: inline-grid;
    place-content: center;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 50%;
    background: var(--tk-accent);
    color: var(--tk-bg);
  }

  &__icon {
    width: 0.8125rem;
    height: 0.8125rem;
  }

  &__chevron {
    width: 0.875rem;
    height: 0.875rem;
    color: $color-emerald-500;
    transition: transform 160ms $ease-out-quint;

    &.is-open {
      transform: rotate(180deg);
    }

    @include reduced-motion {
      transition: none;
    }
  }

  &__popover {
    @include card-surface;

    position: absolute;
    top: calc(100% + #{$space-3});
    right: 0;
    z-index: 60;
    display: grid;
    gap: $space-3;
    width: min(23rem, calc(100vw - #{$space-8}));
    padding: $space-5;
    color: var(--tk-text);
    font-size: $font-sm;
    line-height: 1.65;
    box-shadow: var(--tk-shadow-pop);
    transform-origin: top right;
    word-break: keep-all;
  }

  &__title {
    font-size: $font-base;
  }

  &__howto {
    display: grid;
    gap: $space-1;
    padding: $space-3;
    border-radius: $radius-md;
    background: var(--tk-accent-soft);
  }

  &__howto-title {
    color: var(--tk-accent-text);
    font-size: $font-xs;
    font-weight: 700;
    letter-spacing: $tracking-wide;
  }
}

.popover-enter-active,
.popover-leave-active {
  transition:
    opacity 140ms $ease-out-quint,
    transform 140ms $ease-out-quint;

  @include reduced-motion {
    transition: none;
  }
}

.popover-enter-from,
.popover-leave-to {
  opacity: 0;
  transform: scale(0.97) translateY(-4px);
}
</style>
