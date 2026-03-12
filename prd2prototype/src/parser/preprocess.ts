import { KEYWORD_LOOKUP, type NormalizedKeyword } from '../constants/keywords';
import {
  compressBlankLines,
  escapeRegExp,
  normalizeNewlines,
  replaceTabsWithSpaces,
  splitIntoBlocks,
  splitIntoLines,
  trimLineWhitespace,
} from '../utils/text';

export interface KeywordMatch {
  alias: string;
  normalized: NormalizedKeyword;
  count: number;
}

export interface PreprocessResult {
  rawText: string;
  normalizedText: string;
  lines: string[];
  blocks: string[];
  keywordMatches: KeywordMatch[];
}

const LATIN_LETTER = /[A-Za-z]/;

function createKeywordPattern(): RegExp {
  const aliases = Array.from(KEYWORD_LOOKUP.keys()).sort((left, right) => right.length - left.length);
  const pattern = aliases.map((alias) => escapeRegExp(alias)).join('|');

  return new RegExp(pattern, 'gi');
}

function normalizeKeywordToken(token: string): { normalized: string; alias?: string } {
  const normalized = KEYWORD_LOOKUP.get(token.toLowerCase());

  if (!normalized) {
    return { normalized: token };
  }

  return { normalized, alias: token.toLowerCase() };
}

function shouldNormalize(text: string, start: number, end: number): boolean {
  const previous = text[start - 1] ?? '';
  const next = text[end] ?? '';

  const hasLatinBoundary = LATIN_LETTER.test(previous) || LATIN_LETTER.test(next);
  return !hasLatinBoundary;
}

export function normalizeKeywords(text: string): { text: string; matches: KeywordMatch[] } {
  if (!text) {
    return { text, matches: [] };
  }

  const counts = new Map<string, KeywordMatch>();
  const keywordPattern = createKeywordPattern();

  const normalized = text.replace(keywordPattern, (token, offset, fullText) => {
    const end = offset + token.length;

    if (!shouldNormalize(fullText, offset, end)) {
      return token;
    }

    const keywordToken = normalizeKeywordToken(token);
    if (!keywordToken.alias) {
      return token;
    }

    const existing = counts.get(keywordToken.alias);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(keywordToken.alias, {
        alias: keywordToken.alias,
        normalized: keywordToken.normalized as NormalizedKeyword,
        count: 1,
      });
    }

    return keywordToken.normalized;
  });

  return {
    text: normalized,
    matches: Array.from(counts.values()),
  };
}

export function preprocessPrdText(rawText: string): PreprocessResult {
  const newlineNormalized = normalizeNewlines(rawText);
  const tabsNormalized = replaceTabsWithSpaces(newlineNormalized);
  const whitespaceTrimmed = trimLineWhitespace(tabsNormalized);
  const blankLinesCompressed = compressBlankLines(whitespaceTrimmed);
  const keywordNormalized = normalizeKeywords(blankLinesCompressed);

  return {
    rawText,
    normalizedText: keywordNormalized.text,
    lines: splitIntoLines(keywordNormalized.text),
    blocks: splitIntoBlocks(keywordNormalized.text),
    keywordMatches: keywordNormalized.matches,
  };
}
