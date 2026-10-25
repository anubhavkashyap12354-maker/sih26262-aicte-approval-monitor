import React from 'react';

export interface ToastData {
  id: string;
  title: string;
  message: string;
  type?: 'success' | 'warn' | 'info' | 'error';
}

interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '380px',
        width: 'calc(100vw - 48px)',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => {
        const type = toast.type || 'success';
        const color =
          type === 'success'
            ? 'var(--ok)'
            : type === 'warn'
            ? 'var(--warn)'
            : type === 'error'
            ? 'var(--bad)'
            : 'var(--accent)';

        return (
          <div
            key={toast.id}
            style={{
              pointerEvents: 'auto',
              background: 'var(--panel)',
              border: '1px solid var(--line)',
              borderLeft: `4px solid ${color}`,
              borderRadius: '12px',
              padding: '12px 14px',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.35)',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '12px',
              animation: 'toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              color: 'var(--text)',
            }}
          >
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontFamily: 'var(--fd)',
                  fontWeight: 600,
                  fontSize: '13px',
                  color: color,
                  marginBottom: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>{type === 'success' ? '●' : type === 'warn' ? '▲' : '■'}</span>
                {toast.title}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--muted)',
                  lineHeight: '1.4',
                  wordBreak: 'break-word',
                }}
              >
                {toast.message}
              </div>
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--muted)',
                fontSize: '16px',
                lineHeight: '1',
                padding: '2px 4px',
                cursor: 'pointer',
                borderRadius: '6px',
              }}
              title="Dismiss"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
};
