<template>
  <form
    class="options"
    @submit.prevent="emit('run')"
  >
    <div class="options__grid">
      <div class="options__field">
        <label
          for="options-biz-no"
          class="options__label"
        >우리 회사 사업자번호</label>
        <input
          id="options-biz-no"
          v-model="bizNoText"
          class="options__input"
          type="text"
          inputmode="numeric"
          autocomplete="off"
          maxlength="12"
          placeholder="000-00-00000"
          :aria-invalid="isBizNoInvalid"
          aria-describedby="options-biz-no-hint"
        >
        <p
          id="options-biz-no-hint"
          class="options__hint"
          :class="{ 'is-error': isBizNoInvalid }"
        >
          {{ isBizNoInvalid ? '숫자 10자리로 입력해 주세요' : '비워 두면 계산서에서 가장 많이 나오는 번호로 추정해요' }}
        </p>
      </div>

      <div class="options__field">
        <label
          for="options-window"
          class="options__label"
        >
          날짜 윈도우 ±<output
            class="options__value"
            for="options-window"
          >{{ model.dateWindowDays }}</output>일
        </label>
        <input
          id="options-window"
          class="options__range"
          type="range"
          min="0"
          max="31"
          step="1"
          :value="model.dateWindowDays"
          @input="handleWindow"
        >
      </div>

      <div class="options__field">
        <label
          for="options-tolerance"
          class="options__label"
        >금액 허용오차(원)</label>
        <input
          id="options-tolerance"
          class="options__input options__input--num"
          type="number"
          min="0"
          max="1000"
          step="1"
          :value="model.amountTolerance"
          @input="handleTolerance"
        >
      </div>
    </div>

    <div class="options__footer">
      <label class="options__check">
        <input
          type="checkbox"
          :checked="model.excludeKeywords.length > 0"
          @change="handleExclude"
        >
        <span>이자·수수료·급여 등 자동 제외</span>
      </label>
      <button
        type="submit"
        class="options__run"
        :disabled="!canRun"
      >
        <component
          :is="isRunning ? LoaderCircle : Play"
          class="options__run-icon"
          :class="{ 'is-spinning': isRunning }"
          aria-hidden="true"
        />
        <span>{{ isRunning ? '계산 중…' : '대사 실행' }}</span>
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { LoaderCircle, Play } from 'lucide-vue-next'
import type { ReconcileOptions as ReconcileOptionValues } from '~/types/reconcile'

type Props = {
  canRun: boolean
  isRunning: boolean
}

defineProps<Props>()
const emit = defineEmits<{
  run: []
}>()
const model = defineModel<ReconcileOptionValues>({ required: true })

const bizNoText = ref<string>('')
const isBizNoInvalid = computed<boolean>(() => bizNoText.value.trim() !== '' && normalizeBizNo(bizNoText.value) === null)

// 입력이 유효한 10자리일 때만 옵션에 반영한다 (비우면 추정 모드)
watch(bizNoText, (text) => {
  model.value = { ...model.value, ourBizNo: normalizeBizNo(text) }
})

const readNumber = (event: Event, min: number, max: number): number | null => {
  const input = event.target
  if (!(input instanceof HTMLInputElement) || input.value === '') return null
  return Math.min(max, Math.max(min, Math.round(Number(input.value))))
}

const handleWindow = (event: Event): void => {
  const value = readNumber(event, 0, 31)
  if (value !== null) model.value = { ...model.value, dateWindowDays: value }
}

const handleTolerance = (event: Event): void => {
  const value = readNumber(event, 0, 1000)
  if (value !== null) model.value = { ...model.value, amountTolerance: value }
}

const handleExclude = (event: Event): void => {
  const input = event.target
  if (!(input instanceof HTMLInputElement)) return
  model.value = { ...model.value, excludeKeywords: input.checked ? [...DEFAULT_EXCLUDE_KEYWORDS] : [] }
}
</script>

<style scoped lang="scss">
.options {
  @include card-surface;

  display: grid;
  gap: $space-4;
  padding: $space-5;

  &__grid {
    display: grid;
    gap: $space-4;

    @include respond-to(md) {
      grid-template-columns: 1.2fr 1fr 0.8fr;
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

  &__value {
    font-variant-numeric: tabular-nums;
  }

  &__input {
    padding: $space-2 $space-3;
    border: 1px solid var(--tk-border);
    border-radius: $radius-md;
    background: var(--tk-card);
    font: inherit;
    transition: border-color $duration-fast $ease-out-quint;

    @include focus-ring;

    &--num {
      font-variant-numeric: tabular-nums;
      text-align: right;
    }

    &[aria-invalid='true'] {
      border-color: var(--tk-danger);
    }

    @include reduced-motion {
      transition: none;
    }
  }

  &__range {
    width: 100%;
    accent-color: var(--tk-accent);

    @include focus-ring;
  }

  &__hint {
    color: var(--tk-muted);
    font-size: $font-xs;

    &.is-error {
      color: var(--tk-danger);
    }
  }

  &__footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: $space-3;
  }

  &__check {
    display: inline-flex;
    align-items: center;
    gap: $space-2;
    font-size: $font-sm;
    cursor: pointer;

    input {
      accent-color: var(--tk-accent);
    }
  }

  &__run {
    display: inline-flex;
    align-items: center;
    gap: $space-2;
    padding: $space-2 $space-5;
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

  &__run-icon {
    width: 1rem;
    height: 1rem;

    &.is-spinning {
      animation: spin 0.9s linear infinite;

      @include reduced-motion {
        animation: none;
      }
    }
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
