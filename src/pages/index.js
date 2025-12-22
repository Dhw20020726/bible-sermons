import React, {useCallback, useEffect, useRef, useState} from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

export default function Home() {
  const [lastReadPath, setLastReadPath] = useState('/docs');
  const [lastReadTitle, setLastReadTitle] = useState('继续上次阅读');
  const [heroLoaded, setHeroLoaded] = useState(false);
  const heroRef = useRef(null);
  const heroImageUrl = useBaseUrl('/img/home_hero.webp');
  const hasRequestedHero = useRef(false);

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
      title="圣经讲道与灵修分享"
      description="按卷书系统性分享神的话语与教会讲道"
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
              <Link className="button homePrimaryButton" to="/docs/old-testament/创世记/introduction">
                从创世记开始阅读
              </Link>
              <Link className="button homeSecondaryButton" to={lastReadPath}>
                {lastReadTitle}
              </Link>
            </div>
          </div>
        </section>

      </main>
    </Layout>
  );
}
