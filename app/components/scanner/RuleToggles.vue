<template>
  <fieldset class="rules">
    <legend class="rules__legend">
      검사 규칙
    </legend>
    <div class="rules__list">
      <span
        v-for="rule in RISK_RULES"
        :key="rule.tag"
        class="rules__item"
      >
        <label class="chip-toggle">
          <input
            type="checkbox"
            :value="rule.tag"
            :checked="enabled.includes(rule.tag)"
            @change="handleChange(rule.tag, $event)"
          >
          <span>{{ rule.name }}</span>
        </label>
        <InfoTip :entry="rule.help" />
      </span>
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

  padding: $space-5;

  &__legend {
    @include visually-hidden;
  }

  &__list {
    display: flex;
    flex-wrap: wrap;
    gap: $space-3 $space-5;
  }

  &__item {
    display: inline-flex;
    align-items: center;
    gap: $space-1;
  }
}
</style>
