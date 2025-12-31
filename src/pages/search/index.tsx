import React, {useEffect, useMemo, useState} from 'react';
import Layout from '@theme/Layout';
import algoliasearch from 'algoliasearch/lite';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {useLocation, useHistory} from '@docusaurus/router';
import styles from './styles.module.css';

type Hit = {
  objectID: string;
  title?: string;
  scripture?: string;
  summary?: string;
  heading?: string;
  content?: string;
  url?: string;
  type?: string;
  book?: string;
  chapter?: string;
  verse?: string | number;
};

function formatTitle(hit: Hit) {
  if (hit.title) return hit.title;
  if (hit.scripture) return hit.scripture;
  if (hit.book) return `${hit.book}${hit.chapter ? ` ${hit.chapter}:${hit.verse ?? ''}` : ''}`;
  return hit.heading || '搜索结果';
}

function formatDescription(hit: Hit) {
  if (hit.summary) return hit.summary;
  if (hit.content) return hit.content?.slice(0, 140);
  return '';
}

function formatMeta(hit: Hit) {
  if (hit.scripture) return hit.scripture;
  if (hit.book) return `${hit.book}${hit.chapter ? ` ${hit.chapter}:${hit.verse ?? ''}` : ''}`;
  if (hit.heading) return hit.heading;
  return hit.type === 'sermon' ? '讲道' : hit.type === 'bible' ? '经文' : '其他';
}

const typeOptions = [
  {value: 'sermon', label: '讲道'},
  {value: 'bible', label: '经文'},
];

export default function SearchPage(): JSX.Element {
  const {
    siteConfig: {themeConfig},
  } = useDocusaurusContext();
  const algolia = (themeConfig as any)?.algolia;
  const searchClient = useMemo(
    () => (algolia?.appId && algolia?.apiKey ? algoliasearch(algolia.appId, algolia.apiKey) : null),
    [algolia],
  );

  const location = useLocation();
  const history = useHistory();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hitsPerPage = 12;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const incomingQuery = params.get('q') ?? '';
    setQuery(incomingQuery);
    const incomingTypes = params.getAll('type');
    if (incomingTypes.length) {
      setTypeFilter(new Set(incomingTypes));
    }
  }, [location.search]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    typeFilter.forEach((value) => params.append('type', value));
    history.replace({pathname: location.pathname, search: params.toString()});
  }, [history, location.pathname, query, typeFilter]);

  useEffect(() => {
    if (!searchClient || !algolia?.indexName) {
      setError('未配置 Algolia 搜索凭据');
      return;
    }
    setIsLoading(true);
    setError(null);
    const filters = [...typeFilter].map((value) => `type:${value}`).join(' OR ');
    const pending = {canceled: false};

    searchClient
      .search([
        {
          indexName: algolia.indexName,
          query,
          params: {
            page,
            hitsPerPage,
            ...(filters ? {filters} : {}),
          },
        },
      ])
      .then(({results}) => {
        if (pending.canceled) return;
        const first = results?.[0];
        setHits((first?.hits as Hit[]) ?? []);
        setTotal(first?.nbHits ?? 0);
      })
      .catch(() => {
        if (pending.canceled) return;
        setError('搜索失败，请稍后重试');
      })
      .finally(() => {
        if (pending.canceled) return;
        setIsLoading(false);
      });

    return () => {
      pending.canceled = true;
    };
  }, [algolia?.indexName, page, query, searchClient, typeFilter]);

  const totalPages = Math.ceil(total / hitsPerPage);

  const toggleType = (value: string) => {
    setPage(0);
    setTypeFilter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  };

  return (
    <Layout title="搜索" description="搜索讲道与经文内容">
      <main className={styles.container}>
        <section className={styles.header}>
          <h1>搜索</h1>
          <p className={styles.lead}>使用 Algolia 通用搜索界面快速查找讲道与圣经文本。</p>
          <div className={styles.searchRow}>
            <input
              type="search"
              className={styles.searchInput}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="输入关键词，例如 “生命”"
              aria-label="搜索讲道或经文"
            />
            <div className={styles.filters}>
              <span className={styles.filterLabel}>类型</span>
              {typeOptions.map((option) => (
                <label key={option.value} className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={typeFilter.has(option.value)}
                    onChange={() => toggleType(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>
          {error && <div className={styles.error}>{error}</div>}
        </section>

        <section className={styles.resultsSection}>
          {isLoading ? (
            <div className={styles.status}>正在加载搜索结果...</div>
          ) : hits.length === 0 ? (
            <div className={styles.status}>暂无结果，请尝试其他关键词。</div>
          ) : (
            <div className={styles.resultsGrid}>
              {hits.map((hit) => (
                <article key={hit.objectID} className={styles.card}>
                  <a href={hit.url ?? '#'} className={styles.cardLink}>
                    <div className={styles.cardMeta}>{formatMeta(hit)}</div>
                    <h3 className={styles.cardTitle}>{formatTitle(hit)}</h3>
                    <p className={styles.cardDescription}>{formatDescription(hit)}</p>
                  </a>
                </article>
              ))}
            </div>
          )}
        </section>

        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              className={styles.pageButton}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              上一页
            </button>
            <span className={styles.pageInfo}>
              第 {page + 1} / {totalPages} 页（共 {total} 条）
            </span>
            <button
              className={styles.pageButton}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              下一页
            </button>
          </div>
        )}
      </main>
    </Layout>
  );
}
