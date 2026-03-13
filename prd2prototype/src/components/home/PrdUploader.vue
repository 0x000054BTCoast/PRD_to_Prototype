<template>
  <el-card shadow="never" class="prd-uploader">
    <template #header>
      <div class="header-row">
        <span>PRD Input</span>
        <el-tag :type="store.sourceText ? 'success' : 'info'" effect="light">
          {{ store.sourceText ? 'Loaded' : 'Not Loaded' }}
        </el-tag>
      </div>
    </template>

    <el-alert
      :title="securityNotice"
      type="info"
      show-icon
      :closable="false"
      class="security-notice"
    />

    <el-tabs v-model="activeTab">
      <el-tab-pane label="Upload file" name="upload">
        <el-upload
          drag
          action="#"
          :auto-upload="false"
          :show-file-list="false"
          accept=".md,.txt,text/markdown,text/plain"
          :on-change="onFileChange"
          :on-exceed="onExceed"
          :limit="1"
        >
          <div>Drop a <strong>.md</strong> or <strong>.txt</strong> file here, or click to select.</div>
        </el-upload>
      </el-tab-pane>

      <el-tab-pane label="Paste text" name="paste">
        <el-input
          v-model="pastedText"
          type="textarea"
          :rows="10"
          placeholder="Paste PRD content here"
        />
        <el-button type="primary" class="action-button" @click="applyPastedText" :disabled="!pastedText.trim()">
          Use pasted text
        </el-button>
      </el-tab-pane>

      <el-tab-pane label="Example" name="example">
        <p class="example-copy">Load the bundled sample PRD to try the app quickly.</p>
        <el-button type="primary" :loading="isLoadingExample" @click="loadExampleFile">
          Load example file
        </el-button>
      </el-tab-pane>
    </el-tabs>

    <el-card shadow="never" class="ai-settings-card">
      <template #header>
        <span>DeepSeek Parser 设置（推荐）</span>
      </template>

      <div class="ai-settings-grid">
        <span>启用 DeepSeek 解析</span>
        <el-switch v-model="aiSettingsStore.deepseekEnabled" @change="onAiSettingsChanged" />

        <span>DeepSeek API Key</span>
        <el-input
          v-model="aiSettingsStore.deepseekApiKey"
          type="password"
          show-password
          clearable
          placeholder="sk-..."
          @change="onAiSettingsChanged"
        />
      </div>

      <el-text size="small" type="info">
        新手建议：直接把 API Key 粘贴到这里即可（会保存在当前浏览器 LocalStorage）。
        如果关闭开关或 Key 为空，将自动回退到本地规则解析。
      </el-text>
    </el-card>

    <el-card v-if="store.sourceText" shadow="never" class="source-meta">
      <template #header>
        <span>Source info</span>
      </template>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="Source type">{{ sourceTypeLabel }}</el-descriptions-item>
        <el-descriptions-item label="File name">{{ store.sourceFileName ?? 'N/A' }}</el-descriptions-item>
        <el-descriptions-item label="File size">{{ formattedFileSize }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card v-if="store.sourceText" shadow="never" class="source-preview">
      <template #header>
        <span>Source preview</span>
      </template>
      <pre>{{ previewText }}</pre>
    </el-card>
  </el-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { UploadFile, UploadFiles } from 'element-plus';
import { ElMessage } from 'element-plus';
import { appStore as store, type PrdSourceType } from '../../stores/appStore';
import { aiSettingsStore, persistAiSettings } from '../../stores/aiSettingsStore';

const EXAMPLE_FILE_PATH = '/example-prd.md';
const PREVIEW_CHAR_LIMIT = 1200;

const activeTab = ref<'upload' | 'paste' | 'example'>('upload');
const pastedText = ref('');
const isLoadingExample = ref(false);

const sourceTypeLabel = computed(() => {
  const sourceTypeMap: Record<Exclude<PrdSourceType, null>, string> = {
    upload: 'Local file upload',
    paste: 'Pasted text',
    example: 'Bundled example file',
  };

  if (!store.sourceType) {
    return 'N/A';
  }

  return sourceTypeMap[store.sourceType];
});

const securityNotice = computed(() =>
  aiSettingsStore.deepseekEnabled
    ? '文档默认在本地处理；启用 DeepSeek 时，会将 PRD 文本发送到 DeepSeek API 进行结构化解析。'
    : '所有文档均在本地规则引擎处理，不会上传到云端服务。',
);

const formattedFileSize = computed(() => {
  if (typeof store.sourceFileSize !== 'number') {
    return 'N/A';
  }

  if (store.sourceFileSize < 1024) {
    return `${store.sourceFileSize} B`;
  }

  return `${(store.sourceFileSize / 1024).toFixed(2)} KB`;
});

const previewText = computed(() => {
  if (store.sourceText.length <= PREVIEW_CHAR_LIMIT) {
    return store.sourceText;
  }

  return `${store.sourceText.slice(0, PREVIEW_CHAR_LIMIT)}\n\n... (preview truncated)`;
});

function onAiSettingsChanged(): void {
  persistAiSettings();
}

const onExceed = () => {
  ElMessage.warning('Please upload one file at a time.');
};

const onFileChange = async (file: UploadFile, _files: UploadFiles): Promise<void> => {
  const rawFile = file.raw;

  if (!rawFile) {
    return;
  }

  const isValidTextFile = /\.(md|txt)$/i.test(rawFile.name);

  if (!isValidTextFile) {
    ElMessage.error('Only .md or .txt files are supported.');
    return;
  }

  const text = await rawFile.text();

  store.sourceText = text;
  store.sourceFileName = rawFile.name;
  store.sourceFileSize = rawFile.size;
  store.sourceType = 'upload';

  ElMessage.success('PRD file loaded from local upload.');
};

const applyPastedText = () => {
  const normalizedText = pastedText.value.trim();

  store.sourceText = normalizedText;
  store.sourceFileName = 'pasted-prd.txt';
  store.sourceFileSize = new Blob([normalizedText]).size;
  store.sourceType = 'paste';

  ElMessage.success('Pasted PRD text has been loaded.');
};

const loadExampleFile = async () => {
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

    ElMessage.success('Bundled example PRD loaded.');
  } catch (error) {
    ElMessage.error('Unable to load bundled example file.');
    console.error(error);
  } finally {
    isLoadingExample.value = false;
  }
};
</script>

<style scoped>
.prd-uploader {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.security-notice {
  margin-bottom: 16px;
}

.action-button {
  margin-top: 12px;
}

.ai-settings-card {
  margin-top: 8px;
}

.ai-settings-grid {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  margin-bottom: 8px;
}

.source-meta,
.source-preview {
  margin-top: 8px;
}

.source-preview pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 320px;
  overflow: auto;
}

.example-copy {
  margin: 0 0 12px;
}
</style>
