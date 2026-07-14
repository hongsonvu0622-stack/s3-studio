import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleShowToast = (e) => {
      const { message, type = 'success', duration = 3500 } = e.detail || {};
      if (!message) return;

      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, type }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    };

    window.addEventListener('show-toast', handleShowToast);
    return () => {
      window.removeEventListener('show-toast', handleShowToast);
    };
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start space-x-3 p-4 rounded-xl border backdrop-blur-xl shadow-2xl animate-slide-in transition-all ${
              isSuccess
                ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200 shadow-emerald-950/50'
                : isError
                ? 'bg-red-950/85 border-red-500/40 text-red-200 shadow-red-950/50'
                : 'bg-surface/90 border-border text-gray-200 shadow-black/50'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {isError && <AlertCircle className="w-5 h-5 text-red-400" />}
              {!isSuccess && !isError && <Info className="w-5 h-5 text-primary-400" />}
            </div>

            <div className="flex-1 text-xs font-medium leading-relaxed break-words">
              {toast.message}
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function showToast(message, type = 'success', duration = 3500) {
  window.dispatchEvent(
    new CustomEvent('show-toast', {
      detail: { message, type, duration }
    })
  );
}
