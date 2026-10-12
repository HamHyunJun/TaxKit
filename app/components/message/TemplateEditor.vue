<template>
  <section
    class="editor"
    aria-labelledby="editor-title"
  >
    <div class="editor__head">
      <h2
        id="editor-title"
        class="tk-section-title"
      >
        문구 설정
        <InfoTip topic="templateEdit" />
      </h2>
      <p class="tk-hint">
        비워 둔 항목은 예시 문구(○○세무회계 등)로 보여줘요.
      </p>
    </div>

    <div class="editor__grid">
      <div class="editor__field">
        <div class="editor__label-row">
          <span
            id="editor-channel-label"
            class="tk-label"
          >채널</span>
          <InfoTip topic="messageChannel" />
        </div>
        <div
          class="segmented"
          role="radiogroup"
          aria-labelledby="editor-channel-label"
        >
          <label
            v-for="(label, channel) in CHANNEL_LABELS"
            :key="channel"
          >
            <input
              type="radio"
              name="message-channel"
              :value="channel"
              :checked="settings.channel === channel"
              @change="update({ channel })"
            >
            <span>{{ label }}</span>
          </label>
        </div>
      </div>

      <div class="editor__field">
        <label
          for="editor-office"
          class="tk-label"
        >사무소명</label>
        <input
          id="editor-office"
          type="text"
          autocomplete="off"
          placeholder="○○세무회계"
          :value="settings.officeName"
          @input="handleText('officeName', $event)"
        >
      </div>
      <div class="editor__field">
        <label
          for="editor-manager"
          class="tk-label"
        >담당자</label>
        <input
          id="editor-manager"
          type="text"
          autocomplete="off"
          placeholder="김OO"
          :value="settings.manager"
          @input="handleText('manager', $event)"
        >
      </div>
      <div class="editor__field">
        <div class="editor__label-row">
          <label
            for="editor-due"
            class="tk-label"
          >회신기한</label>
          <InfoTip topic="dueDate" />
        </div>
        <input
          id="editor-due"
          type="date"
          :value="settings.dueDate"
          @input="handleText('dueDate', $event)"
        >
      </div>
    </div>

    <details class="editor__template">
      <summary class="editor__summary">
        <ChevronRight
          class="editor__chevron"
          aria-hidden="true"
        />
        {{ CHANNEL_LABELS[settings.channel] }} 템플릿 편집
      </summary>
      <div class="editor__body">
        <div
          class="editor__chips"
          role="group"
          aria-label="변수 삽입"
        >
          <button
            v-for="name in TEMPLATE_VARIABLES"
            :key="name"
            type="button"
            class="editor__chip"
            @click="insertVariable(name)"
          >
            {{ variableToken(name) }}
          </button>
        </div>
        <label
          for="editor-template"
          class="tk-label"
        >템플릿 본문</label>
        <textarea
          id="editor-template"
          ref="textareaRef"
          v-model="template"
          rows="9"
        />
        <button
          type="button"
          class="tk-btn tk-btn--ghost tk-btn--sm editor__reset"
          @click="template = DEFAULT_TEMPLATES[settings.channel]"
        >
          기본 문구로 되돌리기
        </button>
      </div>
    </details>
  </section>
</template>

<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'
import type { MessageSettings } from '~/types/message'

const settings = defineModel<MessageSettings>({ required: true })
const textareaRef = ref<HTMLTextAreaElement | null>(null)

const update = (patch: Partial<MessageSettings>): void => {
  settings.value = { ...settings.value, ...patch }
}

const handleText = (field: 'officeName' | 'manager' | 'dueDate', event: Event): void => {
  const input = event.target
  if (input instanceof HTMLInputElement) update({ [field]: input.value })
}

// 현재 채널의 템플릿 본문
const template = computed<string>({
  get: () => settings.value.templates[settings.value.channel],
  set: value => update({ templates: { ...settings.value.templates, [settings.value.channel]: value } }),
})

const variableToken = (name: string): string => `{${name}}`

// 커서 위치에 {변수}를 끼워 넣고 커서를 그 뒤로 옮긴다
const insertVariable = async (name: string): Promise<void> => {
  const area = textareaRef.value
  if (!area) return
  const token = variableToken(name)
  const { selectionStart: start, selectionEnd: end } = area
  template.value = template.value.slice(0, start) + token + template.value.slice(end)
  await nextTick()
  area.focus()
  area.setSelectionRange(start + token.length, start + token.length)
}
</script>

<style scoped lang="scss">
.editor {
  @include card-surface;

  display: grid;
  gap: $space-5;
  padding: $space-6;

  &__head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: $space-2;
  }

  &__grid {
    display: grid;
    gap: $space-5;

    @include respond-to(md) {
      grid-template-columns: auto 1fr 1fr 1fr;
    }
  }

  &__field {
    display: grid;
    align-content: start;
    gap: $space-2;
  }

  &__label-row {
    display: flex;
    align-items: center;
    gap: $space-1;
    min-height: 1.5rem;
  }

  &__template {
    border-top: 1px solid var(--tk-border);
    padding-top: $space-4;
  }

  &__summary {
    display: inline-flex;
    align-items: center;
    gap: $space-2;
    color: var(--tk-text-strong);
    font-size: $font-sm;
    font-weight: 600;
    list-style: none;
    cursor: pointer;

    @include focus-ring;

    &::-webkit-details-marker {
      display: none;
    }
  }

  &__chevron {
    width: 1rem;
    height: 1rem;
    color: var(--tk-muted);
    transition: transform $duration-medium $ease-out-quint;

    @include reduced-motion {
      transition: none;
    }
  }

  &__template[open] &__chevron {
    transform: rotate(90deg);
  }

  &__body {
    display: grid;
    gap: $space-3;
    margin-top: $space-4;
  }

  &__chips {
    display: flex;
    flex-wrap: wrap;
    gap: $space-2;
  }

  &__chip {
    padding: $space-1 $space-3;
    border: 1px solid var(--tk-accent);
    border-radius: $radius-full;
    background: var(--tk-accent-soft);
    color: var(--tk-accent-strong);
    font-size: $font-xs;
    font-weight: 700;
    transition: transform $duration-fast $ease-out-quint;

    @include focus-ring;

    &:hover {
      background: $color-ledger-100;
    }

    &:active {
      transform: scale(0.94);
    }

    @include reduced-motion {
      transition: none;
    }
  }

  &__reset {
    justify-self: start;
  }
}
</style>
