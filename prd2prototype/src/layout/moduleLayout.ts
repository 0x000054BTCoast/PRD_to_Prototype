import { classifyModuleType, type ClassifiedModuleType } from '../classifier/moduleClassifier';
import { DEFAULT_LAYOUT_DIMENSIONS, DEFAULT_MODULE_HEIGHTS, type LayoutDimensions } from '../constants/dimensions';
import type { ParsedModule } from '../types/parser';
import type { PageTemplate } from './pageTemplates';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PositionedModule {
  module: ParsedModule;
  moduleType: ClassifiedModuleType;
  frame: Rect;
}

function getModuleType(module: ParsedModule): ClassifiedModuleType {
  return classifyModuleType({
    title: module.title,
    description: module.description,
    location: module.location,
  }).type;
}

function getModuleHeight(moduleType: ClassifiedModuleType): number {
  return DEFAULT_MODULE_HEIGHTS[moduleType] ?? DEFAULT_MODULE_HEIGHTS.section;
}

function createVerticalLayout(modules: ParsedModule[], dimensions: LayoutDimensions): PositionedModule[] {
  const contentWidth = dimensions.pageWidth - dimensions.canvasPadding * 2;
  let cursorY = dimensions.canvasPadding;

  return modules.map((module) => {
    const moduleType = getModuleType(module);
    const frame: Rect = {
      x: dimensions.canvasPadding,
      y: cursorY,
      width: contentWidth,
      height: getModuleHeight(moduleType),
    };

    cursorY += frame.height + dimensions.moduleGap;

    return {
      module,
      moduleType,
      frame,
    };
  });
}

function assignModulesForType(
  moduleType: ClassifiedModuleType,
  source: PositionedModule[],
): PositionedModule | null {
  const index = source.findIndex((entry) => entry.moduleType === moduleType);

  if (index < 0) {
    return null;
  }

  const [matched] = source.splice(index, 1);
  return matched;
}

export function layoutModules(
  modules: ParsedModule[],
  template: PageTemplate | null,
  dimensions: LayoutDimensions = DEFAULT_LAYOUT_DIMENSIONS,
): PositionedModule[] {
  const typedModules = modules.map((module) => ({
    module,
    moduleType: getModuleType(module),
    frame: { x: 0, y: 0, width: 0, height: 0 },
  }));

  if (!template || modules.length === 0) {
    return createVerticalLayout(modules, dimensions);
  }

  const unassigned = [...typedModules];
  const positioned: PositionedModule[] = [];
  const contentWidth = dimensions.pageWidth - dimensions.canvasPadding * 2;
  let cursorY = dimensions.canvasPadding;

  for (const row of template.rows) {
    const slots = row.moduleTypes.length;
    const matchedInRow = row.moduleTypes
      .map((moduleType) => assignModulesForType(moduleType, unassigned))
      .filter((entry): entry is PositionedModule => entry !== null);

    if (matchedInRow.length === 0) {
      continue;
    }

    const widthPerSlot = (contentWidth - dimensions.moduleGap * (slots - 1)) / slots;
    const rowHeight = Math.max(...matchedInRow.map((entry) => getModuleHeight(entry.moduleType)));

    matchedInRow.forEach((entry, slotIndex) => {
      entry.frame = {
        x: dimensions.canvasPadding + slotIndex * (widthPerSlot + dimensions.moduleGap),
        y: cursorY,
        width: widthPerSlot,
        height: rowHeight,
      };
      positioned.push(entry);
    });

    cursorY += rowHeight + dimensions.moduleGap;
  }

  if (unassigned.length > 0) {
    const remainder = createVerticalLayout(
      unassigned.map((entry) => entry.module),
      {
        ...dimensions,
      },
    );

    remainder.forEach((entry) => {
      entry.frame.y += cursorY - dimensions.canvasPadding;
      positioned.push(entry);
    });
  }

  return positioned;
}
