import React, {useEffect, useMemo, useRef, useState} from 'react';
import algoliasearch from 'algoliasearch/lite';
import {useThemeConfig} from '@docusaurus/theme-common';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

function getTitle(hit: any) {
  if (hit.title) return hit.title;
  if (hit.scripture) return hit.scripture;
  if (hit.book) return `${hit.book}${hit.chapter ? ` ${hit.chapter}:${hit.verse ?? ''}` : ''}`;
  return hit.heading || '搜索结果';
}

function getDescription(hit: any) {
  if (hit.summary) return hit.summary;
  if (hit.content) return hit.content.slice(0, 80);
  if (hit.heading) return hit.heading;
  return '';
}

export default function SearchBar() {
  const {algolia} = useThemeConfig();
  const searchClient = useMemo(
    () => (algolia?.appId && algolia?.apiKey ? algoliasearch(algolia.appId, algolia.apiKey) : null),
    [algolia],
  );
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const searchPageUrl = useBaseUrl('/search');

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!searchClient || !algolia?.indexName) {
      setError('未配置搜索客户端');
      setHits([]);
      return;
    }
    setError(null);
    if (!query.trim()) {
      setHits([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const pending = {canceled: false};
    const timer = setTimeout(() => {
      searchClient
        .search([
          {
            indexName: algolia.indexName,
            query,
            params: {
              hitsPerPage: 5,
            },
          },
        ])
        .then(({results}) => {
          if (pending.canceled) return;
          setHits(results?.[0]?.hits ?? []);
        })
        .catch(() => {
          if (pending.canceled) return;
          setError('搜索失败，请稍后再试');
        })
        .finally(() => {
          if (pending.canceled) return;
          setIsLoading(false);
        });
    }, 160);
    return () => {
      pending.canceled = true;
      clearTimeout(timer);
    };
  }, [algolia?.indexName, query, searchClient]);

  if (!algolia?.appId || !algolia?.apiKey || !algolia?.indexName) {
    return null;
  }

  return (
    <div className={styles.searchBar} ref={containerRef} aria-label="网站搜索">
      <input
        ref={inputRef}
        type="search"
        className={styles.searchInput}
        placeholder="搜索讲道或经文"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setIsOpen(true)}
        aria-label="搜索讲道或经文"
        autoComplete="off"
      />
      {isOpen && (
        <div className={styles.dropdown} role="listbox">
          {isLoading ? (
            <div className={styles.message}>正在搜索...</div>
          ) : error ? (
            <div className={styles.error}>{error}</div>
          ) : hits.length === 0 && query ? (
            <div className={styles.message}>没有找到相关结果</div>
          ) : (
            hits.map((hit) => (
              <a
                key={hit.objectID}
                className={styles.item}
                href={hit.url}
                onClick={() => setIsOpen(false)}
              >
                <div className={styles.itemTitle}>{getTitle(hit)}</div>
                <div className={styles.itemDescription}>{getDescription(hit)}</div>
              </a>
            ))
          )}
          {query && (
            <a className={styles.more} href={`${searchPageUrl}?q=${encodeURIComponent(query)}`}>
              查看全部结果
            </a>
          )}
        </div>
      )}
    </div>
  );
}
