import type { ClassifiedModuleType } from '../classifier/moduleClassifier';
import type { ClassifiedPageType } from '../classifier/pageClassifier';

export interface TemplateRow {
  moduleTypes: ClassifiedModuleType[];
}

export interface PageTemplate {
  type: Exclude<ClassifiedPageType, 'generic'>;
  rows: TemplateRow[];
}

const LIST_TEMPLATE: PageTemplate = {
  type: 'list',
  rows: [
    { moduleTypes: ['header'] },
    { moduleTypes: ['actionBar'] },
    { moduleTypes: ['filter'] },
    { moduleTypes: ['table'] },
    { moduleTypes: ['cardList'] },
    { moduleTypes: ['description'] },
  ],
};

const FORM_TEMPLATE: PageTemplate = {
  type: 'form',
  rows: [
    { moduleTypes: ['header'] },
    { moduleTypes: ['actionBar'] },
    { moduleTypes: ['formSection'] },
    { moduleTypes: ['description'] },
  ],
};

const DETAIL_TEMPLATE: PageTemplate = {
  type: 'detail',
  rows: [
    { moduleTypes: ['header'] },
    { moduleTypes: ['description'] },
    { moduleTypes: ['cardList', 'table'] },
    { moduleTypes: ['actionBar'] },
  ],
};

const DASHBOARD_TEMPLATE: PageTemplate = {
  type: 'dashboard',
  rows: [
    { moduleTypes: ['header'] },
    { moduleTypes: ['actionBar'] },
    { moduleTypes: ['cardList', 'cardList', 'cardList'] },
    { moduleTypes: ['table', 'description'] },
  ],
};

const CONFIG_TEMPLATE: PageTemplate = {
  type: 'config',
  rows: [
    { moduleTypes: ['header'] },
    { moduleTypes: ['actionBar'] },
    { moduleTypes: ['formSection'] },
    { moduleTypes: ['table'] },
    { moduleTypes: ['description'] },
  ],
};

export const PAGE_TEMPLATES: Record<Exclude<ClassifiedPageType, 'generic'>, PageTemplate> = {
  list: LIST_TEMPLATE,
  form: FORM_TEMPLATE,
  detail: DETAIL_TEMPLATE,
  dashboard: DASHBOARD_TEMPLATE,
  config: CONFIG_TEMPLATE,
};

export function resolvePageTemplate(pageType: ClassifiedPageType): PageTemplate | null {
  if (pageType === 'generic') {
    return null;
  }

  return PAGE_TEMPLATES[pageType];
}
