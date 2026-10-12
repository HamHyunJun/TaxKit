<template>
  <div class="partner-list">
    <div class="partner-list__search">
      <label
        for="partner-search"
        class="partner-list__label"
      >거래처 검색</label>
      <input
        id="partner-search"
        v-model="search"
        class="partner-list__input"
        type="search"
        autocomplete="off"
        placeholder="상호 또는 사업자번호"
      >
    </div>

    <p
      v-if="groups.length === 0"
      class="partner-list__empty"
    >
      검색 결과가 없어요.
    </p>
    <ul
      v-else
      class="partner-list__items"
    >
      <li
        v-for="group in groups"
        :key="group.key"
      >
        <button
          type="button"
          class="partner-list__item"
          :class="{ 'is-active': group.key === activeKey }"
          :aria-current="group.key === activeKey ? 'true' : undefined"
          @click="emit('select', group.key)"
        >
          <span class="partner-list__name">{{ group.name }}</span>
          <span
            v-if="copiedKeys.includes(group.key)"
            class="partner-list__badge"
          >
            <Check
              class="partner-list__badge-icon"
              aria-hidden="true"
            />복사됨
          </span>
          <span class="partner-list__meta">
            <span v-if="group.bizNo">{{ formatBizNo(group.bizNo) }} · </span>{{ group.count.toLocaleString('ko-KR') }}건 ·
            <span class="num">{{ formatWon(group.total) }}원</span>
          </span>
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { Check } from 'lucide-vue-next'
import type { PartnerGroup } from '~/types/message'

type Props = {
  groups: readonly PartnerGroup[]
  activeKey: string | null
  copiedKeys: readonly string[]
}

defineProps<Props>()
const search = defineModel<string>('search', { required: true })
const emit = defineEmits<{
  select: [key: string]
}>()
</script>

<style scoped lang="scss">
.partner-list {
  display: grid;
  gap: $space-3;

  &__search {
    display: grid;
    gap: $space-1;
  }

  &__label {
    font-size: $font-sm;
    font-weight: 600;
  }

  &__input {
    padding: $space-2 $space-3;
    border: 1px solid var(--tk-border);
    border-radius: $radius-md;
    background: var(--tk-card);
    font: inherit;

    @include focus-ring;
  }

  &__empty {
    padding: $space-6 $space-2;
    color: var(--tk-muted);
    font-size: $font-sm;
    text-align: center;
  }

  &__items {
    display: grid;
    gap: $space-2;
    max-height: 32rem;
    padding: 0;
    overflow-y: auto;
    list-style: none;
  }

  &__item {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: $space-1 $space-2;
    width: 100%;
    padding: $space-3;
    border: 1px solid var(--tk-border);
    border-radius: $radius-md;
    background: var(--tk-card);
    text-align: left;
    transition:
      transform $duration-fast $ease-out-quint,
      border-color $duration-fast $ease-out-quint,
      box-shadow $duration-fast $ease-out-quint;

    @include focus-ring;

    &:hover {
      border-color: var(--tk-muted);
    }

    &:active {
      transform: scale(0.98);
    }

    &.is-active {
      border-color: var(--tk-accent);
      box-shadow: 0 0 0 1px var(--tk-accent);
    }

    @include reduced-motion {
      transition: none;
    }
  }

  &__name {
    font-weight: 600;
    word-break: break-all;
  }

  &__badge {
    display: inline-flex;
    align-items: center;
    gap: $space-1;
    padding: 0 $space-2;
    border-radius: $radius-full;
    background: tint($color-emerald-500, 0.14);
    color: $color-emerald-700;
    font-size: $font-xs;
    font-weight: 600;
    white-space: nowrap;
  }

  &__badge-icon {
    width: 0.75rem;
    height: 0.75rem;
  }

  &__meta {
    grid-column: 1 / -1;
    color: var(--tk-muted);
    font-size: $font-xs;

    .num {
      text-align: left;
    }
  }
}
</style>
