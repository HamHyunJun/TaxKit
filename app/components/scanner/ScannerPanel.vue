<template>
  <section
    class="scanner"
    aria-labelledby="scanner-title"
  >
    <PageHeader
      eyebrow="STEP 2"
      title="법인카드 스캐너"
      description="카드사 승인내역을 올리면 심야·주말·공휴일 사용, 사적 의심 업종, 연속 분할 결제를 찾아 소명이 필요한 건을 모아줘요."
      topic="scannerPage"
      title-id="scanner-title"
    />

    <div class="scanner__block">
      <h2 class="tk-section-title">
        파일 올리기
      </h2>
      <DropZone
        title="법인카드 승인내역 엑셀"
        :file-name="source.fileName"
        :detail="sourceDetail"
        :error="source.error"
        @select="loadFile"
      >
        <template #info>
          <InfoTip topic="cardFile" />
        </template>
      </DropZone>
    </div>

    <p
      class="scanner__status"
      role="status"
      aria-live="polite"
    >
      {{ statusMessage }}
    </p>

    <template v-if="source.fileName && !source.error">
      <div class="scanner__block">
        <h2 class="tk-section-title">
          검사 규칙
          <InfoTip topic="ruleSet" />
        </h2>
        <RuleToggles v-model:enabled="enabledTags" />
      </div>

      <div class="scanner__block">
        <h2 class="tk-section-title">
          검사 결과
        </h2>
        <RiskSummary
          v-model:levels="levels"
          :counts="counts"
        />

        <div class="scanner__toolbar">
          <label class="scanner__sort">
            <span class="tk-label">정렬</span>
            <select
              v-model="sort"
              class="scanner__select"
            >
              <option value="score">리스크 점수 높은 순</option>
              <option value="date">승인일시 순</option>
              <option value="amount">금액 높은 순</option>
            </select>
          </label>
          <span class="scanner__action">
            <button
              type="button"
              class="tk-btn tk-btn--primary scanner__download"
              :disabled="shown.length === 0"
              @click="handleDownload"
            >
              <Download
                class="tk-btn__icon"
                aria-hidden="true"
              />
              <span>소명 대상 엑셀 다운로드 ({{ shown.length.toLocaleString('ko-KR') }}건)</span>
            </button>
            <InfoTip topic="downloadReport" />
          </span>
        </div>

        <RiskTable
          v-model:explanations="explanations"
          :findings="shown"
          :empty-text="emptyText"
        />
      </div>
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
  gap: $space-8;

  &__block {
    display: grid;
    gap: $space-4;
  }

  &__status {
    color: var(--tk-muted);
    font-size: $font-sm;

    &:empty {
      display: none;
    }
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
    gap: $space-3;
  }

  &__select {
    width: auto;
    min-width: 13rem;
  }

  &__action {
    display: inline-flex;
    align-items: center;
    gap: $space-1;
  }
}
</style>
