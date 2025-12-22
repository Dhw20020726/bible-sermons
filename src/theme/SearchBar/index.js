import React, {useEffect, useMemo, useRef, useState} from 'react';
import Link from '@docusaurus/Link';
import {usePluginData} from '@docusaurus/useGlobalData';
import styles from './styles.module.css';

const CHINESE_REGEX = /[\u4e00-\u9fff]/g;
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
  const chineseChars = text.match(CHINESE_REGEX) ?? [];
  chineseChars.forEach((char) => tokens.add(char));
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

function useOutsideClick(ref, handler) {
  useEffect(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
      handler();
    };
    document.addEventListener('mousedown', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
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

  const tokens = useMemo(() => tokenize(query), [query]);

  useEffect(() => {
    if (!tokens.length) {
      setResults([]);
      return;
    }
    const counts = new Map();
    tokens.forEach((token) => {
      const ids = invertedIndex[token];
      if (!ids) {
        return;
      }
      ids.forEach((id) => {
        counts.set(id, (counts.get(id) || 0) + 1);
      });
    });

    const required = tokens.length;
    let candidates = Array.from(counts.entries()).filter(([, count]) => count === required);
    if (!candidates.length) {
      candidates = Array.from(counts.entries()).filter(([, count]) => count > 0);
    }

    candidates.sort((a, b) => b[1] - a[1]);
    const nextResults = candidates.slice(0, 12).map(([id]) => entries[id]).filter(Boolean);
    setResults(nextResults);
  }, [entries, invertedIndex, tokens]);

  useOutsideClick(containerRef, () => setOpen(false));

  return (
    <div className={styles.searchContainer} ref={containerRef}>
      <input
        className={`${styles.searchInput} ${!query && !isFocused ? styles.searchInputCollapsed : ''}`}
        type="search"
        placeholder="搜索讲道内容"
        value={query}
        onChange={(event) => {
          const value = event.target.value;
          setQuery(value);
          setOpen(Boolean(value));
        }}
        onFocus={() => {
          setIsFocused(true);
          setOpen(Boolean(query));
        }}
        onBlur={() => setIsFocused(false)}
        aria-label="搜索讲道内容"
      />
      {open && (
        <div className={styles.searchDropdown} role="listbox">
          {results.length ? (
            results.map((entry) => (
              <Link
                key={`${entry.id}-${entry.permalink}`}
                className={styles.searchResult}
                to={entry.permalink}
                onClick={() => setOpen(false)}
              >
                <div className={styles.searchResultTitle}>{entry.title}</div>
                {entry.section && (
                  <div className={styles.searchResultSection}>{entry.section}</div>
                )}
                <div className={styles.searchResultSnippet}>
                  {buildSnippet(entry.content, tokens)}
                </div>
              </Link>
            ))
          ) : (
            <div className={styles.searchEmpty}>未找到匹配内容</div>
          )}
        </div>
      )}
    </div>
  );
}
