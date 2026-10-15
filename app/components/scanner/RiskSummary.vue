<template>
  <div class="risk-summary">
    <dl class="risk-summary__cards">
      <div class="risk-summary__card">
        <dt>전체 승인</dt>
        <dd>{{ counts.total.toLocaleString('ko-KR') }}<span class="risk-summary__unit">건</span></dd>
      </div>
      <div class="risk-summary__card">
        <dt>소명 대상</dt>
        <dd>{{ counts.flagged.toLocaleString('ko-KR') }}<span class="risk-summary__unit">건</span></dd>
      </div>
      <div class="risk-summary__card risk-summary__card--high">
        <dt>High</dt>
        <dd>{{ counts.high.toLocaleString('ko-KR') }}<span class="risk-summary__unit">건</span></dd>
      </div>
      <div class="risk-summary__card risk-summary__card--medium">
        <dt>Medium</dt>
        <dd>{{ counts.medium.toLocaleString('ko-KR') }}<span class="risk-summary__unit">건</span></dd>
      </div>
    </dl>

    <div class="risk-summary__filters">
      <fieldset class="risk-summary__group">
        <legend class="risk-summary__legend">
          위험도 필터
        </legend>
        <span
          class="risk-summary__label tk-label"
          aria-hidden="true"
        >위험도</span>
        <label
          v-for="level in LEVELS"
          :key="level"
          class="chip-toggle risk-summary__check"
        >
          <input
            type="checkbox"
            :value="level"
            :checked="levels.includes(level)"
            @change="handleChange(level, $event)"
          >
          <span>{{ levelLabel(level) }} 표시</span>
        </label>
        <InfoTip topic="riskLevel" />
      </fieldset>

      <p class="risk-summary__tags">
        <span
          v-for="rule in RISK_RULES"
          :key="rule.tag"
          class="risk-summary__tag"
        >
          {{ rule.name }} <strong class="risk-summary__tag-count">{{ counts.byTag[rule.tag].toLocaleString('ko-KR') }}</strong>
        </span>
      </p>
    </div>
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
  gap: $space-4;

  &__cards {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    margin: 0;

    @include card-surface;

    overflow: hidden;

    @include respond-to(md) {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  &__card {
    display: grid;
    gap: $space-1;
    padding: $space-4 $space-5;
    border-right: 1px solid var(--tk-border);
    border-bottom: 1px solid var(--tk-border);

    &:nth-child(2n) {
      border-right: 0;
    }

    &:nth-last-child(-n + 2) {
      border-bottom: 0;
    }

    @include respond-to(md) {
      border-bottom: 0;

      &:nth-child(2n) {
        border-right: 1px solid var(--tk-border);
      }

      &:last-child {
        border-right: 0;
      }
    }

    dt {
      color: var(--tk-muted);
      font-size: $font-sm;
      font-weight: 600;
    }

    dd {
      margin: 0;
      color: var(--tk-text-strong);
      font-size: $font-2xl;
      font-weight: 700;
      letter-spacing: $tracking-tight;
      font-variant-numeric: tabular-nums;
      line-height: 1.25;
      text-align: left;
    }

    &--high {
      dd {
        color: var(--tk-danger-text);
      }
    }

  }

  &__unit {
    margin-left: $space-0-5;
    color: var(--tk-muted);
    font-size: $font-sm;
    font-weight: 500;
  }

  &__filters {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: $space-3 $space-6;
  }

  &__group {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: $space-2;
  }

  &__legend {
    @include visually-hidden;
  }

  &__label {
    margin-right: $space-1;
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: $space-2;
  }

  &__tag {
    padding: 0.1875rem $space-3;
    border-radius: $radius-full;
    background: var(--tk-surface-strong);
    color: $color-slate-600;
    font-size: $font-xs;
    font-weight: 600;
  }

  &__tag-count {
    margin-left: $space-0-5;
    color: var(--tk-text-strong);
    font-variant-numeric: tabular-nums;
  }
}
</style>
