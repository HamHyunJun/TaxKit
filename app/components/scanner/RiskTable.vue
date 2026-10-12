<template>
  <div class="risk-table">
    <div
      v-if="findings.length === 0"
      class="risk-table__empty"
    >
      <span class="risk-table__empty-icon">
        <ShieldCheck
          class="risk-table__empty-svg"
          aria-hidden="true"
        />
      </span>
      <p>{{ emptyText }}</p>
    </div>
    <div
      v-else
      class="risk-table__scroll"
      role="region"
      aria-label="소명이 필요한 법인카드 승인 내역"
      tabindex="0"
    >
      <table class="risk-table__grid">
        <caption class="risk-table__caption">
          소명이 필요한 법인카드 승인 내역
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              class="risk-table__col-level"
            >
              <span class="risk-table__th">위험도 <InfoTip topic="riskLevel" /></span>
            </th>
            <th
              scope="col"
              class="risk-table__col-date"
            >
              승인일시
            </th>
            <th scope="col">
              가맹점 · 카드
            </th>
            <th
              scope="col"
              class="num risk-table__col-amount"
            >
              금액
            </th>
            <th
              scope="col"
              class="risk-table__col-hits"
            >
              걸린 규칙 · 사유
            </th>
            <th
              scope="col"
              class="risk-table__col-input"
            >
              <span class="risk-table__th">소명 내용 <InfoTip topic="explanation" /></span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="finding in visibleFindings"
            :key="finding.approval.id"
          >
            <td>
              <span
                class="risk-table__badge"
                :class="`risk-table__badge--${finding.level.toLowerCase()}`"
              >
                <component
                  :is="finding.level === 'HIGH' ? TriangleAlert : CircleAlert"
                  class="risk-table__badge-icon"
                  aria-hidden="true"
                />
                {{ levelLabel(finding.level) }}
              </span>
              <span class="risk-table__score">{{ finding.riskScore }}점</span>
            </td>
            <td>
              <span class="risk-table__date">{{ formatDateTime(finding.approval.approvedAt, false) }}</span>
              <span
                v-if="finding.approval.hasTime"
                class="risk-table__time"
              >{{ formatTime(finding.approval.approvedAt) }}</span>
            </td>
            <td>
              <p class="risk-table__name">
                {{ finding.approval.merchantName }}
              </p>
              <p class="risk-table__sub">
                <template v-if="finding.approval.merchantCategory">
                  {{ finding.approval.merchantCategory }} ·
                </template>{{ finding.approval.cardNo }}<template v-if="finding.approval.cardHolder">
                  · {{ finding.approval.cardHolder }}
                </template>
              </p>
            </td>
            <td class="num">
              <span class="risk-table__amount">{{ formatWon(finding.approval.amount) }}</span><span class="risk-table__won">원</span>
            </td>
            <td>
              <ul class="risk-table__hits">
                <li
                  v-for="item in finding.hits"
                  :key="item.tag"
                  class="risk-table__hit"
                >
                  <span
                    class="risk-table__chip"
                    :class="`risk-table__chip--${item.severity.toLowerCase()}`"
                  >{{ tagName(item.tag) }}</span>
                  <span class="risk-table__reason">{{ item.reason }}</span>
                </li>
              </ul>
            </td>
            <td>
              <input
                class="risk-table__input"
                type="text"
                :value="explanations[finding.approval.id] ?? ''"
                :aria-label="`${finding.approval.merchantName} 소명 내용`"
                placeholder="사용 사유를 입력하세요"
                @input="handleInput(finding.approval.id, $event)"
              >
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div
      v-if="hiddenCount > 0"
      class="risk-table__more"
    >
      <button
        type="button"
        class="tk-btn tk-btn--sm risk-table__more-button"
        @click="visibleCount += PAGE_SIZE"
      >
        {{ Math.min(PAGE_SIZE, hiddenCount).toLocaleString('ko-KR') }}건 더 보기 (남은 {{ hiddenCount.toLocaleString('ko-KR') }}건)
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CircleAlert, ShieldCheck, TriangleAlert } from 'lucide-vue-next'
import type { RiskFinding } from '~/types/risk'

