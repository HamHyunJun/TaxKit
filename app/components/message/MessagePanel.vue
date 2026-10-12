<template>
  <section
    class="message"
    aria-labelledby="message-title"
  >
    <header class="message__head">
      <h1
        id="message-title"
        class="message__title"
      >
        독촉 메시지
      </h1>
      <p class="message__desc">
        증빙이 누락된 거래처별로 안내 문구를 만들어 한 번에 복사해요.
      </p>
    </header>

    <fieldset class="message__source">
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
      title="누락 건 엑셀을 놓으세요 (거래처·거래일자·금액)"
      :file-name="source.fileName"
      :detail="uploadDetail"
      :error="source.error"
      @select="loadFile"
    />

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
          <h2 class="message__side-title">
            거래처 {{ groups.length.toLocaleString('ko-KR') }}곳
          </h2>
          <CopyButton
            label="전체 거래처 안내 문구"
            :text="allText"
            @copied="handleCopyAll"
          />
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
    <p
      v-else
      class="message__empty"
    >
      {{ mode === 'handoff' ? '전달된 누락 건이 없어요.' : '위에 누락 건 엑셀을 올리면 거래처별 안내 문구가 만들어져요.' }}
      Tab 1에서 "누락 건 독촉 메시지로 전달"을 누르거나 엑셀을 올려 주세요.
    </p>

    <ColumnMapModal
      v-if="pending"
      :key="pending.fileName"
      :fields="MESSAGE_FIELDS"
      :headers="pending.headers"
      :initial-mapping="pending.mapping"
      @confirm="confirmMapping"
      @cancel="cancelMapping"
    />
  </section>
</template>

<script setup lang="ts">
import type { PartnerGroup } from '~/types/message'

const {
  mode, handoffCount, source, pending, settings, search, rowCount, groups, visibleGroups, activeGroup, copiedKeys,
  select, messageOf, allMessages, markCopied, loadFile, confirmMapping, cancelMapping,
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

  &__source {
    display: flex;
    flex-wrap: wrap;
    gap: $space-2 $space-6;
    padding: 0;
    border: 0;
  }

  &__legend {
    margin-bottom: $space-2;
    font-size: $font-sm;
    font-weight: 600;
  }

  &__radio {
    display: inline-flex;
    align-items: center;
    gap: $space-2;
    font-size: $font-sm;
    cursor: pointer;

    input {
      accent-color: var(--tk-accent);
    }

    &.is-disabled {
      color: var(--tk-muted);
      cursor: not-allowed;
    }
  }

  &__status {
    min-height: 1.5em;
    color: var(--tk-muted);
    font-size: $font-sm;
  }

  &__layout {
    display: grid;
    gap: $space-5;
    align-items: start;

    @include respond-to(md) {
      grid-template-columns: minmax(16rem, 22rem) 1fr;
    }
  }

  &__side {
    display: grid;
    gap: $space-3;
  }

  &__side-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: $space-2;
  }

  &__side-title {
    font-size: $font-base;
  }

  &__empty {
    padding: $space-8 $space-4;
    color: var(--tk-muted);
    text-align: center;
  }
}
</style>
