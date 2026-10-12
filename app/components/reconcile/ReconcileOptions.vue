<template>
  <form
    class="options"
    @submit.prevent="emit('run')"
  >
    <div class="options__grid">
      <div class="options__field">
        <div class="options__label-row">
          <label
            for="options-biz-no"
            class="tk-label"
          >우리 회사 사업자번호</label>
          <InfoTip topic="ourBizNo" />
        </div>
        <input
          id="options-biz-no"
          v-model="bizNoText"
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
          class="tk-hint"
          :class="{ 'is-error': isBizNoInvalid }"
        >
          {{ isBizNoInvalid ? '숫자 10자리로 입력해 주세요' : '비워 두면 계산서에서 가장 많이 나오는 번호로 추정해요' }}
        </p>
      </div>

      <div class="options__field">
        <div class="options__label-row">
          <label
            for="options-window"
            class="tk-label"
          >날짜 윈도우</label>
          <InfoTip topic="dateWindow" />
          <output
            class="options__value"
            for="options-window"
          >±{{ model.dateWindowDays }}일</output>
        </div>
        <input
          id="options-window"
          type="range"
          min="0"
          max="31"
          step="1"
          :style="{ '--fill': windowFill }"
          :value="model.dateWindowDays"
          @input="handleWindow"
        >
        <p class="tk-hint">
          거래일과 계산서 작성일이 이 범위 안일 때만 짝 후보로 봐요
        </p>
      </div>

      <div class="options__field">
        <div class="options__label-row">
          <label
            for="options-tolerance"
            class="tk-label"
          >금액 허용오차</label>
          <InfoTip topic="amountTolerance" />
        </div>
        <div class="options__unit">
          <input
            id="options-tolerance"
            class="options__number"
            type="number"
            min="0"
            max="1000"
            step="1"
            :value="model.amountTolerance"
            @input="handleTolerance"
          >
          <span
            class="options__unit-label"
            aria-hidden="true"
          >원</span>
        </div>
        <p class="tk-hint">
          0원이면 금액이 정확히 같을 때만 일치로 봐요
        </p>
      </div>
    </div>

    <div class="options__footer">
      <span class="options__check">
        <label class="options__check-label">
          <input
            type="checkbox"
            :checked="model.excludeKeywords.length > 0"
            @change="handleExclude"
          >
          <span>이자·수수료·급여 등 자동 제외</span>
        </label>
        <InfoTip topic="autoExclude" />
      </span>
      <button
        type="submit"
        class="tk-btn tk-btn--primary options__run"
        :disabled="!canRun"
      >
        <component
          :is="isRunning ? LoaderCircle : Play"
          class="tk-btn__icon"
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
// 슬라이더 채움 비율(0~31일 → 0~100%)
const windowFill = computed<string>(() => `${(model.value.dateWindowDays / 31) * 100}%`)
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
  gap: $space-5;
  padding: $space-6;

  &__grid {
    display: grid;
    gap: $space-6;

    @include respond-to(md) {
      grid-template-columns: 1.2fr 1fr 0.8fr;
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

  &__value {
    margin-left: auto;
    padding: 0 $space-2;
    border-radius: $radius-full;
    background: var(--tk-accent-soft);
    color: var(--tk-accent-text);
    font-size: $font-xs;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  &__unit {
    position: relative;
  }

  &__number {
    padding-right: $space-8;
    text-align: right;
  }

  &__unit-label {
    position: absolute;
    top: 50%;
    right: $space-3;
    color: var(--tk-muted);
    font-size: $font-sm;
    transform: translateY(-50%);
    pointer-events: none;
  }

  .tk-hint.is-error {
    color: var(--tk-danger-text);
  }

  &__footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: $space-3;
    padding-top: $space-5;
    border-top: 1px solid var(--tk-border);
  }

  &__check {
    display: inline-flex;
    align-items: center;
    gap: $space-1;
  }

  &__check-label {
    display: inline-flex;
    align-items: center;
    gap: $space-2;
    font-size: $font-sm;
    font-weight: 500;
    cursor: pointer;
  }

  &__run {
    min-width: 8.5rem;
  }

  .is-spinning {
    animation: spin 0.9s linear infinite;

    @include reduced-motion {
      animation: none;
    }
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
