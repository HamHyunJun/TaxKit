<template>
  <button
    type="button"
    class="tk-btn copy-button"
    :class="{ 'is-copied': isCopied, 'tk-btn--primary': prominent, 'tk-btn--sm': !prominent }"
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
  prominent?: boolean // 미리보기 옆처럼 주 동작일 때 크고 진하게
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
  &__icon {
    width: 0.9375rem;
    height: 0.9375rem;
  }

  &.is-copied,
  &.is-copied:hover:not(:disabled) {
    border-color: var(--tk-accent);
    background: var(--tk-accent-soft);
    color: var(--tk-accent-strong);
  }

  &.is-copied &__icon {
    animation: spring-pop $duration-slow $spring;
  }

  @include reduced-motion {
    &.is-copied &__icon {
      animation: none;
    }
  }
}
</style>
