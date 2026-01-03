import React, {useEffect, useMemo, useRef, useState} from 'react';
import SlideDrawer from './SlideDrawer';
import styles from './ContactDrawer.module.css';

const FORM_ENDPOINT = 'https://form.taxi/s/bible-sermons';

function ContactForm({open, onClose}) {
  const [status, setStatus] = useState('idle');
  const [feedback, setFeedback] = useState('');
  const formRef = useRef(null);

  useEffect(() => {
    if (status !== 'success' && status !== 'error') {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      onClose?.();
      setStatus('idle');
      setFeedback('');
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [status, onClose]);

  useEffect(() => {
    if (open) {
      return;
    }
    setStatus('idle');
    setFeedback('');
    formRef.current?.reset();
  }, [open]);

  const submitting = status === 'submitting';
  const feedbackClass = useMemo(() => {
    if (status === 'success') return styles.feedbackSuccess;
    if (status === 'error') return styles.feedbackError;
    return '';
  }, [status]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    setStatus('submitting');
    setFeedback('');

    const formData = new FormData(form);
    try {
      const response = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        body: formData,
        headers: {Accept: 'application/json'},
      });

      if (!response.ok) {
        throw new Error('Submit failed');
      }

      setStatus('success');
      setFeedback('发送成功！感谢你的留言。');
      form.reset();
    } catch (error) {
      console.error('Submit failed', error);
      setStatus('error');
      setFeedback('发送失败，请稍后重试。');
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} ref={formRef} noValidate>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="contact-name">
          姓名
        </label>
        <input
          id="contact-name"
          name="Name"
          type="text"
          className={styles.input}
          required
          autoComplete="name"
          placeholder="你的名字"
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="contact-email">
          邮箱
        </label>
        <input
          id="contact-email"
          name="Email"
          type="email"
          className={styles.input}
          required
          autoComplete="email"
          placeholder="name@example.com"
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="contact-message">
          留言
        </label>
        <textarea
          id="contact-message"
          name="Message"
          className={styles.textarea}
          required
          placeholder="请写下你的问题、祷告需求或建议"
        />
      </div>

      <div className={styles.actions}>
        <button className={styles.submit} type="submit" disabled={submitting}>
          {submitting ? '发送中…' : '提交留言'}
        </button>
        <p className={styles.helper}>我们会尽快回复，感谢你的联系。</p>
      </div>

      <div role="status" aria-live="polite" className={`${styles.feedback} ${feedbackClass}`}>
        {feedback}
      </div>
    </form>
  );
}

export default function ContactDrawer({open, onClose}) {
  return (
    <SlideDrawer open={open} onClose={onClose} title="Write message">
      <p className={styles.intro}>
        欢迎留言交流，分享你的见证、祷告请求或改进建议。我们会在收到后尽快与您联系。
      </p>
      <ContactForm open={open} onClose={onClose} />
    </SlideDrawer>
  );
}
