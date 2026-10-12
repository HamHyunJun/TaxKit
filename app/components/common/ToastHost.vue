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
        <Check
          class="toast-host__icon"
          aria-hidden="true"
        />
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
  z-index: 200;
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
    gap: $space-2;
    padding: $space-2 $space-4;
    border-radius: $radius-full;
    background: var(--tk-bg);
    color: $color-white;
    font-size: $font-sm;
    box-shadow: 0 8px 24px tint($color-slate-900, 0.24);
  }

  &__icon {
    width: 1rem;
    height: 1rem;
    color: var(--tk-accent);
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
  transform: translateY(16px);
}
</style>
