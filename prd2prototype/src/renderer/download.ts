import type { ParsedDocument, ParsedInteraction, ParsedPage } from '../types/parser';
import type { RenderPage } from '../types/layout';
import { renderPageToHtml } from './htmlRenderer';
import { renderPageToSvg } from './svgRenderer';

export type ExportFormat = 'json' | 'html' | 'svg';
export type ExportScope = 'current' | 'all';

export interface ExportOptions {
  format: ExportFormat;
  scope: ExportScope;
  inlineStyles: boolean;
  showLabels: boolean;
  projectName?: string;
  selectedPageId?: string | null;
}

interface ExportContext {
  document: ParsedDocument;
  renderPages: readonly RenderPage[];
}

const FALLBACK_BASE_NAME = 'prototype';

export function sanitizeFileName(input: string, fallback = FALLBACK_BASE_NAME): string {
  const normalized = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || fallback;
}

function triggerLocalDownload(fileName: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 0);
}

function getScopedPages(renderPages: readonly RenderPage[], options: ExportOptions): RenderPage[] {
  if (options.scope === 'all') {
    return [...renderPages];
  }

  if (!options.selectedPageId) {
    return renderPages.length > 0 ? [renderPages[0]] : [];
  }

  const match = renderPages.find((page) => page.page.id === options.selectedPageId);
  return match ? [match] : renderPages.slice(0, 1);
}

function collectPageComponentIds(page: ParsedPage): Set<string> {
  const ids = new Set<string>();

  for (const module of page.modules) {
    for (const component of module.components) {
      ids.add(component.id);
    }
  }

  return ids;
}

function getScopedInteractions(pages: readonly ParsedPage[], interactions: readonly ParsedInteraction[]): ParsedInteraction[] {
  const componentIds = new Set<string>();

  for (const page of pages) {
    const pageComponentIds = collectPageComponentIds(page);

    for (const id of pageComponentIds) {
      componentIds.add(id);
    }
  }

  return interactions.filter((interaction) => {
    const hasSource = componentIds.has(interaction.sourceComponentId);
    const hasTarget = interaction.targetComponentId ? componentIds.has(interaction.targetComponentId) : true;

    return hasSource && hasTarget;
  });
}

function toStructureJson(context: ExportContext, options: ExportOptions): string {
  const scopedRenderPages = getScopedPages(context.renderPages, options);
  const scopedPageIds = new Set(scopedRenderPages.map((page) => page.page.id));
  const pages = context.document.pages.filter((page) => scopedPageIds.has(page.id));

  const payload: ParsedDocument = {
    ...context.document,
    pages,
    interactions: getScopedInteractions(pages, context.document.interactions),
  };

  return `${JSON.stringify(payload, null, 2)}\n`;
}

function toHtml(context: ExportContext, options: ExportOptions): string {
  const pages = getScopedPages(context.renderPages, options);

  return pages
    .map((page) =>
      renderPageToHtml(page, {
        showLabels: options.showLabels,
        includeMetadata: true,
        inlineStyles: options.inlineStyles,
        title: `${page.page.name} Prototype`,
      }),
    )
    .join('\n\n');
}

function toSvg(context: ExportContext, options: ExportOptions): string {
  const pages = getScopedPages(context.renderPages, options);

  return pages
    .map((page) =>
      renderPageToSvg(page, {
        showLabels: options.showLabels,
        includeMetadata: true,
        inlineStyles: options.inlineStyles,
        title: `${page.page.name} Prototype`,
      }),
    )
    .join('\n\n');
}

function resolveFileName(options: ExportOptions): string {
  const safeBase = sanitizeFileName(options.projectName || FALLBACK_BASE_NAME, FALLBACK_BASE_NAME);

  if (options.format === 'json') {
    return options.scope === 'all' ? 'structure.json' : `${safeBase}-structure.json`;
  }

  if (options.format === 'html') {
    return options.scope === 'all' ? 'prototype.html' : `${safeBase}-prototype.html`;
  }

  return options.scope === 'all' ? 'prototype.svg' : `${safeBase}-prototype.svg`;
}

function resolveMimeType(format: ExportFormat): string {
  if (format === 'json') {
    return 'application/json;charset=utf-8';
  }

  if (format === 'html') {
    return 'text/html;charset=utf-8';
  }

  return 'image/svg+xml;charset=utf-8';
}

export function exportPrototypeLocally(context: ExportContext, options: ExportOptions): string {
  const content =
    options.format === 'json' ? toStructureJson(context, options) : options.format === 'html' ? toHtml(context, options) : toSvg(context, options);

  const fileName = resolveFileName(options);
  triggerLocalDownload(fileName, content, resolveMimeType(options.format));

  return fileName;
}
