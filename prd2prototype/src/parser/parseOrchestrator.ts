import { runParsingPipelinePreferDeepseek, type ParsePipelineResult } from './pipeline';

export interface ParseOrchestratorOptions {
  timeoutMs?: number;
}

function isDeepseekEnabled(): boolean {
  return import.meta.env.VITE_ENABLE_DEEPSEEK_PARSER !== 'false';
}

export async function parsePrdDocument(
  sourceText: string,
  options: ParseOrchestratorOptions = {},
): Promise<ParsePipelineResult> {
  const result = await runParsingPipelinePreferDeepseek(sourceText, {
    enabled: isDeepseekEnabled(),
    timeoutMs: options.timeoutMs,
  });

  return {
    preprocess: result.preprocess,
    stages: result.stages,
    document: result.document,
  };
}
