import type {
  ComponentType,
  ModuleType,
  PageType,
  PositionRange,
  Value,
} from './prototype';
import type { ParseWarning } from './warning';

export const INTERACTION_TRIGGERS = [
  'click',
  'submit',
  'change',
  'hover',
  'focus',
  'load',
  'custom',
] as const;

export type InteractionTrigger = (typeof INTERACTION_TRIGGERS)[number];

export interface ParsedInteraction {
  id: string;
  trigger: InteractionTrigger;
  sourceComponentId: string;
  targetComponentId?: string;
  action: string;
  payload?: Record<string, Value>;
  location?: PositionRange;
}

export interface ParsedComponent {
  id: string;
  type: ComponentType;
  label?: string;
  props: Record<string, Value>;
  interactions: ParsedInteraction[];
  location?: PositionRange;
}

export interface ParsedModule {
  id: string;
  type: ModuleType;
  title?: string;
  description?: string;
  components: ParsedComponent[];
  metadata?: Record<string, Value>;
  location?: PositionRange;
}

export interface ParsedPage {
  id: string;
  name: string;
  type: PageType;
  route?: string;
  modules: ParsedModule[];
  metadata?: Record<string, Value>;
  location?: PositionRange;
}

export interface ParsedDocument {
  source: string;
  pages: ParsedPage[];
  interactions: ParsedInteraction[];
  warnings: ParseWarning[];
  metadata?: Record<string, Value>;
}
