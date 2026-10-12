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
      <Lock
        class="security-badge__icon"
        aria-hidden="true"
      />
      <span>100% 로컬 연산 (데이터 외부 전송 0 byte)</span>
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
        <p>
          직접 확인하려면 <kbd>F12</kbd>로 개발자도구를 열고 <strong>네트워크</strong> 탭을 본 상태에서
          파일을 올려 보세요. 새 요청이 생기지 않습니다.
        </p>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { Lock } from 'lucide-vue-next'

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
    gap: $space-1-5;
    padding: $space-1-5 $space-3;
    border: 1px solid var(--tk-accent);
    border-radius: $radius-full;
    background: tint($color-emerald-500, 0.12);
    color: $color-emerald-500;
    font-size: $font-sm;
    font-weight: 600;
    transition:
      transform $duration-fast $ease-out-quint,
      background-color $duration-fast $ease-out-quint;

    @include focus-ring;

    &:hover {
      background: tint($color-emerald-500, 0.22);
    }

    &:active {
      transform: scale(0.96);
    }

    @include reduced-motion {
      transition: none;
    }
  }

  &__icon {
    width: 1rem;
    height: 1rem;
  }

  &__popover {
    @include card-surface;

    position: absolute;
    top: calc(100% + #{$space-2});
    right: 0;
    z-index: 60;
    display: grid;
    gap: $space-2;
    width: min(22rem, calc(100vw - #{$space-8}));
    padding: $space-4;
    color: var(--tk-text);
    font-size: $font-sm;
    box-shadow: 0 8px 24px tint($color-slate-900, 0.18);
    transform-origin: top right;
  }

  &__title {
    font-size: $font-base;
  }
}

.popover-enter-active,
.popover-leave-active {
  transition:
    opacity $duration-fast $ease-out-quint,
    transform $duration-fast $ease-out-quint;

  @include reduced-motion {
    transition: none;
  }
}

.popover-enter-from,
.popover-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
</style>
