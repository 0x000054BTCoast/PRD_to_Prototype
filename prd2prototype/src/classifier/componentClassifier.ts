import type { PositionRange } from '../types/prototype';
import type { ParseWarning } from '../types/warning';

export const CLASSIFIED_COMPONENT_TYPES = [
  'input',
  'search',
  'select',
  'datePicker',
  'button',
  'table',
  'image',
  'tag',
  'switch',
  'text',
  'number',
  'container',
] as const;

export type ClassifiedComponentType = (typeof CLASSIFIED_COMPONENT_TYPES)[number];

export interface ComponentClassificationInput {
  label?: string;
  hints?: string[];
  location?: PositionRange;
}

export interface ComponentClassificationResult {
  type: ClassifiedComponentType;
  warnings: ParseWarning[];
}

interface TypeRule {
  type: Exclude<ClassifiedComponentType, 'container'>;
  keywords: readonly string[];
}

const COMPONENT_TYPE_RULES: readonly TypeRule[] = [
  { type: 'search', keywords: ['search', 'lookup', 'query', '检索'] },
  { type: 'datePicker', keywords: ['date', 'time', 'calendar', '日期'] },
  { type: 'select', keywords: ['select', 'dropdown', 'choose', 'option'] },
  { type: 'switch', keywords: ['switch', 'toggle', 'enable', 'disable'] },
  { type: 'button', keywords: ['button', 'submit', 'save', 'cancel', 'confirm'] },
  { type: 'table', keywords: ['table', 'grid', 'rows', 'columns'] },
  { type: 'image', keywords: ['image', 'avatar', 'photo', 'icon', 'logo'] },
  { type: 'tag', keywords: ['tag', 'badge', 'label', 'status'] },
  { type: 'number', keywords: ['number', 'count', 'amount', 'price', 'qty'] },
  { type: 'text', keywords: ['text', 'paragraph', 'description', 'title', 'name'] },
  { type: 'input', keywords: ['input', 'field', 'enter', '填写'] },
];

function normalizeText(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function createWeakInferenceWarning(message: string, location: PositionRange | undefined): ParseWarning {
  return {
    code: 'unsupported-component-type',
    severity: 'warning',
    message,
    location,
  };
}

export function classifyComponentType(input: ComponentClassificationInput): ComponentClassificationResult {
  const tokens = [input.label, ...(input.hints ?? [])].map(normalizeText).filter(Boolean);
  const searchable = tokens.join(' ').trim();

  if (!searchable) {
    return {
      type: 'container',
      warnings: [
        createWeakInferenceWarning('Component type inference is weak: no label/hints were provided. Fallback to "container".', input.location),
      ],
    };
  }

  const matchedRules = COMPONENT_TYPE_RULES.filter((rule) =>
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
          `Component type inference is weak: matched multiple component categories (${matchedRules
            .map((rule) => rule.type)
            .join(', ')}).`,
          input.location,
        ),
      ],
    };
  }

  return {
    type: 'container',
    warnings: [
      createWeakInferenceWarning('Component type inference is weak: no keyword matched. Fallback to "container".', input.location),
    ],
  };
}
