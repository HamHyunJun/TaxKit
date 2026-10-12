<template>
  <div class="tabs-page">
    <TabNav v-model="activeTab" />
    <main
      id="main"
      class="tabs-page__main"
    >
      <div
        :id="`panel-${activeTab}`"
        class="tabs-page__panel"
        role="tabpanel"
        :aria-labelledby="`tab-${activeTab}`"
      >
        <Transition
          name="panel"
          mode="out-in"
        >
          <KeepAlive>
            <component
              :is="PANELS[activeTab]"
              :key="activeTab"
            />
          </KeepAlive>
        </Transition>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import MessagePanel from '~/components/message/MessagePanel.vue'
import ReconcilePanel from '~/components/reconcile/ReconcilePanel.vue'
import ScannerPanel from '~/components/scanner/ScannerPanel.vue'
import type { TabId } from '~/types/tab'

// 탭을 오가도 업로드한 데이터가 사라지지 않도록 KeepAlive로 패널 상태를 유지한다
const PANELS: Record<TabId, Component> = {
  reconcile: ReconcilePanel,
  scanner: ScannerPanel,
  message: MessagePanel,
}

const route = useRoute()
const router = useRouter()

// 현재 탭은 ?tab= 쿼리로 유지한다. 잘못된 값은 기본 탭으로 처리한다
const activeTab = computed<TabId>({
  get: () => (isTabId(route.query.tab) ? route.query.tab : DEFAULT_TAB),
  set: (tab) => {
    router.replace({ query: { ...route.query, tab } })
  },
})
</script>

<style scoped lang="scss">
.tabs-page {
  flex: 1;

  &__main {
    max-width: $container-max;
    margin: 0 auto;
    padding: $space-6 $space-4;

    @include respond-to(md) {
      padding: $space-8 $space-6;
    }
  }
}

.panel-enter-active,
.panel-leave-active {
  transition:
    opacity $duration-base $ease-out-quint,
    transform $duration-base $ease-out-quint;

  @include reduced-motion {
    transition: none;
  }
}

.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
