import type { ParsedDocument } from '../types/parser';
import type { PageType, ModuleType, ComponentType } from '../types/prototype';
import type { ParseWarning } from '../types/warning';
import { defaultOllamaClient, type OllamaClient } from './ollamaClient';

export interface AiTypeSuggestion {
  entityKind: 'page' | 'module' | 'component';
  entityId: string;
  suggestedType: PageType | ModuleType | ComponentType;
  reason?: string;
}

export interface AiInteractionSuggestion {
  sourceComponentId: string;
  action: string;
  trigger?: string;
  targetComponentId?: string;
  reason?: string;
}

export interface WeakStructureSuggestion {
  issue: string;
  recommendation: string;
}

export interface AiEnhancement {
  available: boolean;
  typeSuggestions: AiTypeSuggestion[];
  interactionSuggestions: AiInteractionSuggestion[];
  weakStructureSuggestions: WeakStructureSuggestion[];
  warnings: ParseWarning[];
}

export interface AiEnhancementOptions {
  enabled?: boolean;
  client?: OllamaClient;
  timeoutMs?: number;
}

interface AiEnhancementResponse {
  weakStructureSuggestions?: Array<Record<string, unknown>>;
  typeSuggestions?: Array<Record<string, unknown>>;
  interactionSuggestions?: Array<Record<string, unknown>>;
}

const AI_WARNING_CODE: ParseWarning['code'] = 'ambiguous-content';

