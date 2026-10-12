<template>
  <div
    class="toast-host"
    role="status"
    aria-live="polite"
  >
    <TransitionGroup
      name="toast"
      tag="ul"
      class="toast-host__list"
    >
      <li
        v-for="toast in toasts"
        :key="toast.id"
        class="toast-host__item"
      >
        <span class="toast-host__check">
          <Check
            class="toast-host__icon"
            aria-hidden="true"
          />
        </span>
        <span>{{ toast.message }}</span>
      </li>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { Check } from 'lucide-vue-next'

const { toasts } = useToast()
</script>

<style scoped lang="scss">
.toast-host {
  position: fixed;
  bottom: $space-6;
  left: 50%;
  z-index: 400;
  transform: translateX(-50%);
  pointer-events: none;

  &__list {
    display: grid;
    gap: $space-2;
    justify-items: center;
    padding: 0;
    list-style: none;
  }

  &__item {
    display: inline-flex;
    align-items: center;
    gap: $space-3;
    max-width: calc(100vw - #{$space-8});
    padding: $space-2 $space-5 $space-2 $space-2;
    border: 1px solid #{tint($color-white, 0.1)};
    border-radius: $radius-full;
    background: var(--tk-bg);
    color: $color-white;
    font-size: $font-sm;
    font-weight: 500;
    box-shadow: var(--tk-shadow-pop);
  }

  &__check {
    display: inline-grid;
    flex: none;
    place-content: center;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 50%;
    background: var(--tk-accent);
    color: var(--tk-bg);
  }

  &__icon {
    width: 0.875rem;
    height: 0.875rem;
  }
}

.toast-enter-active,
.toast-leave-active,
.toast-move {
  transition:
    opacity $duration-base $ease-out-quint,
    transform $duration-base $ease-out-quint;

  @include reduced-motion {
    transition: none;
  }
}

.toast-leave-active {
  position: absolute;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(16px) scale(0.96);
}
</style>
