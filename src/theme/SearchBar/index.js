import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Link from '@docusaurus/Link';
import {usePluginData} from '@docusaurus/useGlobalData';
import styles from './styles.module.css';

const CHINESE_SEGMENT_REGEX = /[\u4e00-\u9fff]+/g;
const WORD_REGEX = /[\p{L}\p{N}]+/gu;
const HTML_TAG_REGEX = /<[^>]+>/g;

function tokenize(text) {
  if (!text) {
    return [];
  }
  const tokens = new Set();
  const lower = text.toLowerCase();
  const words = lower.match(WORD_REGEX) ?? [];
  words.forEach((word) => tokens.add(word));
  const chineseSegments = text.match(CHINESE_SEGMENT_REGEX) ?? [];
  chineseSegments.forEach((segment) => {
    const chars = Array.from(segment);
    chars.forEach((char) => tokens.add(char));
    const maxGramLength = Math.min(segment.length, 4);
    for (let size = 2; size <= maxGramLength; size += 1) {
      for (let start = 0; start <= segment.length - size; start += 1) {
        tokens.add(segment.slice(start, start + size));
      }
    }
  });
  return Array.from(tokens);
}

function stripHtml(content) {
  if (!content) {
    return '';
  }
  return content.replace(HTML_TAG_REGEX, ' ').replace(/\s+/g, ' ').trim();
}

function extractMatchingSentence(content, tokens) {
  if (!content) {
    return '';
  }
  const sentences = content.match(/[^。！？!?\.]+[。！？!?\.]?/g) || [];
  if (!sentences.length) {
    return content.trim();
  }
  const lowerTokens = tokens.map((token) => token.toLowerCase());
  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    if (lowerTokens.some((token) => lowerSentence.includes(token))) {
      return sentence.trim();
    }
  }
  return sentences[0].trim();
}

function buildSnippet(content, tokens, maxLength = 80) {
  if (!content) {
    return '';
  }
  const sanitizedContent = stripHtml(content);
  const sentence = extractMatchingSentence(sanitizedContent, tokens);
  if (!sentence) {
    return '';
  }
  if (sentence.length <= maxLength) {
    return sentence;
  }
  return `${sentence.slice(0, maxLength)}…`;
}

function highlightText(text, tokens) {
  if (!text || !tokens?.length) {
    return text;
  }
  const uniqueTokens = Array.from(new Set(tokens.filter(Boolean)));
  if (!uniqueTokens.length) {
    return text;
  }
  const sortedTokens = uniqueTokens.sort((a, b) => b.length - a.length);
  const escapedTokens = sortedTokens.map((token) =>
    token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  );
  const pattern = escapedTokens.join('|');
  if (!pattern) {
    return text;
  }
  const regex = new RegExp(`(${pattern})`, 'gi');
  const lowerTokens = sortedTokens.map((token) => token.toLowerCase());
  return text.split(regex).map((part, index) => {
    const lowerPart = part.toLowerCase();
    if (lowerTokens.includes(lowerPart)) {
      return (
        <mark key={index} className={styles.searchHighlight}>
          {part}
        </mark>
      );
    }
    return part;
  });
}

function useOutsideClick(ref, handler) {
  useEffect(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
      handler();
    };
    document.addEventListener('pointerdown', listener);
    return () => {
      document.removeEventListener('pointerdown', listener);
    };
  }, [handler, ref]);
}

