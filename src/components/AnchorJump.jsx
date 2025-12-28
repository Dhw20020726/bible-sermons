import React from 'react';
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
  const content = label ?? children ?? sectionDefault;

  return (
    <span id={id} className={clsx('anchor-jump', className)}>
      <a href={`#${to}`} className="sermon-link">
        {content}
      </a>
    </span>
  );
}
