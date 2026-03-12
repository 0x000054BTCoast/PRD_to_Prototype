<template>
  <el-card shadow="never" class="prototype-toolbar">
    <div class="prototype-toolbar__row">
      <el-button-group>
        <el-button @click="$emit('zoom-out')" :disabled="zoom <= minZoom">
          -
        </el-button>
        <el-button disabled>{{ Math.round(zoom * 100) }}%</el-button>
        <el-button @click="$emit('zoom-in')" :disabled="zoom >= maxZoom">
          +
        </el-button>
      </el-button-group>

      <el-switch
        :model-value="fitWidth"
        active-text="Fit width"
        @update:model-value="$emit('update:fitWidth', $event)"
      />

      <el-switch
        :model-value="showLabels"
        active-text="Labels"
        @update:model-value="$emit('update:showLabels', $event)"
      />

      <el-segmented
        :model-value="previewMode"
        :options="previewOptions"
        @change="$emit('update:previewMode', $event as 'html' | 'svg')"
      />

      <el-button type="primary" @click="$emit('regenerate')">Regenerate layout</el-button>
    </div>
  </el-card>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    zoom: number;
    minZoom?: number;
    maxZoom?: number;
    fitWidth: boolean;
    showLabels: boolean;
    previewMode: 'html' | 'svg';
  }>(),
  {
    minZoom: 0.4,
    maxZoom: 2,
  },
);

const previewOptions = [
  { label: 'HTML', value: 'html' },
  { label: 'SVG', value: 'svg' },
] as const;

defineEmits<{
  (event: 'zoom-in'): void;
  (event: 'zoom-out'): void;
  (event: 'regenerate'): void;
  (event: 'update:fitWidth', value: boolean): void;
  (event: 'update:showLabels', value: boolean): void;
  (event: 'update:previewMode', value: 'html' | 'svg'): void;
}>();
</script>

<style scoped>
.prototype-toolbar {
  margin-bottom: 12px;
}

.prototype-toolbar__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}
</style>
