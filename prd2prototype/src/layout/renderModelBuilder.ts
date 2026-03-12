import type { ParseWarning } from '../types/warning';
import type { RenderBlock, RenderPage } from '../types/layout';
import type { ParsedPage } from '../types/parser';
import type { PositionedComponent } from './componentLayout';
import type { PositionedModule } from './moduleLayout';

export interface BuildRenderModelInput {
  page: ParsedPage;
  modules: PositionedModule[];
  componentsByModuleId: Record<string, PositionedComponent[]>;
  warnings?: ParseWarning[];
}

function createComponentBlock(
  positionedComponent: PositionedComponent,
  order: number,
  moduleId: string,
): RenderBlock {
  return {
    id: `${moduleId}:${positionedComponent.component.id}`,
    kind: 'component',
    order,
    moduleId,
    componentId: positionedComponent.component.id,
    classes: ['component', `component-${positionedComponent.componentType}`],
    frame: positionedComponent.frame,
    children: [],
    component: positionedComponent.component,
  };
}

function createModuleBlock(
  positionedModule: PositionedModule,
  order: number,
  children: RenderBlock[],
): RenderBlock {
  return {
    id: positionedModule.module.id,
    kind: 'module',
    order,
    moduleId: positionedModule.module.id,
    classes: ['module', `module-${positionedModule.moduleType}`],
    frame: positionedModule.frame,
    children,
    module: positionedModule.module,
  };
}

export function buildRenderModel(input: BuildRenderModelInput): RenderPage {
  const blocks = input.modules.map((positionedModule, moduleIndex) => {
    const componentBlocks = (input.componentsByModuleId[positionedModule.module.id] ?? []).map((positionedComponent, componentIndex) =>
      createComponentBlock(positionedComponent, componentIndex, positionedModule.module.id),
    );

    return createModuleBlock(positionedModule, moduleIndex, componentBlocks);
  });

  return {
    page: input.page,
    blocks,
    warnings: input.warnings ?? [],
  };
}
