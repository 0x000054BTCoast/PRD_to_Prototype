import { runParsingPipelinePreferDeepseek, type ParsePipelineResult } from './pipeline';

export interface ParseOrchestratorOptions {
  timeoutMs?: number;
  deepseek?: {
    enabled?: boolean;
    apiKey?: string;
    endpoint?: string;
    model?: string;
  };
}

function isDeepseekEnabledByEnv(): boolean {
  return import.meta.env.VITE_ENABLE_DEEPSEEK_PARSER !== 'false';
}

export async function parsePrdDocument(
  sourceText: string,
  options: ParseOrchestratorOptions = {},
): Promise<ParsePipelineResult> {
  const result = await runParsingPipelinePreferDeepseek(sourceText, {
    enabled: options.deepseek?.enabled ?? isDeepseekEnabledByEnv(),
    apiKey: options.deepseek?.apiKey,
    endpoint: options.deepseek?.endpoint,
    model: options.deepseek?.model,
    timeoutMs: options.timeoutMs,
  });

  return {
    preprocess: result.preprocess,
    stages: result.stages,
    document: result.document,
  };
}
