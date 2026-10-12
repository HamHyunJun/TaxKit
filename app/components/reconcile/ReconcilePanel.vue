<template>
  <section
    class="reconcile"
    aria-labelledby="reconcile-title"
  >
    <header class="reconcile__head">
      <h1
        id="reconcile-title"
        class="reconcile__title"
      >
        계좌·세금계산서 대사
      </h1>
      <p class="reconcile__desc">
        통장 거래내역과 세금계산서를 올리면 금액·날짜·상호로 짝을 찾아 누락 의심 건을 알려줘요.
      </p>
    </header>

    <div class="reconcile__files">
      <DropZone
        title="통장 거래내역 엑셀을 놓으세요"
        :file-name="bank.fileName"
        :detail="sourceDetail(bank)"
        :error="bank.error"
        @select="(file) => loadFile('bank', file)"
      />
      <DropZone
        title="홈택스 세금계산서 엑셀을 놓으세요"
        :file-name="invoice.fileName"
        :detail="sourceDetail(invoice)"
        :error="invoice.error"
        @select="(file) => loadFile('invoice', file)"
      />
    </div>

    <ReconcileOptions
      v-model="options"
      :can-run="canRun"
      :is-running="isRunning"
      @run="handleRun"
    />

    <p
      class="reconcile__status"
      role="status"
      aria-live="polite"
    >
      {{ statusMessage }}
    </p>

    <template v-if="output">
      <p
        v-if="output.isOurBizNoEstimated && output.ourBizNo"
        class="reconcile__note"
      >
        우리 회사 사업자번호를 {{ formatBizNo(output.ourBizNo) }}(으)로 추정했어요. 다르면 위에서 직접 입력한 뒤 다시 실행해 주세요. (추정)
      </p>
      <p
        v-else-if="!output.ourBizNo"
        class="reconcile__note"
      >
        우리 회사 사업자번호를 판별하지 못해 입금·출금 방향 구분 없이 대사했어요.
      </p>

      <ReconcileSummary
        v-model:filter="filter"
        :summary="output.summary"
      />
      <ReconcileTable
        :rows="shownRows"
        :caption="filterCaption"
        :empty-text="emptyText"
      />

      <div class="reconcile__actions">
        <button
          type="button"
          class="reconcile__button"
          @click="handleDownload"
        >
          <Download
            class="reconcile__button-icon"
            aria-hidden="true"
          />
          <span>결과 엑셀 다운로드</span>
        </button>
        <button
          type="button"
          class="reconcile__button reconcile__button--primary"
          :disabled="output.summary.MISSING.count === 0"
          @click="handleHandoff"
        >
          <span>누락 건 독촉 메시지로 전달 ({{ output.summary.MISSING.count.toLocaleString('ko-KR') }}건)</span>
          <ArrowRight
            class="reconcile__button-icon"
            aria-hidden="true"
          />
        </button>
      </div>
    </template>

    <ColumnMapModal
      v-if="pending"
      :key="`${pending.kind}-${pending.fileName}`"
      :fields="FIELDS_BY_KIND[pending.kind]"
      :headers="pending.headers"
      :initial-mapping="pending.mapping"
      @confirm="confirmMapping"
      @cancel="cancelMapping"
    />
  </section>
</template>

<script setup lang="ts">
import { ArrowRight, Download } from 'lucide-vue-next'
import type { ReconcileFilter, ReconcileResult } from '~/types/reconcile'
import type { SourceState } from '~/composables/useReconcile'

const FILTER_CAPTIONS: Record<ReconcileFilter, string> = {
  matched: '일치 건 (검토 필요 포함)',
  missing: '세금계산서 누락 의심 건',
  mismatch: '금액 불일치 건',
}
const EMPTY_TEXTS: Record<ReconcileFilter, string> = {
  matched: '일치한 거래가 없어요.',
  missing: '누락이 의심되는 거래가 없어요.',
  mismatch: '금액이 다른 거래가 없어요.',
}

const { bank, invoice, pending, options, output, isRunning, canRun, loadFile, confirmMapping, cancelMapping, run } = useReconcile()
const { downloadWorkbook } = useExcelWriter()
const { setHandoff } = useHandoff()
const { showToast } = useToast()
const route = useRoute()
const router = useRouter()

const filter = ref<ReconcileFilter>('missing')
const statusMessage = ref<string>('')

const shownRows = computed<ReconcileResult[]>(() => (output.value ? filterResults(output.value.results, filter.value) : []))
const filterCaption = computed<string>(() => FILTER_CAPTIONS[filter.value])
const emptyText = computed<string>(() => EMPTY_TEXTS[filter.value])

// "1,204행 · 확인 필요 3건"
const sourceDetail = (source: SourceState<unknown>): string | null => {
  if (source.fileName === null) return null
  const base = `${source.rows.length.toLocaleString('ko-KR')}행`
  return source.needsCheck > 0 ? `${base} · 확인 필요 ${source.needsCheck.toLocaleString('ko-KR')}건` : base
}

const handleRun = async (): Promise<void> => {
  statusMessage.value = '대사 계산 중…'
  await run()
  const result = output.value
  if (!result) return
  filter.value = 'missing'
  statusMessage.value = `대사 완료: 누락 의심 ${result.summary.MISSING.count}건, 금액 불일치 ${result.summary.AMOUNT_MISMATCH.count}건, 일치 ${result.summary.MATCHED.count + result.summary.REVIEW.count}건`
}

const handleDownload = (): void => {
  if (!output.value) return
  downloadWorkbook(`TaxKit_대사결과_${formatDateCompact(new Date())}`, buildReconcileSheets(output.value, options.value))
}

// 누락 의심 건을 Tab 3 입력으로 넘기고 해당 탭으로 이동한다
const handleHandoff = async (): Promise<void> => {
  if (!output.value) return
  const rows = toMissingEvidenceRows(output.value.results)
  setHandoff(rows)
  showToast(`누락 ${rows.length}건을 독촉 메시지로 전달했어요`)
  await router.replace({ query: { ...route.query, tab: 'message' } })
}
</script>

<style scoped lang="scss">
.reconcile {
  display: grid;
  gap: $space-5;

  &__head {
    display: grid;
    gap: $space-1;
  }

  &__title {
    font-size: $font-xl;
  }

  &__desc {
    color: var(--tk-muted);
    font-size: $font-sm;
  }

  &__files {
    display: grid;
    gap: $space-4;

    @include respond-to(md) {
      grid-template-columns: 1fr 1fr;
    }
  }

  &__status {
    min-height: 1.5em;
    color: var(--tk-muted);
    font-size: $font-sm;
  }

  &__note {
    padding: $space-2 $space-3;
    border-radius: $radius-md;
    background: tint($color-amber-500, 0.14);
    font-size: $font-sm;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: $space-3;
  }

  &__button {
    display: inline-flex;
    align-items: center;
    gap: $space-2;
    padding: $space-2 $space-4;
    border: 1px solid var(--tk-border);
    border-radius: $radius-md;
    background: var(--tk-card);
    font-weight: 600;
    transition:
      transform $duration-fast $ease-out-quint,
      background-color $duration-fast $ease-out-quint;

    @include focus-ring;

    &:active:not(:disabled) {
      transform: scale(0.96);
    }

    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    &--primary {
      border-color: var(--tk-accent);
      background: var(--tk-accent);
      color: var(--tk-bg);

      &:hover:not(:disabled) {
        background: var(--tk-accent-hover);
      }
    }

    @include reduced-motion {
      transition: none;
    }
  }

  &__button-icon {
    width: 1rem;
    height: 1rem;
  }
}
</style>
