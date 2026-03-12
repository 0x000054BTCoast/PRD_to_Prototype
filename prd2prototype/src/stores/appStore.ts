import { reactive } from 'vue';

export interface AppState {
  projectName: string;
  lastOpenedPrdPath: string | null;
}

export const appStore = reactive<AppState>({
  projectName: 'PRD2Prototype',
  lastOpenedPrdPath: null
});
