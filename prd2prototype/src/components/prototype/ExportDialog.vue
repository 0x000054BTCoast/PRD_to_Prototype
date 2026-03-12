<template>
  <el-dialog
    :model-value="modelValue"
    title="Export prototype"
    width="520px"
    @close="onClose"
  >
    <el-form label-position="top" class="export-dialog__form">
      <el-form-item label="Export format">
        <el-dropdown trigger="click" @command="onFormatCommand">
          <el-button>
            {{ selectedFormatLabel }}
            <el-icon class="el-icon--right"><arrow-down /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                v-for="option in formatOptions"
                :key="option.value"
                :command="option.value"
              >
                {{ option.label }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-form-item>

      <el-form-item label="Scope">
        <el-radio-group v-model="scope">
          <el-radio value="current">Current page only</el-radio>
          <el-radio value="all">All pages</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item>
        <el-checkbox v-model="inlineStyles" :disabled="format === 'json'">
          Inline styles (HTML/SVG only)
        </el-checkbox>
      </el-form-item>

      <el-form-item>
        <el-checkbox v-model="showLabels" :disabled="format === 'json'">
          Include block labels (HTML/SVG only)
        </el-checkbox>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="export-dialog__footer">
        <el-button @click="onClose">Cancel</el-button>
        <el-button type="primary" :disabled="disabled" @click="onExport">Download</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ArrowDown } from '@element-plus/icons-vue';
import type { ExportFormat, ExportScope } from '../../renderer/download';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    disabled?: boolean;
  }>(),
  {
    disabled: false,
  },
);

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void;
  (
    event: 'confirm',
    payload: { format: ExportFormat; scope: ExportScope; inlineStyles: boolean; showLabels: boolean },
  ): void;
}>();

const formatOptions = [
  { label: 'structure.json', value: 'json' },
  { label: 'prototype.html', value: 'html' },
  { label: 'prototype.svg', value: 'svg' },
] as const;

const format = ref<ExportFormat>('json');
const scope = ref<ExportScope>('current');
const inlineStyles = ref(false);
const showLabels = ref(true);

const selectedFormatLabel = computed(() => {
  return formatOptions.find((option) => option.value === format.value)?.label ?? 'Select format';
});

watch(format, (nextFormat) => {
  if (nextFormat === 'json') {
    inlineStyles.value = false;
    showLabels.value = true;
  }
});

function onFormatCommand(value: string | number | object): void {
  if (value === 'json' || value === 'html' || value === 'svg') {
    format.value = value;
  }
}

function onClose(): void {
  emit('update:modelValue', false);
}

function onExport(): void {
  emit('confirm', {
    format: format.value,
    scope: scope.value,
    inlineStyles: inlineStyles.value,
    showLabels: showLabels.value,
  });
  onClose();
}
</script>

<style scoped>
.export-dialog__form {
  display: grid;
}

.export-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
