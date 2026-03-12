<template>
  <el-card shadow="never" class="issue-panel">
    <template #header>
      <div class="header-row">
        <span>Warnings & Issues</span>
        <el-tag :type="warnings.length ? 'warning' : 'success'" effect="light">
          {{ warnings.length }} warning(s)
        </el-tag>
      </div>
    </template>

    <el-alert
      :title="warnings.length ? 'Warnings are visible but non-blocking. You can continue generating layouts.' : 'No parser warnings.'"
      :type="warnings.length ? 'warning' : 'success'"
      :closable="false"
      show-icon
      class="summary-alert"
    />

    <el-collapse v-model="activePanels">
      <el-collapse-item name="issues" :title="`Parse Warnings (${warnings.length})`">
        <el-table :data="warnings" size="small" empty-text="No warnings" max-height="300">
          <el-table-column prop="severity" label="Severity" width="110">
            <template #default="{ row }">
              <el-tag size="small" :type="severityTagType(row.severity)">{{ row.severity }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="code" label="Code" width="170" />
          <el-table-column prop="message" label="Message" min-width="240" />
          <el-table-column label="Location" width="110">
            <template #default="{ row }">
              {{ formatLocation(row.location) }}
            </template>
          </el-table-column>
        </el-table>
      </el-collapse-item>

      <el-collapse-item name="keywords" :title="`Keyword Normalization (${keywordMatches.length})`">
        <el-table :data="keywordMatches" size="small" empty-text="No keyword alias replacements" max-height="240">
          <el-table-column prop="alias" label="Alias" min-width="140" />
          <el-table-column prop="normalized" label="Normalized" min-width="140" />
          <el-table-column prop="count" label="Count" width="90" />
        </el-table>
      </el-collapse-item>
    </el-collapse>

    <el-empty
      v-if="!warnings.length && !keywordMatches.length"
      description="No diagnostics yet. Load and parse a PRD to inspect parser behavior."
    />
  </el-card>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { ParseWarning, WarningSeverity } from '../../types/warning';
import type { PositionRange } from '../../types/prototype';
import type { KeywordMatch } from '../../parser/preprocess';

defineProps<{
  warnings: ParseWarning[];
  keywordMatches: KeywordMatch[];
}>();

const activePanels = ref(['issues', 'keywords']);

function formatLocation(location?: PositionRange): string {
  if (!location?.startLine) {
    return '-';
  }

  if (location.startLine === location.endLine) {
    return `L${location.startLine}`;
  }

  return `L${location.startLine}-${location.endLine}`;
}

function severityTagType(severity: WarningSeverity): 'info' | 'warning' | 'danger' {
  if (severity === 'error') {
    return 'danger';
  }

  if (severity === 'warning') {
    return 'warning';
  }

  return 'info';
}
</script>

<style scoped>
.issue-panel {
  height: 100%;
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.summary-alert {
  margin-bottom: 12px;
}
</style>
