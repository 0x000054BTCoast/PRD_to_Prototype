<template>
  <el-card shadow="never" class="property-panel">
    <template #header>
      <div class="property-panel__header">Property panel</div>
    </template>

    <el-form label-position="top" size="small">
      <el-form-item label="Layout mode">
        <el-select
          :model-value="layoutMode"
          placeholder="Select layout mode"
          @update:model-value="$emit('update:layoutMode', $event)"
        >
          <el-option
            v-for="option in layoutModeOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="Preview mode">
        <el-radio-group
          :model-value="previewMode"
          @update:model-value="$emit('update:previewMode', $event)"
        >
          <el-radio-button label="html">HTML</el-radio-button>
          <el-radio-button label="svg">SVG</el-radio-button>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="Page summary">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="Name">{{ selectedPage?.name ?? '--' }}</el-descriptions-item>
          <el-descriptions-item label="Type">{{ selectedPage?.type ?? '--' }}</el-descriptions-item>
          <el-descriptions-item label="Modules">{{ selectedPage?.modules.length ?? 0 }}</el-descriptions-item>
        </el-descriptions>
      </el-form-item>

      <el-form-item>
        <el-button type="primary" plain @click="$emit('regenerate')">Regenerate layout</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import type { ParsedPage } from '../../types/parser';

defineProps<{
  layoutMode: 'compact' | 'balanced' | 'comfortable';
  previewMode: 'html' | 'svg';
  selectedPage: ParsedPage | null;
}>();

const layoutModeOptions = [
  { label: 'Compact', value: 'compact' },
  { label: 'Balanced', value: 'balanced' },
  { label: 'Comfortable', value: 'comfortable' },
] as const;

defineEmits<{
  (event: 'update:layoutMode', value: 'compact' | 'balanced' | 'comfortable'): void;
  (event: 'update:previewMode', value: 'html' | 'svg'): void;
  (event: 'regenerate'): void;
}>();
</script>

<style scoped>
.property-panel {
  height: 100%;
}

.property-panel__header {
  font-weight: 600;
}
</style>
