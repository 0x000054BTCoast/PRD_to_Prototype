import { classifyComponentType, type ClassifiedComponentType } from '../classifier/componentClassifier';
import { DEFAULT_LAYOUT_DIMENSIONS, MIN_COMPONENT_HEIGHT, type LayoutDimensions } from '../constants/dimensions';
import type { ParsedComponent } from '../types/parser';
import type { Rect } from './moduleLayout';

export interface PositionedComponent {
  component: ParsedComponent;
  componentType: ClassifiedComponentType;
  frame: Rect;
}

const COMPONENT_HEIGHT_BY_TYPE: Partial<Record<ClassifiedComponentType, number>> = {
  button: 36,
  input: 40,
  search: 40,
  select: 40,
  datePicker: 40,
  switch: 32,
  tag: 28,
  image: 88,
  number: 36,
  text: 32,
  table: 160,
  container: 52,
};

function getComponentType(component: ParsedComponent): ClassifiedComponentType {
  return classifyComponentType({
    label: component.label,
    hints: [component.type],
    location: component.location,
  }).type;
}

function getComponentHeight(type: ClassifiedComponentType): number {
  return COMPONENT_HEIGHT_BY_TYPE[type] ?? MIN_COMPONENT_HEIGHT;
}

export function layoutComponents(
  components: ParsedComponent[],
  moduleFrame: Rect,
  dimensions: LayoutDimensions = DEFAULT_LAYOUT_DIMENSIONS,
): PositionedComponent[] {
  const innerX = moduleFrame.x + dimensions.componentGap;
  const innerY = moduleFrame.y + dimensions.componentGap;
  const innerWidth = moduleFrame.width - dimensions.componentGap * 2;

  let cursorY = innerY;

  return components.map((component) => {
    const componentType = getComponentType(component);
    const height = getComponentHeight(componentType);

    const frame: Rect = {
      x: innerX,
      y: cursorY,
      width: innerWidth,
      height,
    };

    cursorY += height + dimensions.componentGap;

    return {
      component,
      componentType,
      frame,
    };
  });
}
