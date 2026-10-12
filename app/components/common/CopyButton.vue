<template>
  <button
    type="button"
    class="copy-button"
    :class="{ 'is-copied': isCopied }"
    :aria-label="`${label} ${isCopied ? '복사됨' : '복사'}`"
    @click="handleClick"
  >
    <component
      :is="isCopied ? Check : Copy"
      class="copy-button__icon"
      aria-hidden="true"
    />
    <span>{{ isCopied ? '복사됨' : '복사' }}</span>
  </button>
</template>

<script setup lang="ts">
import { Check, Copy } from 'lucide-vue-next'

type Props = {
  label: string
  text: string
}

const COPIED_RESET_MS = 2000

const props = defineProps<Props>()
const emit = defineEmits<{
  copied: [label: string]
}>()

const { copyText } = useClipboard()
const { showToast } = useToast()
const isCopied = ref<boolean>(false)
let resetTimer: ReturnType<typeof setTimeout> | undefined

// 클립보드 복사 후 아이콘을 체크로 바꾸고 부모에 알린다
const handleClick = async (): Promise<void> => {
  const ok = await copyText(props.text)
  if (!ok) {
    showToast('복사하지 못했어요. 문구를 직접 선택해 Ctrl+C로 복사해 주세요')
    return
  }
  isCopied.value = true
  emit('copied', props.label)
  clearTimeout(resetTimer)
  resetTimer = setTimeout(() => {
    isCopied.value = false
  }, COPIED_RESET_MS)
}

onBeforeUnmount(() => clearTimeout(resetTimer))
</script>

<style scoped lang="scss">
.copy-button {
  display: inline-flex;
  align-items: center;
  gap: $space-1-5;
  padding: $space-1-5 $space-3;
  border: 1px solid var(--tk-border);
  border-radius: $radius-md;
  background: var(--tk-card);
  font-size: $font-sm;
  font-weight: 500;
  color: var(--tk-text);
  transition: transform $duration-fast $ease-out-quint;

  @include focus-ring;

  &:active {
    transform: scale(0.96);
  }

  &__icon {
    width: 1rem;
    height: 1rem;
  }

  &.is-copied &__icon {
    color: var(--tk-accent-hover);
    animation: spring-pop $duration-slow $spring;
  }

  @include reduced-motion {
    transition: none;

    &.is-copied &__icon {
      animation: none;
    }
  }
}
</style>
