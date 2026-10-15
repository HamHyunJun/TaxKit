<template>
  <div class="table">
    <div
      v-if="rows.length === 0"
      class="table__empty"
    >
      <span class="table__empty-icon">
        <Inbox
          class="table__empty-svg"
          aria-hidden="true"
        />
      </span>
      <p>{{ emptyText }}</p>
    </div>
    <div
      v-else
      class="table__scroll"
      role="region"
      :aria-label="caption"
      tabindex="0"
    >
      <table class="table__grid">
        <caption class="table__caption">
          {{ caption }}
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              class="table__col-status"
            >
              상태
            </th>
            <th
              scope="col"
              class="table__col-date"
            >
              거래일
            </th>
            <th
              scope="col"
              class="num table__col-amount"
            >
              금액
            </th>
            <th scope="col">
              적요와 판정 근거
            </th>
            <th
              v-if="showMatch"
              scope="col"
              class="table__col-invoice"
            >
              매칭 계산서
            </th>
            <th
              v-if="showMatch"
              scope="col"
              class="table__col-score"
            >
              <span class="table__th">점수 <InfoTip topic="matchScore" /></span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in visibleRows"
            :key="row.id"
          >
            <td>
              <span
                v-if="row.status === 'MISSING'"
                class="stamp"
              >{{ statusLabel(row.status) }}</span>
              <span
                v-else
                class="table__badge"
                :class="`table__badge--${row.status.toLowerCase()}`"
              >
                <component
                  :is="statusIcon(row.status)"
                  class="table__badge-icon"
                  aria-hidden="true"
                />
                {{ statusLabel(row.status) }}
              </span>
            </td>
            <td>
              <template v-if="row.bank">
                <span class="table__date">{{ formatDate(row.bank.date) }}</span>
                <span
                  class="table__dir"
                  :class="`is-${row.bank.direction.toLowerCase()}`"
                >{{ directionLabel(row.bank.direction) }}</span>
              </template>
              <span
                v-else
                class="table__none"
              >—</span>
            </td>
            <td class="num">
              <template v-if="row.bank">
                <span class="table__amount">{{ formatWon(row.bank.amount) }}</span><span class="table__won">원</span>
              </template>
              <span
                v-else
                class="table__none"
              >—</span>
            </td>
            <td>
              <p class="table__name">
                {{ row.bank?.description ?? invoicePartner(row) }}
              </p>
              <p
                class="table__reason"
                :title="row.reason"
              >
                {{ row.reason }}
              </p>
            </td>
            <td v-if="showMatch">
              <template v-if="row.invoice">
                <p class="table__name">
                  {{ invoicePartner(row) }}
                </p>
                <p class="table__reason">
                  {{ formatDate(row.invoice.issueDate) }}, {{ formatWon(row.invoice.totalAmount) }}원
                </p>
              </template>
              <span
                v-else
                class="table__none"
              >—</span>
            </td>
            <td v-if="showMatch">
              <span
                v-if="row.score"
                class="table__score"
              >
                <span
                  class="table__meter"
                  aria-hidden="true"
                >
                  <span
                    class="table__meter-fill"
                    :style="{ width: `${Math.round(row.score.total * 100)}%` }"
                  />
                </span>
                {{ row.score.total.toFixed(2) }}
              </span>
              <span
                v-else
                class="table__none"
              >—</span>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2">
              합계 ({{ rows.length.toLocaleString('ko-KR') }}건)
            </td>
            <td class="num">
              <span
                v-if="totals.out > 0"
                class="table__total-line"
              >출금 {{ formatWon(totals.out) }}원</span>
              <span
                v-if="totals.in > 0"
                class="table__total-line"
              >입금 {{ formatWon(totals.in) }}원</span>
            </td>
            <td :colspan="showMatch ? 3 : 1" />
          </tr>
        </tfoot>
      </table>
    </div>
    <ShowMore
      :hidden-count="hiddenCount"
      :next-count="nextCount"
      @more="showMore"
    />
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import { ArrowLeftRight, CircleAlert, CircleCheck, CircleMinus, Inbox, TriangleAlert } from 'lucide-vue-next'
import type { MatchStatus, ReconcileResult } from '~/types/reconcile'

type Props = {
  rows: readonly ReconcileResult[]
  caption: string
  emptyText: string
}

const { rows } = defineProps<Props>()

// 긴 결과는 200건씩 보여주고, 필터나 결과가 바뀌면 처음부터 다시 보여준다
const { visible: visibleRows, hiddenCount, nextCount, showMore } = usePagedList(() => rows)
// 짝지어진 계산서가 있는 행이 하나도 없으면(예: 누락 의심) 계산서·점수 열을 숨겨 본문을 넓게 쓴다
const showMatch = computed<boolean>(() => rows.some(row => row.invoice !== null))

