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
    let target = targetAnchor.nextElementSibling;
    while (target && target.classList && target.classList.contains('anchor-jump')) {
      target = target.nextElementSibling;
    }
    if (!target || !target.classList) return;

    target.classList.remove('anchor-target-highlight');
    // 强制重绘以便重新触发动画
    // eslint-disable-next-line no-unused-expressions
    target.offsetHeight;
    target.classList.add('anchor-target-highlight');
    setTimeout(() => {
      target.classList.remove('anchor-target-highlight');
    }, 700);
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
