import React, { useEffect, useState } from 'react';
import './KeyboardShortcutsModal.css';

const ROWS = [
  { keys: '?', desc: 'Open or close this help panel' },
  { keys: 'Tab', desc: 'Move focus through links and buttons' },
  { keys: 'Esc', desc: 'Close this panel (when open)' },
];

export default function KeyboardShortcutsModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) return;
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!open) return null;

  return (
    <div className="kbd-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="kbd-title">
      <div className="kbd-modal">
        <div className="kbd-modal__head">
          <h2 id="kbd-title">Keyboard shortcuts</h2>
          <button type="button" className="kbd-modal__close" onClick={() => setOpen(false)} aria-label="Close">
            ×
          </button>
        </div>
        <ul className="kbd-modal__list">
          {ROWS.map((r) => (
            <li key={r.keys}>
              <kbd className="kbd-pill">{r.keys}</kbd>
              <span>{r.desc}</span>
            </li>
          ))}
        </ul>
        <p className="kbd-modal__hint">Press ? again to dismiss.</p>
      </div>
    </div>
  );
}
