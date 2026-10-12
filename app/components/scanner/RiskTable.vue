<template>
  <div class="risk-table">
    <p
      v-if="findings.length === 0"
      class="risk-table__empty"
    >
      {{ emptyText }}
    </p>
    <div
      v-else
      class="risk-table__scroll"
    >
      <table class="risk-table__grid">
        <caption class="risk-table__caption">
          소명이 필요한 법인카드 승인 내역
        </caption>
        <thead>
          <tr>
            <th scope="col">
              위험도
            </th>
            <th
              scope="col"
              class="num"
            >
              점수
            </th>
            <th scope="col">
              승인일시
            </th>
            <th scope="col">
              카드
            </th>
            <th scope="col">
              사용자
            </th>
            <th scope="col">
              가맹점
            </th>
            <th
              scope="col"
              class="num"
            >
              금액
            </th>
            <th scope="col">
              리스크 태그
            </th>
            <th scope="col">
              사유
            </th>
            <th scope="col">
              소명 내용
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
            </td>
            <td class="num">
              {{ finding.riskScore }}
            </td>
            <td class="risk-table__nowrap">
              {{ formatDateTime(finding.approval.approvedAt, finding.approval.hasTime) }}
            </td>
            <td class="risk-table__nowrap">
              {{ finding.approval.cardNo }}
            </td>
            <td>{{ finding.approval.cardHolder ?? '—' }}</td>
            <td>
              {{ finding.approval.merchantName }}
              <span
                v-if="finding.approval.merchantCategory"
                class="risk-table__sub"
              >{{ finding.approval.merchantCategory }}</span>
            </td>
            <td class="num">
              {{ formatWon(finding.approval.amount) }}
            </td>
            <td>
              <ul class="risk-table__chips">
                <li
                  v-for="item in finding.hits"
                  :key="item.tag"
                  class="risk-table__chip"
                >
                  {{ tagName(item.tag) }}
                </li>
              </ul>
            </td>
            <td class="risk-table__reason">
              <ul class="risk-table__reasons">
                <li
                  v-for="item in finding.hits"
                  :key="item.tag"
                >
                  {{ item.reason }}
                </li>
              </ul>
            </td>
            <td>
              <input
                class="risk-table__input"
                type="text"
                :value="explanations[finding.approval.id] ?? ''"
                :aria-label="`${finding.approval.merchantName} 소명 내용`"
                placeholder="소명 내용 입력"
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
        class="risk-table__more-button"
        @click="visibleCount += PAGE_SIZE"
      >
        {{ Math.min(PAGE_SIZE, hiddenCount).toLocaleString('ko-KR') }}건 더 보기 (남은 {{ hiddenCount.toLocaleString('ko-KR') }}건)
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CircleAlert, TriangleAlert } from 'lucide-vue-next'
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

  &__nowrap {
    white-space: nowrap;
  }

  &__badge {
    display: inline-flex;
    align-items: center;
    gap: $space-1;
    padding: 0 $space-2;
    border-radius: $radius-full;
    font-size: $font-xs;
    font-weight: 700;
    white-space: nowrap;

    &--high {
      background: tint($color-rose-600, 0.12);
      color: $color-rose-600;
    }

    &--medium {
      background: tint($color-amber-500, 0.18);
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
  }

  &__chips,
  &__reasons {
    display: grid;
    gap: $space-1;
    padding: 0;
    list-style: none;
  }

  &__chip {
    width: fit-content;
    padding: 0 $space-2;
    border-radius: $radius-full;
    background: tint($color-slate-500, 0.14);
    font-size: $font-xs;
    font-weight: 600;
    white-space: nowrap;
  }

  &__reason {
    min-width: 14rem;
    color: var(--tk-muted);
  }

  &__input {
    width: 100%;
    min-width: 10rem;
    padding: $space-1-5 $space-2;
    border: 1px solid var(--tk-border);
    border-radius: $radius-md;
    background: var(--tk-card);
    font: inherit;

    @include focus-ring;
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
