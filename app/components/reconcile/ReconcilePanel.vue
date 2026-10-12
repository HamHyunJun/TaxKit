<template>
  <section
    class="reconcile"
    aria-labelledby="reconcile-title"
  >
    <PageHeader
      eyebrow="STEP 1"
      title="계좌·세금계산서 대사"
      description="통장 거래내역과 세금계산서를 올리면 금액·날짜·상호로 짝을 찾아 세금계산서가 누락된 것으로 의심되는 건을 알려줘요."
      topic="reconcilePage"
      title-id="reconcile-title"
    />

    <div class="reconcile__block">
      <h2 class="tk-section-title">
        파일 올리기
      </h2>
      <div class="reconcile__files">
        <DropZone
          title="통장 거래내역 엑셀"
          :file-name="bank.fileName"
          :detail="sourceDetail(bank)"
          :error="bank.error"
          @select="(file) => loadFile('bank', file)"
        >
          <template #info>
            <InfoTip topic="bankFile" />
          </template>
          <template #footer>
            <button
              v-if="canReopenBank"
              type="button"
              class="tk-btn tk-btn--ghost tk-btn--sm drop-zone-reopen"
              @click="reopenMapping('bank')"
            >
              컬럼 다시 지정
            </button>
          </template>
        </DropZone>
        <DropZone
          title="홈택스 세금계산서 엑셀"
          :file-name="invoice.fileName"
          :detail="sourceDetail(invoice)"
          :error="invoice.error"
          @select="(file) => loadFile('invoice', file)"
        >
          <template #info>
            <InfoTip topic="invoiceFile" />
          </template>
          <template #footer>
            <button
              v-if="canReopenInvoice"
              type="button"
              class="tk-btn tk-btn--ghost tk-btn--sm drop-zone-reopen"
              @click="reopenMapping('invoice')"
            >
              컬럼 다시 지정
            </button>
          </template>
        </DropZone>
      </div>
    </div>

    <div class="reconcile__block">
      <h2 class="tk-section-title">
        대사 옵션
      </h2>
      <ReconcileOptions
        v-model="options"
        :can-run="canRun"
        :is-running="isRunning"
        @run="handleRun"
      />
    </div>

    <p
      class="reconcile__status"
      role="status"
      aria-live="polite"
    >
      {{ statusMessage }}
    </p>

    <template v-if="output">
      <div class="reconcile__block">
        <h2 class="tk-section-title">
          대사 결과
          <InfoTip topic="resultFilters" />
        </h2>
        <p
          v-if="isStale"
          class="reconcile__note"
        >
          <Info
            class="reconcile__note-icon"
            aria-hidden="true"
          />
          옵션이 바뀌었어요. 아래 결과는 이전 옵션 기준이니, 위에서 [대사 실행]을 다시 눌러 주세요.
        </p>
        <p
          v-if="output.isOurBizNoEstimated && output.ourBizNo"
          class="reconcile__note"
        >
          <Info
            class="reconcile__note-icon"
            aria-hidden="true"
          />
          우리 회사 사업자번호를 {{ formatBizNo(output.ourBizNo) }}(으)로 추정했어요. 다르면 위 옵션에서 직접 입력한 뒤 다시 실행해 주세요. (추정)
        </p>
        <p
          v-else-if="!output.ourBizNo"
          class="reconcile__note"
        >
          <Info
            class="reconcile__note-icon"
            aria-hidden="true"
          />
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
          <span class="reconcile__action">
            <button
              type="button"
              class="tk-btn reconcile__button"
              @click="handleDownload"
            >
              <Download
                class="tk-btn__icon"
                aria-hidden="true"
              />
              <span>결과 엑셀 다운로드</span>
            </button>
            <InfoTip topic="downloadResult" />
          </span>
          <span class="reconcile__action">
            <button
              type="button"
              class="tk-btn tk-btn--primary reconcile__button reconcile__button--primary"
              :disabled="output.summary.MISSING.count === 0"
              @click="handleHandoff"
            >
              <span>누락 건 독촉 메시지로 전달 ({{ output.summary.MISSING.count.toLocaleString('ko-KR') }}건)</span>
              <ArrowRight
                class="tk-btn__icon"
                aria-hidden="true"
              />
            </button>
            <InfoTip topic="handoff" />
          </span>
        </div>
      </div>
    </template>

    <ColumnMapModal
      v-if="pending"
      :key="pending.fileName"
      :fields="pending.specs"
      :headers="pending.headers"
      :initial-mapping="pending.mapping"
      @confirm="confirmMapping"
      @cancel="cancelMapping"
    />
  </section>
