import type {
  ParsedComponent,
  ParsedDocument,
  ParsedInteraction,
  ParsedModule,
  ParsedPage,
} from '../types/parser';
import type { InteractionTrigger } from '../types/parser';
import type { ParseWarning } from '../types/warning';

const LABEL_ALIASES = {
  PAGE: ['PAGE', 'Page', 'page', '页面'],
  MODULE: ['MODULE', 'Module', 'module', '模块'],
  COMPONENT: ['COMPONENT', 'Component', 'component', '组件', '控件', '字段'],
  INTERACTION: ['INTERACTION', 'Interaction', 'interaction', '交互', '操作', '行为'],
} as const;

type ExplicitLabel = keyof typeof LABEL_ALIASES;

interface ParsedLabelLine {
  label: ExplicitLabel;
  value: string;
}

interface ParseContext {
  pages: ParsedPage[];
  interactions: ParsedInteraction[];
  warnings: ParseWarning[];
  currentPage?: ParsedPage;
  currentModule?: ParsedModule;
  currentComponent?: ParsedComponent;
}

const INTERACTION_PREFIX: ReadonlyArray<InteractionTrigger> = [
  'click',
  'submit',
  'change',
  'hover',
  'focus',
  'load',
  'custom',
];

const LABEL_PATTERN = new RegExp(
  `^\\s*(${Object.values(LABEL_ALIASES)
    .flat()
    .sort((left, right) => right.length - left.length)
    .map(escapeRegExp)
    .join('|')})\\s*[:：]\\s*(.*?)\\s*$`,
  'i',
);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createId(prefix: string, seed: string, index: number): string {
  const normalizedSeed = seed
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);

  const suffix = normalizedSeed || `${prefix}-${index}`;
  return `${prefix}-${suffix}-${index}`;
}

function parseLabelLine(line: string): ParsedLabelLine | undefined {
  const matched = line.match(LABEL_PATTERN);
  if (!matched) {
    return undefined;
  }

  const alias = matched[1];
  const value = matched[2]?.trim() ?? '';
  const normalizedLabel = (Object.entries(LABEL_ALIASES).find(([, aliases]) =>
    aliases.some((candidate) => candidate.toLowerCase() === alias.toLowerCase()),
  )?.[0] ?? 'PAGE') as ExplicitLabel;

  return {
    label: normalizedLabel,
    value,
  };
}

function createWarning(message: string, line: number, code: ParseWarning['code'] = 'ambiguous-content'): ParseWarning {
  return {
    code,
    severity: 'warning',
    message,
    location: {
      startLine: line,
      endLine: line,
    },
  };
}

function parseInteractionContent(value: string): { trigger: InteractionTrigger; action: string } | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const tokenized = trimmed.split(/\s+/);
  const first = tokenized[0]?.toLowerCase();
  const trigger = INTERACTION_PREFIX.find((candidate) => candidate === first) ?? 'custom';
  const action = trigger === 'custom' ? trimmed : tokenized.slice(1).join(' ').trim();

  return {
    trigger,
    action: action || trimmed,
  };
}

function attachComponentToModule(context: ParseContext, component: ParsedComponent): boolean {
  if (context.currentModule) {
    context.currentModule.components.push(component);
    return true;
  }

  if (!context.currentPage) {
    return false;
  }

  const fallbackModule: ParsedModule = {
    id: createId('module', 'auto', context.currentPage.modules.length + 1),
    type: 'custom',
    title: 'Auto Module',
    components: [component],
  };

  context.currentPage.modules.push(fallbackModule);
  context.currentModule = fallbackModule;

  return true;
}

function parseExplicitLabelLine(parsedLine: ParsedLabelLine, context: ParseContext, lineNumber: number): void {
  if (!parsedLine.value) {
    context.warnings.push(createWarning(`${parsedLine.label} label is missing a value.`, lineNumber, 'missing-required-field'));
    return;
  }

  if (parsedLine.label === 'PAGE') {
    const page: ParsedPage = {
      id: createId('page', parsedLine.value, context.pages.length + 1),
      name: parsedLine.value,
      type: 'custom',
      modules: [],
      location: { startLine: lineNumber, endLine: lineNumber },
    };

    context.pages.push(page);
    context.currentPage = page;
    context.currentModule = undefined;
    context.currentComponent = undefined;
    return;
  }

  if (parsedLine.label === 'MODULE') {
    if (!context.currentPage) {
      context.warnings.push(createWarning('Module appears before any page. Ignored.', lineNumber, 'missing-section'));
      return;
    }

    const module: ParsedModule = {
      id: createId('module', parsedLine.value, context.currentPage.modules.length + 1),
      type: 'custom',
      title: parsedLine.value,
      components: [],
      location: { startLine: lineNumber, endLine: lineNumber },
    };

    context.currentPage.modules.push(module);
    context.currentModule = module;
    context.currentComponent = undefined;
    return;
  }

  if (parsedLine.label === 'COMPONENT') {
    const component: ParsedComponent = {
      id: createId('component', parsedLine.value, (context.currentModule?.components.length ?? 0) + 1),
      type: 'custom',
      label: parsedLine.value,
      props: {},
      interactions: [],
      location: { startLine: lineNumber, endLine: lineNumber },
    };

    const attached = attachComponentToModule(context, component);
    if (!attached) {
      context.warnings.push(createWarning('Component appears before page/module context. Ignored.', lineNumber, 'missing-section'));
      return;
    }

    context.currentComponent = component;
    return;
  }

  if (parsedLine.label === 'INTERACTION') {
    const parsedInteraction = parseInteractionContent(parsedLine.value);
    if (!parsedInteraction) {
      context.warnings.push(createWarning('Interaction line is empty.', lineNumber, 'invalid-interaction'));
      return;
    }

    if (!context.currentComponent) {
      context.warnings.push(createWarning('Interaction cannot be attached because no component is active.', lineNumber, 'missing-section'));
      return;
    }

    const interaction: ParsedInteraction = {
      id: createId('interaction', parsedLine.value, context.currentComponent.interactions.length + 1),
      trigger: parsedInteraction.trigger,
      sourceComponentId: context.currentComponent.id,
      action: parsedInteraction.action,
      location: { startLine: lineNumber, endLine: lineNumber },
    };

    context.currentComponent.interactions.push(interaction);
    context.interactions.push(interaction);
    return;
  }
}

export function parseExplicitLabelDocument(normalizedText: string): ParsedDocument {
  const context: ParseContext = {
    pages: [],
    interactions: [],
    warnings: [],
  };

  const lines = normalizedText.split('\n');

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) {
      return;
    }

    const parsedLine = parseLabelLine(line);
    if (!parsedLine) {
      return;
    }

    parseExplicitLabelLine(parsedLine, context, index + 1);
  });

  return {
    source: normalizedText,
    pages: context.pages,
    interactions: context.interactions,
    warnings: context.warnings,
  };
}
