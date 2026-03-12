<template>
  <section class="parser-page">
    <PrdPreviewPanel :source-text="store.sourceText" :normalized-text="normalizedText" />

    <section class="center-column">
      <el-tabs v-model="activeCenterTab" class="center-tabs">
        <el-tab-pane label="Structure" name="structure">
          <StructureTree :document="parsedDocument" />
        </el-tab-pane>
        <el-tab-pane label="Raw JSON" name="json">
          <JsonViewer :data="parsedDocument" />
        </el-tab-pane>
      </el-tabs>
    </section>

    <ParseIssuePanel :warnings="warnings" :keyword-matches="keywordMatches" />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import PrdPreviewPanel from '../components/parser/PrdPreviewPanel.vue';
import JsonViewer from '../components/parser/JsonViewer.vue';
import StructureTree from '../components/parser/StructureTree.vue';
import ParseIssuePanel from '../components/parser/ParseIssuePanel.vue';
import { appStore as store } from '../stores/appStore';
import { runParsingPipeline } from '../parser/pipeline';

const activeCenterTab = ref<'structure' | 'json'>('structure');

const pipelineResult = computed(() => runParsingPipeline(store.sourceText));
const parsedDocument = computed(() => pipelineResult.value.document);
const normalizedText = computed(() => pipelineResult.value.preprocess?.normalizedText ?? '');
const warnings = computed(() => parsedDocument.value?.warnings ?? []);
const keywordMatches = computed(() => pipelineResult.value.preprocess?.keywordMatches ?? []);
</script>

<style scoped>
.parser-page {
  display: grid;
  grid-template-columns: minmax(280px, 1fr) minmax(320px, 1fr) minmax(300px, 1fr);
  gap: 12px;
  height: calc(100vh - 170px);
  min-height: 620px;
}

.center-column {
  min-width: 0;
}

.center-tabs :deep(.el-tabs__content) {
  height: calc(100% - 40px);
}

@media (max-width: 1280px) {
  .parser-page {
    grid-template-columns: 1fr;
    height: auto;
  }
}
</style>
