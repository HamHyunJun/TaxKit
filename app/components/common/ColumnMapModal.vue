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
      <header class="column-map__head">
        <span class="column-map__badge">
          <Columns3
            class="column-map__badge-icon"
            aria-hidden="true"
          />
        </span>
        <div class="column-map__head-text">
          <h2
            id="column-map-title"
            class="column-map__title"
          >
            컬럼 매핑
          </h2>
          <p class="column-map__desc">
            필수 컬럼을 자동으로 찾지 못했어요. 엑셀의 어느 열인지 직접 골라 주세요.
            같은 양식의 파일은 다음부터 기억해 둬요.
          </p>
        </div>
      </header>

      <div class="column-map__rows">
        <div
          v-for="(field, fieldIndex) in fields"
          :key="field.key"
          class="column-map__row"
        >
          <label
            :for="`column-map-${field.key}`"
            class="column-map__label"
          >
            <span>{{ field.label }}</span>
            <span
              v-if="field.required"
              class="column-map__tag"
            >필수</span>
          </label>
          <select
            :id="`column-map-${field.key}`"
            class="column-map__select"
            :autofocus="fieldIndex === 0"
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
      </div>

      <footer class="column-map__actions">
        <button
          type="button"
          class="tk-btn tk-btn--ghost column-map__button"
          @click="dialogRef?.close()"
        >
          취소
        </button>
        <button
          type="submit"
          class="tk-btn tk-btn--primary column-map__button column-map__button--primary"
          :disabled="!canConfirm"
        >
          확인
        </button>
      </footer>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { Columns3 } from 'lucide-vue-next'
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
  width: min(36rem, calc(100vw - #{$space-8}));
  max-height: calc(100vh - #{$space-8});
  margin: auto;
  padding: 0;
  border: 1px solid var(--tk-border);
  border-radius: $radius-xl;
  background: var(--tk-card);
  color: var(--tk-text);
  box-shadow: var(--tk-shadow-pop);
  animation: column-map-in $duration-base $ease-out-quint;

  &::backdrop {
    background: #{tint($color-slate-900, 0.5)};
    backdrop-filter: blur(3px);
    animation: backdrop-in $duration-base $ease-out-quint;
  }

  &__form {
    display: grid;
    gap: $space-5;
    padding: $space-6;
  }

  &__head {
    display: flex;
    gap: $space-4;
  }

  &__badge {
    display: inline-grid;
    flex: none;
    place-content: center;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: $radius-lg;
    background: var(--tk-accent-soft);
    color: var(--tk-accent-text);
  }

  &__badge-icon {
    width: 1.375rem;
    height: 1.375rem;
  }

  &__head-text {
    display: grid;
    gap: $space-1;
  }

  &__title {
    font-size: $font-xl;
    font-weight: 700;
  }

  &__desc {
    color: var(--tk-muted);
    font-size: $font-sm;
    line-height: 1.65;
    word-break: keep-all;
  }

  &__rows {
    display: grid;
    gap: $space-3;
    max-height: 22rem;
    padding: $space-1;
    overflow-y: auto;

    @include focus-ring;
  }

  &__row {
    display: grid;
    gap: $space-2;
    padding: $space-3 $space-4;
    border: 1px solid var(--tk-border);
    border-radius: $radius-lg;
    background: var(--tk-surface);

    @include respond-to(md) {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
      align-items: center;
    }
  }

  &__label {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: $space-2;
    color: var(--tk-text-strong);
    font-size: $font-sm;
    font-weight: 600;
  }

  &__tag {
    padding: 0 $space-2;
    border-radius: $radius-full;
    background: var(--tk-danger-soft);
    color: var(--tk-danger-text);
    font-size: $font-xs;
    font-weight: 700;
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: $space-2;
    padding-top: $space-1;
  }

  @include reduced-motion {
    animation: none;

    &::backdrop {
      animation: none;
    }
  }
}

@keyframes column-map-in {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.98);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes backdrop-in {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}
</style>
