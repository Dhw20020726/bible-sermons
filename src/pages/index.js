import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import {useAllDocsData} from '@docusaurus/plugin-content-docs/client';

export default function Home() {
  const allDocsData = useAllDocsData();
  const recentArticles = Object.values(allDocsData)
    .flatMap((docData) => docData.versions)
    .flatMap((version) => version.docs)
    .map((doc) => {
      const updatedAt = doc.frontMatter?.updated
        ? Date.parse(doc.frontMatter.updated)
        : doc.lastUpdatedAt || 0;
      return {
        permalink: doc.permalink,
        cover: doc.frontMatter?.cover,
        scripture: doc.frontMatter?.scripture,
        title: doc.frontMatter?.sermonTitle || doc.title,
        summary: doc.frontMatter?.summary || doc.description,
        updatedAt,
      };
    })
    .filter((article) => article.cover && article.scripture && article.summary)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 3);

  return (
    <Layout title="圣经讲道与灵修分享" description="按卷书系统性分享神的话语与教会讲道">
      <main className="homeLayout">
        <section className="homeHero">
          <div className="homeHeroContent">
            <div>
              <h1>圣经讲道与灵修分享</h1>
              <p>
                按卷书系统性分享神的话语与教会讲道，让每一次阅读成为敬拜与生命更新的起点。
              </p>
            </div>
            <div className="homeHeroActions">
              <Link className="button homePrimaryButton" to="/docs/old-testament/创世记/introduction">
                从创世记开始阅读
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
                  <img className="homeCardImage" src={article.cover} alt={article.title} />
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
