<template>
  <el-card shadow="never" class="json-card">
    <template #header>
      <div class="header-row">
        <span>Raw JSON</span>
        <el-tag effect="plain" :type="data ? 'success' : 'info'">{{ data ? 'Available' : 'Empty' }}</el-tag>
      </div>
    </template>

    <el-alert
      v-if="!data"
      title="JSON output will appear after parsing PRD text."
      type="info"
      show-icon
      :closable="false"
    />

    <el-scrollbar v-else height="34vh">
      <pre class="json-content">{{ prettyJson }}</pre>
    </el-scrollbar>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  data: unknown | null;
}>();

const prettyJson = computed(() => JSON.stringify(props.data, null, 2));
</script>

<style scoped>
.json-card {
  height: 100%;
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.json-content {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 12px;
  line-height: 1.4;
}
</style>
