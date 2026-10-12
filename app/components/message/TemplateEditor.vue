<template>
  <section
    class="editor"
    aria-labelledby="editor-title"
  >
    <h2
      id="editor-title"
      class="editor__title"
    >
      문구 설정
    </h2>

    <div class="editor__grid">
      <fieldset class="editor__channel">
        <legend class="editor__label">
          채널
        </legend>
        <label
          v-for="(label, channel) in CHANNEL_LABELS"
          :key="channel"
          class="editor__radio"
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
      </fieldset>

      <div class="editor__field">
        <label
          for="editor-office"
          class="editor__label"
        >사무소명</label>
        <input
          id="editor-office"
          class="editor__input"
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
          class="editor__label"
        >담당자</label>
        <input
          id="editor-manager"
          class="editor__input"
          type="text"
          autocomplete="off"
          placeholder="김OO"
          :value="settings.manager"
          @input="handleText('manager', $event)"
        >
      </div>
      <div class="editor__field">
        <label
          for="editor-due"
          class="editor__label"
        >회신기한</label>
        <input
          id="editor-due"
          class="editor__input"
          type="date"
          :value="settings.dueDate"
          @input="handleText('dueDate', $event)"
        >
      </div>
    </div>

    <details class="editor__template">
      <summary class="editor__summary">
        {{ CHANNEL_LABELS[settings.channel] }} 템플릿 편집
      </summary>
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
        class="editor__label"
      >템플릿 본문</label>
      <textarea
        id="editor-template"
        ref="textareaRef"
        v-model="template"
        class="editor__textarea"
        rows="9"
      />
      <button
        type="button"
        class="editor__reset"
        @click="template = DEFAULT_TEMPLATES[settings.channel]"
      >
        기본 문구로 되돌리기
      </button>
    </details>
  </section>
</template>

<script setup lang="ts">
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
  gap: $space-4;
  padding: $space-5;

  &__title {
    font-size: $font-base;
  }

  &__grid {
    display: grid;
    gap: $space-4;

    @include respond-to(md) {
      grid-template-columns: auto 1fr 1fr 1fr;
    }
  }

  &__channel {
    display: flex;
    flex-wrap: wrap;
    align-content: start;
    gap: $space-1-5 $space-4;
    padding: 0;
    border: 0;

    .editor__label {
      width: 100%;
      padding: 0;
    }
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
  }

  &__field {
    display: grid;
    align-content: start;
    gap: $space-1-5;
  }

  &__label {
    font-size: $font-sm;
    font-weight: 600;
  }

  &__input,
  &__textarea {
    padding: $space-2 $space-3;
    border: 1px solid var(--tk-border);
    border-radius: $radius-md;
    background: var(--tk-card);
    font: inherit;
    transition: border-color $duration-fast $ease-out-quint;

    @include focus-ring;

    @include reduced-motion {
      transition: none;
    }
  }

  &__template {
    display: grid;
    gap: $space-3;
  }

  &__summary {
    font-size: $font-sm;
    font-weight: 600;
    cursor: pointer;

    @include focus-ring;
  }

  &__chips {
    display: flex;
    flex-wrap: wrap;
    gap: $space-2;
    margin-top: $space-3;
  }

  &__chip {
    padding: $space-1 $space-3;
    border: 1px solid var(--tk-border);
    border-radius: $radius-full;
    background: var(--tk-surface);
    font-size: $font-xs;
    font-weight: 600;
    transition: transform $duration-fast $ease-out-quint;

    @include focus-ring;

    &:active {
      transform: scale(0.94);
    }

    @include reduced-motion {
      transition: none;
    }
  }

  &__textarea {
    width: 100%;
    line-height: 1.6;
    resize: vertical;
  }

  &__reset {
    width: fit-content;
    color: var(--tk-muted);
    font-size: $font-sm;
    text-decoration: underline;

    @include focus-ring;
  }
}
</style>
