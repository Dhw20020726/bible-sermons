import React from 'react';
import clsx from 'clsx';

export default function AnchorJump({id, to, children, className, label}) {
  if (!id || !to) {
    return null;
  }
  const content = children ?? label ?? '→ 跳转';

  return (
    <span id={id} className={clsx('anchor-jump', className)}>
      <a href={`#${to}`} className="sermon-link">
        {content}
      </a>
    </span>
  );
}
