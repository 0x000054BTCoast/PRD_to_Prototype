import { reactive } from 'vue';

export type PrdSourceType = 'upload' | 'paste' | 'example' | null;

export interface AppState {
  projectName: string;
  lastOpenedPrdPath: string | null;
  sourceText: string;
  sourceFileName: string | null;
  sourceFileSize: number | null;
  sourceType: PrdSourceType;
}

export const appStore = reactive<AppState>({
  projectName: 'PRD2Prototype',
  lastOpenedPrdPath: null,
  sourceText: '',
  sourceFileName: null,
  sourceFileSize: null,
  sourceType: null
});
