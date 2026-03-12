import type { PositionRange } from '../types/prototype';
import type { ParseWarning } from '../types/warning';

export const CLASSIFIED_PAGE_TYPES = ['list', 'form', 'detail', 'dashboard', 'config', 'generic'] as const;

export type ClassifiedPageType = (typeof CLASSIFIED_PAGE_TYPES)[number];

export interface PageClassificationInput {
  name?: string;
  route?: string;
  location?: PositionRange;
}

export interface PageClassificationResult {
  type: ClassifiedPageType;
  warnings: ParseWarning[];
}

interface TypeRule {
  type: Exclude<ClassifiedPageType, 'generic'>;
  keywords: readonly string[];
}

const PAGE_TYPE_RULES: readonly TypeRule[] = [
  { type: 'dashboard', keywords: ['dashboard', 'overview', 'kpi', 'metrics', 'analytics', 'home'] },
  { type: 'list', keywords: ['list', 'table', 'grid', 'index', 'results', 'catalog'] },
  { type: 'detail', keywords: ['detail', 'profile', 'summary', 'view', '详情'] },
  { type: 'form', keywords: ['form', 'create', 'edit', 'new', 'register', 'submit'] },
  { type: 'config', keywords: ['config', 'setting', 'preferences', 'admin', 'manage'] },
];

function normalizeText(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function includesKeyword(haystack: string, keyword: string): boolean {
  if (!haystack || !keyword) {
    return false;
  }

  return haystack.includes(keyword);
}

function createWeakInferenceWarning(
  message: string,
  location: PositionRange | undefined,
): ParseWarning {
  return {
    code: 'ambiguous-content',
    severity: 'warning',
    message,
    location,
  };
}

export function classifyPageType(input: PageClassificationInput): PageClassificationResult {
  const name = normalizeText(input.name);
  const route = normalizeText(input.route);
  const searchable = `${name} ${route}`.trim();

  if (!searchable) {
    return {
      type: 'generic',
      warnings: [
        createWeakInferenceWarning('Page type inference is weak: no name or route was provided. Fallback to "generic".', input.location),
      ],
    };
  }

  const matchedRules = PAGE_TYPE_RULES.filter((rule) =>
    rule.keywords.some((keyword) => includesKeyword(searchable, keyword)),
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
          `Page type inference is weak: matched multiple page categories (${matchedRules.map((rule) => rule.type).join(', ')}).`,
          input.location,
        ),
      ],
    };
  }

  return {
    type: 'generic',
    warnings: [
      createWeakInferenceWarning('Page type inference is weak: no keyword matched. Fallback to "generic".', input.location),
    ],
  };
}
