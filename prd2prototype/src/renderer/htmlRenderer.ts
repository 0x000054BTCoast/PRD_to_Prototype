import type { RenderBlock, RenderPage } from '../types/layout';

export interface HtmlRenderOptions {
  title?: string;
  showLabels?: boolean;
  includeMetadata?: boolean;
  inlineStyles?: boolean;
}

const DEFAULT_PAGE_WIDTH = 1440;
const DEFAULT_PAGE_HEIGHT = 720;
const PAGE_PADDING = 24;

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function resolveLabel(block: RenderBlock): string {
  if (block.module?.title) {
    return block.module.title;
  }

  if (block.component?.label) {
    return block.component.label;
  }

  if (block.module?.type) {
    return block.module.type;
  }

  if (block.component?.type) {
    return block.component.type;
  }

  return block.kind;
}

function toStyle(frame: RenderBlock['frame']): string {
  return [
    `left:${frame.x}px`,
    `top:${frame.y}px`,
    `width:${frame.width}px`,
    `min-height:${frame.height}px`,
  ].join(';');
}

function renderBlock(block: RenderBlock, showLabels: boolean, inlineStyles: boolean): string {
  const label = escapeHtml(resolveLabel(block));
  const children = block.children.map((child) => renderBlock(child, showLabels, inlineStyles)).join('');

  const className = inlineStyles ? '' : ` class="wireframe-block kind-${block.kind}"`;
  const inlineSurfaceStyles = inlineStyles
    ? `;position:absolute;border-radius:10px;border:1px solid ${block.kind === 'component' ? '#fdba74' : '#dbeafe'};background:${block.kind === 'component' ? '#fff7ed' : '#eff6ff'};padding-top:2px`
    : '';
  const labelStyle = inlineStyles
    ? ' style="display:inline-flex;margin:8px;padding:2px 8px;border-radius:999px;background:rgba(15, 23, 42, 0.08);font-size:12px;line-height:18px;color:#334155"'
    : ' class="wireframe-label"';

  return [
    `<article${className} data-block-id="${escapeHtml(block.id)}" style="${toStyle(block.frame)}${inlineSurfaceStyles}">`,
    showLabels ? `<header${labelStyle}>${label}</header>` : '',
    children,
    '</article>',
  ].join('');
}

function resolvePageWidth(renderPage: RenderPage): number {
  const metadataWidth = renderPage.page.metadata?.pageWidth;
  return typeof metadataWidth === 'number' ? metadataWidth : DEFAULT_PAGE_WIDTH;
}

function resolvePageHeight(renderPage: RenderPage): number {
  const maxModuleBottom = renderPage.blocks.reduce((maxBottom, block) => {
    return Math.max(maxBottom, block.frame.y + block.frame.height);
  }, 0);

  return Math.max(maxModuleBottom + PAGE_PADDING, DEFAULT_PAGE_HEIGHT);
}

function renderMetadata(renderPage: RenderPage, inlineStyles: boolean): string {
  const metadataEntries = Object.entries(renderPage.page.metadata ?? {});

  if (metadataEntries.length === 0) {
    return '';
  }

  const rows = metadataEntries
    .map(([key, value]) => {
      const content = typeof value === 'string' ? value : JSON.stringify(value);
      return `<li><strong>${escapeHtml(key)}:</strong> ${escapeHtml(content)}</li>`;
    })
    .join('');

  if (inlineStyles) {
    return `<section style="margin-top:16px;padding:12px 16px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;width:fit-content;max-width:100%;font-size:13px"><h2 style="margin:0 0 8px;font-size:13px;color:#475569;text-transform:uppercase;letter-spacing:0.04em">Page metadata</h2><ul style="margin:0;padding-left:16px">${rows}</ul></section>`;
  }

  return `<section class="wireframe-meta"><h2>Page metadata</h2><ul>${rows}</ul></section>`;
}

