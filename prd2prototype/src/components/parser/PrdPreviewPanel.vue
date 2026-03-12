<template>
  <el-card shadow="never" class="preview-panel">
    <template #header>
      <div class="header-row">
        <span>Original PRD</span>
        <el-tag :type="hasContent ? 'success' : 'info'" effect="light">{{ hasContent ? 'Ready' : 'Empty' }}</el-tag>
      </div>
    </template>

    <el-alert
      v-if="!hasContent"
      title="No PRD source text available. Upload or paste a PRD on the Home page."
      type="info"
      :closable="false"
      show-icon
    />

    <template v-else>
      <el-tabs v-model="activeTab">
        <el-tab-pane label="Original" name="original" />
        <el-tab-pane label="Normalized" name="normalized" />
      </el-tabs>

      <el-scrollbar height="70vh" class="preview-scroll">
        <el-input
          :model-value="activeTab === 'original' ? sourceText : normalizedText"
          type="textarea"
          :rows="26"
          resize="none"
          readonly
        />
      </el-scrollbar>
    </template>
  </el-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

const props = withDefaults(
  defineProps<{
    sourceText: string;
    normalizedText?: string;
  }>(),
  {
    normalizedText: '',
  },
);

const activeTab = ref<'original' | 'normalized'>('original');
const hasContent = computed(() => props.sourceText.trim().length > 0);
</script>

<style scoped>
.preview-panel {
  height: 100%;
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.preview-scroll {
  margin-top: 8px;
}
</style>
