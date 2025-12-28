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
  }, 2200);
}
