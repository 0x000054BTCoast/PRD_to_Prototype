import { parseExplicitLabelDocument } from './explicitLabelParser';
import { parseHeadingDocument } from './headingParser';
import { parseIndentDocument } from './indentParser';
import { preprocessPrdText, type PreprocessResult } from './preprocess';
import { normalizeStructure } from './structureNormalizer';
import type { ParsedDocument } from '../types/parser';

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

function parseNormalizedText(normalizedText: string): ParsePipelineStages {
  return {
    explicit: parseExplicitLabelDocument(normalizedText),
    heading: parseHeadingDocument(normalizedText),
    indent: parseIndentDocument(normalizedText),
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

  const preprocess = preprocessPrdText(sourceText);
  const stages = parseNormalizedText(preprocess.normalizedText);
  const document = normalizeStructure([stages.explicit, stages.heading, stages.indent]);

  return {
    preprocess,
    stages,
    document,
  };
}
