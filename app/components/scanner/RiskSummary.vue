<template>
  <div class="risk-summary">
    <dl class="risk-summary__cards">
      <div class="risk-summary__card">
        <dt>전체 승인</dt>
        <dd class="num">
          {{ counts.total.toLocaleString('ko-KR') }}건
        </dd>
      </div>
      <div class="risk-summary__card">
        <dt>소명 대상</dt>
        <dd class="num">
          {{ counts.flagged.toLocaleString('ko-KR') }}건
        </dd>
      </div>
      <div class="risk-summary__card risk-summary__card--high">
        <dt>High</dt>
        <dd class="num">
          {{ counts.high.toLocaleString('ko-KR') }}건
        </dd>
      </div>
      <div class="risk-summary__card risk-summary__card--medium">
        <dt>Medium</dt>
        <dd class="num">
          {{ counts.medium.toLocaleString('ko-KR') }}건
        </dd>
      </div>
    </dl>

    <fieldset class="risk-summary__filters">
      <legend class="risk-summary__legend">
        위험도 필터
      </legend>
      <label
        v-for="level in LEVELS"
        :key="level"
        class="risk-summary__check"
      >
        <input
          type="checkbox"
          :value="level"
          :checked="levels.includes(level)"
          @change="handleChange(level, $event)"
        >
        <span>{{ levelLabel(level) }} 표시</span>
      </label>
    </fieldset>

    <p class="risk-summary__tags">
      <span
        v-for="rule in RISK_RULES"
        :key="rule.tag"
        class="risk-summary__tag"
      >
        {{ rule.name }} <span class="num">{{ counts.byTag[rule.tag].toLocaleString('ko-KR') }}</span>
      </span>
    </p>
  </div>
</template>

<script setup lang="ts">
import type { RiskCounts, RiskLevel } from '~/types/risk'

type Props = {
  counts: RiskCounts
}

const LEVELS: readonly RiskLevel[] = ['HIGH', 'MEDIUM']

defineProps<Props>()
const levels = defineModel<RiskLevel[]>('levels', { required: true })

const handleChange = (level: RiskLevel, event: Event): void => {
  const input = event.target
  if (!(input instanceof HTMLInputElement)) return
  levels.value = input.checked ? [...levels.value, level] : levels.value.filter(item => item !== level)
}
</script>

<style scoped lang="scss">
.risk-summary {
  display: grid;
  gap: $space-3;

  &__cards {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: $space-3;

    @include respond-to(md) {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  &__card {
    @include card-surface;

    display: grid;
    gap: $space-1;
    padding: $space-3 $space-4;
    font-size: $font-sm;

    dt {
      color: var(--tk-muted);
      font-weight: 600;
    }

    dd {
      margin: 0;
      font-size: $font-xl;
      font-weight: 700;
      text-align: left;
    }

    &--high dd {
      color: var(--tk-danger);
    }

    &--medium dd {
      color: $color-slate-800;
    }
  }

  &__filters {
    display: flex;
    flex-wrap: wrap;
    gap: $space-2 $space-5;
    padding: 0;
    border: 0;
  }

  &__legend {
    @include visually-hidden;
  }

  &__check {
    display: inline-flex;
    align-items: center;
    gap: $space-2;
    font-size: $font-sm;
    cursor: pointer;

    input {
      accent-color: var(--tk-accent);
    }
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: $space-2;
  }

  &__tag {
    padding: 0 $space-3;
    border-radius: $radius-full;
    background: tint($color-slate-500, 0.12);
    font-size: $font-xs;
    font-weight: 600;
  }
}
</style>
