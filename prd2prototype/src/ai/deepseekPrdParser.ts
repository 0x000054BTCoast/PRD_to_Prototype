import type { ParsedDocument } from '../types/parser';
import type { ParseWarning } from '../types/warning';
import { normalizeStructure } from '../parser/structureNormalizer';
import { createDeepseekClient, defaultDeepseekClient, type DeepseekClient } from './deepseekClient';

export interface DeepseekParserOptions {
  enabled?: boolean;
  client?: DeepseekClient;
  apiKey?: string;
  endpoint?: string;
  model?: string;
  timeoutMs?: number;
}

interface DeepseekParseResult {
  available: boolean;
  document: ParsedDocument | null;
  warnings: ParseWarning[];
}

interface DeepseekDocumentPayload {
  pages?: unknown[];
  interactions?: unknown[];
  metadata?: Record<string, unknown>;
}

function createAiWarning(message: string): ParseWarning {
  return {
    code: 'ambiguous-content',
    severity: 'warning',
    message,
  };
}

function extractJsonBlock(content: string): string {
  const fencedMatch = content.match(/```json\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = content.indexOf('{');
  const lastBrace = content.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return content.slice(firstBrace, lastBrace + 1).trim();
  }

  return content.trim();
}

function parseDeepseekDocument(content: string): DeepseekDocumentPayload | null {
  try {
    const raw = JSON.parse(extractJsonBlock(content)) as unknown;

    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return null;
    }

    return raw as DeepseekDocumentPayload;
  } catch {
    return null;
  }
}

function buildPrompt(sourceText: string): string {
  return [
    'Read the PRD and return STRICT JSON only.',
    'You must output a complete app document for a prototype renderer.',
    'Use this schema exactly:',
    JSON.stringify({
      pages: [
        {
          name: 'string',
          type: 'list|form|detail|dashboard|config|generic|custom',
          route: '/optional-path',
          modules: [
            {
              title: 'string',
              type: 'hero|filters|table|form|detail|stats|actions|description|custom',
              description: 'string',
              components: [
                {
                  label: 'string',
                  type:
                    'text|input|textarea|select|checkbox|radio|switch|button|table|card|tag|image|icon|chart|date-picker|time-picker|tabs|list|pagination|container|custom',
                  props: { any: 'json' },
                  interactions: [
                    {
                      trigger: 'click|submit|change|hover|focus|load|custom',
                      action: 'string',
                      targetComponentId: 'optional-string-id',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      interactions: [
        {
          trigger: 'click|submit|change|hover|focus|load|custom',
          sourceComponentId: 'string',
          action: 'string',
          targetComponentId: 'optional-string-id',
        },
      ],
      metadata: {
        language: 'zh|en|mixed',
        summary: 'short summary',
      },
    }),
    'Rules:',
    '1) Never return empty pages. At least one page/module/component.',
    '2) Keep names and labels faithful to PRD.',
    '3) Do not wrap output with markdown.',
    '',
    'PRD:',
    sourceText.slice(0, 12000),
  ].join('\n');
}

export async function parsePrdWithDeepseek(
  sourceText: string,
  options: DeepseekParserOptions = {},
): Promise<DeepseekParseResult> {
  if (!options.enabled) {
    return { available: false, document: null, warnings: [] };
  }

  const client = options.client
    ?? (options.apiKey || options.endpoint || options.model
      ? createDeepseekClient({
          apiKey: options.apiKey,
          endpoint: options.endpoint,
          model: options.model,
        })
      : defaultDeepseekClient);
  const available = await client.isAvailable();

  if (!available) {
    return {
      available: false,
      document: null,
      warnings: [createAiWarning('DeepSeek parsing skipped: endpoint unavailable or API key missing. Falling back to rule-based parser.')],
    };
  }

  try {
    const response = await client.chat({
      messages: [
        {
          role: 'system',
          content: 'You are a PRD-to-JSON parser. Output valid JSON only.',
        },
        {
          role: 'user',
          content: buildPrompt(sourceText),
        },
      ],
      timeoutMs: options.timeoutMs,
      temperature: 0,
    });

    const payload = parseDeepseekDocument(response);

    if (!payload) {
      return {
        available: true,
        document: null,
        warnings: [createAiWarning('DeepSeek parsing returned invalid JSON. Falling back to rule-based parser.')],
      };
    }

    const normalized = normalizeStructure([
      {
        source: sourceText,
        pages: Array.isArray(payload.pages) ? (payload.pages as never[]) : [],
        interactions: Array.isArray(payload.interactions) ? (payload.interactions as never[]) : [],
        warnings: [],
      },
    ]);

    return {
      available: true,
      document: normalized,
      warnings: [],
    };
  } catch (error) {
    return {
      available: true,
      document: null,
      warnings: [
        createAiWarning(
          `DeepSeek parsing failed: ${error instanceof Error ? error.message : 'unknown error'}. Falling back to rule-based parser.`,
        ),
      ],
    };
  }
}
