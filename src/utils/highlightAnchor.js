/**
 * @fileoverview 锚点目标高亮工具。
 * 通过 CSS class 动画短暂高亮指定 id 的元素（用于跳转反馈）。
 * 使用方式：highlightAnchorTarget(id) → 目标元素闪烁 2 秒后恢复。
 */

/**
 * 滚动到并高亮指定 anchor id 的元素。
 * 优先高亮标题后的第一个正文段落（非 anchor-jump 元素），
 * 如果不存在则高亮标题本身。
 * @param {string} id - 目标元素的 HTML id
 */
/** 锚点高亮动画持续时间（需与 CSS 中 anchor-target-flash 动画时长同步） */
const ANCHOR_FLASH_DURATION_MS = 2200;

export function highlightAnchorTarget(id) {
  if (!id) return;

  const targetAnchor = document.getElementById(id);
  if (!targetAnchor) return;

  // 本页总览（TOC）跳转：高亮标题本身
  let target = targetAnchor;

  // 若需要高亮标题下的正文，则选择标题后的第一个非 anchor-jump 节点
  let contentCandidate = targetAnchor.nextElementSibling;
  while (contentCandidate && contentCandidate.classList && contentCandidate.classList.contains('anchor-jump')) {
    contentCandidate = contentCandidate.nextElementSibling;
  }
  if (contentCandidate && contentCandidate.classList) {
    target = contentCandidate;
  }

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
