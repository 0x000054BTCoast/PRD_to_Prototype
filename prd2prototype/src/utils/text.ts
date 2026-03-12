const WINDOWS_NEWLINE = /\r\n?/g;
const TAB_CHARACTER = /\t/g;
const TRAILING_WHITESPACE = /[ \t]+$/gm;
const MULTIPLE_BLANK_LINES = /\n{3,}/g;

const REGEX_SPECIAL_CHARACTERS = /[.*+?^${}()|[\]\\]/g;

export function normalizeNewlines(text: string): string {
  return text.replace(WINDOWS_NEWLINE, '\n');
}

export function replaceTabsWithSpaces(text: string, spacesPerTab = 2): string {
  return text.replace(TAB_CHARACTER, ' '.repeat(spacesPerTab));
}

export function trimLineWhitespace(text: string): string {
  return text
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replace(TRAILING_WHITESPACE, '');
}

export function compressBlankLines(text: string, maxConsecutive = 1): string {
  const safeMax = Math.max(1, maxConsecutive);
  const replacement = '\n'.repeat(safeMax + 1);

  if (safeMax === 1) {
    return text.replace(MULTIPLE_BLANK_LINES, replacement);
  }

  const excessiveBlankLines = new RegExp(`\\n{${safeMax + 2},}`, 'g');
  return text.replace(excessiveBlankLines, replacement);
}

export function splitIntoLines(text: string): string[] {
  if (!text) {
    return [];
  }

  return text.split('\n');
}

export function splitIntoBlocks(text: string): string[] {
  if (!text) {
    return [];
  }

  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);
}

export function escapeRegExp(text: string): string {
  return text.replace(REGEX_SPECIAL_CHARACTERS, '\\$&');
}