// 금액은 항상 양수이고 방향은 따로 있어서, 출금과 입금을 섞어 더하지 않고 나눠서 합친다 (계산서만 있는 행은 제외)
const totals = computed<{ out: number, in: number }>(() => {
  const sum = { out: 0, in: 0 }
  for (const row of rows) {
    if (row.bank) sum[row.bank.direction === 'IN' ? 'in' : 'out'] += row.bank.amount
  }
  return sum
})

const STATUS_ICONS: Record<MatchStatus, Component> = {
  MATCHED: CircleCheck,
  REVIEW: TriangleAlert,
  MISSING: CircleAlert,
  AMOUNT_MISMATCH: ArrowLeftRight,
  INVOICE_ONLY: CircleMinus,
  EXCLUDED: CircleMinus,
}

const statusIcon = (status: MatchStatus): Component => STATUS_ICONS[status]
</script>

<style scoped lang="scss">
.table {
  @include card-surface;

  overflow: hidden;

  &__empty {
    display: grid;
    justify-items: center;
    gap: $space-3;
    padding: $space-12 $space-4;
    color: var(--tk-muted);
    font-size: $font-sm;
  }

  &__empty-icon {
    display: inline-grid;
    place-content: center;
    width: 3rem;
    height: 3rem;
    border-radius: $radius-lg;
    background: var(--tk-surface-strong);
  }

  &__empty-svg {
    width: 1.5rem;
    height: 1.5rem;
  }

  // 행이 많아도 헤더가 보이도록 표 안에서 스크롤한다 (키보드로도 스크롤할 수 있게 포커스 가능)
  &__scroll {
    max-height: 36rem;
    overflow: auto;
    scroll-padding-block: $space-12;

    @include focus-ring;
  }

  &__caption {
    @include visually-hidden;
  }

  &__grid {
    @include data-table;

    min-width: 52rem;
  }

  &__col-status {
    width: 7.5rem;
  }

  &__col-date {
    width: 7.75rem;
  }

  &__col-amount {
    width: 8.5rem;
  }

  &__col-invoice {
    width: 15rem;
  }

  &__col-score {
    width: 7rem;
  }

  &__th {
    display: inline-flex;
    align-items: center;
    gap: $space-1;
  }

  &__date {
    display: block;
    color: var(--tk-text-strong);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  &__dir {
    display: inline-block;
    margin-top: $space-0-5;
    padding: 0 $space-2;
    border-radius: $radius-full;
    font-size: $font-xs;
    font-weight: 600;

    &.is-out {
      background: var(--tk-surface-strong);
      color: $color-slate-600;
    }

    &.is-in {
      background: $color-sky-50;
      color: $color-sky-700;
    }
  }

  &__amount {
    color: var(--tk-text-strong);
    font-size: $font-base;
    font-weight: 700;
    letter-spacing: $tracking-tight;
    white-space: nowrap;
  }

  &__won {
    margin-left: $space-0-5;
    color: var(--tk-muted);
    font-size: $font-xs;
  }

  &__name {
    color: var(--tk-text-strong);
    font-weight: 600;
    word-break: keep-all;
    overflow-wrap: anywhere;
  }

  &__reason {
    display: -webkit-box;
    margin-top: $space-0-5;
    overflow: hidden;
    color: var(--tk-muted);
    font-size: $font-xs;
    line-height: 1.5;
    word-break: keep-all;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  &__total-line {
    display: block;
  }

  &__none {
    color: var(--tk-subtle);
  }

  &__badge {
    display: inline-flex;
    align-items: center;
    gap: $space-1;
    padding: 0.1875rem $space-2-5;
    border-radius: $radius-full;
    font-size: $font-xs;
    font-weight: 700;
    white-space: nowrap;

    &--matched {
      background: var(--tk-accent-soft);
      color: var(--tk-accent-text);
    }

    &--review,
    &--amount_mismatch {
      background: var(--tk-warn-soft);
      color: var(--tk-warn-text);
    }

    &--missing {
      background: var(--tk-danger-soft);
      color: var(--tk-danger-text);
    }

    &--invoice_only,
    &--excluded {
      background: var(--tk-surface-strong);
      color: $color-slate-600;
    }
  }

  &__badge-icon {
    width: 0.875rem;
    height: 0.875rem;
  }

  &__score {
    display: inline-flex;
    align-items: center;
    gap: $space-2;
    color: var(--tk-text-strong);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  &__meter {
    display: inline-block;
    width: 2.25rem;
    height: 0.375rem;
    overflow: hidden;
    border-radius: $radius-full;
    background: var(--tk-border);
  }

  &__meter-fill {
    display: block;
    height: 100%;
    border-radius: $radius-full;
    background: var(--tk-accent-hover);
  }
}
</style>
