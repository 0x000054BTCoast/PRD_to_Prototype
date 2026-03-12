import type { ParsedComponent, ParsedDocument, ParsedModule, ParsedPage } from '../types/parser';
import type { ParseWarning } from '../types/warning';

interface IndentLine {
  lineNumber: number;
  leadingSpaces: number;
  content: string;
}

interface TreeNodeRef {
  depth: number;
  kind: 'page' | 'module' | 'component';
  pageIndex: number;
  moduleIndex?: number;
  componentIndex?: number;
}

interface IndentParseContext {
  pages: ParsedPage[];
  warnings: ParseWarning[];
  stack: TreeNodeRef[];
  indentUnit: number;
}

function createId(prefix: string, value: string, index: number): string {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

  return `${prefix}-${normalized || index}-${index}`;
}

function createWarning(message: string, lineNumber: number): ParseWarning {
  return {
    code: 'ambiguous-content',
    severity: 'warning',
    message,
    location: {
      startLine: lineNumber,
      endLine: lineNumber,
    },
  };
}

function gcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);

  while (b !== 0) {
    const temp = b;
    b = a % b;
    a = temp;
  }

  return a;
}

function parseIndentLines(text: string): IndentLine[] {
  return text
    .split('\n')
    .map((line, index) => ({
      lineNumber: index + 1,
      leadingSpaces: line.match(/^\s*/)?.[0].length ?? 0,
      content: line.trim(),
    }))
    .filter((line) => line.content.length > 0);
}

function inferIndentUnit(lines: IndentLine[]): number {
  const positiveIndents = lines.map((line) => line.leadingSpaces).filter((indent) => indent > 0);
  if (positiveIndents.length === 0) {
    return 2;
  }

  const base = positiveIndents.reduce((acc, value) => gcd(acc, value));
  return Math.max(1, base || 2);
}

function latestOfKind(context: IndentParseContext, kind: TreeNodeRef['kind']): TreeNodeRef | undefined {
  for (let index = context.stack.length - 1; index >= 0; index -= 1) {
    if (context.stack[index].kind === kind) {
      return context.stack[index];
    }
  }

  return undefined;
}

function addPage(context: IndentParseContext, line: IndentLine): TreeNodeRef {
  const page: ParsedPage = {
    id: createId('page', line.content, context.pages.length + 1),
    name: line.content,
    type: 'custom',
    modules: [],
    location: { startLine: line.lineNumber, endLine: line.lineNumber },
  };

  context.pages.push(page);
  return {
    depth: 0,
    kind: 'page',
    pageIndex: context.pages.length - 1,
  };
}

function addModule(context: IndentParseContext, line: IndentLine, depth: number): TreeNodeRef {
  const activePage = latestOfKind(context, 'page');

  if (!activePage) {
    const pageNode = addPage(context, {
      ...line,
      content: 'Untitled Page',
    });
    context.stack = [pageNode];
    context.warnings.push(createWarning('Indented module found before any page. Created an implicit page.', line.lineNumber));
  }

  const pageNode = latestOfKind(context, 'page') as TreeNodeRef;
  const page = context.pages[pageNode.pageIndex];

  const module: ParsedModule = {
    id: createId('module', line.content, page.modules.length + 1),
    type: 'custom',
    title: line.content,
    components: [],
    location: { startLine: line.lineNumber, endLine: line.lineNumber },
  };

  page.modules.push(module);
  return {
    depth,
    kind: 'module',
    pageIndex: pageNode.pageIndex,
    moduleIndex: page.modules.length - 1,
  };
}

function addComponent(context: IndentParseContext, line: IndentLine, depth: number): TreeNodeRef {
  let activeModule = latestOfKind(context, 'module');
  if (!activeModule) {
    const moduleNode = addModule(
      context,
      {
        ...line,
        content: 'Untitled Module',
      },
      1,
    );
    context.stack = [...context.stack.filter((node) => node.kind === 'page'), moduleNode];
    context.warnings.push(createWarning('Component found without an active module. Created an implicit module.', line.lineNumber));
    activeModule = moduleNode;
  }

  const page = context.pages[activeModule.pageIndex];
  const module = page.modules[activeModule.moduleIndex as number];

  const component: ParsedComponent = {
    id: createId('component', line.content, module.components.length + 1),
    type: 'custom',
    label: line.content,
    props: {},
    interactions: [],
    location: { startLine: line.lineNumber, endLine: line.lineNumber },
  };

  module.components.push(component);
  return {
    depth,
    kind: 'component',
    pageIndex: activeModule.pageIndex,
    moduleIndex: activeModule.moduleIndex,
    componentIndex: module.components.length - 1,
  };
}

function appendHint(context: IndentParseContext, line: IndentLine): void {
  const activeComponent = latestOfKind(context, 'component');
  if (activeComponent) {
    const component =
      context.pages[activeComponent.pageIndex].modules[activeComponent.moduleIndex as number].components[
        activeComponent.componentIndex as number
      ];
    const existingHints = component.props.hints;
    const normalizedHints = Array.isArray(existingHints) ? existingHints.filter((value) => typeof value === 'string') : [];
    component.props.hints = [...normalizedHints, line.content];
    return;
  }

  const activeModule = latestOfKind(context, 'module');
  if (activeModule) {
    const module = context.pages[activeModule.pageIndex].modules[activeModule.moduleIndex as number];
    module.description = module.description ? `${module.description}\n${line.content}` : line.content;
    return;
  }

  context.warnings.push(createWarning('Deeply indented line has no matching context and was ignored.', line.lineNumber));
}

export function parseIndentDocument(text: string): ParsedDocument {
  const lines = parseIndentLines(text);
  const context: IndentParseContext = {
    pages: [],
    warnings: [],
    stack: [],
    indentUnit: inferIndentUnit(lines),
  };

  for (const line of lines) {
    if (line.leadingSpaces % context.indentUnit !== 0) {
      context.warnings.push(
        createWarning(
          `Line indentation (${line.leadingSpaces} spaces) is not a multiple of inferred indent unit (${context.indentUnit}).`,
          line.lineNumber,
        ),
      );
    }

    const depth = Math.max(0, Math.floor(line.leadingSpaces / context.indentUnit));
    context.stack = context.stack.filter((node) => node.depth < depth);

    if (depth === 0) {
      const pageNode = addPage(context, line);
      context.stack.push(pageNode);
      continue;
    }

    if (depth === 1) {
      const moduleNode = addModule(context, line, depth);
      context.stack.push(moduleNode);
      continue;
    }

    if (depth === 2) {
      const componentNode = addComponent(context, line, depth);
      context.stack.push(componentNode);
      continue;
    }

    appendHint(context, line);
  }

  return {
    source: text,
    pages: context.pages,
    interactions: [],
    warnings: context.warnings,
  };
}
