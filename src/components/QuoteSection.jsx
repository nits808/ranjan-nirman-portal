import React, { useState } from 'react';
import { submitQuoteRequest } from '../api';
import { useToast } from '../context/ToastContext';
import './QuoteSection.css';

const initial = { name: '', email: '', phone: '', projectType: '', message: '' };

export default function QuoteSection() {
  const { success, error: toastError } = useToast();
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const onChange = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setMsg({ type: '', text: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ type: '', text: '' });
    try {
      const { ok, data } = await submitQuoteRequest(form);
      if (ok) {
        setForm(initial);
        success(data?.message || 'Quote request sent — we will be in touch soon.');
        setMsg({
          type: 'ok',
          text: data?.message || 'Thank you — we will contact you shortly.',
        });
      } else {
        toastError(data?.message || 'Could not submit quote.');
        setMsg({
          type: 'err',
          text: data?.message || 'Could not submit. Please try again or call us directly.',
        });
      }
    } catch {
      toastError('Server unreachable — quote not saved.');
      setMsg({
        type: 'err',
        text:
          'Could not reach the server. Your request was not saved. Ensure the backend implements POST /api/quote-requests (see docs/API_AUTH.md).',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contact" className="quote-section">
      <div className="quote-inner animate-fade-up">
        <h2 className="quote-title">
          Request a <span>quote</span>
        </h2>
        <p className="quote-subtitle">
          Tell us about your project. We respond within one business day.
        </p>

        {msg.text && (
          <div className={msg.type === 'ok' ? 'quote-banner quote-banner--ok' : 'quote-banner quote-banner--err'}>
            {msg.text}
          </div>
        )}

        <form className="quote-form" onSubmit={handleSubmit}>
          <div className="quote-grid">
            <label className="quote-field">
              <span>Name</span>
              <input
                required
                value={form.name}
                onChange={onChange('name')}
                placeholder="Your name"
                autoComplete="name"
              />
            </label>
            <label className="quote-field">
              <span>Email</span>
              <input
                required
                type="email"
                value={form.email}
                onChange={onChange('email')}
                placeholder="you@company.com"
                autoComplete="email"
              />
            </label>
            <label className="quote-field">
              <span>Phone</span>
              <input
                value={form.phone}
                onChange={onChange('phone')}
                placeholder="+977 …"
                autoComplete="tel"
              />
            </label>
            <label className="quote-field">
              <span>Project type</span>
              <select value={form.projectType} onChange={onChange('projectType')} required>
                <option value="">Select…</option>
                <option value="commercial">Commercial</option>
                <option value="residential">Residential</option>
                <option value="infrastructure">Infrastructure</option>
                <option value="consulting">Consulting</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>
          <label className="quote-field quote-field--full">
            <span>Message</span>
            <textarea
              rows={4}
              value={form.message}
              onChange={onChange('message')}
              placeholder="Scope, location, timeline…"
              required
            />
          </label>
          <button type="submit" className="quote-submit" disabled={loading}>
            {loading ? 'Sending…' : 'Submit request'}
          </button>
        </form>
      </div>
    </section>
  );
}