type Props = {
  findings: readonly RiskFinding[]
  emptyText: string
}

const PAGE_SIZE = 200

const { findings } = defineProps<Props>()
// 소명 내용은 승인 id → 입력값으로 메모리에만 보관한다 (화면을 떠나면 사라진다)
const explanations = defineModel<Record<string, string>>('explanations', { required: true })

const visibleCount = ref<number>(PAGE_SIZE)
const visibleFindings = computed<readonly RiskFinding[]>(() => findings.slice(0, visibleCount.value))
const hiddenCount = computed<number>(() => Math.max(0, findings.length - visibleCount.value))

// 필터나 정렬이 바뀌면 처음 200건부터 다시 보여준다
watch(() => findings, () => {
  visibleCount.value = PAGE_SIZE
})

const handleInput = (id: string, event: Event): void => {
  const input = event.target
  if (!(input instanceof HTMLInputElement)) return
  explanations.value = { ...explanations.value, [id]: input.value }
}
</script>

<style scoped lang="scss">
.risk-table {
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
    max-height: 40rem;
    overflow: auto;

    @include focus-ring;
  }

  &__caption {
    @include visually-hidden;
  }

  &__grid {
    @include data-table;

    min-width: 64rem;

    td {
      vertical-align: top;
    }
  }

  &__col-level {
    width: 7rem;
  }

  &__col-date {
    width: 9.5rem;
  }

  &__col-amount {
    width: 8rem;
  }

  &__col-hits {
    width: 22rem;
  }

  &__col-input {
    width: 15rem;
  }

  &__th {
    display: inline-flex;
    align-items: center;
    gap: $space-1;
  }

  &__badge {
    display: inline-flex;
    align-items: center;
    gap: $space-1;
    padding: 0.1875rem 0.625rem;
    border-radius: $radius-full;
    font-size: $font-xs;
    font-weight: 700;
    white-space: nowrap;

    &--high {
      background: var(--tk-danger-soft);
      color: var(--tk-danger-text);
    }

    &--medium {
      background: var(--tk-warn-soft);
      color: var(--tk-warn-text);
    }
  }

  &__badge-icon {
    width: 0.875rem;
    height: 0.875rem;
  }

  &__score {
    display: block;
    margin-top: $space-1;
    color: var(--tk-muted);
    font-size: $font-xs;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  &__date {
    display: block;
    color: var(--tk-text-strong);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  &__time {
    display: block;
    color: var(--tk-muted);
    font-size: $font-xs;
    font-variant-numeric: tabular-nums;
  }

  &__name {
    color: var(--tk-text-strong);
    font-weight: 600;
    word-break: keep-all;
    overflow-wrap: anywhere;
  }

  &__sub {
    margin-top: 0.125rem;
    color: var(--tk-muted);
    font-size: $font-xs;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }

  &__amount {
    color: var(--tk-text-strong);
    font-size: $font-base;
    font-weight: 700;
    letter-spacing: $tracking-tight;
    white-space: nowrap;
  }

  &__won {
    margin-left: 0.125rem;
    color: var(--tk-muted);
    font-size: $font-xs;
  }

  &__hits {
    display: grid;
    gap: $space-2;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__hit {
    display: flex;
    align-items: flex-start;
    gap: $space-2;
  }

  &__chip {
    flex: none;
    padding: 0.125rem $space-2;
    border-radius: $radius-sm;
    background: var(--tk-surface-strong);
    color: $color-slate-700;
    font-size: $font-xs;
    font-weight: 700;
    white-space: nowrap;

    &--high {
      background: var(--tk-danger-soft);
      color: var(--tk-danger-text);
    }

    &--medium {
      background: var(--tk-warn-soft);
      color: var(--tk-warn-text);
    }
  }

  &__reason {
    color: var(--tk-muted);
    font-size: $font-xs;
    line-height: 1.6;
    word-break: keep-all;
  }

  &__input {
    min-height: 2.25rem;
    padding-block: $space-1-5;
  }

  &__more {
    padding: $space-3;
    border-top: 1px solid var(--tk-border);
    text-align: center;
  }
}
</style>
