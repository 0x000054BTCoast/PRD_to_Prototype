export const NORMALIZED_KEYWORDS = ['PAGE', 'MODULE', 'COMPONENT', 'INTERACTION'] as const;

export type NormalizedKeyword = (typeof NORMALIZED_KEYWORDS)[number];

export const KEYWORD_ALIASES: Record<NormalizedKeyword, readonly string[]> = {
  PAGE: ['页面', 'page'],
  MODULE: ['模块', 'section', 'block'],
  COMPONENT: ['组件', '控件', '字段', 'component'],
  INTERACTION: ['交互', '操作', '行为', 'interaction'],
};

export const KEYWORD_LOOKUP: ReadonlyMap<string, NormalizedKeyword> = new Map(
  Object.entries(KEYWORD_ALIASES).flatMap(([keyword, aliases]) =>
    aliases.map((alias) => [alias.toLowerCase(), keyword as NormalizedKeyword] as const),
  ),
);
