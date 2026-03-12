export interface LayoutDimensions {
  pageWidth: number;
  canvasPadding: number;
  moduleGap: number;
  componentGap: number;
}

export const DEFAULT_LAYOUT_DIMENSIONS: LayoutDimensions = {
  pageWidth: 1440,
  canvasPadding: 24,
  moduleGap: 16,
  componentGap: 12,
};

export const DEFAULT_MODULE_HEIGHTS = {
  header: 96,
  actionBar: 64,
  filter: 84,
  table: 360,
  cardList: 280,
  formSection: 260,
  description: 180,
  section: 220,
} as const;

export const MIN_COMPONENT_HEIGHT = 32;
