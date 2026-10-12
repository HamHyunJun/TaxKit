<template>
  <label
    class="drop-zone"
    :class="{
      'is-dragging': isDragging,
      'is-dropped': isDropped,
      'is-done': isDone,
      'has-error': Boolean(shownError),
    }"
    @dragenter.prevent="isDragging = true"
    @dragover.prevent
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <input
      class="drop-zone__input"
      type="file"
      :accept="ACCEPTED_EXTENSIONS.join(',')"
      @change="handleChange"
    >
    <component
      :is="isDone ? Check : Upload"
      class="drop-zone__icon"
      aria-hidden="true"
    />
    <span class="drop-zone__title">{{ title }}</span>
    <span class="drop-zone__hint">또는 클릭해서 파일 선택 ({{ ACCEPTED_EXTENSIONS.join(' ') }}, 최대 20MB)</span>
    <span
      class="drop-zone__status"
      aria-live="polite"
    >
      <template v-if="shownError">{{ shownError }}</template>
      <template v-else-if="isDone">{{ fileName }}<template v-if="detail"> · {{ detail }}</template></template>
    </span>
  </label>
</template>

<script setup lang="ts">
import { Check, Upload } from 'lucide-vue-next'

type Props = {
  title: string
  fileName?: string | null // 파싱이 끝난 파일 이름 (있으면 완료 상태로 표시)
  detail?: string | null // 예: '1,204행'
  error?: string | null // 부모가 파싱 중 만난 오류
}

const DROPPED_FEEDBACK_MS = 150

const { title, fileName = null, detail = null, error = null } = defineProps<Props>()
const emit = defineEmits<{
  select: [file: File]
}>()

const isDragging = ref<boolean>(false)
const isDropped = ref<boolean>(false)
const localError = ref<string | null>(null)

const isDone = computed<boolean>(() => fileName !== null && !localError.value && !error)
const shownError = computed<string | null>(() => localError.value ?? error)

// 형식을 확인하고, 20MB를 넘으면 계속할지 사용자에게 묻는다
const validate = (file: File): boolean => {
  const lowerName = file.name.toLowerCase()
  if (!ACCEPTED_EXTENSIONS.some(extension => lowerName.endsWith(extension))) {
    localError.value = `지원하지 않는 형식이에요 (${ACCEPTED_EXTENSIONS.join(', ')})`
    return false
  }
  if (file.size > MAX_FILE_BYTES) {
    const megabytes = (file.size / 1024 / 1024).toFixed(1)
    const proceed = window.confirm(`파일이 ${megabytes}MB예요. 20MB를 넘으면 처리가 느리거나 멈출 수 있어요. 계속할까요?`)
    if (!proceed) return false
  }
  localError.value = null
  return true
}

const handleFiles = (files: FileList | null | undefined): void => {
  const file = files?.[0]
  if (file && validate(file)) emit('select', file)
}

// 자식 요소로 넘어갈 때 발생하는 dragleave는 무시한다
const handleDragLeave = (event: DragEvent): void => {
  const area = event.currentTarget
  if (area instanceof Node && event.relatedTarget instanceof Node && area.contains(event.relatedTarget)) return
  isDragging.value = false
}

const handleDrop = (event: DragEvent): void => {
  isDragging.value = false
  isDropped.value = true
  setTimeout(() => {
    isDropped.value = false
  }, DROPPED_FEEDBACK_MS)
  handleFiles(event.dataTransfer?.files)
}

const handleChange = (event: Event): void => {
  const input = event.target
  if (!(input instanceof HTMLInputElement)) return
  handleFiles(input.files)
  input.value = '' // 같은 파일을 다시 골라도 change가 발생하도록 비운다
}
</script>

<style scoped lang="scss">
.drop-zone {
  position: relative;
  display: grid;
  justify-items: center;
  gap: $space-1-5;
  padding: $space-8 $space-4;
  border: 2px dashed var(--tk-border);
  border-radius: $radius-lg;
  background: var(--tk-card);
  color: var(--tk-muted);
  text-align: center;
  cursor: pointer;
  transition:
    transform $duration-base $ease-out-quint,
    background-color $duration-base $ease-out-quint,
    border-color $duration-base $ease-out-quint;

  &:focus-within {
    outline: 2px solid var(--tk-accent);
    outline-offset: 2px;
  }

  &:hover {
    border-color: var(--tk-accent);
  }

  &.is-dragging {
    border-color: var(--tk-accent);
    background: tint($color-emerald-500, 0.08);
    transform: scale(1.02);
  }

  &.is-dropped {
    transform: scale(0.98);
  }

  &.is-done {
    border-style: solid;
    border-color: var(--tk-accent);
  }

  &.has-error {
    border-color: var(--tk-danger);
  }

  &__input {
    @include visually-hidden;
  }

  &__icon {
    width: 1.5rem;
    height: 1.5rem;
  }

  &.is-done &__icon {
    color: var(--tk-accent-hover);
    animation: spring-pop $duration-slow $spring;
  }

  &__title {
    color: var(--tk-text);
    font-weight: 600;
  }

  &__hint {
    font-size: $font-xs;
  }

  &__status {
    min-height: 1.5em;
    font-size: $font-sm;
    font-weight: 500;
    color: var(--tk-accent-hover);
    word-break: break-all;
  }

  &.has-error &__status {
    color: var(--tk-danger);
  }

  @include reduced-motion {
    transition: none;

    &.is-done &__icon {
      animation: none;
    }
  }
}
</style>
