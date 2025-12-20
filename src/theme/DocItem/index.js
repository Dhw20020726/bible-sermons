import React, {useEffect} from 'react';
import DocItem from '@theme-original/DocItem';
import {useLocation} from '@docusaurus/router';

export default function DocItemWrapper(props) {
  const metadata = props?.content?.metadata;
  const location = useLocation();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const path = metadata?.permalink || location.pathname;
    if (path) {
      window.localStorage.setItem('lastReadDocPath', path);
    }
    if (metadata?.title) {
      window.localStorage.setItem('lastReadDocTitle', metadata.title);
    }
  }, [metadata?.permalink, metadata?.title, location.pathname]);

  return <DocItem {...props} />;
}
