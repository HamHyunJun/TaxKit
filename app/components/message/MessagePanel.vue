<template>
  <section
    class="message"
    aria-labelledby="message-title"
  >
    <PageHeader
      eyebrow="STEP 3"
      title="독촉 메시지"
      description="증빙이 누락된 거래처별로 안내 문구를 만들어요. 거래처마다 건수·합계금액·거래 목록이 자동으로 채워지고, 복사 한 번이면 카카오톡이나 문자에 붙여넣을 수 있어요."
      topic="messagePage"
      title-id="message-title"
    />

    <div class="message__block">
      <h2 class="tk-section-title">
        입력 소스
        <InfoTip topic="messageSource" />
      </h2>
      <fieldset class="segmented message__source">
        <legend class="message__legend">
          입력 소스
        </legend>
        <label
          class="message__radio"
          :class="{ 'is-disabled': handoffCount === 0 }"
        >
          <input
            v-model="mode"
            type="radio"
            name="message-source"
            value="handoff"
            :disabled="handoffCount === 0"
          >
          <span>Tab 1에서 전달된 누락 {{ handoffCount.toLocaleString('ko-KR') }}건</span>
        </label>
        <label class="message__radio">
          <input
            v-model="mode"
            type="radio"
            name="message-source"
            value="upload"
          >
          <span>엑셀 직접 업로드</span>
        </label>
      </fieldset>

      <DropZone
        v-if="mode === 'upload'"
        title="누락 건 엑셀 (거래처·거래일자·금액)"
        :file-name="source.fileName"
        :detail="uploadDetail"
        :error="source.error"
        @select="loadFile"
      >
        <template #footer>
          <button
            v-if="canReopen"
            type="button"
            class="tk-btn tk-btn--ghost tk-btn--sm drop-zone-reopen"
            @click="reopenMapping"
          >
            컬럼 다시 지정
          </button>
        </template>
      </DropZone>
    </div>

    <TemplateEditor v-model="settings" />

    <p
      class="message__status"
      role="status"
      aria-live="polite"
    >
      {{ statusMessage }}
    </p>

    <div
      v-if="groups.length > 0"
      class="message__layout"
    >
      <div class="message__side">
        <div class="message__side-head">
          <div class="message__side-heading">
            <h2 class="message__side-title">
              거래처 {{ groups.length.toLocaleString('ko-KR') }}곳
            </h2>
            <InfoTip topic="partnerGroups" />
          </div>
          <span class="message__copy-all">
            <CopyButton
              label="전체 거래처 안내 문구"
              :text="allText"
              @copied="handleCopyAll"
            />
            <InfoTip topic="copyAll" />
          </span>
        </div>
        <PartnerList
          v-model:search="search"
          :groups="visibleGroups"
          :active-key="activeGroup?.key ?? null"
          :copied-keys="copiedKeys"
          @select="select"
        />
      </div>

      <MessagePreview
        :group="activeGroup"
        :text="activeText"
        :channel="settings.channel"
        @copied="handleCopied"
      />
    </div>
    <div
      v-else
      class="message__empty"
    >
      <span class="message__empty-icon">
        <MessageSquareText
          class="message__empty-svg"
          aria-hidden="true"
        />
      </span>
      <p class="message__empty-title">
        {{ mode === 'handoff' ? '전달된 누락 건이 없어요.' : '누락 건 엑셀을 올리면 거래처별 안내 문구가 만들어져요.' }}
      </p>
      <p class="message__empty-desc">
        Tab 1에서 "누락 건 독촉 메시지로 전달"을 누르거나 엑셀을 올려 주세요.
      </p>
    </div>

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
import { MessageSquareText } from 'lucide-vue-next'
import type { PartnerGroup } from '~/types/message'

const {
  mode, handoffCount, source, pending, settings, search, rowCount, groups, visibleGroups, activeGroup, copiedKeys,
  select, messageOf, allMessages, markCopied, canReopen, loadFile, confirmMapping, cancelMapping, reopenMapping,
} = useMessageBuilder()
const { showToast } = useToast()

const activeText = computed<string>(() => (activeGroup.value ? messageOf(activeGroup.value) : ''))
const allText = computed<string>(() => allMessages())

const uploadDetail = computed<string | null>(() => {
  if (source.value.fileName === null) return null
  const base = `${rowCount.value.toLocaleString('ko-KR')}행`
  return source.value.needsCheck > 0 ? `${base} · 확인 필요 ${source.value.needsCheck.toLocaleString('ko-KR')}건` : base
})

const statusMessage = computed<string>(() =>
  groups.value.length > 0 ? `거래처 ${groups.value.length}곳, 누락 ${rowCount.value}건의 안내 문구를 만들었어요` : '',
)

const handleCopied = (group: PartnerGroup): void => {
  markCopied([group.key])
  showToast(`${group.name} 안내 문구를 복사했어요`)
}

const handleCopyAll = (): void => {
  markCopied(groups.value.map(group => group.key))
  showToast(`거래처 ${groups.value.length}곳의 안내 문구를 모두 복사했어요`)
}
</script>

<style scoped lang="scss">
.message {
  display: grid;
  gap: $space-8;

  &__block {
    display: grid;
    gap: $space-4;
  }

  &__legend {
    @include visually-hidden;
  }

  &__source {
    justify-self: start;
    max-width: 100%;
    flex-wrap: wrap;
  }

  &__radio.is-disabled {
    cursor: not-allowed;
  }

  &__status {
    color: var(--tk-muted);
    font-size: $font-sm;

    &:empty {
      display: none;
    }
  }

  &__layout {
    display: grid;
    gap: $space-5;
    align-items: start;

    @include respond-to(md) {
      grid-template-columns: minmax(17rem, 23rem) 1fr;
    }
  }

  &__side {
    @include card-surface;

    display: grid;
    gap: $space-4;
    padding: $space-5;
  }

  &__side-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: $space-2;
  }

  &__side-heading,
  &__copy-all {
    display: inline-flex;
    align-items: center;
    gap: $space-1;
  }

  &__side-title {
    font-size: $font-base;
    font-weight: 700;
  }

  &__empty {
    display: grid;
    justify-items: center;
    gap: $space-2;
    padding: $space-12 $space-4;
    border: 1.5px dashed var(--tk-border-strong);
    border-radius: $radius-xl;
    text-align: center;
  }

  &__empty-icon {
    display: inline-grid;
    place-content: center;
    width: 3rem;
    height: 3rem;
    margin-bottom: $space-2;
    border-radius: $radius-lg;
    background: var(--tk-surface-strong);
    color: $color-slate-600;
  }

  &__empty-svg {
    width: 1.5rem;
    height: 1.5rem;
  }

  &__empty-title {
    color: var(--tk-text-strong);
    font-weight: 600;
  }

  &__empty-desc {
    color: var(--tk-muted);
    font-size: $font-sm;
  }
}
</style>
