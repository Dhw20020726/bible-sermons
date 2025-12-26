import React from 'react';
import clsx from 'clsx';

export default function AnchorJump({id, to, children, className}) {
  if (!id || !to) {
    return null;
  }

  return (
    <span id={id} className={clsx('anchor-jump', className)}>
      <a href={`#${to}`} className="sermon-link">
        {children || '→ 跳转'}
      </a>
    </span>
  );
}
