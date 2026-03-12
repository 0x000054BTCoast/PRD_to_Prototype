import type { ParsedComponent, ParsedModule, ParsedPage } from './parser';
import type { ParseWarning } from './warning';

export const RENDER_BLOCK_KINDS = ['module', 'component'] as const;

export type RenderBlockKind = (typeof RENDER_BLOCK_KINDS)[number];

export interface RenderBlock {
  id: string;
  kind: RenderBlockKind;
  order: number;
  moduleId?: string;
  componentId?: string;
  classes: string[];
  children: RenderBlock[];
  module?: ParsedModule;
  component?: ParsedComponent;
}

export interface RenderPage {
  page: ParsedPage;
  blocks: RenderBlock[];
  warnings: ParseWarning[];
}
