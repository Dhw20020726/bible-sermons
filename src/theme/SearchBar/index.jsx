/**
 * @fileoverview Algolia DocSearch 搜索栏组件。
 * 覆盖 Docusaurus 默认的 @theme/SearchBar，集成 Algolia DocSearch 弹窗搜索。
 * 核心子组件 DocSearch 负责：导入 @docsearch/react/modal、管理开关状态、
 * 连接 Algolia 搜索客户端、渲染搜索结果弹窗。
 * 配置来自 themeConfig.algolia（在 docusaurus.config.js 中设置）。
 */

import React, {useCallback, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {DocSearchButton} from '@docsearch/react';
import {useDocSearchKeyboardEvents} from '@docsearch/react/useDocSearchKeyboardEvents';
import Head from '@docusaurus/Head';
import Link from '@docusaurus/Link';
import {useHistory} from '@docusaurus/router';
import {
  isRegexpStringMatch,
  useSearchLinkCreator,
} from '@docusaurus/theme-common';
import {
  useAlgoliaContextualFacetFilters,
  useSearchResultUrlProcessor,
  useAlgoliaAskAi,
  mergeFacetFilters,
} from '@docusaurus/theme-search-algolia/client';
import Translate from '@docusaurus/Translate';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import translations from '@theme/SearchTranslations';
import {persistSearchQuery} from '../../utils/highlightKeywords';

/** 找到 DocSearch 最近搜索记录的 localStorage 键（形如 __DOCSEARCH_RECENT_SEARCHES__<indexName>） */
function findRecentSearchesKey() {
  if (typeof window === 'undefined') return null;
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith('__DOCSEARCH_RECENT_SEARCHES__')) {
      return key;
    }
  }
  return null;
}

/**
 * 把带 <mark> 高亮的摘要片段写回最近搜索记录。
 * DocSearch 内部 saveRecentSearch 会把 content 项的 content 置空、type 改为 lvl1，
 * 导致最近搜索只显示标题、没有内容。这里在跳转前（saveRecentSearch 之后）手动把
 * type 改回 content 并填回摘要，让最近搜索像普通命中一样显示「摘要 + 标题」。
 */
function persistRecentSearchSnippet(item) {
  if (typeof window === 'undefined' || !item || item.type !== 'content') return;

  // 优先取 Algolia 的 _snippetResult（含 <mark>）；再次点击最近搜索时该项没有
  // _snippetResult，则回退到已存的 content（即上次保存的摘要）。
  const snippet = item._snippetResult?.content?.value || item.content;
  if (!snippet) return;

  const key = findRecentSearchesKey();
  if (!key) return;

  let stored;
  try {
    stored = JSON.parse(window.localStorage.getItem(key));
  } catch (error) {
    return;
  }
  if (!Array.isArray(stored)) return;

  const idx = stored.findIndex((entry) => entry.objectID === item.objectID);
  if (idx === -1) return;

  stored[idx] = {
    ...stored[idx],
    type: 'content',
    content: snippet,
  };
  window.localStorage.setItem(key, JSON.stringify(stored));
}

/** 根据 URL 是否匹配外部域名，决定用 history.push 还是 window.location.href 进行导航 */
function useNavigator({externalUrlRegex}) {
  const history = useHistory();
  const [navigator] = useState(() => {
    return {
      navigate(params) {
        // 记录本次搜索关键词，供跳转后的页面高亮命中的关键字
        persistSearchQuery(params.state?.query);
        // 修正最近搜索记录：补回内容摘要，避免只显示标题
        persistRecentSearchSnippet(params.item);
        if (isRegexpStringMatch(externalUrlRegex, params.itemUrl)) {
          window.location.href = params.itemUrl;
        } else {
          history.push(params.itemUrl);
        }
      },
    };
  });
  return navigator;
}

/** 为 Algolia 搜索客户端添加 Docusaurus 版本信息（用于分析统计） */
function useTransformSearchClient() {
  const {
    siteMetadata: {docusaurusVersion},
  } = useDocusaurusContext();
  return useCallback(
    (searchClient) => {
      searchClient.addAlgoliaAgent('docusaurus', docusaurusVersion);
      return searchClient;
    },
    [docusaurusVersion],
  );
}

/** 处理搜索结果项：把 URL 转换为 Docusaurus 站点内链接 */
function useTransformItems({transformItems}) {
  const processSearchResultUrl = useSearchResultUrlProcessor();
  const [transform] = useState(() => {
    return (items) => {
      const processed = transformItems
        ? transformItems(items)
        : items.map((item) => ({
            ...item,
            url: processSearchResultUrl(item.url),
          }));
      return processed;
    };
  });
  return transform;
}

