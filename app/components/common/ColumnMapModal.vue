<template>
  <dialog
    ref="dialogRef"
    class="column-map"
    aria-labelledby="column-map-title"
    @close="handleClose"
  >
    <form
      class="column-map__form"
      @submit.prevent="handleSubmit"
    >
      <h2
        id="column-map-title"
        class="column-map__title"
      >
        컬럼 매핑
      </h2>
      <p class="column-map__desc">
        필수 컬럼을 자동으로 찾지 못했어요. 엑셀의 어느 열인지 직접 골라 주세요. 다음에 같은 양식이면 기억해 둬요.
      </p>
      <div
        v-for="field in fields"
        :key="field.key"
        class="column-map__row"
      >
        <label
          :for="`column-map-${field.key}`"
          class="column-map__label"
        >
          {{ field.label }}
          <span
            v-if="field.required"
            class="column-map__required"
          >(필수)</span>
        </label>
        <select
          :id="`column-map-${field.key}`"
          class="column-map__select"
          :value="draft[field.key] ?? ''"
          @change="handleSelect(field.key, $event)"
        >
          <option value="">
            선택 안 함
          </option>
          <option
            v-for="(header, index) in headers"
            :key="index"
            :value="index"
          >
            {{ utils.encode_col(index) }}열 · {{ header || '(빈 헤더)' }}
          </option>
        </select>
      </div>
      <div class="column-map__actions">
        <button
          type="button"
          class="column-map__button"
          @click="dialogRef?.close()"
        >
          취소
        </button>
        <button
          type="submit"
          class="column-map__button column-map__button--primary"
          :disabled="!canConfirm"
        >
          확인
        </button>
      </div>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { utils } from 'xlsx'
import type { ColumnMapping, FieldSpec } from '~/types/excel'

type Props = {
  fields: readonly FieldSpec[]
  headers: readonly string[] // 선택지로 보여줄 헤더 행의 셀 값
  initialMapping?: ColumnMapping
}

const { fields, headers, initialMapping = {} } = defineProps<Props>()
const emit = defineEmits<{
  confirm: [mapping: ColumnMapping]
  cancel: []
}>()

const dialogRef = ref<HTMLDialogElement | null>(null)
const draft = ref<ColumnMapping>({ ...initialMapping })
let isConfirmed = false

const canConfirm = computed<boolean>(() =>
  fields.every(field => !field.required || draft.value[field.key] !== undefined),
)

const handleSelect = (key: string, event: Event): void => {
  const select = event.target
  if (!(select instanceof HTMLSelectElement)) return
  draft.value = { ...draft.value, [key]: select.value === '' ? undefined : Number(select.value) }
}

const handleSubmit = (): void => {
  if (!canConfirm.value) return
  isConfirmed = true
  emit('confirm', { ...draft.value })
  dialogRef.value?.close()
}

// Esc·취소 버튼으로 닫힌 경우에만 cancel을 알린다
const handleClose = (): void => {
  if (!isConfirmed) emit('cancel')
}

// 부모가 v-if로 마운트하는 순간 모달로 연다 (포커스 트랩·Esc는 <dialog>가 처리)
onMounted(() => dialogRef.value?.showModal())
</script>

<style scoped lang="scss">
.column-map {
  width: min(32rem, calc(100vw - #{$space-8}));
  max-height: calc(100vh - #{$space-8});
  margin: auto;
  padding: 0;
  border: 1px solid var(--tk-border);
  border-radius: $radius-lg;
  background: var(--tk-card);
  color: var(--tk-text);
  animation: column-map-in $duration-base $ease-out-quint;

  &::backdrop {
    background: tint($color-slate-900, 0.5);
  }

  &__form {
    display: grid;
    gap: $space-4;
    padding: $space-6;
  }

  &__title {
    font-size: $font-xl;
  }

  &__desc {
    color: var(--tk-muted);
    font-size: $font-sm;
  }

  &__row {
    display: grid;
    gap: $space-1;
  }

  &__label {
    font-size: $font-sm;
    font-weight: 600;
  }

  &__required {
    color: var(--tk-danger);
    font-weight: 500;
  }

  &__select {
    padding: $space-2 $space-3;
    border: 1px solid var(--tk-border);
    border-radius: $radius-md;
    background: var(--tk-card);
    font: inherit;

    @include focus-ring;
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: $space-2;
  }

  &__button {
    padding: $space-2 $space-4;
    border: 1px solid var(--tk-border);
    border-radius: $radius-md;
    font-weight: 600;
    transition: transform $duration-fast $ease-out-quint;

    @include focus-ring;

    &:active:not(:disabled) {
      transform: scale(0.96);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    &--primary {
      border-color: var(--tk-accent);
      background: var(--tk-accent);
      color: var(--tk-bg);
    }

    @include reduced-motion {
      transition: none;
    }
  }

  @include reduced-motion {
    animation: none;
  }
}

@keyframes column-map-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
