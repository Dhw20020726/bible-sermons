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

  const extractIntroContent = useMemo(() => {
    return (doc) => {
      const quote =
        doc.frontMatter?.quote ||
        doc.frontMatter?.excerpt ||
        doc.frontMatter?.verse ||
        '';
      const reflection =
        doc.frontMatter?.reflection || doc.frontMatter?.meditation || '';
      return {
        scripture: doc.frontMatter?.scripture || '圣经章节更新中',
        title: doc.frontMatter?.sermonTitle || doc.title,
        summary:
          reflection ||
          doc.frontMatter?.summary ||
          doc.description ||
          '讲道摘要更新中。',
        quote,
      };
    };
  }, []);

  const johnIntro = Object.values(allDocsData)
    .flatMap((docData) => docData.versions)
    .flatMap((version) => version.docs)
    .find((doc) => doc.unversionedId === 'new-testament/约翰福音/introduction');

  const introContent = johnIntro ? extractIntroContent(johnIntro) : null;
  const articleCards = introContent
    ? [
        {
          key: 'scripture',
          label: '圣经章节',
          title: introContent.title,
          description: introContent.scripture,
        },
        {
          key: 'quote',
          label: '经文摘录',
          title: '经文摘录',
          description: introContent.quote || '经文摘录更新中。',
        },
        {
          key: 'reflection',
          label: '默想与讲道示例',
          title: '默想与讲道示例',
          description: introContent.summary,
        },
      ]
    : [];

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
                <h1>约翰福音 1:18</h1>
                <h2>
                  从来没有人看见　神，只有在父怀里的独生子将他表明出来。
                </h2>
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
            {articleCards.map((article) => (
              <div className="homeCard" key={article.key}>
                <Link
                  className="homeCardLink"
                  to={johnIntro?.permalink || '/docs/new-testament/约翰福音/introduction'}
                >
                  <img
                    className="homeCardImage"
                    src={useBaseUrl(johnIntro?.frontMatter?.cover || defaultCover)}
                    alt={article.title}
                  />
                  <span className="homeCardScripture">{article.label}</span>
                  <h3 className="homeCardTitle">{article.title}</h3>
                  <p className="homeCardDescription">{article.description}</p>
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
