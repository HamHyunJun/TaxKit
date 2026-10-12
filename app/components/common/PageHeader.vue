<template>
  <header class="page-header">
    <div class="page-header__text">
      <div class="page-header__title-row">
        <h1
          :id="titleId"
          class="page-header__title"
        >
          {{ title }}
        </h1>
        <InfoTip :topic="topic" />
      </div>
      <p class="page-header__desc">
        {{ description }}
      </p>
    </div>
    <div
      v-if="$slots.default"
      class="page-header__aside"
    >
      <slot />
    </div>
  </header>
</template>

<script setup lang="ts">
import type { HelpTopic } from '~/types/help'

type Props = {
  title: string
  description: string
  topic: HelpTopic
  titleId: string // 섹션의 aria-labelledby가 가리키는 id
}

defineProps<Props>()
</script>

<style scoped lang="scss">
.page-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: $space-4;

  &__text {
    display: grid;
    gap: $space-1;
    max-width: 44rem;
  }

  &__title-row {
    display: flex;
    align-items: center;
    gap: $space-2;
  }

  &__title {
    font-size: $font-2xl;
    font-weight: 700;

    @include respond-to(md) {
      font-size: $font-3xl;
    }
  }

  &__desc {
    color: var(--tk-muted);
    font-size: $font-sm;
    line-height: 1.65;
    word-break: keep-all;
  }
}
</style>
