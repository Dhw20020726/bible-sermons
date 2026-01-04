import React, {useEffect, useRef, useState} from 'react';
import SlideDrawer from './SlideDrawer';

const FORM_ENDPOINT = 'https://form.taxi/s/nazc3qhm';

function ContactForm({open, onClose}) {
  const [status, setStatus] = useState('idle');
  const [feedback, setFeedback] = useState('');
  const [canSubmit, setCanSubmit] = useState(false);
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
    setCanSubmit(false);
    formRef.current?.reset();
  }, [open]);

  useEffect(() => {
    const form = formRef.current;
    if (!form) {
      return undefined;
    }

    const handleInput = () => {
      setCanSubmit(form.checkValidity());
    };

    handleInput();
    form.addEventListener('input', handleInput);

    return () => {
      form.removeEventListener('input', handleInput);
    };
  }, [open]);

  const submitting = status === 'submitting';

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
      setCanSubmit(false);
    } catch (error) {
      console.error('Submit failed', error);
      setStatus('error');
      setFeedback('发送失败，请稍后重试。');
    }
  };

  const isDisabled = submitting || !canSubmit;

  return (
    <form className="window" onSubmit={handleSubmit} ref={formRef} noValidate>
      <button type="button" className="close" aria-label="关闭" onClick={onClose}>
        <svg fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12"></path>
        </svg>
      </button>

      <div className="cont">
        <h2>
          Hey! <br />
          Tell us about your plans
        </h2>

        <fieldset>
          <div className="cols">
            <div>
              <label className="inpt-label" htmlFor="contact-name">
                Name &amp; Company
              </label>
              <input
                className="inpt"
                id="contact-name"
                name="Name"
                type="text"
                required
                maxLength={50}
                autoComplete="name"
              />
            </div>
            <div>
              <label className="inpt-label" htmlFor="contact-email">
                Your email address
              </label>
              <input
                className="inpt"
                id="contact-email"
                name="Email"
                type="email"
                required
                maxLength={250}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="text">
            <label className="inpt-label" htmlFor="contact-message">
              Your message
            </label>
            <textarea
              className="inpt"
              id="contact-message"
              name="Message"
              required
              maxLength={1000}
            />
          </div>
        </fieldset>
      </div>

      <div className="btnbar">
        <p>
          Our e-mail <a href="mailto:support@form.taxi">support@form.taxi</a>
        </p>
        <button className="btn primary" type="submit" disabled={isDisabled} aria-busy={submitting}>
          {submitting ? (
            <>
              <span className="spinner" aria-hidden />
              Sending…
            </>
          ) : (
            'Submit'
          )}
        </button>
      </div>

      <div role="status" aria-live="polite" className="inpt">
        {feedback ? <strong>{feedback}</strong> : null}
      </div>
    </form>
  );
}

export default function ContactDrawer({open, onClose}) {
  return (
    <SlideDrawer open={open} onClose={onClose} title="Write message">
      <ContactForm open={open} onClose={onClose} />
    </SlideDrawer>
  );
}
