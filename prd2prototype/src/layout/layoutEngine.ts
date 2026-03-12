import { classifyPageType } from '../classifier/pageClassifier';
import { DEFAULT_LAYOUT_DIMENSIONS, type LayoutDimensions } from '../constants/dimensions';
import type { RenderPage } from '../types/layout';
import type { ParsedDocument } from '../types/parser';
import { layoutComponents, type PositionedComponent } from './componentLayout';
import { layoutModules } from './moduleLayout';
import { resolvePageTemplate } from './pageTemplates';
import { buildRenderModel } from './renderModelBuilder';

function buildComponentsByModuleId(
  modules: ReturnType<typeof layoutModules>,
  dimensions: LayoutDimensions,
): Record<string, PositionedComponent[]> {
  return modules.reduce<Record<string, PositionedComponent[]>>((acc, positionedModule) => {
    acc[positionedModule.module.id] = layoutComponents(
      positionedModule.module.components,
      positionedModule.frame,
      dimensions,
    );

    return acc;
  }, {});
}

export function generateRenderPages(
  document: ParsedDocument,
  dimensions: LayoutDimensions = DEFAULT_LAYOUT_DIMENSIONS,
): RenderPage[] {
  return document.pages.map((page) => {
    const pageClassification = classifyPageType({
      name: page.name,
      route: page.route,
      location: page.location,
    });

    const template = resolvePageTemplate(pageClassification.type);
    const positionedModules = layoutModules(page.modules, template, dimensions);
    const componentsByModuleId = buildComponentsByModuleId(positionedModules, dimensions);

    return buildRenderModel({
      page,
      modules: positionedModules,
      componentsByModuleId,
      warnings: [...document.warnings, ...pageClassification.warnings],
    });
  });
}
