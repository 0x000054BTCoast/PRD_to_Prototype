import type { RenderBlock, RenderPage } from '../types/layout';

export interface SvgRenderOptions {
  title?: string;
  showLabels?: boolean;
  includeMetadata?: boolean;
  inlineStyles?: boolean;
}

const DEFAULT_PAGE_WIDTH = 1440;
const DEFAULT_PAGE_HEIGHT = 720;
const PAGE_PADDING = 24;
const LABEL_X_OFFSET = 10;
const LABEL_Y_OFFSET = 22;

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
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

function toRectClass(block: RenderBlock): string {
  return ['wireframe-block', `kind-${block.kind}`, ...block.classes].join(' ');
}

function renderLabel(block: RenderBlock, inlineStyles: boolean): string {
  const label = escapeXml(resolveLabel(block));

  const className = inlineStyles ? '' : ' class="wireframe-label"';
  const style = inlineStyles
    ? ' style="fill:#334155;font-size:12px;font-family:Inter, \"Segoe UI\", Roboto, Arial, sans-serif"'
    : '';

  return `<text${className}${style} x="${block.frame.x + LABEL_X_OFFSET}" y="${block.frame.y + LABEL_Y_OFFSET}">${label}</text>`;
}

function renderBlock(block: RenderBlock, showLabels: boolean, inlineStyles: boolean): string {
  const children = block.children.map((child) => renderBlock(child, showLabels, inlineStyles)).join('');
  const label = showLabels ? renderLabel(block, inlineStyles) : '';

  const groupClass = inlineStyles ? '' : ` class="wireframe-group kind-${block.kind}"`;
  const rectClass = inlineStyles ? '' : ` class="${escapeXml(toRectClass(block))}"`;
  const rectStyle = inlineStyles
    ? ` style="fill:${block.kind === 'component' ? '#fff7ed' : '#eff6ff'};stroke:${block.kind === 'component' ? '#fdba74' : '#bfdbfe'};stroke-width:1;${block.kind === 'component' ? 'stroke-dasharray:4 3;' : ''}"`
    : '';

  return [
    `<g${groupClass} data-block-id="${escapeXml(block.id)}">`,
    `<rect${rectClass}${rectStyle} x="${block.frame.x}" y="${block.frame.y}" width="${block.frame.width}" height="${block.frame.height}" rx="8" ry="8" />`,
    label,
    children,
    '</g>',
  ].join('');
}

function renderMetadata(renderPage: RenderPage, inlineStyles: boolean): string {
  const metadataEntries = Object.entries(renderPage.page.metadata ?? {});

  if (metadataEntries.length === 0) {
    return '';
  }

  const lineHeight = 16;
  const startX = 16;
  const startY = 24;

  const lines = metadataEntries.map(([key, value], index) => {
    const content = typeof value === 'string' ? value : JSON.stringify(value);
    const y = startY + index * lineHeight;
    const className = inlineStyles ? '' : ' class="wireframe-meta"';
    const style = inlineStyles
      ? ' style="fill:#64748b;font-size:12px;font-family:Inter, \"Segoe UI\", Roboto, Arial, sans-serif"'
      : '';
    return `<text${className}${style} x="${startX}" y="${y}">${escapeXml(`${key}: ${content}`)}</text>`;
  });

  return `<g id="metadata">${lines.join('')}</g>`;
}

function renderDefs(inlineStyles: boolean): string {
  if (inlineStyles) {
    return '';
  }

  return `<defs>
    <style>
      .wireframe-page { fill: #ffffff; stroke: #cbd5e1; stroke-width: 1; }
      .wireframe-block { fill: #eff6ff; stroke: #bfdbfe; stroke-width: 1; }
      .wireframe-block.kind-component { fill: #fff7ed; stroke: #fdba74; stroke-dasharray: 4 3; }
      .wireframe-label {
        fill: #334155;
        font-size: 12px;
        font-family: Inter, &quot;Segoe UI&quot;, Roboto, Arial, sans-serif;
      }
      .wireframe-meta {
        fill: #64748b;
        font-size: 12px;
        font-family: Inter, &quot;Segoe UI&quot;, Roboto, Arial, sans-serif;
      }
    </style>
  </defs>`;
}

export function renderPageToSvg(renderPage: RenderPage, options: SvgRenderOptions = {}): string {
  const width = resolvePageWidth(renderPage);
  const height = resolvePageHeight(renderPage);
  const showLabels = options.showLabels ?? true;
  const inlineStyles = options.inlineStyles ?? false;
  const title = options.title ?? `${renderPage.page.name} Prototype`;
  const blocks = renderPage.blocks.map((block) => renderBlock(block, showLabels, inlineStyles)).join('');
  const svgStyle = inlineStyles ? ' style="background:#fff"' : '';
  const pageRectClass = inlineStyles ? '' : ' class="wireframe-page"';
  const pageRectStyle = inlineStyles ? ' style="fill:#ffffff;stroke:#cbd5e1;stroke-width:1"' : '';

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc"${svgStyle}>`,
    `<title id="title">${escapeXml(title)}</title>`,
    `<desc id="desc">Wireframe for ${escapeXml(renderPage.page.name)} (${escapeXml(renderPage.page.type)})</desc>`,
    renderDefs(inlineStyles),
    `<rect${pageRectClass}${pageRectStyle} x="0.5" y="0.5" width="${Math.max(0, width - 1)}" height="${Math.max(0, height - 1)}" rx="12" ry="12" />`,
    '<g id="blocks">',
    blocks,
    '</g>',
    options.includeMetadata ? renderMetadata(renderPage, inlineStyles) : '',
    '</svg>',
  ].join('');
}

export function renderPagesToSvgDocument(
  renderPages: readonly RenderPage[],
  options: SvgRenderOptions = {},
): Record<string, string> {
  return renderPages.reduce<Record<string, string>>((acc, page, index) => {
    const fallbackName = `page-${index + 1}`;
    const baseName = page.page.route?.replaceAll('/', '-') || page.page.name || fallbackName;
    const safeFileName =
      baseName
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '') || fallbackName;

    acc[`${safeFileName}.svg`] = renderPageToSvg(page, options);
    return acc;
  }, {});
}
