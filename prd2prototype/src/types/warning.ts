import type { PositionRange } from './prototype';

export const WARNING_SEVERITIES = ['info', 'warning', 'error'] as const;

export type WarningSeverity = (typeof WARNING_SEVERITIES)[number];

export const PARSE_WARNING_CODES = [
  'parse-failure',
  'missing-section',
  'unsupported-page-type',
  'unsupported-module-type',
  'unsupported-component-type',
  'invalid-interaction',
  'missing-required-field',
  'duplicate-identifier',
  'ambiguous-content',
] as const;

export type ParseWarningCode = (typeof PARSE_WARNING_CODES)[number];

export interface ParseWarning {
  code: ParseWarningCode;
  severity: WarningSeverity;
  message: string;
  location?: PositionRange;
  entityId?: string;
  suggestion?: string;
}
