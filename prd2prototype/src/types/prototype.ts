/**
 * Shared type primitives for parser, classifier, layout, and renderer pipelines.
 */

export const PAGE_TYPES = [
  'landing',
  'marketing',
  'dashboard',
  'authentication',
  'settings',
  'detail',
  'list',
  'checkout',
  'custom',
] as const;

export type PageType = (typeof PAGE_TYPES)[number];

export const MODULE_TYPES = [
  'header',
  'hero',
  'feature-grid',
  'content',
  'metrics',
  'pricing',
  'testimonial',
  'faq',
  'gallery',
  'form',
  'cta',
  'footer',
  'custom',
] as const;

export type ModuleType = (typeof MODULE_TYPES)[number];

export const COMPONENT_TYPES = [
  'heading',
  'text',
  'image',
  'button',
  'link',
  'icon',
  'badge',
  'tag',
  'input',
  'textarea',
  'select',
  'checkbox',
  'radio',
  'switch',
  'card',
  'list',
  'table',
  'tabs',
  'accordion',
  'chart',
  'divider',
  'spacer',
  'container',
  'custom',
] as const;

export type ComponentType = (typeof COMPONENT_TYPES)[number];

export type Primitive = string | number | boolean | null;

export type Value = Primitive | Value[] | { [key: string]: Value };

export interface PositionRange {
  startLine: number;
  endLine: number;
}

export interface EntityRef {
  id: string;
  name?: string;
}
