<template>
  <div class="drop-zone-wrap">
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
      <span class="drop-zone__badge">
        <component
          :is="isDone ? Check : Upload"
          class="drop-zone__icon"
          aria-hidden="true"
        />
      </span>
      <span class="drop-zone__title">{{ title }}</span>
      <span class="drop-zone__hint">
        여기에 끌어다 놓거나 <span class="drop-zone__link">파일 선택</span>
      </span>
      <span class="drop-zone__formats">{{ ACCEPTED_EXTENSIONS.join(' ') }}, 20MB 넘으면 확인</span>
      <span
        class="drop-zone__status"
        aria-live="polite"
      >
        <template v-if="shownError">{{ shownError }}</template>
        <template v-else-if="isDone">{{ fileName }}<template v-if="detail">, {{ detail }}</template></template>
      </span>
    </label>
    <div
      v-if="$slots.info"
      class="drop-zone-wrap__info"
    >
      <slot name="info" />
    </div>
    <div
      v-if="$slots.footer"
      class="drop-zone-wrap__footer"
    >
      <slot name="footer" />
    </div>
  </div>
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

let droppedTimer: ReturnType<typeof setTimeout> | undefined
onBeforeUnmount(() => clearTimeout(droppedTimer))

const isDragging = ref<boolean>(false)
const isDropped = ref<boolean>(false)
const localError = ref<string | null>(null)

const isDone = computed<boolean>(() => fileName !== null && !localError.value && !error)
const shownError = computed<string | null>(() => localError.value ?? error)

// 형식을 확인하고, 20MB를 넘으면 계속할지 사용자에게 묻는다
const validate = (file: File): boolean => {
  localError.value = null // 이전 파일의 오류가 새 파일에 남지 않게 한다
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
  clearTimeout(droppedTimer)
  droppedTimer = setTimeout(() => {
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
.drop-zone-wrap {
  position: relative;

  &__info {
    position: absolute;
    top: $space-3;
    right: $space-3;
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
  }
}

.drop-zone {
  display: grid;
  justify-items: center;
  align-content: center;
  gap: $space-1;
  min-height: 11.5rem;
  padding: $space-6 $space-4;
  border: 1.5px dashed var(--tk-border-strong);
  border-radius: $radius-xl;
  background: var(--tk-card);
  color: var(--tk-muted);
  text-align: center;
  cursor: pointer;
  transition:
    transform $duration-base $ease-out-quint,
    background-color $duration-base $ease-out-quint,
    border-color $duration-base $ease-out-quint,
    box-shadow $duration-base $ease-out-quint;

  &:focus-within {
    outline: 2px solid var(--tk-accent);
    outline-offset: 2px;
  }

  &:hover {
    border-color: var(--tk-accent);
    background: var(--tk-accent-soft);
  }

  &.is-dragging {
    border-color: var(--tk-accent);
    background: #{tint($color-ledger-500, 0.1)};
    box-shadow: 0 0 0 4px #{tint($color-ledger-500, 0.14)};
    transform: scale(1.02);
  }

  &.is-dropped {
    transform: scale(0.98);
  }

  &.is-done {
    border-style: solid;
    border-color: var(--tk-accent);
    background: var(--tk-accent-soft);
  }

  &.has-error {
    border-color: var(--tk-danger);
    background: var(--tk-danger-soft);
  }

  &__input {
    @include visually-hidden;
  }

  &__badge {
    display: inline-grid;
    place-content: center;
    width: 3rem;
    height: 3rem;
    margin-bottom: $space-2;
    border-radius: $radius-lg;
    background: var(--tk-surface-strong);
    color: $color-slate-600;
    transition:
      background-color $duration-base $ease-out-quint,
      color $duration-base $ease-out-quint;
  }

  &:hover &__badge,
  &.is-dragging &__badge {
    background: var(--tk-card);
    color: var(--tk-accent-text);
    box-shadow: var(--tk-shadow-sm);
  }

  &.is-done &__badge {
    background: var(--tk-accent-text);
    color: $color-white;
    animation: spring-pop $duration-slow $spring;
  }

  &__icon {
    width: 1.375rem;
    height: 1.375rem;
  }

  &__title {
    color: var(--tk-text-strong);
    font-size: $font-base;
    font-weight: 700;
    letter-spacing: $tracking-tight;
    word-break: keep-all;
  }

  &__hint {
    font-size: $font-sm;
  }

  &__link {
    color: var(--tk-accent-text);
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  &__formats {
    font-size: $font-xs;
  }

  &__status {
    min-height: 1.75rem;
    margin-top: $space-2;
    color: var(--tk-accent-text);
    font-size: $font-sm;
    font-weight: 600;
    word-break: break-all;
  }

  &.has-error &__status {
    color: var(--tk-danger-text);
  }

  @include reduced-motion {
    transition: none;

    &__badge,
    &.is-done &__badge {
      transition: none;
      animation: none;
    }
  }
}
</style>
