import React, {useEffect, useMemo, useState} from 'react';
import clsx from 'clsx';
import {useThemeConfig} from '@docusaurus/theme-common';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import styles from './styles.module.css';

function getNavbarHeight() {
  const navbar = document.querySelector('.navbar');
  return navbar ? navbar.clientHeight : 0;
}

function scrollToHeading(heading) {
  if (!heading) {
    return;
  }
  const offset = getNavbarHeight() + 16;
  const top = heading.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({top, behavior: 'smooth'});
}

function getActiveHeading(headings, anchorTopOffset) {
  const nextVisibleHeading = headings.find((heading) => {
    const rect = heading.getBoundingClientRect();
    return rect.top >= anchorTopOffset;
  });
  if (nextVisibleHeading) {
    const rect = nextVisibleHeading.getBoundingClientRect();
    if (rect.top > 0 && rect.bottom < window.innerHeight / 2) {
      return nextVisibleHeading;
    }
    const previousIndex = headings.indexOf(nextVisibleHeading) - 1;
    return headings[previousIndex] || nextVisibleHeading;
  }
  return headings[headings.length - 1] || null;
}

export default function DocItemTOCDropdown({className}) {
  const {toc, frontMatter} = useDoc();
  const themeConfig = useThemeConfig();
  const minHeadingLevel =
    frontMatter.toc_min_heading_level ??
    themeConfig.tableOfContents.minHeadingLevel;
  const maxHeadingLevel =
    frontMatter.toc_max_heading_level ??
    themeConfig.tableOfContents.maxHeadingLevel;
  const tocItems = useMemo(() => {
    return toc.filter(
      (item) =>
        item.level >= minHeadingLevel && item.level <= maxHeadingLevel,
    );
  }, [toc, minHeadingLevel, maxHeadingLevel]);
  const [activeId, setActiveId] = useState(tocItems[0]?.id ?? '');

  useEffect(() => {
    if (!tocItems.length) {
      return undefined;
    }
    const headings = tocItems
      .map((item) => document.getElementById(item.id))
      .filter(Boolean);
    const anchorTopOffset = themeConfig.navbar?.hideOnScroll
      ? 0
      : getNavbarHeight();

    const updateActiveHeading = () => {
      if (!headings.length) {
        return;
      }
      const activeHeading = getActiveHeading(headings, anchorTopOffset);
      if (activeHeading?.id) {
        setActiveId(activeHeading.id);
      }
    };

    updateActiveHeading();
    document.addEventListener('scroll', updateActiveHeading);
    window.addEventListener('resize', updateActiveHeading);
    return () => {
      document.removeEventListener('scroll', updateActiveHeading);
      window.removeEventListener('resize', updateActiveHeading);
    };
  }, [themeConfig.navbar?.hideOnScroll, tocItems]);

  useEffect(() => {
    if (tocItems.length) {
      setActiveId(tocItems[0]?.id ?? '');
    }
  }, [tocItems]);

  const handleChange = (event) => {
    const nextId = event.target.value;
    setActiveId(nextId);
    const heading = document.getElementById(nextId);
    scrollToHeading(heading);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${nextId}`);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const hash = window.location.hash?.slice(1);
    if (!hash) {
      return;
    }
    if (tocItems.some((item) => item.id === hash)) {
      setActiveId(hash);
    }
  }, [tocItems]);

  if (!tocItems.length) {
    return null;
  }

  return (
    <div className={clsx(styles.dropdownWrapper, className)}>
      <label className={styles.dropdownLabel} htmlFor="doc-toc-dropdown">
        目录
      </label>
      <select
        id="doc-toc-dropdown"
        className={styles.dropdownSelect}
        onChange={handleChange}
        value={activeId}
      >
        {tocItems.map((item) => {
          const indent = '—'.repeat(Math.max(item.level - minHeadingLevel, 0));
          return (
            <option key={item.id} value={item.id}>
              {indent ? `${indent} ` : ''}
              {item.value}
            </option>
          );
        })}
      </select>
    </div>
  );
}