function createAiWarning(message: string): ParseWarning {
  return {
    code: AI_WARNING_CODE,
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

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function parseAiResponse(content: string): AiEnhancementResponse | null {
  const jsonText = extractJsonBlock(content);

  try {
    const parsed = JSON.parse(jsonText) as unknown;
    return toRecord(parsed) as AiEnhancementResponse | null;
  } catch {
    return null;
  }
}

function buildPrompt(sourceText: string, document: ParsedDocument): string {
  const lightweightDoc = {
    pages: document.pages.map((page) => ({
      id: page.id,
      name: page.name,
      type: page.type,
      modules: page.modules.map((module) => ({
        id: module.id,
        title: module.title,
        type: module.type,
        components: module.components.map((component) => ({
          id: component.id,
          label: component.label,
          type: component.type,
        })),
      })),
    })),
    interactions: document.interactions.map((interaction) => ({
      id: interaction.id,
      sourceComponentId: interaction.sourceComponentId,
      trigger: interaction.trigger,
      action: interaction.action,
      targetComponentId: interaction.targetComponentId,
    })),
    warningCount: document.warnings.length,
  };

  return [
    'Given PRD text and a rule-based parsed document, provide optional enhancement hints.',
    'Return STRICT JSON only with keys: weakStructureSuggestions, typeSuggestions, interactionSuggestions.',
    'Do not invent IDs. Use only ids that appear in parsed document.',
    'Keep each list short (0~5 items).',
    '',
    'PRD:',
    sourceText.slice(0, 6000),
    '',
    'Parsed Document Summary:',
    JSON.stringify(lightweightDoc),
    '',
    'JSON schema:',
    JSON.stringify({
      weakStructureSuggestions: [{ issue: 'string', recommendation: 'string' }],
      typeSuggestions: [{ entityKind: 'page|module|component', entityId: 'string', suggestedType: 'string', reason: 'string' }],
      interactionSuggestions: [
        {
          sourceComponentId: 'string',
          action: 'string',
          trigger: 'click|submit|change|hover|focus|load|custom',
          targetComponentId: 'string',
          reason: 'string',
        },
      ],
    }),
  ].join('\n');
}

function coerceTypeSuggestions(payload: AiEnhancementResponse | null): AiTypeSuggestion[] {
  const suggestions: AiTypeSuggestion[] = [];

  for (const entry of payload?.typeSuggestions ?? []) {
    const item = toRecord(entry);
    if (!item) {
      continue;
    }

    const entityKind = asString(item.entityKind);
    const entityId = asString(item.entityId);
    const suggestedType = asString(item.suggestedType);

    if (!entityKind || !entityId || !suggestedType) {
      continue;
    }

    if (!['page', 'module', 'component'].includes(entityKind)) {
      continue;
    }

    const suggestion: AiTypeSuggestion = {
      entityKind: entityKind as AiTypeSuggestion['entityKind'],
      entityId,
      suggestedType: suggestedType as AiTypeSuggestion['suggestedType'],
    };

    const reason = asString(item.reason);
    if (reason) {
      suggestion.reason = reason;
    }

    suggestions.push(suggestion);
  }

  return suggestions;
}

function coerceWeakStructureSuggestions(payload: AiEnhancementResponse | null): WeakStructureSuggestion[] {
  return (payload?.weakStructureSuggestions ?? [])
    .map((entry) => {
      const item = toRecord(entry);
      if (!item) {
        return null;
      }

      const issue = asString(item.issue);
      const recommendation = asString(item.recommendation);

      if (!issue || !recommendation) {
        return null;
      }

      return { issue, recommendation };
    })
    .filter((entry): entry is WeakStructureSuggestion => Boolean(entry));
}

function coerceInteractionSuggestions(payload: AiEnhancementResponse | null): AiInteractionSuggestion[] {
  const suggestions: AiInteractionSuggestion[] = [];

  for (const entry of payload?.interactionSuggestions ?? []) {
    const item = toRecord(entry);
    if (!item) {
      continue;
    }

    const sourceComponentId = asString(item.sourceComponentId);
    const action = asString(item.action);

    if (!sourceComponentId || !action) {
      continue;
    }

    const suggestion: AiInteractionSuggestion = {
      sourceComponentId,
      action,
    };

    const trigger = asString(item.trigger);
    const targetComponentId = asString(item.targetComponentId);
    const reason = asString(item.reason);

    if (trigger) {
      suggestion.trigger = trigger;
    }

    if (targetComponentId) {
      suggestion.targetComponentId = targetComponentId;
    }

    if (reason) {
      suggestion.reason = reason;
    }

    suggestions.push(suggestion);
  }

  return suggestions;
}

export async function enhanceParserWithAi(
  sourceText: string,
  document: ParsedDocument,
  options: AiEnhancementOptions = {},
): Promise<AiEnhancement> {
  if (!options.enabled) {
    return {
      available: false,
      typeSuggestions: [],
      interactionSuggestions: [],
      weakStructureSuggestions: [],
      warnings: [],
    };
  }

  const client = options.client ?? defaultOllamaClient;

  const available = await client.isAvailable();
  if (!available) {
    return {
      available: false,
      typeSuggestions: [],
      interactionSuggestions: [],
      weakStructureSuggestions: [],
      warnings: [createAiWarning('AI enhancement skipped: local Ollama endpoint is unavailable. Continuing with rule-based parsing.')],
    };
  }

  try {
    const prompt = buildPrompt(sourceText, document);
    const response = await client.generate({
      prompt,
      timeoutMs: options.timeoutMs,
      temperature: 0.1,
      system:
        'You assist a parser by suggesting optional hints. Return valid JSON only, never markdown.',
    });

    const payload = parseAiResponse(response);

    if (!payload) {
      return {
        available: true,
        typeSuggestions: [],
        interactionSuggestions: [],
        weakStructureSuggestions: [],
        warnings: [createAiWarning('AI enhancement failed: response format was invalid JSON. Using rule-based output.')],
      };
    }

    return {
      available: true,
      typeSuggestions: coerceTypeSuggestions(payload),
      interactionSuggestions: coerceInteractionSuggestions(payload),
      weakStructureSuggestions: coerceWeakStructureSuggestions(payload),
      warnings: [],
    };
  } catch (error) {
    return {
      available: true,
      typeSuggestions: [],
      interactionSuggestions: [],
      weakStructureSuggestions: [],
      warnings: [
        createAiWarning(
          `AI enhancement failed: ${error instanceof Error ? error.message : 'unknown error'}. Using rule-based output.`,
        ),
      ],
    };
  }
}
