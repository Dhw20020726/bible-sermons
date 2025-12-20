import React, {useEffect, useMemo, useState} from 'react';
import Layout from '@theme/Layout';
import {useAllDocsData} from '@docusaurus/plugin-content-docs/client';

const getDocsMetadata = (allDocsData) => {
  const docDataEntries = Object.values(allDocsData || {});
  if (docDataEntries.length === 0) {
    return {firstDoc: null, permalinks: new Set()};
  }

  const {versions = []} = docDataEntries[0];
  const [currentVersion] = versions;
  const docs = currentVersion?.docs || [];
  const permalinks = new Set(docs.map((doc) => doc.permalink));
  return {firstDoc: docs[0] || null, permalinks};
};

export default function DocsIndex() {
  const allDocsData = useAllDocsData();
  const {firstDoc, permalinks} = useMemo(
    () => getDocsMetadata(allDocsData),
    [allDocsData],
  );
  const [hasDocs, setHasDocs] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (permalinks.size === 0) {
      setHasDocs(false);
      return;
    }

    const savedPath = window.localStorage.getItem('lastReadDocPath');
    if (savedPath && permalinks.has(savedPath)) {
      window.location.replace(savedPath);
      return;
    }

    if (firstDoc?.permalink) {
      window.location.replace(firstDoc.permalink);
      return;
    }

    setHasDocs(false);
  }, [firstDoc?.permalink, permalinks]);

  return (
    <Layout title={hasDocs ? '正在跳转' : '暂无内容'}>
      <main style={{padding: '4rem 1.5rem', textAlign: 'center'}}>
        {hasDocs ? '正在跳转到可用的阅读内容…' : '暂无内容'}
      </main>
    </Layout>
  );
}
