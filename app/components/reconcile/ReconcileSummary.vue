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
        <span class="summary__icon-wrap">
          <component
            :is="item.icon"
            class="summary__icon"
            aria-hidden="true"
          />
        </span>
        <span class="summary__body">
          <span class="summary__label">{{ item.label }}</span>
          <span class="summary__count">{{ item.count.toLocaleString('ko-KR') }}건</span>
          <span class="summary__amount">{{ formatWon(item.amount) }}원</span>
        </span>
      </button>
    </div>
    <p class="summary__extra">
      계산서만 존재 {{ summary.INVOICE_ONLY.count.toLocaleString('ko-KR') }}건, 자동 제외 {{ summary.EXCLUDED.count.toLocaleString('ko-KR') }}건
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
  gap: $space-3;

  &__filters {
    display: grid;

    @include card-surface;

    overflow: hidden;

    @include respond-to(md) {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  &__filter {
    display: flex;
    align-items: flex-start;
    gap: $space-4;
    padding: $space-4 $space-5;
    text-align: left;
    transition:
      transform $duration-fast $ease-out-quint,
      background-color $duration-medium $ease-out-quint,
      box-shadow $duration-medium $ease-out-quint;

    @include focus-ring;

    // 바깥으로 그려지는 링은 띠의 overflow에 잘리므로 안쪽에 그린다
    &:focus-visible {
      outline-offset: -3px;
    }

    & + & {
      border-top: 1px solid var(--tk-border);

      @include respond-to(md) {
        border-top: 0;
        border-left: 1px solid var(--tk-border);
      }
    }

    &:hover {
      background: var(--tk-surface-strong);
    }

    &:active {
      transform: scale(0.985);
    }

    // 선택된 칸은 아래에 굵은 잉크선을 그어 "펼친 장부 페이지"처럼 표시한다
    &.is-active {
      background: var(--tk-accent-soft);
      box-shadow: inset 0 -3px 0 var(--tk-accent-text);
    }

    @include reduced-motion {
      transition: none;
    }
  }

  &__icon-wrap {
    display: inline-grid;
    flex: none;
    place-content: center;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: $radius-lg;
    background: var(--tk-surface-strong);
    color: $color-slate-600;
  }

  &__filter--matched &__icon-wrap {
    background: var(--tk-accent-soft);
    color: var(--tk-accent-text);
  }

  &__filter--missing &__icon-wrap {
    background: var(--tk-danger-soft);
    color: var(--tk-danger-text);
  }

  &__filter--mismatch &__icon-wrap {
    background: var(--tk-warn-soft);
    color: var(--tk-warn-text);
  }

  &__icon {
    width: 1.25rem;
    height: 1.25rem;
  }

  &__body {
    display: grid;
    gap: 0.125rem;
    min-width: 0;
  }

  &__label {
    color: var(--tk-muted);
    font-size: $font-sm;
    font-weight: 600;
    word-break: keep-all;
  }

  &__count {
    color: var(--tk-text-strong);
    font-size: $font-2xl;
    font-weight: 700;
    letter-spacing: $tracking-tight;
    font-variant-numeric: tabular-nums;
    line-height: 1.25;
  }

  &__amount {
    color: var(--tk-muted);
    font-size: $font-sm;
    font-variant-numeric: tabular-nums;
  }

  &__extra {
    color: var(--tk-muted);
    font-size: $font-xs;
  }
}
</style>
