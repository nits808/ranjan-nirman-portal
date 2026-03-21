import React, { createContext, useCallback, useContext, useState } from 'react';
import './ToastContext.css';

const ToastCtx = createContext(null);

export function useToast() {
  const v = useContext(ToastCtx);
  if (!v) throw new Error('useToast must be used within ToastProvider');
  return v;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (message, type = 'info', ms = 4200) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((t) => [...t, { id, message, type }]);
      window.setTimeout(() => remove(id), ms);
    },
    [remove]
  );

  const value = {
    toast: push,
    success: (m, ms) => push(m, 'success', ms),
    error: (m, ms) => push(m, 'error', ms),
    info: (m, ms) => push(m, 'info', ms),
  };

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-relevant="additions">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.type}`} role="status">
            <span className="toast__text">{t.message}</span>
            <button type="button" className="toast__close" onClick={() => remove(t.id)} aria-label="Dismiss">
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
