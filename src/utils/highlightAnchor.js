/**
 * @fileoverview 锚点目标高亮工具。
 * 通过 CSS class 动画短暂高亮指定 id 的元素（用于跳转反馈）。
 * 使用方式：highlightAnchorTarget(id) → 目标元素闪烁 2 秒后恢复。
 */

/** 锚点高亮动画持续时间（需与 CSS 中 anchor-target-flash 动画时长同步） */
const ANCHOR_FLASH_DURATION_MS = 2200;

/**
 * 高亮指定 anchor id 的元素（通常是标题）。
 * @param {string} id - 目标元素的 HTML id
 */
export function highlightAnchorTarget(id) {
  if (!id) return;

  const target = document.getElementById(id);
  if (!target || !target.classList) return;

  target.classList.remove('anchor-target-highlight');
  // 强制重绘以便重新触发动画
  // eslint-disable-next-line no-unused-expressions
  target.offsetHeight;
  target.classList.add('anchor-target-highlight');
  setTimeout(() => {
    target.classList.remove('anchor-target-highlight');
  }, ANCHOR_FLASH_DURATION_MS);
}

/**
 * 等待指定 id 的元素出现在 DOM 中后执行回调。
 * Docusaurus 客户端路由下，跳转后正文是异步渲染的，直接 getElementById 可能为 null，
 * 因此轮询等待元素就绪，让标题高亮更可靠。
 * @param {string} id - 目标元素 id
 * @param {Function} callback - 元素就绪后的回调
 * @param {number} [maxTries] - 最大轮询次数（默认 30 次）
 * @param {number} [interval] - 轮询间隔毫秒（默认 100ms）
 */
export function waitForElement(id, callback, maxTries = 30, interval = 100) {
  if (!id || typeof callback !== 'function') return;
  let tries = 0;
  const check = () => {
    const el = document.getElementById(id);
    if (el) {
      callback(el);
      return;
    }
    tries += 1;
    if (tries >= maxTries) return;
    setTimeout(check, interval);
  };
  check();
}
