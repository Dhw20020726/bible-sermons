import React, {useEffect, useMemo, useState} from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {useAllDocsData} from '@docusaurus/plugin-content-docs/client';

export default function Home() {
  const allDocsData = useAllDocsData();
  const defaultCover = '/img/sermon-light.svg';
  const [lastReadPath, setLastReadPath] = useState('/docs');
  const [lastReadTitle, setLastReadTitle] = useState('继续上次阅读');

  const parseUpdatedAt = useMemo(() => {
    return (value) => {
      if (!value) {
        return null;
      }
      if (value instanceof Date) {
        return value.getTime();
      }
      const parsed = new Date(value).getTime();
      return Number.isNaN(parsed) ? null : parsed;
    };
  }, []);

  const recentArticles = Object.values(allDocsData)
    .flatMap((docData) => docData.versions)
    .flatMap((version) => version.docs)
    .map((doc) => {
      const updatedAt =
        parseUpdatedAt(doc.frontMatter?.updated) ?? doc.lastUpdatedAt ?? 0;
      return {
        permalink: doc.permalink,
        cover: doc.frontMatter?.cover || defaultCover,
        scripture: doc.frontMatter?.scripture || '圣经章节更新中',
        title: doc.frontMatter?.sermonTitle || doc.title,
        summary: doc.frontMatter?.summary || doc.description || '讲道摘要更新中。',
        updatedAt,
      };
    })
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 3);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const savedPath = window.localStorage.getItem('lastReadDocPath');
    const savedTitle = window.localStorage.getItem('lastReadDocTitle');
    if (savedPath) {
      setLastReadPath(savedPath);
    }
    if (savedTitle) {
      setLastReadTitle(`继续阅读：${savedTitle}`);
    }
  }, []);

  return (
    <Layout title="圣经讲道与灵修分享" description="按卷书系统性分享神的话语与教会讲道">
      <main className="homeLayout">
        <section className="homeHero">
          <div className="homeHeroContent">
            <div className="homeHeroVerse">
              <div>
                <h1>约翰福音 1:1</h1>
                <p>太初有道，道与　神同在，道就是　神。</p>
              </div>
              <div>
                <h2>约翰福音 1:14</h2>
                <p>
                  道成了肉身，住在我们中间，满有恩典和真理。我们见过他的荣光，
                  正是从父而来的独生子的荣光。
                </p>
              </div>
            </div>
            <div className="homeHeroActions">
              <Link className="button homePrimaryButton" to="/docs/old-testament/创世记/introduction">
                从创世记开始阅读
              </Link>
              <Link className="button homeSecondaryButton" to={lastReadPath}>
                {lastReadTitle}
              </Link>
            </div>
          </div>
        </section>

        <section className="homeSection">
          <h2>文章</h2>
          <div className="homeCardGrid">
            {recentArticles.map((article) => (
              <div className="homeCard" key={article.permalink}>
                <Link className="homeCardLink" to={article.permalink}>
                  <img
                    className="homeCardImage"
                    src={useBaseUrl(article.cover)}
                    alt={article.title}
                  />
                  <span className="homeCardScripture">{article.scripture}</span>
                  <h3 className="homeCardTitle">{article.title}</h3>
                  <p className="homeCardDescription">{article.summary}</p>
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className="homeAbout">
          <div className="homeAboutInner">
            <h2>关于我们</h2>
            <p>
              我们致力于以圣经为中心的讲道与灵修分享，盼望帮助弟兄姊妹在真道上扎根，
              在生活中经历主的恩典。
            </p>
            <p>如需联系或获取更多资源，请访问各卷书内容或相关资料区。</p>
          </div>
        </section>
      </main>
    </Layout>
  );
}