export default function SearchBar() {
  const {entries = [], invertedIndex = {}} = usePluginData('local-search') || {};
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const scrollPositionRef = useRef(0);

  const restoreScrollPosition = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const targetScrollY = scrollPositionRef.current;
    let attempts = 0;
    const applyScroll = () => {
      attempts += 1;
      window.scrollTo({top: targetScrollY});
      if (attempts < 3) {
        requestAnimationFrame(applyScroll);
      }
    };
    requestAnimationFrame(applyScroll);
  }, []);

  const preserveScrollPosition = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    scrollPositionRef.current = window.scrollY;
    restoreScrollPosition();
  }, [restoreScrollPosition]);

  const handleInputPointerDown = useCallback(
    (event) => {
      if (typeof window === 'undefined') {
        return;
      }
      scrollPositionRef.current = window.scrollY;
      if (inputRef.current && event.target === inputRef.current) {
        if (document.activeElement !== inputRef.current) {
          event.preventDefault();
          inputRef.current.focus({preventScroll: true});
        }
      }
    },
    [inputRef],
  );

  const resetSearch = useCallback(() => {
    setOpen(false);
    setQuery('');
    setIsFocused(false);
    if (inputRef.current) {
      inputRef.current.blur();
    }
  }, []);

  const tokens = useMemo(() => tokenize(query), [query]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (isFocused) {
      scrollPositionRef.current = window.scrollY;
    }
  }, [isFocused]);

  useEffect(() => {
    if (!isFocused || typeof window === 'undefined') {
      return undefined;
    }
    const handleScroll = () => {
      scrollPositionRef.current = window.scrollY;
    };
    window.addEventListener('scroll', handleScroll, {passive: true});
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isFocused]);

  useLayoutEffect(() => {
    if (!isFocused || typeof window === 'undefined') {
      return;
    }
    restoreScrollPosition();
  }, [query, open, isFocused, restoreScrollPosition]);

  useEffect(() => {
    if (!tokens.length) {
      setResults([]);
      return;
    }
    const matchedTokensByEntry = new Map();
    tokens.forEach((token) => {
      const ids = invertedIndex[token];
      if (!ids) {
        return;
      }
      ids.forEach((id) => {
        if (!matchedTokensByEntry.has(id)) {
          matchedTokensByEntry.set(id, new Set());
        }
        matchedTokensByEntry.get(id).add(token);
      });
    });

    if (!matchedTokensByEntry.size) {
      setResults([]);
      return;
    }

    const scored = Array.from(matchedTokensByEntry.entries()).map(([id, matchedSet]) => {
      const matchedTokens = Array.from(matchedSet);
      const coverage = matchedTokens.length / tokens.length;
      const lengthScore = matchedTokens.reduce(
        (sum, token) => sum + Math.max(token.length, 1),
        0,
      );
      const longestToken = matchedTokens.reduce(
        (max, token) => Math.max(max, token.length),
        0,
      );
      return {id, matchedTokens, coverage, lengthScore, longestToken};
    });

    scored.sort((a, b) => {
      if (b.coverage !== a.coverage) {
        return b.coverage - a.coverage;
      }
      if (b.longestToken !== a.longestToken) {
        return b.longestToken - a.longestToken;
      }
      if (b.lengthScore !== a.lengthScore) {
        return b.lengthScore - a.lengthScore;
      }
      return a.id - b.id;
    });

    const nextResults = scored
      .slice(0, 12)
      .map(({id, matchedTokens}) => {
        const entry = entries[id];
        if (!entry) {
          return null;
        }
        return {...entry, matchedTokens};
      })
      .filter(Boolean);

    setResults(nextResults);
  }, [entries, invertedIndex, tokens, isFocused]);

  useOutsideClick(containerRef, resetSearch);

  return (
    <div className={styles.searchContainer} ref={containerRef}>
      <input
        className={`${styles.searchInput} ${!query && !isFocused ? styles.searchInputCollapsed : ''}`}
        type="text"
        inputMode="search"
        enterKeyHint="search"
        value={query}
        ref={inputRef}
        onPointerDown={handleInputPointerDown}
        onChange={(event) => {
          preserveScrollPosition();
          const value = event.target.value;
          setQuery(value);
          setOpen(Boolean(value));
        }}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Backspace') {
            if (!query) {
              event.preventDefault();
            }
          }
        }}
        onFocus={() => {
          preserveScrollPosition();
          setIsFocused(true);
          setOpen(Boolean(query));
        }}
        onBlur={() => setIsFocused(false)}
        aria-label="搜索讲道内容"
      />
      {open && (
        <div className={styles.searchDropdown} role="listbox">
          {results.length ? (
            results.map((entry) => {
              const matchedTokens = entry.matchedTokens ?? tokens;
              const snippet = buildSnippet(entry.content, matchedTokens);
              return (
                <Link
                  key={`${entry.id}-${entry.permalink}`}
                  className={styles.searchResult}
                  to={entry.permalink}
                  onClick={() => setOpen(false)}
                >
                  <div className={styles.searchResultTitle}>
                    {highlightText(entry.title, matchedTokens)}
                  </div>
                  {entry.section && (
                    <div className={styles.searchResultSection}>
                      {highlightText(entry.section, matchedTokens)}
                    </div>
                  )}
                  <div className={styles.searchResultSnippet}>
                    {highlightText(snippet, matchedTokens)}
                  </div>
                </Link>
              );
            })
          ) : (
            <div className={styles.searchEmpty}>未找到匹配内容</div>
          )}
        </div>
      )}
    </div>
  );
}
