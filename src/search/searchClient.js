import MiniSearch from '@site/packages/search-engine';
import * as pipeline from './pipeline';

const {
  normalizeText,
  tokenizeText,
  detectLanguage,
  makeSnippet,
  highlightSnippet,
  rerankHits,
  defaultSearchOptions,
} = pipeline;

let miniSearchPromise = null;
let indexMetadata = null;
let searchOptionsSnapshot = defaultSearchOptions.searchOptions;

function buildOptions(payloadOptions = {}) {
  return {
    ...defaultSearchOptions,
    ...payloadOptions,
    tokenize: (text) => tokenizeText(text).tokens,
    processTerm: (term) => normalizeText(term),
  };
}

export async function loadIndex(indexUrl) {
  if (miniSearchPromise) {
    return miniSearchPromise;
  }
  miniSearchPromise = fetch(indexUrl)
    .then((res) => {
      if (!res.ok) {
        throw new Error(`无法加载搜索索引（${res.status}）`);
      }
      return res.json();
    })
    .then((payload) => {
      indexMetadata = payload.metadata;
      const options = buildOptions(payload.options);
      searchOptionsSnapshot = options.searchOptions || searchOptionsSnapshot;
      return MiniSearch.loadJS(payload.index, options);
    });
  return miniSearchPromise;
}

export function getIndexMeta() {
  return indexMetadata;
}

export async function searchIndex(query, { indexUrl, lang = 'auto' }) {
  const trimmed = (query || '').trim();
  if (!trimmed) {
    return [];
  }
  const langPreference = lang === 'auto' ? detectLanguage(trimmed) : lang;
  const queryTokens = tokenizeText(trimmed, langPreference).primary;
  const miniSearch = await loadIndex(indexUrl);
  const hits = miniSearch.search(normalizeText(trimmed), {
    ...searchOptionsSnapshot,
  });
  const reranked = rerankHits(hits, queryTokens, langPreference).slice(0, 12);
  return reranked.map((hit) => {
    const highlightTerms =
      (hit.queryTerms && hit.queryTerms.length > 0
        ? hit.queryTerms
        : queryTokens) || [];
    const snippet = makeSnippet(hit.snippetSource, highlightTerms);
    return {
      ...hit,
      snippet: {
        raw: snippet.text,
        html: highlightSnippet(snippet.text, snippet.highlights),
      },
    };
  });
}