/** 渲染搜索结果弹窗底部的"查看全部 N 条结果"链接 */
function useResultsFooterComponent({closeModal}) {
  return useMemo(
    () =>
      ({state}) =>
        (
          <Link to={useSearchLinkCreator()(state.query)} onClick={closeModal}>
            <Translate id="theme.SearchBar.seeAll" values={{count: state.context.nbHits}}>
              {'See all {count} results'}
            </Translate>
          </Link>
        ),
    [closeModal],
  );
}

/** 合并 contextual search facet filter 和用户配置的 searchParameters */
function useSearchParameters({contextualSearch, ...props}) {
  const contextualSearchFacetFilters = useAlgoliaContextualFacetFilters();
  const configFacetFilters = props.searchParameters?.facetFilters ?? [];
  const facetFilters = contextualSearch
    ? mergeFacetFilters(contextualSearchFacetFilters, configFacetFilters)
    : configFacetFilters;

  return {
    ...props.searchParameters,
    facetFilters,
  };
}

/**
 * DocSearch 弹窗容器组件。
 * 管理弹窗开关状态、搜索容器 DOM 挂载、键盘快捷键绑定和 portal 渲染。
 */
function DocSearch({externalUrlRegex, ...props}) {
  const navigator = useNavigator({externalUrlRegex});
  const searchParameters = useSearchParameters({...props});
  const transformItems = useTransformItems(props);
  const transformSearchClient = useTransformSearchClient();

  const searchContainer = useRef(null);
  const searchButtonRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [initialQuery, setInitialQuery] = useState(undefined);

  const {isAskAiActive, currentPlaceholder, onAskAiToggle, extraAskAiProps} =
    useAlgoliaAskAi(props);

  const DocSearchModalComponent = useRef(null);
  const prepareSearchContainer = useCallback(() => {
    if (!searchContainer.current) {
      const divElement = document.createElement('div');
      searchContainer.current = divElement;
      document.body.insertBefore(divElement, document.body.firstChild);
    }
  }, []);

  const openModal = useCallback(() => {
    prepareSearchContainer();
    Promise.all([import('@docsearch/react/modal'), import('@docsearch/react/style')])
      .then(([{DocSearchModal: Modal}]) => {
        DocSearchModalComponent.current = Modal;
        setIsOpen(true);
      })
      .catch((err) => {
        console.error('DocSearch 弹窗加载失败：', err);
      });
  }, [prepareSearchContainer]);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    searchButtonRef.current?.focus();
    setInitialQuery(undefined);
    onAskAiToggle(false);
  }, [onAskAiToggle]);

  const handleInput = useCallback(
    (event) => {
      if (event.key === 'f' && (event.metaKey || event.ctrlKey)) {
        return;
      }
      event.preventDefault();
      setInitialQuery(event.key);
      openModal();
    },
    [openModal],
  );

  const resultsFooterComponent = useResultsFooterComponent({closeModal});

  useDocSearchKeyboardEvents({
    isOpen,
    onOpen: openModal,
    onClose: closeModal,
    onInput: handleInput,
    searchButtonRef,
    isAskAiActive: isAskAiActive ?? false,
    onAskAiToggle: onAskAiToggle ?? (() => {}),
  });

  return (
    <>
      <Head>
        <link
          rel="preconnect"
          href={`https://${props.appId}-dsn.algolia.net`}
          crossOrigin="anonymous"
        />
      </Head>

      <DocSearchButton
        onTouchStart={prepareSearchContainer}
        onFocus={prepareSearchContainer}
        onMouseOver={prepareSearchContainer}
        onClick={openModal}
        ref={searchButtonRef}
        translations={props.translations?.button ?? translations.button}
      />

      {isOpen &&
        DocSearchModalComponent.current &&
        searchContainer.current &&
        createPortal(
          <DocSearchModalComponent.current
            onClose={closeModal}
            initialScrollY={window.scrollY}
            initialQuery={initialQuery}
            navigator={navigator}
            transformItems={transformItems}
            hitComponent={({hit, children}) => <Link to={hit.url}>{children}</Link>}
            transformSearchClient={transformSearchClient}
            {...(props.searchPagePath && {
              resultsFooterComponent,
            })}
            placeholder={currentPlaceholder}
            {...props}
            translations={props.translations?.modal ?? translations.modal}
            searchParameters={searchParameters}
            {...extraAskAiProps}
          />,
          searchContainer.current,
        )}
    </>
  );
}

/** 搜索栏入口组件，从 siteConfig.themeConfig.algolia 读取配置并传递给 DocSearch */
export default function SearchBar() {
  const {siteConfig} = useDocusaurusContext();
  return <DocSearch {...siteConfig.themeConfig.algolia} />;
}
