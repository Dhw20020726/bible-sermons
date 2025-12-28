import React, {useCallback} from 'react';
import clsx from 'clsx';

export default function AnchorJump({id, to, children, className, label, section}) {
  if (!id || !to) {
    return null;
  }
  const sectionDefault =
    section === '经文摘录'
      ? '→ 讲道'
      : section === '讲道正文'
        ? '→ 经文'
        : '→ 跳转';
  const content = label !== undefined ? label : children ?? sectionDefault;

  const highlightTarget = useCallback(() => {
    const targetAnchor = document.getElementById(to);
    if (!targetAnchor) return;
    // 优先高亮当前标题（本页总览 TOC 跳转），否则高亮标题后的内容块
    let target = targetAnchor;
    if (target && target.nextElementSibling) {
      let candidate = target.nextElementSibling;
      while (candidate && candidate.classList && candidate.classList.contains('anchor-jump')) {
        candidate = candidate.nextElementSibling;
      }
      if (candidate && candidate.classList) {
        target = candidate;
      }
    }
    if (!target || !target.classList) return;

    target.classList.remove('anchor-target-highlight');
    // 强制重绘以便重新触发动画
    // eslint-disable-next-line no-unused-expressions
    target.offsetHeight;
    target.classList.add('anchor-target-highlight');
    setTimeout(() => {
      target.classList.remove('anchor-target-highlight');
    }, 1000);
  }, [to]);

  return (
    <span id={id} className={clsx('anchor-jump', className)}>
      <a
        href={`#${to}`}
        className="sermon-link"
        onClick={() => {
          window.requestAnimationFrame(() => highlightTarget());
        }}>
        {content}
      </a>
    </span>
  );
}
