<template>
  <el-card shadow="never" class="tree-card">
    <template #header>
      <div class="header-row">
        <span>Structure Tree</span>
        <el-tag effect="light" :type="document ? 'success' : 'info'">
          {{ document ? `${document.pages.length} page(s)` : 'No Data' }}
        </el-tag>
      </div>
    </template>

    <el-alert
      v-if="!document"
      title="No parsed structure yet. Provide PRD text to see parse results."
      type="info"
      show-icon
      :closable="false"
    />

    <el-scrollbar v-else height="34vh">
      <el-tree
        :data="treeNodes"
        node-key="id"
        default-expand-all
        :expand-on-click-node="false"
      >
        <template #default="{ data }">
          <span class="tree-node">
            <span>{{ data.label }}</span>
            <el-tag size="small" effect="plain">{{ data.kind }}</el-tag>
          </span>
        </template>
      </el-tree>
    </el-scrollbar>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ParsedDocument } from '../../types/parser';

interface TreeNode {
  id: string;
  label: string;
  kind: 'page' | 'module' | 'component' | 'interaction';
  children?: TreeNode[];
}

const props = defineProps<{
  document: ParsedDocument | null;
}>();

const treeNodes = computed<TreeNode[]>(() => {
  if (!props.document) {
    return [];
  }

  return props.document.pages.map((page) => ({
    id: page.id,
    kind: 'page',
    label: page.name,
    children: page.modules.map((module) => ({
      id: module.id,
      kind: 'module',
      label: module.title ?? 'Untitled Module',
      children: module.components.map((component) => ({
        id: component.id,
        kind: 'component',
        label: component.label ?? 'Untitled Component',
        children: component.interactions.map((interaction) => ({
          id: interaction.id,
          kind: 'interaction',
          label: `${interaction.trigger}: ${interaction.action}`,
        })),
      })),
    })),
  }));
});
</script>

<style scoped>
.tree-card {
  height: 100%;
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tree-node {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
</style>