function renderStyles(): string {
  return `<style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      font-family: Inter, "Segoe UI", Roboto, Arial, sans-serif;
      background: #f8fafc;
      color: #0f172a;
    }
    .wireframe-page-title {
      margin: 0 0 6px;
      font-size: 20px;
      font-weight: 600;
    }
    .wireframe-page-subtitle {
      margin: 0 0 16px;
      font-size: 13px;
      color: #64748b;
    }
    .wireframe-surface {
      position: relative;
      width: var(--surface-width);
      min-height: var(--surface-height);
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      background: #ffffff;
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
      overflow: hidden;
    }
    .wireframe-block {
      position: absolute;
      border-radius: 10px;
      border: 1px solid #dbeafe;
      background: #eff6ff;
      padding-top: 2px;
    }
    .wireframe-block.kind-component {
      border-style: dashed;
      border-color: #fdba74;
      background: #fff7ed;
    }
    .wireframe-label {
      display: inline-flex;
      margin: 8px;
      padding: 2px 8px;
      border-radius: 999px;
      background: rgba(15, 23, 42, 0.08);
      font-size: 12px;
      line-height: 18px;
      color: #334155;
    }
    .wireframe-meta {
      margin-top: 16px;
      padding: 12px 16px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      background: #fff;
      width: fit-content;
      max-width: 100%;
      font-size: 13px;
    }
    .wireframe-meta h2 {
      margin: 0 0 8px;
      font-size: 13px;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .wireframe-meta ul {
      margin: 0;
      padding-left: 16px;
    }
  </style>`;
}

export function renderPageToHtml(renderPage: RenderPage, options: HtmlRenderOptions = {}): string {
  const showLabels = options.showLabels ?? true;
  const inlineStyles = options.inlineStyles ?? false;
  const pageWidth = resolvePageWidth(renderPage);
  const pageHeight = resolvePageHeight(renderPage);
  const title = options.title ?? `${renderPage.page.name} Prototype`;

  const blocks = renderPage.blocks
    .map((block) => renderBlock(block, showLabels, inlineStyles))
    .join('');
  const bodyStyle = inlineStyles
    ? ' style="margin:0;padding:24px;font-family:Inter, \"Segoe UI\", Roboto, Arial, sans-serif;background:#f8fafc;color:#0f172a"'
    : '';
  const titleStyle = inlineStyles
    ? ' style="margin:0 0 6px;font-size:20px;font-weight:600"'
    : ' class="wireframe-page-title"';
  const subtitleStyle = inlineStyles
    ? ' style="margin:0 0 16px;font-size:13px;color:#64748b"'
    : ' class="wireframe-page-subtitle"';
  const surfaceStyle = inlineStyles
    ? ` style="position:relative;width:${pageWidth}px;min-height:${pageHeight}px;border:1px solid #cbd5e1;border-radius:12px;background:#ffffff;box-shadow:0 12px 32px rgba(15, 23, 42, 0.08);overflow:hidden"`
    : ` class="wireframe-surface" style="--surface-width:${pageWidth}px;--surface-height:${pageHeight}px"`;

  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="UTF-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    `<title>${escapeHtml(title)}</title>`,
    inlineStyles ? '' : renderStyles(),
    '</head>',
    `<body${bodyStyle}>`,
    `<h1${titleStyle}>${escapeHtml(renderPage.page.name)}</h1>`,
    `<p${subtitleStyle}>Type: ${escapeHtml(renderPage.page.type)}${renderPage.page.route ? ` · Route: ${escapeHtml(renderPage.page.route)}` : ''}</p>`,
    `<main${surfaceStyle}>${blocks}</main>`,
    options.includeMetadata ? renderMetadata(renderPage, inlineStyles) : '',
    '</body>',
    '</html>',
  ].join('');
}

export function renderPagesToHtmlDocument(
  renderPages: readonly RenderPage[],
  options: HtmlRenderOptions = {},
): Record<string, string> {
  return renderPages.reduce<Record<string, string>>((acc, page, index) => {
    const fallbackName = `page-${index + 1}`;
    const baseName = page.page.route?.replaceAll('/', '-') || page.page.name || fallbackName;
    const safeFileName = baseName
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '') || fallbackName;

    acc[`${safeFileName}.html`] = renderPageToHtml(page, options);
    return acc;
  }, {});
}
