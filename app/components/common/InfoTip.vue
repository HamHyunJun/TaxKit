<template>
  <span class="info-tip">
    <button
      ref="buttonRef"
      type="button"
      class="info-tip__button"
      :class="{ 'is-open': isOpen }"
      :aria-label="`${help.title} 설명 ${isOpen ? '닫기' : '보기'}`"
      :aria-expanded="isOpen"
      :aria-controls="isOpen ? bubbleId : undefined"
      @click="toggle"
    >
      <Info
        class="info-tip__icon"
        aria-hidden="true"
      />
    </button>
    <Teleport to="body">
      <Transition name="tip">
        <div
          v-if="isOpen"
          :id="bubbleId"
          ref="bubbleRef"
          class="info-tip__bubble"
          :class="`is-${placement}`"
          :style="bubbleStyle"
          role="region"
          tabindex="-1"
          :aria-label="`${help.title} 설명`"
          @focusout="handleFocusOut"
        >
          <span
            class="info-tip__arrow"
            :style="arrowStyle"
            aria-hidden="true"
          />
          <p class="info-tip__title">{{ help.title }}</p>
          <dl class="info-tip__list">
            <div class="info-tip__item">
              <dt>하는 일</dt>
              <dd>{{ help.what }}</dd>
            </div>
            <div class="info-tip__item">
              <dt>왜 필요한가요?</dt>
              <dd>{{ help.why }}</dd>
            </div>
          </dl>
        </div>
      </Transition>
    </Teleport>
  </span>
</template>

<script setup lang="ts">
import { Info } from 'lucide-vue-next'
import type { HelpEntry, HelpTopic } from '~/types/help'

type Props = {
  topic?: HelpTopic // 공용 도움말 문구의 키
  entry?: HelpEntry // 키 대신 직접 문구를 넘길 때 (예: 검사 규칙별 설명)
}

const BUBBLE_WIDTH = 336
const VIEWPORT_GAP = 12
const ANCHOR_GAP = 10

const { topic, entry } = defineProps<Props>()

// topic도 entry도 없으면 빈 설명이 보이지 않도록 제목만 비운 기본값을 쓴다
const help = computed<HelpEntry>(() => entry ?? (topic ? HELP[topic] : { title: '', what: '', why: '' }))

const bubbleId = `info-tip-${useId()}`
const isOpen = ref<boolean>(false)
const buttonRef = ref<HTMLButtonElement | null>(null)
const bubbleRef = ref<HTMLElement | null>(null)
const placement = ref<'bottom' | 'top'>('bottom')
const position = ref<{ left: number, top: number, width: number, arrowX: number }>({ left: 0, top: 0, width: BUBBLE_WIDTH, arrowX: 0 })

const bubbleStyle = computed<{ left: string, top: string, width: string }>(() => ({
  left: `${position.value.left}px`,
  top: `${position.value.top}px`,
  width: `${position.value.width}px`,
}))
const arrowStyle = computed<{ left: string }>(() => ({ left: `${position.value.arrowX}px` }))

// 아이콘 옆(기본은 아래, 공간이 없으면 위)에 말풍선을 놓고 화면 밖으로 나가지 않게 맞춘다.
// 표의 스크롤 영역에 잘리지 않도록 body로 옮겨 fixed로 배치한다
const reposition = (): void => {
  const button = buttonRef.value
  if (!button) return
  const rect = button.getBoundingClientRect()
  const width = Math.min(BUBBLE_WIDTH, window.innerWidth - VIEWPORT_GAP * 2)
  const center = rect.left + rect.width / 2
  const left = Math.min(Math.max(center - width / 2, VIEWPORT_GAP), window.innerWidth - width - VIEWPORT_GAP)
  const height = bubbleRef.value?.offsetHeight ?? 0
  const fitsBelow = rect.bottom + ANCHOR_GAP + height <= window.innerHeight - VIEWPORT_GAP
  placement.value = fitsBelow || rect.top - ANCHOR_GAP - height < VIEWPORT_GAP ? 'bottom' : 'top'
  const top = placement.value === 'bottom' ? rect.bottom + ANCHOR_GAP : rect.top - ANCHOR_GAP - height
  position.value = { left, top, width, arrowX: Math.min(Math.max(center - left, 20), width - 20) }
}

const close = (): void => {
  isOpen.value = false
}

// 말풍선은 body 끝에 있어서, 포커스가 안에 있는 채로 닫히면 읽던 위치를 잃는다. 닫기 전에 버튼으로 돌려준다
const closeAndRestoreFocus = (): void => {
  if (bubbleRef.value?.contains(document.activeElement)) buttonRef.value?.focus({ preventScroll: true })
  close()
}

// 스크롤·창 크기 변경 중에는 프레임마다 한 번만 위치를 다시 잡는다. 아이콘이 화면 밖으로 나가면 닫는다
let frame = 0
const follow = (): void => {
  if (!isOpen.value || frame) return
  frame = requestAnimationFrame(() => {
    frame = 0
    const rect = buttonRef.value?.getBoundingClientRect()
    if (!rect || rect.bottom < 0 || rect.top > window.innerHeight) return closeAndRestoreFocus()
    reposition()
  })
}

