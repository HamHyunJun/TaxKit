<template>
  <section
    class="scanner"
    aria-labelledby="scanner-title"
  >
    <header class="scanner__head">
      <h1
        id="scanner-title"
        class="scanner__title"
      >
        법인카드 스캐너
      </h1>
      <p class="scanner__desc">
        카드사 승인내역을 올리면 심야·주말·공휴일·사적 의심 업종·분할 결제를 찾아 소명이 필요한 건을 알려줘요.
      </p>
    </header>

    <DropZone
      title="법인카드 승인내역 엑셀을 놓으세요"
      :file-name="source.fileName"
      :detail="sourceDetail"
      :error="source.error"
      @select="loadFile"
    />

    <p
      class="scanner__status"
      role="status"
      aria-live="polite"
    >
      {{ statusMessage }}
    </p>

    <template v-if="source.fileName && !source.error">
      <RuleToggles v-model:enabled="enabledTags" />
      <RiskSummary
        v-model:levels="levels"
        :counts="counts"
      />

      <div class="scanner__toolbar">
        <label class="scanner__sort">
          <span>정렬</span>
          <select
            v-model="sort"
            class="scanner__select"
          >
            <option value="score">리스크 점수 높은 순</option>
            <option value="date">승인일시 순</option>
            <option value="amount">금액 높은 순</option>
          </select>
        </label>
        <button
          type="button"
          class="scanner__download"
          :disabled="shown.length === 0"
          @click="handleDownload"
        >
          <Download
            class="scanner__download-icon"
            aria-hidden="true"
          />
          <span>소명 대상 엑셀 다운로드 ({{ shown.length.toLocaleString('ko-KR') }}건)</span>
        </button>
      </div>

      <RiskTable
        v-model:explanations="explanations"
        :findings="shown"
        :empty-text="emptyText"
      />
    </template>

    <ColumnMapModal
      v-if="pending"
      :key="pending.fileName"
      :fields="CARD_FIELDS"
      :headers="pending.headers"
      :initial-mapping="pending.mapping"
      @confirm="confirmMapping"
      @cancel="cancelMapping"
    />
  </section>
</template>

<script setup lang="ts">
import { Download } from 'lucide-vue-next'

const { source, pending, enabledTags, levels, sort, explanations, counts, shown, loadFile, confirmMapping, cancelMapping } = useRiskScanner()
const { downloadWorkbook } = useExcelWriter()

// "취소 2건 상계 · 짝 없는 취소 1건 · 확인 필요 3건"
const sourceDetail = computed<string | null>(() => {
  if (source.value.fileName === null) return null
  const parts = [`승인 ${counts.value.total.toLocaleString('ko-KR')}건`]
  if (source.value.offsetCount > 0) parts.push(`취소 ${source.value.offsetCount.toLocaleString('ko-KR')}건 상계`)
  if (source.value.unmatchedCancels > 0) parts.push(`원 승인 없는 취소 ${source.value.unmatchedCancels.toLocaleString('ko-KR')}건 제외`)
  if (source.value.needsCheck > 0) parts.push(`확인 필요 ${source.value.needsCheck.toLocaleString('ko-KR')}건`)
  return parts.join(' · ')
})

const statusMessage = computed<string>(() =>
  source.value.fileName && !source.value.error
    ? `검사 결과: 소명 대상 ${counts.value.flagged}건 (High ${counts.value.high}건, Medium ${counts.value.medium}건)`
    : '',
)

const emptyText = computed<string>(() =>
  counts.value.flagged === 0 ? '소명이 필요한 승인 내역이 없어요.' : '선택한 위험도에 해당하는 내역이 없어요.',
)

// 화면에 보이는(위험도 필터를 적용한) 소명 대상만 내려받는다
const handleDownload = (): void => {
  downloadWorkbook(
    `TaxKit_법인카드소명_${formatDateCompact(new Date())}`,
    buildRiskSheets(shown.value, counts.value, explanations.value, {
      fileName: source.value.fileName ?? '',
      enabledTags: enabledTags.value,
      offsetCount: source.value.offsetCount,
    }),
  )
}
</script>

<style scoped lang="scss">
.scanner {
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

  &__status {
    min-height: 1.5em;
    color: var(--tk-muted);
    font-size: $font-sm;
  }

  &__toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: $space-3;
  }

  &__sort {
    display: inline-flex;
    align-items: center;
    gap: $space-2;
    font-size: $font-sm;
    font-weight: 600;
  }

  &__select {
    padding: $space-1-5 $space-3;
    border: 1px solid var(--tk-border);
    border-radius: $radius-md;
    background: var(--tk-card);
    font: inherit;
    font-weight: 400;

    @include focus-ring;
  }

  &__download {
    display: inline-flex;
    align-items: center;
    gap: $space-2;
    padding: $space-2 $space-4;
    border: 1px solid var(--tk-accent);
    border-radius: $radius-md;
    background: var(--tk-accent);
    color: var(--tk-bg);
    font-weight: 700;
    transition:
      transform $duration-fast $ease-out-quint,
      background-color $duration-fast $ease-out-quint;

    @include focus-ring;

    &:hover:not(:disabled) {
      background: var(--tk-accent-hover);
    }

    &:active:not(:disabled) {
      transform: scale(0.96);
    }

    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    @include reduced-motion {
      transition: none;
    }
  }

  &__download-icon {
    width: 1rem;
    height: 1rem;
  }
}
</style>
