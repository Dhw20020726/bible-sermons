/**
 * @fileoverview 站点首页组件。
 * 渲染 hero 区域（大图背景 + 经文金句）、"从创世记开始阅读"按钮、
 * 以及"继续上次阅读"按钮（从 localStorage 读取上次访问的文档路径）。
 * 背景图懒加载：用 IntersectionObserver 监听 hero 区域进入视口后才加载图片。
 */

import React, {useCallback, useEffect, useRef, useState} from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

/**
 * 首页组件：Hero 背景图懒加载 + 经文展示 + "从创世记开始阅读" + "继续上次阅读"。
 * 背景图使用 IntersectionObserver 延迟加载，避免阻塞首屏渲染。
 */
export default function Home() {
  const [lastReadPath, setLastReadPath] = useState('/docs');
  const [lastReadTitle, setLastReadTitle] = useState('继续上次阅读');
  const [hasLastRead, setHasLastRead] = useState(false);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const heroRef = useRef(null);
  const heroImageUrl = useBaseUrl('/img/home_hero.webp');
  const hasRequestedHero = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    document.body.classList.add('home-page');
    return () => {
      document.body.classList.remove('home-page');
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const savedPath = window.localStorage.getItem('lastReadDocPath');
    const savedTitle = window.localStorage.getItem('lastReadDocTitle');
    if (savedPath) {
      setLastReadPath(savedPath);
      setHasLastRead(true);
    }
    if (savedTitle) {
      setLastReadTitle(`继续阅读：${savedTitle}`);
    }
  }, []);

  const loadHeroImage = useCallback(() => {
    if (hasRequestedHero.current) {
      return;
    }
    hasRequestedHero.current = true;
    const image = new Image();
    image.onload = () => {
      setHeroLoaded(true);
    };
    image.src = heroImageUrl;
  }, [heroImageUrl]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    if (!heroRef.current) {
      return undefined;
    }
    let observer;
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            loadHeroImage();
            observer.disconnect();
          }
        },
        {rootMargin: '200px'},
      );
      observer.observe(heroRef.current);
    } else {
      window.addEventListener('load', loadHeroImage, {once: true});
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
      window.removeEventListener('load', loadHeroImage);
    };
  }, [loadHeroImage]);

  const heroStyle = heroLoaded
    ? {
        '--home-hero-image': `url("${heroImageUrl}")`,
        '--home-hero-opacity': 1,
      }
    : undefined;

  return (
    <Layout
      description="以圣经为中心分享神的话语与教会讲道"
      wrapperClassName="navbar--home"
    >
      <main className="homeLayout">
        <section className="homeHero" ref={heroRef} style={heroStyle}>
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
              <Link className="button homePrimaryButton" to="/docs/category/创世记">
                从创世记开始阅读
              </Link>
              {hasLastRead && (
                <Link className="button homeSecondaryButton" to={lastReadPath}>
                  {lastReadTitle}
                </Link>
              )}
            </div>
          </div>
        </section>

      </main>
    </Layout>
  );
}
