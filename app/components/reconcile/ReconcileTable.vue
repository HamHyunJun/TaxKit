<template>
  <div class="table">
    <p
      v-if="rows.length === 0"
      class="table__empty"
    >
      {{ emptyText }}
    </p>
    <div
      v-else
      class="table__scroll"
    >
      <table class="table__grid">
        <caption class="table__caption">
          {{ caption }}
        </caption>
        <thead>
          <tr>
            <th scope="col">
              상태
            </th>
            <th scope="col">
              거래일
            </th>
            <th scope="col">
              구분
            </th>
            <th
              scope="col"
              class="num"
            >
              금액
            </th>
            <th scope="col">
              적요
            </th>
            <th scope="col">
              매칭 계산서
            </th>
            <th
              scope="col"
              class="num"
            >
              점수
            </th>
            <th scope="col">
              근거
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
            <td>{{ row.bank ? formatDate(row.bank.date) : '—' }}</td>
            <td>{{ row.bank ? directionLabel(row.bank.direction) : '—' }}</td>
            <td class="num">
              {{ row.bank ? formatWon(row.bank.amount) : '—' }}
            </td>
            <td>{{ row.bank?.description ?? '—' }}</td>
            <td>
              <template v-if="row.invoice">
                {{ formatDate(row.invoice.issueDate) }} {{ invoicePartner(row) }}
                <span class="num table__sub">{{ formatWon(row.invoice.totalAmount) }}원</span>
              </template>
              <template v-else>
                —
              </template>
            </td>
            <td class="num">
              {{ row.score ? row.score.total.toFixed(2) : '—' }}
            </td>
            <td class="table__reason">
              {{ row.reason }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div
      v-if="hiddenCount > 0"
      class="table__more"
    >
      <button
        type="button"
        class="table__more-button"
        @click="visibleCount += PAGE_SIZE"
      >
        {{ Math.min(PAGE_SIZE, hiddenCount).toLocaleString('ko-KR') }}건 더 보기 (남은 {{ hiddenCount.toLocaleString('ko-KR') }}건)
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import { ArrowLeftRight, CircleAlert, CircleCheck, CircleMinus, TriangleAlert } from 'lucide-vue-next'
import type { MatchStatus, ReconcileResult } from '~/types/reconcile'

type Props = {
  rows: readonly ReconcileResult[]
  caption: string
  emptyText: string
}

const PAGE_SIZE = 200

const { rows } = defineProps<Props>()

const visibleCount = ref<number>(PAGE_SIZE)
const visibleRows = computed<readonly ReconcileResult[]>(() => rows.slice(0, visibleCount.value))
const hiddenCount = computed<number>(() => Math.max(0, rows.length - visibleCount.value))

// 필터나 결과가 바뀌면 처음 200건부터 다시 보여준다
watch(() => rows, () => {
  visibleCount.value = PAGE_SIZE
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
    padding: $space-8 $space-4;
    color: var(--tk-muted);
    text-align: center;
  }

  &__scroll {
    overflow-x: auto;
  }

  &__caption {
    @include visually-hidden;
  }

  &__grid {
    width: 100%;
    border-collapse: collapse;
    font-size: $font-sm;

    th,
    td {
      padding: $space-2 $space-3;
      border-bottom: 1px solid var(--tk-border);
      text-align: left;
      vertical-align: top;
    }

    th {
      position: sticky;
      top: 0;
      background: var(--tk-surface);
      color: var(--tk-muted);
      font-weight: 600;
      white-space: nowrap;
    }

    td.num,
    th.num {
      text-align: right;
    }

    tbody tr:hover {
      background: var(--tk-surface);
    }
  }

  &__badge {
    display: inline-flex;
    align-items: center;
    gap: $space-1;
    padding: 0 $space-2;
    border-radius: $radius-full;
    font-size: $font-xs;
    font-weight: 600;
    white-space: nowrap;

    &--matched {
      background: tint($color-emerald-500, 0.14);
      color: $color-emerald-700;
    }

    &--review,
    &--amount_mismatch {
      background: tint($color-amber-500, 0.18);
      color: $color-slate-800;
    }

    &--missing {
      background: tint($color-rose-600, 0.12);
      color: $color-rose-700;
    }

    &--invoice_only,
    &--excluded {
      background: tint($color-slate-500, 0.14);
      color: $color-slate-800;
    }
  }

  &__badge-icon {
    width: 0.875rem;
    height: 0.875rem;
  }

  &__sub {
    display: block;
    color: var(--tk-muted);
    font-size: $font-xs;
    text-align: left;
  }

  &__reason {
    min-width: 14rem;
    color: var(--tk-muted);
  }

  &__more {
    padding: $space-3;
    text-align: center;
  }

  &__more-button {
    padding: $space-2 $space-4;
    border: 1px solid var(--tk-border);
    border-radius: $radius-md;
    font-size: $font-sm;
    font-weight: 600;
    transition: transform $duration-fast $ease-out-quint;

    @include focus-ring;

    &:active {
      transform: scale(0.96);
    }

    @include reduced-motion {
      transition: none;
    }
  }
}
</style>
