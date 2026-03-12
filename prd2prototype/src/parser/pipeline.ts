import { parseExplicitLabelDocument } from './explicitLabelParser';
import { parseHeadingDocument } from './headingParser';
import { parseIndentDocument } from './indentParser';
import { preprocessPrdText, type PreprocessResult } from './preprocess';
import { normalizeStructure } from './structureNormalizer';
import type { ParsedDocument } from '../types/parser';
import { enhanceParserWithAi, type AiEnhancement, type AiEnhancementOptions } from '../ai/aiParser';

export interface ParsePipelineStages {
  explicit: ParsedDocument;
  heading: ParsedDocument;
  indent: ParsedDocument;
}

export interface ParsePipelineResult {
  preprocess: PreprocessResult | null;
  stages: ParsePipelineStages | null;
  document: ParsedDocument | null;
}

export interface ParsePipelineWithAiResult extends ParsePipelineResult {
  aiEnhancement: AiEnhancement | null;
}

function parseNormalizedText(normalizedText: string): ParsePipelineStages {
  return {
    explicit: parseExplicitLabelDocument(normalizedText),
    heading: parseHeadingDocument(normalizedText),
    indent: parseIndentDocument(normalizedText),
  };
}

function createParseFailureDocument(sourceText: string, error: unknown): ParsedDocument {
  const errorMessage = error instanceof Error ? error.message : 'Unknown parser error';

  return {
    source: sourceText,
    pages: [],
    interactions: [],
    warnings: [
      {
        code: 'parse-failure',
        severity: 'error',
        message: 'The parser failed on malformed content. Showing an empty fallback structure instead.',
        suggestion: `Fix malformed sections and parse again. Technical detail: ${errorMessage}`,
      },
    ],
    metadata: {
      parseFailed: true,
    },
  };
}

export function runParsingPipeline(sourceText: string): ParsePipelineResult {
  const trimmed = sourceText.trim();

  if (!trimmed) {
    return {
      preprocess: null,
      stages: null,
      document: null,
    };
  }

  try {
    const preprocess = preprocessPrdText(sourceText);
    const stages = parseNormalizedText(preprocess.normalizedText);
    const document = normalizeStructure([stages.explicit, stages.heading, stages.indent]);

    return {
      preprocess,
      stages,
      document,
    };
  } catch (error) {
    console.error('Parsing pipeline failed, returning safe fallback.', error);

    return {
      preprocess: null,
      stages: null,
      document: createParseFailureDocument(sourceText, error),
    };
  }
}

export async function runParsingPipelineWithOptionalAi(
  sourceText: string,
  aiOptions: AiEnhancementOptions = {},
): Promise<ParsePipelineWithAiResult> {
  const baseResult = runParsingPipeline(sourceText);

  if (!baseResult.document) {
    return {
      ...baseResult,
      aiEnhancement: null,
    };
  }

  const aiEnhancement = await enhanceParserWithAi(sourceText, baseResult.document, aiOptions);

  if (aiEnhancement.warnings.length > 0) {
    baseResult.document.warnings.push(...aiEnhancement.warnings);
  }

  return {
    ...baseResult,
    aiEnhancement,
  };
}
