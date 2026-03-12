import type { PositionRange } from '../types/prototype';
import type { ParseWarning } from '../types/warning';

export const CLASSIFIED_MODULE_TYPES = [
  'header',
  'actionBar',
  'filter',
  'table',
  'cardList',
  'formSection',
  'description',
  'section',
] as const;

export type ClassifiedModuleType = (typeof CLASSIFIED_MODULE_TYPES)[number];

export interface ModuleClassificationInput {
  title?: string;
  description?: string;
  location?: PositionRange;
}

export interface ModuleClassificationResult {
  type: ClassifiedModuleType;
  warnings: ParseWarning[];
}

interface TypeRule {
  type: Exclude<ClassifiedModuleType, 'section'>;
  keywords: readonly string[];
}

const MODULE_TYPE_RULES: readonly TypeRule[] = [
  { type: 'header', keywords: ['header', 'top', 'title', 'hero', 'banner'] },
  { type: 'actionBar', keywords: ['action', 'toolbar', 'operations', 'cta', 'buttons'] },
  { type: 'filter', keywords: ['filter', 'search', 'query', '筛选'] },
  { type: 'table', keywords: ['table', 'list', 'grid', 'rows', 'columns'] },
  { type: 'cardList', keywords: ['cards', 'card list', 'tiles', 'gallery'] },
  { type: 'formSection', keywords: ['form', 'field', 'input', 'edit', 'create'] },
  { type: 'description', keywords: ['description', 'details', 'info', 'summary', '说明'] },
];

function normalizeText(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function createWeakInferenceWarning(message: string, location: PositionRange | undefined): ParseWarning {
  return {
    code: 'unsupported-module-type',
    severity: 'warning',
    message,
    location,
  };
}

export function classifyModuleType(input: ModuleClassificationInput): ModuleClassificationResult {
  const title = normalizeText(input.title);
  const description = normalizeText(input.description);
  const searchable = `${title} ${description}`.trim();

  if (!searchable) {
    return {
      type: 'section',
      warnings: [
        createWeakInferenceWarning('Module type inference is weak: no title/description was provided. Fallback to "section".', input.location),
      ],
    };
  }

  const matchedRules = MODULE_TYPE_RULES.filter((rule) =>
    rule.keywords.some((keyword) => searchable.includes(keyword)),
  );

  if (matchedRules.length === 1) {
    return {
      type: matchedRules[0].type,
      warnings: [],
    };
  }

  if (matchedRules.length > 1) {
    return {
      type: matchedRules[0].type,
      warnings: [
        createWeakInferenceWarning(
          `Module type inference is weak: matched multiple module categories (${matchedRules.map((rule) => rule.type).join(', ')}).`,
          input.location,
        ),
      ],
    };
  }

  return {
    type: 'section',
    warnings: [
      createWeakInferenceWarning('Module type inference is weak: no keyword matched. Fallback to "section".', input.location),
    ],
  };
}
