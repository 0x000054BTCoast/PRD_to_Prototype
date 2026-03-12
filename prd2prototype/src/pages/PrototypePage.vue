<template>
  <section class="prototype-page">
    <el-card shadow="never" class="prototype-page__sidebar">
      <template #header>
        <div class="prototype-page__section-title">Pages</div>
      </template>

      <el-tree
        v-if="pageTreeNodes.length"
        node-key="id"
        :data="pageTreeNodes"
        :props="treeProps"
        :expand-on-click-node="false"
        :default-expanded-keys="pageTreeNodes.map((node) => node.id)"
        :current-node-key="selectedPageId"
        highlight-current
        @node-click="onPageNodeClick"
      />
      <el-empty v-else description="No pages parsed yet." />
    </el-card>

    <section class="prototype-page__canvas-area">
      <PrototypeToolbar
        :zoom="zoom"
        :fit-width="fitWidth"
        :show-labels="showLabels"
        :preview-mode="previewMode"
        @zoom-in="zoomIn"
        @zoom-out="zoomOut"
        @update:fit-width="fitWidth = $event"
        @update:show-labels="showLabels = $event"
        @update:preview-mode="previewMode = $event"
        @regenerate="regenerateLayout"
      />

      <PrototypeCanvas
        :render-page="selectedRenderPage"
        :zoom="zoom"
        :fit-width="fitWidth"
        :show-labels="showLabels"
        :preview-mode="previewMode"
      />
    </section>

    <PropertyPanel
      :layout-mode="layoutMode"
      :preview-mode="previewMode"
      :selected-page="selectedPage"
      @update:layout-mode="layoutMode = $event"
      @update:preview-mode="previewMode = $event"
      @regenerate="regenerateLayout"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import PrototypeCanvas from '../components/prototype/PrototypeCanvas.vue';
import PrototypeToolbar from '../components/prototype/PrototypeToolbar.vue';
import PropertyPanel from '../components/prototype/PropertyPanel.vue';
import { appStore as store } from '../stores/appStore';
import { runParsingPipeline } from '../parser/pipeline';
import { generateRenderPages } from '../layout/layoutEngine';
import { DEFAULT_LAYOUT_DIMENSIONS } from '../constants/dimensions';
import type { LayoutDimensions } from '../constants/dimensions';

interface PageTreeNode {
  id: string;
  label: string;
}

const treeProps = {
  label: 'label',
};

const zoom = ref(1);
const fitWidth = ref(true);
const showLabels = ref(true);
const previewMode = ref<'html' | 'svg'>('html');
const layoutMode = ref<'compact' | 'balanced' | 'comfortable'>('balanced');
const regenerationCount = ref(0);
const selectedPageId = ref<string | null>(null);

const pipelineResult = computed(() => runParsingPipeline(store.sourceText));
const parsedDocument = computed(() => pipelineResult.value.document);

const pageTreeNodes = computed<PageTreeNode[]>(() => {
  const pages = parsedDocument.value?.pages ?? [];

  return pages.map((page) => ({
    id: page.id,
    label: `${page.name} (${page.type})`,
  }));
});

const renderPages = computed(() => {
  const document = parsedDocument.value;

  if (!document) {
    return [];
  }

  regenerationCount.value;

  return generateRenderPages(document, getLayoutDimensions(layoutMode.value));
});

const selectedPage = computed(() => {
  const pages = parsedDocument.value?.pages ?? [];
  return pages.find((page) => page.id === selectedPageId.value) ?? pages[0] ?? null;
});

const selectedRenderPage = computed(() => {
  if (!selectedPage.value) {
    return null;
  }

  return renderPages.value.find((page) => page.page.id === selectedPage.value?.id) ?? null;
});

watch(
  () => parsedDocument.value?.pages,
  (pages) => {
    if (!pages?.length) {
      selectedPageId.value = null;
      return;
    }

    if (!selectedPageId.value || !pages.some((page) => page.id === selectedPageId.value)) {
      selectedPageId.value = pages[0].id;
    }
  },
  { immediate: true },
);

function zoomIn(): void {
  zoom.value = Math.min(2, roundZoom(zoom.value + 0.1));
}

function zoomOut(): void {
  zoom.value = Math.max(0.4, roundZoom(zoom.value - 0.1));
}

function regenerateLayout(): void {
  regenerationCount.value += 1;
}

function roundZoom(value: number): number {
  return Math.round(value * 10) / 10;
}

function onPageNodeClick(node: PageTreeNode): void {
  selectedPageId.value = node.id;
}

function getLayoutDimensions(mode: 'compact' | 'balanced' | 'comfortable'): LayoutDimensions {
  if (mode === 'compact') {
    return {
      ...DEFAULT_LAYOUT_DIMENSIONS,
      moduleGap: 10,
      componentGap: 8,
    };
  }

  if (mode === 'comfortable') {
    return {
      ...DEFAULT_LAYOUT_DIMENSIONS,
      moduleGap: 24,
      componentGap: 18,
    };
  }

  return DEFAULT_LAYOUT_DIMENSIONS;
}
</script>

<style scoped>
.prototype-page {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr) 300px;
  gap: 12px;
  height: calc(100vh - 170px);
  min-height: 620px;
}

.prototype-page__sidebar {
  height: 100%;
  overflow: auto;
}

.prototype-page__canvas-area {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
}

.prototype-page__canvas-area :deep(.prototype-canvas__viewport) {
  flex: 1;
}

.prototype-page__section-title {
  font-weight: 600;
}

@media (max-width: 1360px) {
  .prototype-page {
    grid-template-columns: 1fr;
    height: auto;
  }
}
</style>
