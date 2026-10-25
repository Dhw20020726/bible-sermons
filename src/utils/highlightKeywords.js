/**
 * @fileoverview 搜索关键词高亮工具。
 * 用户点击搜索结果跳转到目标页后，在正文中高亮其搜索的关键词。
 * 关键词由 SearchBar 在导航前写入 sessionStorage，此处读取、切词并高亮。
 */

const STORAGE_KEY = 'docsearch-highlight-query';

/**
 * 将搜索 query 切分为若干关键词。
 * 按空白与常见中文标点切分，过滤掉过短（单字符）的片段，避免高亮到「的/了/是」等虚词。
 * @param {string} query
 * @returns {string[]}
 */
export function tokenizeQuery(query) {
  if (!query) return [];
  return query
    .split(/[\s,，。;；、|/（）()]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);
}

/** 转义正则特殊字符，避免关键词中的符号破坏正则 */
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 获取正文内容根节点：优先文档正文，其次 article，最后整个 body */
function getContentRoot() {
  return (
    document.querySelector('.theme-doc-markdown') ||
    document.querySelector('article') ||
    document.body
  );
}

/**
 * 在指定根节点内高亮所有匹配的关键词（用 <mark class="keyword-highlight"> 包裹）。
 * 采用 TreeWalker 遍历文本节点，跳过 mark/代码块/脚本等无关节点。
 * @param {string[]} terms
 * @param {HTMLElement} [root]
 */
export function highlightKeywords(terms, root) {
  if (!terms || terms.length === 0) return;
  const targetRoot = root || getContentRoot();
  if (!targetRoot) return;

  // 长的关键词优先，避免「耶稣」被「耶稣基督」截断后重复高亮
  const escaped = terms
    .map(escapeRegExp)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  const pattern = escaped.join('|');
  if (!pattern) return;

  const regex = new RegExp(`(${pattern})`);
  const walker = document.createTreeWalker(targetRoot, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (parent.closest('mark, script, style, noscript, pre, code')) {
        return NodeFilter.FILTER_REJECT;
      }
      if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const textNodes = [];
  let current = walker.nextNode();
  while (current) {
    textNodes.push(current);
    current = walker.nextNode();
  }

  textNodes.forEach((node) => {
    const text = node.nodeValue;
    if (!regex.test(text)) return;

    const parts = text.split(regex);
    if (parts.length < 2) return;

    const fragment = document.createDocumentFragment();
    parts.forEach((part, index) => {
      if (index % 2 === 1) {
        const mark = document.createElement('mark');
        mark.className = 'keyword-highlight';
        mark.textContent = part;
        fragment.appendChild(mark);
      } else if (part) {
        fragment.appendChild(document.createTextNode(part));
      }
    });
    node.parentNode.replaceChild(fragment, node);
  });
}

/**
 * 等待正文内容加载完成（轮询最多 maxTries 次，每次间隔 interval 毫秒）。
 * Docusaurus 客户端路由下，跳转后正文是异步渲染的，需等 DOM 就绪再高亮。
 * @param {Function} callback
 * @param {number} [maxTries]
 * @param {number} [interval]
 */
function waitForContent(callback, maxTries = 30, interval = 100) {
  let tries = 0;
  const check = () => {
    const root = getContentRoot();
    if (root && root.textContent.trim().length > 0) {
      callback(root);
      return;
    }
    tries += 1;
    if (tries >= maxTries) return;
    setTimeout(check, interval);
  };
  check();
}

/** 读取并清除 sessionStorage 中的搜索关键词 */
function consumeSearchQuery() {
  if (typeof window === 'undefined') return '';
  const query = window.sessionStorage.getItem(STORAGE_KEY) || '';
  window.sessionStorage.removeItem(STORAGE_KEY);
  return query;
}

/**
 * 从 sessionStorage 读取搜索关键词，等正文加载后高亮。
 * 供 Root.jsx 在 hash 跳转时调用。
 */
export function highlightKeywordsFromQuery() {
  if (typeof window === 'undefined') return;
  const query = consumeSearchQuery();
  const terms = tokenizeQuery(query);
  if (terms.length === 0) return;
  waitForContent((root) => highlightKeywords(terms, root));
}

/**
 * 保存搜索关键词到 sessionStorage（由 SearchBar 在导航前调用）。
 * @param {string} query
 */
export function persistSearchQuery(query) {
  if (typeof window === 'undefined' || !query) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, query);
  } catch (error) {
    // sessionStorage 不可用时静默失败，不影响搜索跳转
  }
}
