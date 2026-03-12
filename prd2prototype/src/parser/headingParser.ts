import type { ParsedComponent, ParsedDocument, ParsedModule, ParsedPage } from '../types/parser';
import type { ParseWarning } from '../types/warning';

const DOCUMENT_LEVEL_HEADINGS = new Set(['background', 'goal', 'scope', 'notes']);
const MARKDOWN_HEADING = /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/;

interface HeadingLine {
  level: number;
  text: string;
  lineNumber: number;
}

interface HeadingParseContext {
  pages: ParsedPage[];
  warnings: ParseWarning[];
  currentPage?: ParsedPage;
  currentModule?: ParsedModule;
  currentComponent?: ParsedComponent;
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

function parseHeadingLine(line: string, lineNumber: number): HeadingLine | undefined {
  const match = line.match(MARKDOWN_HEADING);
  if (!match) {
    return undefined;
  }

  return {
    level: match[1].length,
    text: match[2].trim(),
    lineNumber,
  };
}

function isDocumentHeading(text: string): boolean {
  return DOCUMENT_LEVEL_HEADINGS.has(text.toLowerCase());
}

function ensurePage(context: HeadingParseContext, line: HeadingLine): ParsedPage {
  if (context.currentPage) {
    return context.currentPage;
  }

  const fallbackPage: ParsedPage = {
    id: createId('page', 'Untitled Page', context.pages.length + 1),
    name: 'Untitled Page',
    type: 'custom',
    modules: [],
    location: { startLine: line.lineNumber, endLine: line.lineNumber },
  };

  context.pages.push(fallbackPage);
  context.currentPage = fallbackPage;
  context.warnings.push(
    createWarning('Module/component heading appeared before a page heading. Created an implicit page.', line.lineNumber),
  );

  return fallbackPage;
}

function ensureModule(context: HeadingParseContext, line: HeadingLine): ParsedModule {
  if (context.currentModule) {
    return context.currentModule;
  }

  const page = ensurePage(context, line);
  const fallbackModule: ParsedModule = {
    id: createId('module', 'Untitled Module', page.modules.length + 1),
    type: 'custom',
    title: 'Untitled Module',
    description: undefined,
    components: [],
    location: { startLine: line.lineNumber, endLine: line.lineNumber },
  };

  page.modules.push(fallbackModule);
  context.currentModule = fallbackModule;
  context.warnings.push(
    createWarning('Component/description heading appeared before a module heading. Created an implicit module.', line.lineNumber),
  );

  return fallbackModule;
}

function appendComponentHint(component: ParsedComponent, hint: string): void {
  const currentHints = component.props.hints;
  const normalizedHints = Array.isArray(currentHints) ? currentHints.filter((value) => typeof value === 'string') : [];
  component.props.hints = [...normalizedHints, hint];
}

function parseHeading(heading: HeadingLine, context: HeadingParseContext): void {
  if (isDocumentHeading(heading.text)) {
    return;
  }

  if (heading.level === 1) {
    const page: ParsedPage = {
      id: createId('page', heading.text, context.pages.length + 1),
      name: heading.text,
      type: 'custom',
      modules: [],
      location: { startLine: heading.lineNumber, endLine: heading.lineNumber },
    };

    context.pages.push(page);
    context.currentPage = page;
    context.currentModule = undefined;
    context.currentComponent = undefined;
    return;
  }

  if (heading.level === 2) {
    const page = ensurePage(context, heading);
    const module: ParsedModule = {
      id: createId('module', heading.text, page.modules.length + 1),
      type: 'custom',
      title: heading.text,
      components: [],
      location: { startLine: heading.lineNumber, endLine: heading.lineNumber },
    };

    page.modules.push(module);
    context.currentModule = module;
    context.currentComponent = undefined;
    return;
  }

  if (heading.level === 3) {
    const module = ensureModule(context, heading);
    const component: ParsedComponent = {
      id: createId('component', heading.text, module.components.length + 1),
      type: 'custom',
      label: heading.text,
      props: {},
      interactions: [],
      location: { startLine: heading.lineNumber, endLine: heading.lineNumber },
    };

    module.components.push(component);
    context.currentComponent = component;
    return;
  }

  if (context.currentComponent) {
    appendComponentHint(context.currentComponent, heading.text);
    return;
  }

  if (context.currentModule) {
    context.currentModule.description = context.currentModule.description
      ? `${context.currentModule.description}\n${heading.text}`
      : heading.text;
    return;
  }

  context.warnings.push(createWarning('Description/interaction heading has no page/module/component context and was ignored.', heading.lineNumber));
}

export function parseHeadingDocument(markdownText: string): ParsedDocument {
  const context: HeadingParseContext = {
    pages: [],
    warnings: [],
  };

  markdownText.split('\n').forEach((line, index) => {
    const parsed = parseHeadingLine(line, index + 1);
    if (!parsed) {
      return;
    }

    parseHeading(parsed, context);
  });

  return {
    source: markdownText,
    pages: context.pages,
    interactions: [],
    warnings: context.warnings,
  };
}
