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

    // 高亮锚点本身（用于 TOC / 自动跳转）
    const target = targetAnchor;
    if (!target || !target.classList) return;

    target.classList.remove('anchor-target-highlight');
    // 强制重绘以便重新触发动画
    // eslint-disable-next-line no-unused-expressions
    target.offsetHeight;
    target.classList.add('anchor-target-highlight');
    setTimeout(() => {
      target.classList.remove('anchor-target-highlight');
    }, 900);
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
