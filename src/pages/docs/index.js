import React, {useEffect} from 'react';
import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';

export default function DocsIndex() {
  const defaultDocPath = useBaseUrl('/docs/old-testament/创世记/introduction');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const savedPath = window.localStorage.getItem('lastReadDocPath');
    if (savedPath) {
      window.location.replace(savedPath);
      return;
    }
    window.location.replace(defaultDocPath);
  }, [defaultDocPath]);

  return (
    <Layout title="正在跳转">
      <main style={{padding: '4rem 1.5rem', textAlign: 'center'}}>
        正在跳转到上次阅读的位置…
      </main>
    </Layout>
  );
}
