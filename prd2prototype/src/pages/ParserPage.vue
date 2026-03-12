<template>
  <section class="parser-page">
    <el-card shadow="never" class="parser-page__panel parser-page__panel--preview">
      <template #header>
        <div class="parser-page__panel-header">
          <span>PRD Source</span>
          <div class="parser-page__actions">
            <el-button size="small" @click="loadExampleFile" :loading="isLoadingExample">Example file</el-button>
            <el-button size="small" @click="reparse">Parse again</el-button>
          </div>
        </div>
      </template>
      <PrdPreviewPanel :source-text="store.sourceText" :normalized-text="normalizedText" />
    </el-card>

    <el-card shadow="never" class="parser-page__panel parser-page__panel--center">
      <template #header>
        <div class="parser-page__panel-header">
          <span>Parsed Output</span>
          <div class="parser-page__actions">
            <el-button size="small" @click="copyJson" :disabled="!parsedDocument">Copy JSON</el-button>
          </div>
        </div>
      </template>

      <el-alert
        v-if="warnings.length"
        title="Warnings are informational and do not block parsing. Review and continue."
        type="warning"
        :closable="false"
        show-icon
        class="parser-page__warning-banner"
      />

      <el-empty
        v-if="!store.sourceText.trim()"
        description="Start by uploading, pasting, or loading the example PRD on Home."
      />

      <template v-else>
        <el-tabs v-model="activeCenterTab" class="center-tabs">
          <el-tab-pane label="Structure" name="structure">
            <StructureTree :document="parsedDocument" />
          </el-tab-pane>
          <el-tab-pane label="Raw JSON" name="json">
            <JsonViewer :data="parsedDocument" />
          </el-tab-pane>
        </el-tabs>
      </template>
    </el-card>

    <el-card shadow="never" class="parser-page__panel parser-page__panel--issues">
      <template #header>
        <div class="parser-page__panel-header">
          <span>Warnings & Diagnostics</span>
          <el-button size="small" @click="reparse" :disabled="!store.sourceText.trim()">Parse again</el-button>
        </div>
      </template>
      <ParseIssuePanel :warnings="warnings" :keyword-matches="keywordMatches" />
    </el-card>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { ElMessage } from 'element-plus';
import PrdPreviewPanel from '../components/parser/PrdPreviewPanel.vue';
import JsonViewer from '../components/parser/JsonViewer.vue';
import StructureTree from '../components/parser/StructureTree.vue';
import ParseIssuePanel from '../components/parser/ParseIssuePanel.vue';
import { appStore as store } from '../stores/appStore';
import { runParsingPipeline } from '../parser/pipeline';

const EXAMPLE_FILE_PATH = '/example-prd.md';

const activeCenterTab = ref<'structure' | 'json'>('structure');
const parseVersion = ref(0);
const isLoadingExample = ref(false);

const pipelineResult = computed(() => {
  parseVersion.value;
  return runParsingPipeline(store.sourceText);
});
const parsedDocument = computed(() => pipelineResult.value.document);
const normalizedText = computed(() => pipelineResult.value.preprocess?.normalizedText ?? '');
const warnings = computed(() => parsedDocument.value?.warnings ?? []);
const keywordMatches = computed(() => pipelineResult.value.preprocess?.keywordMatches ?? []);

function reparse(): void {
  parseVersion.value += 1;
  ElMessage.success('Parse completed.');
}

async function copyJson(): Promise<void> {
  if (!parsedDocument.value) {
    ElMessage.warning('Nothing to copy yet.');
    return;
  }

  try {
    await navigator.clipboard.writeText(JSON.stringify(parsedDocument.value, null, 2));
    ElMessage.success('Parsed JSON copied to clipboard.');
  } catch (error) {
    ElMessage.error('Unable to access clipboard in this environment.');
    console.error(error);
  }
}

async function loadExampleFile(): Promise<void> {
  isLoadingExample.value = true;

  try {
    const response = await fetch(EXAMPLE_FILE_PATH);

    if (!response.ok) {
      throw new Error(`Failed to load example file: ${response.status}`);
    }

    const text = await response.text();

    store.sourceText = text;
    store.sourceFileName = 'example-prd.md';
    store.sourceFileSize = new Blob([text]).size;
    store.sourceType = 'example';

    parseVersion.value += 1;
    ElMessage.success('Bundled example PRD loaded and parsed.');
  } catch (error) {
    ElMessage.error('Unable to load bundled example file.');
    console.error(error);
  } finally {
    isLoadingExample.value = false;
  }
}
</script>

<style scoped>
.parser-page {
  display: grid;
  grid-template-columns: minmax(280px, 1fr) minmax(320px, 1fr) minmax(300px, 1fr);
  gap: 12px;
  height: calc(100vh - 170px);
  min-height: 620px;
}

.parser-page__panel {
  min-width: 0;
  height: 100%;
  overflow: hidden;
}

.parser-page__panel :deep(.el-card__body) {
  height: calc(100% - 56px);
  overflow: auto;
}

.parser-page__panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.parser-page__actions {
  display: inline-flex;
  gap: 8px;
}

.center-tabs :deep(.el-tabs__content) {
  height: calc(100% - 40px);
  overflow: auto;
}

.parser-page__warning-banner {
  margin-bottom: 10px;
}

@media (max-width: 1280px) {
  .parser-page {
    grid-template-columns: 1fr;
    height: auto;
  }

  .parser-page__panel {
    height: 520px;
  }
}
</style>
