<template>
  <div class="preview">
    <Transition
      name="preview"
      mode="out-in"
    >
      <article
        v-if="group"
        :key="group.key"
        class="preview__card"
        aria-labelledby="preview-title"
      >
        <header class="preview__head">
          <div>
            <h2
              id="preview-title"
              class="preview__title"
            >
              {{ group.name }}
            </h2>
            <p class="preview__sub">
              <span v-if="group.bizNo">{{ formatBizNo(group.bizNo) }} · </span>누락 {{ group.count.toLocaleString('ko-KR') }}건 · {{ formatWon(group.total) }}원
            </p>
          </div>
          <CopyButton
            :label="`${group.name} 안내 문구`"
            :text="text"
            @copied="emit('copied', group)"
          />
        </header>

        <div
          class="preview__bubble"
          :class="`preview__bubble--${channel}`"
          tabindex="0"
          :aria-label="`${group.name} 안내 문구 미리보기`"
        >
          {{ text }}
        </div>

        <p
          class="preview__stat"
          :class="{ 'is-over': channel === 'sms' && kind === 'OVER' }"
        >
          <template v-if="channel === 'sms'">
            {{ bytes.toLocaleString('ko-KR') }}byte · {{ kind === 'OVER' ? '2,000byte 초과' : kind }}
          </template>
          <template v-else>
            {{ [...text].length.toLocaleString('ko-KR') }}자
          </template>
        </p>
      </article>
      <p
        v-else
        key="empty"
        class="preview__empty"
      >
        왼쪽에서 거래처를 선택하면 안내 문구가 여기에 나타나요.
      </p>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { MessageChannel, PartnerGroup } from '~/types/message'

type Props = {
  group: PartnerGroup | null
  text: string
  channel: MessageChannel
}

const { text } = defineProps<Props>()
const emit = defineEmits<{
  copied: [group: PartnerGroup]
}>()

const bytes = computed<number>(() => smsByteLength(text))
const kind = computed<'SMS' | 'LMS' | 'OVER'>(() => smsKind(bytes.value))
</script>

<style scoped lang="scss">
.preview {
  &__card {
    @include card-surface;

    display: grid;
    gap: $space-4;
    padding: $space-5;
  }

  &__head {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: $space-3;
  }

  &__title {
    font-size: $font-lg;
    word-break: break-all;
  }

  &__sub {
    color: var(--tk-muted);
    font-size: $font-sm;
  }

  &__bubble {
    padding: $space-4;
    border-radius: $radius-lg;
    background: tint($color-slate-500, 0.1);
    font-size: $font-sm;
    line-height: 1.7;
    white-space: pre-wrap;
    word-break: break-word;

    @include focus-ring;

    &--kakao {
      background: $color-kakao-bubble;
      color: $color-kakao-text;
    }
  }

  &__stat {
    color: var(--tk-muted);
    font-size: $font-xs;
    font-variant-numeric: tabular-nums;

    &.is-over {
      color: var(--tk-danger);
      font-weight: 600;
    }
  }

  &__empty {
    padding: $space-10 $space-4;
    color: var(--tk-muted);
    text-align: center;
  }
}

.preview-enter-active,
.preview-leave-active {
  transition:
    opacity $duration-fast $ease-out-quint,
    transform $duration-fast $ease-out-quint;

  @include reduced-motion {
    transition: none;
  }
}

.preview-enter-from,
.preview-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
