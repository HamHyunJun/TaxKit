<template>
  <div class="partner-list">
    <div class="partner-list__search">
      <label
        for="partner-search"
        class="partner-list__label"
      >거래처 검색</label>
      <div class="partner-list__field">
        <Search
          class="partner-list__search-icon"
          aria-hidden="true"
        />
        <input
          id="partner-search"
          v-model="search"
          class="partner-list__input"
          type="search"
          autocomplete="off"
          placeholder="상호 또는 사업자번호"
        >
      </div>
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
          <span
            class="partner-list__avatar"
            aria-hidden="true"
          >{{ group.name.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 1) }}</span>
          <span class="partner-list__text">
            <span class="partner-list__name">{{ group.name }}</span>
            <span class="partner-list__meta">
              <span v-if="group.bizNo">{{ formatBizNo(group.bizNo) }}, </span>{{ group.count.toLocaleString('ko-KR') }}건,
              <span class="partner-list__total">{{ formatWon(group.total) }}원</span>
            </span>
          </span>
          <span
            v-if="copiedSet.has(group.key)"
            class="partner-list__badge"
          >
            <Check
              class="partner-list__badge-icon"
              aria-hidden="true"
            />복사됨
          </span>
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { Check, Search } from 'lucide-vue-next'
import type { PartnerGroup } from '~/types/message'

type Props = {
  groups: readonly PartnerGroup[]
  activeKey: string | null
  copiedKeys: readonly string[]
}

const props = defineProps<Props>()
const search = defineModel<string>('search', { required: true })

// 복사한 거래처 확인을 목록 렌더링마다 배열 검색하지 않도록 Set으로 한 번만 만든다
const copiedSet = computed<ReadonlySet<string>>(() => new Set(props.copiedKeys))
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
    gap: $space-1-5;
  }

  &__label {
    color: var(--tk-text-strong);
    font-size: $font-sm;
    font-weight: 600;
  }

  &__field {
    position: relative;
  }

  &__search-icon {
    position: absolute;
    top: 50%;
    left: $space-3;
    width: 1rem;
    height: 1rem;
    color: var(--tk-subtle);
    transform: translateY(-50%);
    pointer-events: none;
  }

  &__input {
    padding-left: 2.25rem;
  }

  &__empty {
    padding: $space-8 $space-2;
    color: var(--tk-muted);
    font-size: $font-sm;
    text-align: center;
  }

  &__items {
    display: grid;
    gap: $space-2;
    max-height: 32rem;
    margin: 0;
    padding: 0 $space-1 0 0;
    overflow-y: auto;
    list-style: none;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: $space-3;
    width: 100%;
    padding: $space-3;
    border: 1px solid var(--tk-border);
    border-radius: $radius-lg;
    background: var(--tk-card);
    text-align: left;
    transition:
      transform $duration-fast $ease-out-quint,
      border-color $duration-medium $ease-out-quint,
      background-color $duration-medium $ease-out-quint,
      box-shadow $duration-medium $ease-out-quint;

    @include focus-ring;

    &:hover {
      border-color: var(--tk-subtle);
      box-shadow: var(--tk-shadow-sm);
    }

    &:active {
      transform: scale(0.985);
    }

    &.is-active {
      border-color: var(--tk-accent-text);
      background: var(--tk-accent-soft);
      box-shadow: 0 0 0 1px var(--tk-accent-text);
    }

    @include reduced-motion {
      transition: none;
    }
  }

  &__avatar {
    display: inline-grid;
    flex: none;
    place-content: center;
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 50%;
    background: var(--tk-surface-strong);
    color: $color-slate-600;
    font-size: $font-sm;
    font-weight: 700;
  }

  &__item.is-active &__avatar {
    background: var(--tk-accent-text);
    color: $color-white;
  }

  &__text {
    display: grid;
    flex: 1;
    gap: $space-0-5;
    min-width: 0;
  }

  &__name {
    color: var(--tk-text-strong);
    font-weight: 600;
    overflow-wrap: anywhere;
    word-break: keep-all;
  }

  &__meta {
    color: var(--tk-muted);
    font-size: $font-xs;
  }

  &__total {
    font-variant-numeric: tabular-nums;
  }

  &__badge {
    display: inline-flex;
    flex: none;
    align-items: center;
    gap: $space-1;
    padding: $space-0-5 $space-2;
    border-radius: $radius-full;
    background: var(--tk-accent-soft);
    color: var(--tk-accent-text);
    font-size: $font-xs;
    font-weight: 700;
    white-space: nowrap;
  }

  &__item.is-active &__badge {
    background: $color-white;
  }

  &__badge-icon {
    width: 0.75rem;
    height: 0.75rem;
  }
}
</style>
