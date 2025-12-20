import React, {useEffect, useMemo, useState} from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
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

export default function Home() {
  const allDocsData = useAllDocsData();
  const {firstDoc, permalinks} = useMemo(
    () => getDocsMetadata(allDocsData),
    [allDocsData],
  );
  const [lastReadPath, setLastReadPath] = useState(null);
  const [lastReadTitle, setLastReadTitle] = useState('继续上次阅读');
  const [hasLastRead, setHasLastRead] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const savedPath = window.localStorage.getItem('lastReadDocPath');
    const savedTitle = window.localStorage.getItem('lastReadDocTitle');
    if (savedPath && permalinks.has(savedPath)) {
      setLastReadPath(savedPath);
      setHasLastRead(true);
    }
    if (savedTitle) {
      setLastReadTitle(`继续阅读：${savedTitle}`);
    }
  }, [permalinks]);

  const primaryPath = firstDoc?.permalink || '/docs';
  const primaryLabel = firstDoc?.title ? `从${firstDoc.title}开始阅读` : '开始阅读';

  return (
    <Layout title="圣经讲道与灵修分享" description="按卷书系统性分享神的话语与教会讲道">
      <main className="homeLayout">
        <section className="homeHero">
          <div className="homeHeroContent">
            <div className="homeHeroVerse">
              <div>
                <h1>约翰福音 1:18</h1>
                <h2>
                  从来没有人看见　神，只有在父怀里的独生子将他表明出来。
                </h2>
              </div>
            </div>
            <div className="homeHeroActions">
              <Link className="button homePrimaryButton" to={primaryPath}>
                {primaryLabel}
              </Link>
              {hasLastRead && lastReadPath ? (
                <Link className="button homeSecondaryButton" to={lastReadPath}>
                  {lastReadTitle}
                </Link>
              ) : null}
            </div>
          </div>
        </section>

      </main>
    </Layout>
  );
}
