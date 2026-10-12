<template>
  <fieldset class="rules">
    <legend class="rules__legend">
      검사 규칙
    </legend>
    <div class="rules__list">
      <label
        v-for="rule in RISK_RULES"
        :key="rule.tag"
        class="rules__item"
        :title="rule.description"
      >
        <input
          type="checkbox"
          :value="rule.tag"
          :checked="enabled.includes(rule.tag)"
          @change="handleChange(rule.tag, $event)"
        >
        <span>{{ rule.name }}</span>
      </label>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
import type { RiskTag } from '~/types/risk'

const enabled = defineModel<RiskTag[]>('enabled', { required: true })

const handleChange = (tag: RiskTag, event: Event): void => {
  const input = event.target
  if (!(input instanceof HTMLInputElement)) return
  enabled.value = input.checked ? [...enabled.value, tag] : enabled.value.filter(item => item !== tag)
}
</script>

<style scoped lang="scss">
.rules {
  @include card-surface;

  padding: $space-3 $space-4 $space-4;

  &__legend {
    padding: 0 $space-1;
    font-size: $font-sm;
    font-weight: 600;
  }

  &__list {
    display: flex;
    flex-wrap: wrap;
    gap: $space-2 $space-5;
  }

  &__item {
    display: inline-flex;
    align-items: center;
    gap: $space-2;
    font-size: $font-sm;
    cursor: pointer;

    input {
      accent-color: var(--tk-accent);
    }
  }
}
</style>
