import React, {useEffect, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import clsx from 'clsx';
import styles from './SlideDrawer.module.css';

const focusableSelectors = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([type="hidden"]):not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function useIsMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}

function useBodyScrollLock(open) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const scrollY = window.scrollY;
    const {style} = document.body;
    const originalPosition = style.position;
    const originalTop = style.top;
    const originalWidth = style.width;

    style.position = 'fixed';
    style.top = `-${scrollY}px`;
    style.width = '100%';

    return () => {
      style.position = originalPosition;
      style.top = originalTop;
      style.width = originalWidth;
      window.scrollTo(0, scrollY);
    };
  }, [open]);
}

export default function SlideDrawer({open, onClose, title, children}) {
  const isMounted = useIsMounted();
  const rootRef = useRef(null);
  const lastActiveRef = useRef(null);

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    lastActiveRef.current = document.activeElement;

    const timer = window.setTimeout(() => {
      const preferred =
        rootRef.current?.querySelector('input:not([disabled]), textarea:not([disabled]), select:not([disabled])') ||
        rootRef.current?.querySelector(focusableSelectors);
      preferred?.focus();
    }, 10);

    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (open) {
      return undefined;
    }
    const previous = lastActiveRef.current;
    if (previous && 'focus' in previous) {
      previous.focus();
    }
    lastActiveRef.current = null;
  }, [open]);

  const portalTarget = useMemo(() => {
    if (!isMounted) {
      return null;
    }
    return document.body;
  }, [isMounted]);

  if (!portalTarget) {
    return null;
  }

  return createPortal(
    <div
      className={clsx(styles.root, open && styles.rootOpen)}
      aria-hidden={!open}
      ref={rootRef}>
      <div className={styles.overlay} onClick={onClose} />
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={title || '侧滑窗'}>
        <div className={styles.header}>
          {title ? <h2 className={styles.title}>{title}</h2> : <span aria-hidden="true" />}
          <button
            type="button"
            className={styles.closeButton}
            aria-label="关闭"
            onClick={onClose}>
            ×
          </button>
        </div>
        <div className={styles.content}>{children}</div>
      </div>
    </div>,
    portalTarget,
  );
}
