export const PUNCT_MAP = {
  '“': '"',
  '”': '"',
  '‘': "'",
  '’': "'",
  '，': ',',
  '。': '.',
  '、': ',',
  '；': ';',
  '：': ':',
  '？': '?',
  '！': '!',
  '【': '[',
  '】': ']',
  '（': '(',
  '）': ')',
  '《': '<',
  '》': '>',
  '／': '/',
  '％': '%',
};

export const FIELD_BOOST = {
  title: 5,
  headings: 3,
  summary: 2,
  scripture: 1.5,
  content: 1,
};

function toHalfWidth(input) {
  return input
    .replace(/[\uff01-\uff5e]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0xfee0),
    )
    .replace(/\u3000/g, ' ');
}

export function normalizeText(input, { lowercaseEnglish = true } = {}) {
  if (!input) {
    return '';
  }
  let value = toHalfWidth(String(input)).normalize('NFKC');
  value = value.replace(
    /[“”‘’。，、；：？！【】（）《》／％]/g,
    (match) => PUNCT_MAP[match] || match,
  );
  if (lowercaseEnglish) {
    value = value.replace(/[A-Z]/g, (ch) => ch.toLowerCase());
  }
  value = value.replace(/\s+/g, ' ').trim();
  return value;
}

export function detectLanguage(text) {
  const normalized = normalizeText(text);
  const zhMatches = normalized.match(/[\p{Script=Han}]/gu)?.length || 0;
  const enMatches = normalized.match(/[a-zA-Z]/g)?.length || 0;
  if (zhMatches === 0 && enMatches === 0) {
    return 'auto';
  }
  return zhMatches >= enMatches ? 'zh' : 'en';
}

function segmentChinese(text) {
  const segments = [];
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter('zh', { granularity: 'word' });
    for (const { segment, isWordLike } of segmenter.segment(text)) {
      if (isWordLike && segment.trim()) {
        segments.push(segment);
      } else if (segment.trim()) {
        segments.push(...segment.split('').filter(Boolean));
      }
    }
    return segments;
  }
  return text.split('').filter(Boolean);
}

function extractTokens(text, lang) {
  const normalized = normalizeText(text, { lowercaseEnglish: lang !== 'zh' });
  const tokens = [];
  const primary = [];
  const segments = normalized.match(/[\p{Script=Han}]+|[a-zA-Z0-9]+/gu) || [];
  segments.forEach((segment) => {
    if (/[\p{Script=Han}]/u.test(segment)) {
      const pieces = segmentChinese(segment);
      primary.push(...pieces);
    } else {
      primary.push(segment);
    }
  });
  primary.forEach((token) => {
    tokens.push(token);
    if (token.length > 1) {
      for (let i = 1; i < Math.min(token.length, 4); i += 1) {
        tokens.push(token.slice(0, i + 1));
      }
    }
  });
  for (let i = 0; i < primary.length - 1; i += 1) {
    tokens.push(`${primary[i]}_${primary[i + 1]}`);
  }
  return {
    normalized,
    lang,
    tokens: Array.from(new Set(tokens.filter(Boolean))),
    primary: Array.from(new Set(primary.filter(Boolean))),
  };
}

export function tokenizeText(text, langHint = 'auto') {
  const lang =
    langHint === 'auto' || !langHint ? detectLanguage(text) : langHint;
  return extractTokens(text, lang);
}

export function createSlugger() {
  const seen = new Map();
  return (value) => {
    const base = normalizeText(value || '', { lowercaseEnglish: true })
      .replace(/[^a-z0-9\u4e00-\u9fff\s-]/giu, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    const safeBase = base || 'section';
    const count = seen.get(safeBase) || 0;
    const next = count === 0 ? safeBase : `${safeBase}-${count}`;
    seen.set(safeBase, count + 1);
    return next;
  };
}

export function makeSnippet(source, terms, windowSize = 80) {
  const cleanSource = source || '';
  if (!terms || terms.length === 0) {
    return { text: cleanSource.slice(0, windowSize), highlights: [] };
  }
  const normalizedSource = normalizeText(cleanSource);
  const normalizedTerms = terms.map((term) => normalizeText(term));
  let hitIndex = -1;
  for (const term of normalizedTerms) {
    const idx = normalizedSource.indexOf(term);
    if (idx !== -1 && (hitIndex === -1 || idx < hitIndex)) {
      hitIndex = idx;
    }
  }
  const start =
    hitIndex === -1
      ? 0
      : Math.max(0, hitIndex - Math.floor(windowSize / 2));
  const end = Math.min(cleanSource.length, start + windowSize);
  const text = cleanSource.slice(start, end);
  return {
    text,
    highlights: normalizedTerms.filter(Boolean),
  };
}

export function highlightSnippet(snippet, terms) {
  if (!snippet) {
    return '';
  }
  let result = snippet;
  terms
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .forEach((term) => {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'giu');
      result = result.replace(regex, (match) => `<mark>${match}</mark>`);
    });
  return result;
}

export function rerankHits(hits, queryTokens, langPreference = 'auto') {
  const grouped = new Map();
  hits.forEach((hit) => {
    const matched = new Set(hit.queryTerms || hit.terms || []);
    const coverage =
      queryTokens.length === 0 ? 1 : matched.size / queryTokens.length;
    const fieldBoost =
      FIELD_BOOST[hit.field] != null ? FIELD_BOOST[hit.field] : 1;
    const levelBonus =
      hit.level != null ? Math.max(0, 0.6 - hit.level * 0.05) : 0;
    const langBonus =
      langPreference !== 'auto' && hit.lang === langPreference ? 0.15 : 0;
    const proximityBonus =
      matched.size > 1 ? Math.min(0.25, matched.size * 0.05) : 0;
    const fuzzyPenalty =
      queryTokens.length > matched.size
        ? (queryTokens.length - matched.size) * 0.05
        : 0;
    const score =
      hit.score *
      (1 +
        fieldBoost * 0.1 +
        levelBonus +
        proximityBonus +
        coverage * 0.4 +
        langBonus) -
      fuzzyPenalty;
    const existing = grouped.get(hit.url);
    if (!existing || score > existing.score) {
      grouped.set(hit.url, { ...hit, score });
    }
  });
  return Array.from(grouped.values()).sort((a, b) => b.score - a.score);
}

export const defaultSearchOptions = {
  fields: ['title', 'headings', 'content', 'scripture', 'summary'],
  storeFields: [
    'docId',
    'sectionId',
    'anchor',
    'breadcrumb',
    'lang',
    'snippetSource',
    'field',
    'level',
    'url',
    'title',
  ],
  searchOptions: {
    boost: FIELD_BOOST,
    prefix: true,
    fuzzy: 0.3,
    combineWith: 'AND',
  },
};