</template>

<script setup lang="ts">
import { ArrowRight, Download, Info } from 'lucide-vue-next'
import type { ReconcileFilter, ReconcileResult } from '~/types/reconcile'
import type { SheetSourceState } from '~/composables/useSheetSource'

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

const { bank, invoice, pending, options, output, isRunning, runError, canRun, canReopenBank, canReopenInvoice, loadFile, confirmMapping, cancelMapping, reopenMapping, run } = useReconcile()
const { downloadWorkbook } = useExcelWriter()
const { setHandoff } = useHandoff()
const { showToast } = useToast()
const route = useRoute()
const router = useRouter()

const filter = ref<ReconcileFilter>('missing')
const statusMessage = ref<string>('')

const shownRows = computed<ReconcileResult[]>(() => (output.value ? filterResults(output.value.results, filter.value) : []))
const filterCaption = computed<string>(() => FILTER_CAPTIONS[filter.value])

// 대사를 실행한 뒤 옵션을 바꾸면, 결과는 실행 당시 옵션 기준이라는 점을 알린다
const isStale = computed<boolean>(() => {
  const used = output.value?.options
  if (!used) return false
  const now = options.value
  return used.dateWindowDays !== now.dateWindowDays
    || used.amountTolerance !== now.amountTolerance
    || used.ourBizNo !== now.ourBizNo
    || (used.excludeKeywords.length > 0) !== (now.excludeKeywords.length > 0)
})
const emptyText = computed<string>(() => EMPTY_TEXTS[filter.value])

// "1,204행 · 확인 필요 3건"
const sourceDetail = (source: SheetSourceState<unknown>): string | null => {
  if (source.fileName === null) return null
  const base = `${source.rows.length.toLocaleString('ko-KR')}행`
  return source.needsCheck > 0 ? `${base} · 확인 필요 ${source.needsCheck.toLocaleString('ko-KR')}건` : base
}

const handleRun = async (): Promise<void> => {
  statusMessage.value = '대사 계산 중…'
  await run()
  const result = output.value
  if (!result) {
    statusMessage.value = runError.value ?? ''
    return
  }
  filter.value = 'missing'
  statusMessage.value = `대사 완료: 누락 의심 ${result.summary.MISSING.count}건, 금액 불일치 ${result.summary.AMOUNT_MISMATCH.count}건, 일치 ${result.summary.MATCHED.count + result.summary.REVIEW.count}건`
}

const handleDownload = (): void => {
  if (!output.value) return
  downloadWorkbook(`TaxKit_대사결과_${formatDateCompact(new Date())}`, buildReconcileSheets(output.value))
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
  gap: $space-8;

  &__block {
    display: grid;
    gap: $space-4;
  }

  &__files {
    display: grid;
    gap: $space-4;

    @include respond-to(md) {
      grid-template-columns: 1fr 1fr;
    }
  }

  &__status {
    min-height: 0;
    color: var(--tk-muted);
    font-size: $font-sm;

    &:empty {
      display: none;
    }
  }

  &__note {
    display: flex;
    align-items: flex-start;
    gap: $space-2;
    padding: $space-3 $space-4;
    border: 1px solid #{tint($color-amber-500, 0.35)};
    border-radius: $radius-lg;
    background: var(--tk-warn-soft);
    color: var(--tk-warn-text);
    font-size: $font-sm;
    line-height: 1.6;
    word-break: keep-all;
  }

  &__note-icon {
    flex: none;
    width: 1.125rem;
    height: 1.125rem;
    margin-top: 0.125rem;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: $space-4;
  }

  &__action {
    display: inline-flex;
    align-items: center;
    gap: $space-1;
  }
}
</style>
