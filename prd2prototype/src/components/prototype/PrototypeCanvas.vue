<template>
  <div ref="viewportRef" class="prototype-canvas__viewport">
    <div
      v-if="renderPage"
      class="prototype-canvas__surface"
      :style="surfaceStyle"
    >
      <template v-if="previewMode === 'svg'">
        <svg :width="pageWidth" :height="pageHeight" class="prototype-canvas__svg">
          <g v-for="block in flattenedBlocks" :key="block.id">
            <rect
              :x="block.frame.x"
              :y="block.frame.y"
              :width="block.frame.width"
              :height="block.frame.height"
              :class="['prototype-canvas__svg-block', `kind-${block.kind}`]"
              rx="8"
            />
            <text
              v-if="showLabels"
              :x="block.frame.x + 10"
              :y="block.frame.y + 22"
              class="prototype-canvas__svg-label"
            >
              {{ resolveLabel(block) }}
            </text>
          </g>
        </svg>
      </template>

      <template v-else>
        <article
          v-for="block in renderPage.blocks"
          :key="block.id"
          class="prototype-canvas__block"
          :class="[`kind-${block.kind}`]"
          :style="blockStyle(block.frame)"
        >
          <header v-if="showLabels" class="prototype-canvas__label">{{ resolveLabel(block) }}</header>
          <article
            v-for="child in block.children"
            :key="child.id"
            class="prototype-canvas__block prototype-canvas__block--child"
            :class="[`kind-${child.kind}`]"
            :style="blockStyle(child.frame)"
          >
            <header v-if="showLabels" class="prototype-canvas__label">{{ resolveLabel(child) }}</header>
          </article>
        </article>
      </template>
    </div>

    <el-empty v-else description="No prototype pages available yet. Parse a PRD first." />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type { RenderBlock, RenderPage } from '../../types/layout';

const props = withDefaults(
  defineProps<{
    renderPage: RenderPage | null;
    zoom: number;
    fitWidth: boolean;
    showLabels: boolean;
    previewMode: 'html' | 'svg';
  }>(),
  {
    renderPage: null,
  },
);

const viewportRef = ref<HTMLElement | null>(null);
const viewportWidth = ref(0);
let resizeObserver: ResizeObserver | null = null;

const flattenedBlocks = computed<RenderBlock[]>(() => {
  if (!props.renderPage) {
    return [];
  }

  const queue = [...props.renderPage.blocks];
  const result: RenderBlock[] = [];

  while (queue.length > 0) {
    const block = queue.shift();

    if (!block) {
      continue;
    }

    result.push(block);
    queue.push(...block.children);
  }

  return result;
});

const pageWidth = computed(() => {
  const metadataWidth = props.renderPage?.page.metadata?.pageWidth;
  return typeof metadataWidth === 'number' ? metadataWidth : 1440;
});

const pageHeight = computed(() => {
  if (!props.renderPage) {
    return 720;
  }

  const maxBottom = flattenedBlocks.value.reduce((maxValue, block) => {
    const bottom = block.frame.y + block.frame.height;
    return Math.max(maxValue, bottom);
  }, 0);

  return Math.max(maxBottom + 40, 720);
});

const effectiveZoom = computed(() => {
  if (!props.fitWidth || viewportWidth.value <= 0) {
    return props.zoom;
  }

  const candidate = viewportWidth.value / pageWidth.value;
  return Math.min(2, Math.max(0.3, candidate));
});

const surfaceStyle = computed(() => ({
  width: `${pageWidth.value}px`,
  height: `${pageHeight.value}px`,
  transform: `scale(${effectiveZoom.value})`,
}));

function blockStyle(frame: RenderBlock['frame']): Record<string, string> {
  return {
    left: `${frame.x}px`,
    top: `${frame.y}px`,
    width: `${frame.width}px`,
    minHeight: `${frame.height}px`,
  };
}

function resolveLabel(block: RenderBlock): string {
  if (block.module?.title) {
    return block.module.title;
  }

  if (block.component?.label) {
    return block.component.label;
  }

  return block.module?.type ?? block.component?.type ?? block.kind;
}

function measureViewportWidth(): void {
  if (!viewportRef.value) {
    viewportWidth.value = 0;
    return;
  }

  viewportWidth.value = viewportRef.value.clientWidth - 48;
}

onMounted(() => {
  measureViewportWidth();

  if (!viewportRef.value) {
    return;
  }

  resizeObserver = new ResizeObserver(() => {
    measureViewportWidth();
  });

  resizeObserver.observe(viewportRef.value);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
});
</script>

<style scoped>
.prototype-canvas__viewport {
  overflow: auto;
  height: 100%;
  padding: 24px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 10px;
  background: #f5f7fa;
}

.prototype-canvas__surface {
  position: relative;
  margin: 0 auto;
  transform-origin: top center;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 16px 40px rgb(15 23 42 / 10%);
}

.prototype-canvas__svg {
  display: block;
}

.prototype-canvas__svg-block {
  fill: #f8fafc;
  stroke: #cbd5e1;
  stroke-width: 1;
}

.prototype-canvas__svg-block.kind-component {
  fill: #eef2ff;
}

.prototype-canvas__svg-label {
  font-size: 12px;
  fill: #334155;
}

.prototype-canvas__block {
  position: absolute;
  border-radius: 10px;
  border: 1px solid #dbeafe;
  background: #eff6ff;
}

.prototype-canvas__block.kind-component {
  background: #fff7ed;
  border-color: #fed7aa;
}

.prototype-canvas__block--child {
  background: rgb(255 255 255 / 75%);
  border-style: dashed;
}

.prototype-canvas__label {
  display: inline-flex;
  margin: 8px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgb(15 23 42 / 8%);
  color: #334155;
  font-size: 12px;
  line-height: 18px;
}
</style>