const toggle = async (): Promise<void> => {
  if (isOpen.value) return close()
  isOpen.value = true
  reposition()
  await nextTick() // 말풍선 높이를 잰 뒤 위/아래를 다시 정한다
  reposition()
  // 화면 낭독기와 키보드 사용자가 열린 설명을 바로 읽을 수 있도록 포커스를 말풍선으로 옮긴다
  bubbleRef.value?.focus({ preventScroll: true })
}

// 포커스가 말풍선 밖으로 나가면(Tab 등) 닫는다
const handleFocusOut = (event: FocusEvent): void => {
  const next = event.relatedTarget
  if (next instanceof Node && (bubbleRef.value?.contains(next) || buttonRef.value?.contains(next))) return
  close()
}

const handlePointerDown = (event: PointerEvent): void => {
  if (!isOpen.value || !(event.target instanceof Node)) return
  if (buttonRef.value?.contains(event.target) || bubbleRef.value?.contains(event.target)) return
  close()
}

const handleKeydown = (event: KeyboardEvent): void => {
  if (!isOpen.value) return
  if (event.key === 'Escape') {
    close()
    buttonRef.value?.focus()
    return
  }
  // Tab은 버튼으로 돌려놓고 기본 동작에 맡겨 버튼 앞뒤 요소로 자연스럽게 이동한다
  if (event.key === 'Tab' && bubbleRef.value?.contains(document.activeElement)) closeAndRestoreFocus()
}

// 전역 리스너는 말풍선이 열려 있는 동안에만 둔다 (아이콘이 수십 개여도 평소에는 비용이 없다)
const attach = (): void => {
  document.addEventListener('pointerdown', handlePointerDown)
  document.addEventListener('keydown', handleKeydown)
  window.addEventListener('resize', follow)
  window.addEventListener('scroll', follow, { capture: true, passive: true })
}
const detach = (): void => {
  document.removeEventListener('pointerdown', handlePointerDown)
  document.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', follow)
  window.removeEventListener('scroll', follow, { capture: true })
  cancelAnimationFrame(frame)
  frame = 0
}

watch(isOpen, (open) => {
  if (open) attach()
  else detach()
})
onBeforeUnmount(detach)
</script>

<style scoped lang="scss">
.info-tip {
  display: inline-flex;
  vertical-align: middle;

  &__button {
    display: inline-grid;
    place-content: center;
    width: 1.375rem;
    height: 1.375rem;
    border-radius: $radius-full;
    color: var(--tk-subtle);
    transition:
      color $duration-fast $ease-out-quint,
      background-color $duration-fast $ease-out-quint,
      transform $duration-fast $ease-out-quint;

    @include focus-ring;

    &:hover,
    &.is-open {
      background: var(--tk-accent-soft);
      color: var(--tk-accent-text);
    }

    &:active {
      transform: scale(0.88);
    }

    @include reduced-motion {
      transition: none;
    }
  }

  &__icon {
    width: 1rem;
    height: 1rem;
  }

  &__bubble {
    position: fixed;
    z-index: 300;
    padding: $space-4 $space-4 $space-3;
    border: 1px solid var(--tk-border);
    border-radius: $radius-lg;
    background: var(--tk-card);
    color: var(--tk-text);
    box-shadow: var(--tk-shadow-pop);

    &.is-bottom {
      transform-origin: top center;
    }

    &.is-top {
      transform-origin: bottom center;
    }

    // 마우스로 열었을 때는 링이 보이지 않고, 키보드로 열었을 때만 보인다
    &:focus {
      outline: none;
    }

    &:focus-visible {
      box-shadow: var(--tk-shadow-pop), var(--tk-focus-ring);
    }
  }

  &__arrow {
    position: absolute;
    width: 0.75rem;
    height: 0.75rem;
    margin-left: -$space-1-5;
    border: 1px solid var(--tk-border);
    background: var(--tk-card);
  }

  &__bubble.is-bottom &__arrow {
    top: -0.4375rem;
    border-right: 0;
    border-bottom: 0;
    border-radius: $radius-sm 0 0;
    transform: rotate(45deg);
  }

  &__bubble.is-top &__arrow {
    bottom: -0.4375rem;
    border-top: 0;
    border-left: 0;
    border-radius: 0 0 $radius-sm;
    transform: rotate(45deg);
  }

  &__title {
    margin-bottom: $space-3;
    color: var(--tk-text-strong);
    font-size: $font-sm;
    font-weight: 700;
    letter-spacing: $tracking-tight;
  }

  &__list {
    display: grid;
    gap: $space-3;
    margin: 0;
  }

  &__item {
    display: grid;
    gap: $space-1;

    dt {
      color: var(--tk-accent-text);
      font-size: $font-xs;
      font-weight: 700;
      letter-spacing: $tracking-wide;
    }

    dd {
      margin: 0;
      font-size: $font-sm;
      line-height: 1.6;
      word-break: keep-all;
    }
  }
}

.tip-enter-active,
.tip-leave-active {
  transition:
    opacity $duration-medium $ease-out-quint,
    transform $duration-medium $ease-out-quint;

  @include reduced-motion {
    transition: none;
  }
}

.tip-enter-from,
.tip-leave-to {
  opacity: 0;
  transform: scale(0.97);
}
</style>
