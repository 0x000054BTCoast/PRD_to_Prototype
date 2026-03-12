import type {
  ParsedComponent,
  ParsedDocument,
  ParsedInteraction,
  ParsedModule,
  ParsedPage,
} from '../types/parser';
import type { Value } from '../types/prototype';
import type { ParseWarning } from '../types/warning';

export type PartialParsedDocument = Partial<ParsedDocument> | null | undefined;

interface NormalizeContext {
  warnings: ParseWarning[];
  idState: Record<string, number>;
  componentIdAlias: Map<string, string>;
}

function createWarning(message: string, code: ParseWarning['code'] = 'ambiguous-content'): ParseWarning {
  return {
    code,
    severity: 'warning',
    message,
  };
}

function normalizeSlug(value: string | undefined, fallback: string): string {
  const cleaned = (value ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return cleaned || fallback;
}

function nextStableId(prefix: string, seed: string, idState: Record<string, number>): string {
  const normalizedSeed = normalizeSlug(seed, prefix);
  const key = `${prefix}:${normalizedSeed}`;
  const index = (idState[key] ?? 0) + 1;
  idState[key] = index;
  return `${prefix}-${normalizedSeed}-${index}`;
}

function isRecord(value: unknown): value is Record<string, Value> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function mergeMetadata(
  left?: Record<string, Value>,
  right?: Record<string, Value>,
): Record<string, Value> | undefined {
  if (!isRecord(left) && !isRecord(right)) {
    return undefined;
  }

  return {
    ...(isRecord(left) ? left : {}),
    ...(isRecord(right) ? right : {}),
  };
}

function mergeMetadataList(values: ReadonlyArray<Record<string, Value> | undefined>): Record<string, Value> | undefined {
  return values.reduce<Record<string, Value> | undefined>((accumulator, value) => mergeMetadata(accumulator, value), undefined);
}

function samePage(left: ParsedPage, right: ParsedPage): boolean {
  return (
    normalizeSlug(left.name, 'page') === normalizeSlug(right.name, 'page')
    && left.type === right.type
    && (left.route ?? '') === (right.route ?? '')
  );
}

function sameModule(left: ParsedModule, right: ParsedModule): boolean {
  return (
    normalizeSlug(left.title, 'module') === normalizeSlug(right.title, 'module')
    && left.type === right.type
  );
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(',')}]`;
  }

  if (!value || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  return `{${Object.keys(value)
    .sort((left, right) => left.localeCompare(right))
    .map((key) => `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`)
    .join(',')}}`;
}

function sameComponent(left: ParsedComponent, right: ParsedComponent): boolean {
  return (
    normalizeSlug(left.label, 'component') === normalizeSlug(right.label, 'component')
    && left.type === right.type
    && stableJson(left.props) === stableJson(right.props)
  );
}

function mergeAdjacentDuplicates<T>(
  items: T[],
  isSame: (left: T, right: T) => boolean,
  merge: (left: T, right: T) => T,
): T[] {
  return items.reduce<T[]>((accumulator, item) => {
    const previous = accumulator[accumulator.length - 1];
    if (previous && isSame(previous, item)) {
      accumulator[accumulator.length - 1] = merge(previous, item);
      return accumulator;
    }

    accumulator.push(item);
    return accumulator;
  }, []);
}

function normalizeInteraction(
  interaction: Partial<ParsedInteraction>,
  defaultSourceComponentId: string,
  context: NormalizeContext,
): ParsedInteraction {
  const rawSourceId = interaction.sourceComponentId;
  const mappedSourceId = (rawSourceId && context.componentIdAlias.get(rawSourceId)) ?? defaultSourceComponentId;

  if (!rawSourceId) {
    context.warnings.push(createWarning('Interaction source component was missing and was repaired using the owning component.', 'missing-section'));
  }

  const targetComponentId = interaction.targetComponentId
    ? (context.componentIdAlias.get(interaction.targetComponentId) ?? interaction.targetComponentId)
    : undefined;

  return {
    id: nextStableId('interaction', interaction.action ?? interaction.id ?? 'interaction', context.idState),
    trigger: interaction.trigger ?? 'custom',
    sourceComponentId: mappedSourceId,
    targetComponentId,
    action: interaction.action?.trim() || 'unspecified action',
    payload: isRecord(interaction.payload) ? interaction.payload : undefined,
    location: interaction.location,
  };
}

function normalizeComponent(component: Partial<ParsedComponent>, context: NormalizeContext): ParsedComponent {
  const label = component.label?.trim() || 'Untitled Component';
  const id = nextStableId('component', label, context.idState);

  if (!component.label?.trim()) {
    context.warnings.push(createWarning('Component label was missing and replaced with "Untitled Component".', 'missing-required-field'));
  }

  if (component.id) {
    context.componentIdAlias.set(component.id, id);
  }

  const interactions = Array.isArray(component.interactions)
    ? component.interactions.map((entry) => normalizeInteraction(entry, id, context))
    : [];

  return {
    id,
    type: component.type ?? 'custom',
    label,
    props: isRecord(component.props) ? component.props : {},
    interactions,
    location: component.location,
  };
}

function normalizeModule(module: Partial<ParsedModule>, context: NormalizeContext): ParsedModule {
  const title = module.title?.trim() || 'Untitled Module';
  const components = Array.isArray(module.components)
    ? module.components.map((component) => normalizeComponent(component, context))
    : [];

  const deduplicatedComponents = mergeAdjacentDuplicates(
    components,
    sameComponent,
    (left, right) => ({
      ...left,
      interactions: [...left.interactions, ...right.interactions],
      location: left.location ?? right.location,
    }),
  );

  if (deduplicatedComponents.length !== components.length) {
    context.warnings.push(createWarning(`Merged ${components.length - deduplicatedComponents.length} adjacent duplicate component(s).`, 'ambiguous-content'));
  }

  return {
    id: nextStableId('module', title, context.idState),
    type: module.type ?? 'custom',
    title,
    description: module.description,
    components: deduplicatedComponents,
    metadata: mergeMetadata(module.metadata),
    location: module.location,
  };
}

function normalizePage(page: Partial<ParsedPage>, context: NormalizeContext): ParsedPage {
  const name = page.name?.trim() || 'Untitled Page';

  const modules = Array.isArray(page.modules)
    ? page.modules.map((module) => normalizeModule(module, context))
    : [];

  if (!modules.length) {
    context.warnings.push(createWarning(`Page "${name}" had no modules. Created a default module.`, 'missing-section'));
    modules.push(
      normalizeModule(
        {
          title: 'Untitled Module',
          type: 'custom',
          components: [],
        },
        context,
      ),
    );
  }

  const deduplicatedModules = mergeAdjacentDuplicates(
    modules,
    sameModule,
    (left, right) => ({
      ...left,
      description: [left.description, right.description].filter(Boolean).join('\n') || undefined,
      components: [...left.components, ...right.components],
      metadata: mergeMetadata(left.metadata, right.metadata),
      location: left.location ?? right.location,
    }),
  );

  if (deduplicatedModules.length !== modules.length) {
    context.warnings.push(createWarning(`Merged ${modules.length - deduplicatedModules.length} adjacent duplicate module(s).`, 'ambiguous-content'));
  }

  return {
    id: nextStableId('page', name, context.idState),
    name,
    type: page.type ?? 'custom',
    route: page.route,
    modules: deduplicatedModules,
    metadata: mergeMetadata(page.metadata),
    location: page.location,
  };
}

function mergeStageWarnings(stageResults: readonly PartialParsedDocument[]): ParseWarning[] {
  return stageResults.flatMap((stage) => (Array.isArray(stage?.warnings) ? stage.warnings : []));
}

export function normalizeStructure(stageResults: readonly PartialParsedDocument[]): ParsedDocument {
  const safeStages = stageResults.filter((stage): stage is Partial<ParsedDocument> => Boolean(stage));

  const context: NormalizeContext = {
    warnings: mergeStageWarnings(stageResults),
    idState: {},
    componentIdAlias: new Map<string, string>(),
  };

  const candidatePages = safeStages.flatMap((stage) => (Array.isArray(stage.pages) ? stage.pages : []));
  let pages = candidatePages.map((page) => normalizePage(page, context));

  if (!pages.length) {
    context.warnings.push(createWarning('No page information was parsed. Created a default page.', 'missing-section'));
    pages = [
      normalizePage(
        {
          name: 'Untitled Page',
          type: 'custom',
          modules: [],
        },
        context,
      ),
    ];
  }

  pages = mergeAdjacentDuplicates(
    pages,
    samePage,
    (left, right) => ({
      ...left,
      modules: [...left.modules, ...right.modules],
      metadata: mergeMetadata(left.metadata, right.metadata),
      location: left.location ?? right.location,
    }),
  );

  const stageInteractions = safeStages.flatMap((stage) => (Array.isArray(stage.interactions) ? stage.interactions : []));
  const documentInteractions = [
    ...pages.flatMap((page) =>
      page.modules.flatMap((module) =>
        module.components.flatMap((component) => component.interactions),
      ),
    ),
    ...stageInteractions.map((interaction) =>
      normalizeInteraction(
        interaction,
        context.componentIdAlias.get(interaction.sourceComponentId) ?? interaction.sourceComponentId,
        context,
      ),
    ),
  ];

  return {
    source: safeStages.map((stage) => stage.source).find((source): source is string => typeof source === 'string') ?? '',
    pages,
    interactions: documentInteractions,
    warnings: context.warnings,
    metadata: mergeMetadataList(safeStages.map((stage) => stage.metadata)),
  };
}
