import React, {useEffect} from 'react';
import {useLocation} from '@docusaurus/router';
import {highlightAnchorTarget} from '../utils/highlightAnchor';

export default function Root({children}) {
  const {hash} = useLocation();

  useEffect(() => {
    if (!hash) return;
    const id = decodeURIComponent(hash.replace(/^#/, ''));
    window.requestAnimationFrame(() => {
      highlightAnchorTarget(id);
    });
  }, [hash]);

  return <>{children}</>;
}
