import React, {useEffect, useState} from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

export default function Home() {
  const [lastRead, setLastRead] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const savedPath = window.localStorage.getItem('lastReadDocPath');
    const savedTitle = window.localStorage.getItem('lastReadDocTitle');
    if (savedPath) {
      setLastRead({
        path: savedPath,
        title: savedTitle || '继续上次阅读',
      });
    }
  }, []);

  const articles = [
    {
      title: '在信心中持续前行',
      excerpt: '从创世记到启示录，我们一步步学习信心的脚踪与盼望。',
      meta: '更新于最近一次讲道',
    },
    {
      title: '旧约中的恩典线索',
      excerpt: '透过律法、历史与诗歌，看到神持守的救赎计划。',
      meta: '旧约专题',
    },
    {
      title: '福音光照日常',
      excerpt: '灵修分享帮助我们在日常中操练祷告与顺服。',
      meta: '灵修分享',
    },
  ];

  const resources = [
    {
      title: '讲道资源',
      description: '整理主日讲道与专题系列，按主题浏览。',
    },
    {
      title: '阅读计划',
      description: '按卷书阅读路径，帮助系统性阅读。',
    },
    {
      title: '音频与讲义',
      description: '收听与下载内容，随时继续学习。',
    },
  ];

  return (
    <Layout title="圣经讲道与灵修分享" description="按卷书系统性分享神的话语与教会讲道">
      <main className="homeLayout">
        <section className="homeHero">
          <div className="homeHeroContent">
            <div className="homeHeroTop">
              <Link className="homeBackButton" to="/">
                回到主页
              </Link>
              <span>按卷书阅读神的话语</span>
            </div>
            <div>
              <h1>圣经讲道与灵修分享</h1>
              <p>
                按卷书系统性分享神的话语与教会讲道，让每一次阅读成为敬拜与生命更新的起点。
              </p>
            </div>
            <div className="homeHeroActions">
              <Link className="button homePrimaryButton" to="/docs">
                按卷书阅读神的话语
              </Link>
              {lastRead && (
                <Link className="button homeSecondaryButton" to={lastRead.path}>
                  继续上次阅读 · {lastRead.title}
                </Link>
              )}
            </div>
          </div>
        </section>

        <section className="homeSection">
          <h2>文章</h2>
          <div className="homeCardGrid">
            {articles.map((article) => (
              <div className="homeCard" key={article.title}>
                <strong>{article.title}</strong>
                <span className="homeCardMeta">{article.meta}</span>
                <p>{article.excerpt}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="homeSection">
          <h2>资源</h2>
          <div className="homeResourceStrip">
            {resources.map((resource) => (
              <div className="homeResourceItem" key={resource.title}>
                <strong>{resource.title}</strong>
                <p>{resource.description}</p>
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
