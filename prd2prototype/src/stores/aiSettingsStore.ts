import { reactive } from 'vue';

const STORAGE_KEY = 'prd2prototype.ai-settings';

export interface AiSettingsState {
  deepseekEnabled: boolean;
  deepseekApiKey: string;
}

interface PersistedAiSettings {
  deepseekEnabled?: boolean;
  deepseekApiKey?: string;
}

function readPersistedSettings(): PersistedAiSettings {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as unknown;

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return parsed as PersistedAiSettings;
  } catch {
    return {};
  }
}

function createInitialState(): AiSettingsState {
  const persisted = readPersistedSettings();

  return {
    deepseekEnabled: persisted.deepseekEnabled ?? true,
    deepseekApiKey: persisted.deepseekApiKey ?? '',
  };
}

export const aiSettingsStore = reactive<AiSettingsState>(createInitialState());

export function persistAiSettings(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const payload: AiSettingsState = {
    deepseekEnabled: aiSettingsStore.deepseekEnabled,
    deepseekApiKey: aiSettingsStore.deepseekApiKey.trim(),
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}
