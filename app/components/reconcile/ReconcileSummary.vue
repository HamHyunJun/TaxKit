<template>
  <div class="summary">
    <div
      class="summary__filters"
      role="group"
      aria-label="결과 필터"
    >
      <button
        v-for="item in items"
        :key="item.filter"
        type="button"
        class="summary__filter"
        :class="[`summary__filter--${item.filter}`, { 'is-active': filter === item.filter }]"
        :aria-pressed="filter === item.filter"
        @click="filter = item.filter"
      >
        <component
          :is="item.icon"
          class="summary__icon"
          aria-hidden="true"
        />
        <span class="summary__label">{{ item.label }}</span>
        <span class="summary__count num">{{ item.count.toLocaleString('ko-KR') }}건</span>
        <span class="summary__amount num">{{ formatWon(item.amount) }}원</span>
      </button>
    </div>
    <p class="summary__extra">
      계산서만 존재 {{ summary.INVOICE_ONLY.count.toLocaleString('ko-KR') }}건 · 자동 제외 {{ summary.EXCLUDED.count.toLocaleString('ko-KR') }}건
      (결과 엑셀에서 확인할 수 있어요)
    </p>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import { ArrowLeftRight, CircleAlert, CircleCheck } from 'lucide-vue-next'
import type { ReconcileFilter, ReconcileSummary as ReconcileSummaryValues } from '~/types/reconcile'

type Props = {
  summary: ReconcileSummaryValues
}

type FilterItem = {
  filter: ReconcileFilter
  label: string
  icon: Component
  count: number
  amount: number
}

const { summary } = defineProps<Props>()
const filter = defineModel<ReconcileFilter>('filter', { required: true })

const items = computed<FilterItem[]>(() => [
  {
    filter: 'matched',
    label: '일치 건',
    icon: CircleCheck,
    count: summary.MATCHED.count + summary.REVIEW.count,
    amount: summary.MATCHED.amount + summary.REVIEW.amount,
  },
  { filter: 'missing', label: '세금계산서 누락 의심 건', icon: CircleAlert, count: summary.MISSING.count, amount: summary.MISSING.amount },
  { filter: 'mismatch', label: '금액 불일치 건', icon: ArrowLeftRight, count: summary.AMOUNT_MISMATCH.count, amount: summary.AMOUNT_MISMATCH.amount },
])
</script>

<style scoped lang="scss">
.summary {
  display: grid;
  gap: $space-2;

  &__filters {
    display: grid;
    gap: $space-3;

    @include respond-to(md) {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  &__filter {
    @include card-surface;

    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: $space-1 $space-2;
    padding: $space-3 $space-4;
    text-align: left;
    transition:
      transform $duration-fast $ease-out-quint,
      border-color $duration-fast $ease-out-quint,
      box-shadow $duration-fast $ease-out-quint;

    @include focus-ring;

    &:hover {
      border-color: var(--tk-muted);
    }

    &:active {
      transform: scale(0.98);
    }

    &.is-active {
      border-color: var(--tk-accent);
      box-shadow: 0 0 0 1px var(--tk-accent);
    }

    &--missing .summary__icon {
      color: var(--tk-danger);
    }

    &--mismatch .summary__icon {
      color: var(--tk-warn);
    }

    &--matched .summary__icon {
      color: var(--tk-accent-hover);
    }

    @include reduced-motion {
      transition: none;
    }
  }

  &__icon {
    width: 1.25rem;
    height: 1.25rem;
  }

  &__label {
    font-size: $font-sm;
    font-weight: 600;
  }

  &__count {
    font-size: $font-lg;
    font-weight: 700;
  }

  &__amount {
    grid-column: 2 / -1;
    color: var(--tk-muted);
    font-size: $font-sm;
    text-align: left;
  }

  &__extra {
    color: var(--tk-muted);
    font-size: $font-xs;
  }
}
</style>
