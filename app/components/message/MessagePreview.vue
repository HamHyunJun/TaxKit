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
          <div class="preview__heading">
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
            prominent
            @copied="emit('copied', group)"
          />
        </header>

        <div
          class="preview__stage"
          :class="`preview__stage--${channel}`"
        >
          <div
            class="preview__bubble"
            :class="`preview__bubble--${channel}`"
            role="region"
            tabindex="0"
            :aria-label="`${group.name} 안내 문구 미리보기`"
          >
            {{ text }}
          </div>
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
      <div
        v-else
        key="empty"
        class="preview__empty"
      >
        <p>왼쪽에서 거래처를 선택하면 안내 문구가 여기에 나타나요.</p>
      </div>
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

    @include respond-to(md) {
      padding: $space-6;
    }
  }

  &__head {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: $space-3;
  }

  &__heading {
    display: grid;
    gap: 0.125rem;
    min-width: 0;
  }

  &__title {
    font-size: $font-xl;
    font-weight: 700;
    overflow-wrap: anywhere;
    word-break: keep-all;
  }

  &__sub {
    color: var(--tk-muted);
    font-size: $font-sm;
    font-variant-numeric: tabular-nums;
  }

  // 채팅 화면처럼 보이도록 말풍선을 옅은 배경 위에 놓는다
  &__stage {
    padding: $space-5;
    border-radius: $radius-lg;
    background: var(--tk-surface-strong);

    &--kakao {
      background: #{tint($color-sky-700, 0.08)};
    }
  }

  &__bubble {
    position: relative;
    max-width: 34rem;
    padding: $space-4 $space-5;
    border-radius: 0.25rem $radius-xl $radius-xl $radius-xl;
    background: $color-white;
    color: var(--tk-text-strong);
    font-size: $font-sm;
    line-height: 1.75;
    box-shadow: var(--tk-shadow-sm);
    white-space: pre-wrap;
    word-break: keep-all;
    overflow-wrap: anywhere;

    @include focus-ring;

    &--kakao {
      background: $color-kakao-bubble;
      color: $color-kakao-text;
    }

    &--sms {
      background: $color-slate-200;
    }
  }

  &__stat {
    color: var(--tk-muted);
    font-size: $font-xs;
    font-variant-numeric: tabular-nums;

    &.is-over {
      color: var(--tk-danger-text);
      font-weight: 700;
    }
  }

  &__empty {
    @include card-surface;

    padding: $space-12 $space-4;
    color: var(--tk-muted);
    font-size: $font-sm;
    text-align: center;
  }
}

.preview-enter-active,
.preview-leave-active {
  transition:
    opacity 140ms $ease-out-quint,
    transform 140ms $ease-out-quint;

  @include reduced-motion {
    transition: none;
  }
}

.preview-enter-from,
.preview-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>
