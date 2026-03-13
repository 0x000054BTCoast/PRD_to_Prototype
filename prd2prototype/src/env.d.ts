/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEEPSEEK_API_KEY?: string;
  readonly VITE_ENABLE_DEEPSEEK_PARSER?: 'true' | 'false';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
