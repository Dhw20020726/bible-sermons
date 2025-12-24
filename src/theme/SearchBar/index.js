import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import Link from '@docusaurus/Link';
import clsx from 'clsx';
import useBaseUrl from '@docusaurus/useBaseUrl';
import * as pipeline from '@site/src/search/pipeline';
import {loadIndex, searchIndex} from '@site/src/search/searchClient';
import styles from './styles.module.css';

const FIELD_LABEL = {
  title: '标题',
  headings: '小节',
  content: '正文',
  scripture: '经文',
  summary: '摘要',
};

function resolveUrl(base, url) {
  const baseClean = base.endsWith('/') ? base.slice(0, -1) : base;
  const target = url.startsWith('/') ? url : `/${url}`;
  return `${baseClean}${target}`;
}

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(false);
  const containerRef = useRef(null);
  const basePath = useBaseUrl('/');
  const indexUrl = useBaseUrl('/search/index.json');

  const langPreference = useMemo(
    () => (query ? pipeline.detectLanguage(query) : 'auto'),
    [query],
  );

  useEffect(() => {
    const handleClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!focused) {
      setResults([]);
    }
  }, [focused]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setError('');
      return () => {};
    }
    let cancelled = false;
    const handler = setTimeout(() => {
      setLoading(true);
      searchIndex(query, {indexUrl, lang: langPreference})
        .then((hits) => {
          if (cancelled) return;
          setResults(hits);
          setError('');
        })
        .catch((err) => {
          if (cancelled) return;
          const fallbackMessage =
            (err && err.message) || (typeof err === 'string' ? err : '搜索失败');
          setError(fallbackMessage);
          setResults([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(handler);
    };
  }, [indexUrl, langPreference, query]);

  const prefetchIndex = useCallback(() => {
    loadIndex(indexUrl).catch(() => {});
  }, [indexUrl]);

  const trimmedQuery = query.trim();
  const shouldShowDropdown = focused && trimmedQuery && results.length > 0;

  return (
    <div className={styles.searchContainer} ref={containerRef}>
      <input
        type="search"
        placeholder="搜索..."
        className={clsx(styles.searchInput, {
          [styles.searchInputCollapsed]: !focused && !query,
        })}
        value={query}
        onFocus={() => {
          setFocused(true);
          prefetchIndex();
        }}
        onChange={(event) => setQuery(event.target.value)}
        aria-label="搜索文档"
      />
      {shouldShowDropdown && (
        <div className={styles.searchDropdown}>
          {results.map((result) => {
            const url = resolveUrl(basePath, result.url);
            const breadcrumb = result.breadcrumb?.join(' › ');
            const fieldLabel = FIELD_LABEL[result.field] || result.field;
            return (
              <Link
                key={result.id}
                to={url}
                className={styles.searchResult}
                onClick={() => setFocused(false)}
              >
                <div className={styles.searchResultTitle}>
                  {result.title || breadcrumb || result.docId}
                </div>
                <div className={styles.searchResultSection}>
                  {[fieldLabel, breadcrumb].filter(Boolean).join(' ｜ ')}
                </div>
                <div
                  className={styles.searchResultSnippet}
                  dangerouslySetInnerHTML={{__html: result.snippet.html}}
                />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
