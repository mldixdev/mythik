import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { StateStore } from 'mythik';
import { useDesignTokens } from './use-design-tokens.js';

/** Notification object shape from /ui/notifications state */
interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  duration?: number | null;
  timestamp: number;
}

/** Color config per notification type — light and dark variants */
const TYPE_COLORS: Record<string, { color: string; bgLight: string; bgDark: string }> = {
  success: { color: '#10B981', bgLight: '#ECFDF5', bgDark: '#052E1C' },
  error:   { color: '#EF4444', bgLight: '#FEF2F2', bgDark: '#3B1114' },
  warning: { color: '#F59E0B', bgLight: '#FFFBEB', bgDark: '#3B2506' },
  info:    { color: '#3B82F6', bgLight: '#EFF6FF', bgDark: '#0C1F3D' },
};

/** Fallback SVG icons when no icon plugin is available */
function FallbackIcon({ type, color }: { type: string; color: string }) {
  const size = 20;
  const common = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: color, strokeWidth: 2,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  };

  switch (type) {
    case 'success':
      return (
        <svg {...common} data-toast-icon="success">
          <circle cx="12" cy="12" r="10" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    case 'error':
      return (
        <svg {...common} data-toast-icon="error">
          <circle cx="12" cy="12" r="10" />
          <path d="M15 9l-6 6M9 9l6 6" />
        </svg>
      );
    case 'warning':
      return (
        <svg {...common} data-toast-icon="warning">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case 'info':
    default:
      return (
        <svg {...common} data-toast-icon="info">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      );
  }
}

/** Icon name mapping per notification type */
const TYPE_ICON_NAMES: Record<string, string> = {
  success: 'check-circle',
  error: 'x-circle',
  warning: 'warning',
  info: 'info',
};

/** Positions → CSS properties */
function getPositionStyles(position: string, offset: number): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'fixed', zIndex: 9999,
    display: 'flex', flexDirection: 'column',
    pointerEvents: 'none',
  };
  const [vertical, horizontal] = position.split('-') as [string, string];

  if (vertical === 'top') base.top = offset;
  else base.bottom = offset;

  if (horizontal === 'left') {
    base.left = offset;
    base.alignItems = 'flex-start';
  } else if (horizontal === 'center') {
    base.left = '50%';
    base.transform = 'translateX(-50%)';
    base.alignItems = 'center';
  } else {
    base.right = offset;
    base.alignItems = 'flex-end';
  }

  return base;
}

/** Slide direction based on position */
function getSlideX(position: string): number {
  return position.includes('left') ? -80 : 80;
}

export interface ToastContainerProps {
  store: StateStore;
  onDismiss: (id: string) => void;
  position?: string;
  duration?: number;
  maxVisible?: number;
  offset?: number;
  gap?: number;
  _tokens?: Record<string, unknown>;
  renderIcon?: (name: string, size: number, color: string) => React.ReactNode;
}

export function ToastContainer({
  store,
  onDismiss,
  position = 'top-right',
  duration = 4000,
  maxVisible = 5,
  offset = 24,
  gap,
  _tokens,
  renderIcon,
}: ToastContainerProps) {
  const t = useDesignTokens(_tokens);
  const resolvedGap = gap ?? t.spacing.scale.sm;
  const [notifications, setNotifications] = React.useState<Notification[]>(() => {
    return (store.get('/ui/notifications') as Notification[]) ?? [];
  });
  const [isDark, setIsDark] = React.useState<boolean>(() => {
    return (store.get('/preferences/theme') as string) === 'dark';
  });
  const timersRef = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const onDismissRef = React.useRef(onDismiss);
  onDismissRef.current = onDismiss;

  // Subscribe to /ui/notifications and /preferences/theme
  React.useEffect(() => {
    const unsubNotifs = store.subscribePath('/ui/notifications', (updated) => {
      setNotifications((updated as Notification[]) ?? []);
    });
    const unsubTheme = store.subscribePath('/preferences/theme', (updated) => {
      setIsDark(updated === 'dark');
    });
    return () => {
      unsubNotifs();
      unsubTheme();
      for (const timer of timersRef.current.values()) {
        clearTimeout(timer);
      }
      timersRef.current.clear();
    };
  }, [store]);

  // Set up auto-dismiss timers for new notifications
  React.useEffect(() => {
    for (const notif of notifications) {
      if (timersRef.current.has(notif.id)) continue;

      const notifDuration = notif.duration !== undefined ? notif.duration : duration;
      if (notifDuration === null) continue;

      const timer = setTimeout(() => {
        timersRef.current.delete(notif.id);
        onDismissRef.current(notif.id);
      }, notifDuration);
      timersRef.current.set(notif.id, timer);
    }

    // Clean up timers for removed notifications
    for (const [id, timer] of timersRef.current.entries()) {
      if (!notifications.find(n => n.id === id)) {
        clearTimeout(timer);
        timersRef.current.delete(id);
      }
    }
  }, [notifications, duration]);

  const visible = notifications.slice(-maxVisible);
  const slideX = getSlideX(position);

  return (
    <div style={getPositionStyles(position, offset)} data-toast-container>
      <AnimatePresence mode="popLayout">
        {visible.map((notif) => {
          const typeConfig = TYPE_COLORS[notif.type] ?? TYPE_COLORS.info;
          const bg = isDark ? typeConfig.bgDark : typeConfig.bgLight;
          const titleColor = isDark ? '#F1F5F9' : '#0F172A';
          const messageColor = isDark ? '#CBD5E1' : '#334155';
          const closeColor = isDark ? '#64748B' : '#94A3B8';
          const shadow = t.elevation.lg;
          const notifDuration = notif.duration !== undefined ? notif.duration : duration;
          const showProgress = notifDuration !== null;

          return (
            <motion.div
              key={notif.id}
              layout
              initial={{ x: slideX, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: slideX, opacity: 0, height: 0, marginBottom: 0, overflow: 'hidden' as const }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={{
                pointerEvents: 'auto' as const,
                marginBottom: resolvedGap,
                width: 360,
                backgroundColor: bg,
                borderLeft: `4px solid ${typeConfig.color}`,
                borderRadius: t.radius(t.shape.radius.md),
                boxShadow: shadow,
                overflow: 'hidden' as const,
              }}
              data-toast
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', padding: '12px 12px 8px 12px', gap: 10 }}>
                {/* Icon */}
                <div style={{ flexShrink: 0, marginTop: 1 }}>
                  {renderIcon
                    ? renderIcon(TYPE_ICON_NAMES[notif.type] ?? 'info', 20, typeConfig.color)
                    : <FallbackIcon type={notif.type} color={typeConfig.color} />
                  }
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0, fontFamily: t.typography.fontFamily.base }}>
                  {notif.title && (
                    <div style={{ fontWeight: t.typography.weight.semibold, fontSize: t.typography.scale.sm.fontSize, color: titleColor, marginBottom: 2, lineHeight: 1.3 }}>
                      {notif.title}
                    </div>
                  )}
                  <div style={{ fontSize: 13, color: messageColor, lineHeight: 1.4 }}>
                    {notif.message}
                  </div>
                </div>

                {/* Close button */}
                <button
                  data-toast-close
                  onClick={() => onDismiss(notif.id)}
                  style={{
                    flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer',
                    padding: 4, borderRadius: 4, color: closeColor, lineHeight: 1,
                    fontSize: 16, fontWeight: 'bold',
                  }}
                  aria-label="Dismiss notification"
                >
                  ✕
                </button>
              </div>

              {/* Progress bar */}
              {showProgress && (
                <div
                  data-toast-progress
                  style={{
                    height: 3,
                    backgroundColor: typeConfig.color,
                    opacity: 0.3,
                    animation: `sv-toast-progress ${notifDuration}ms linear forwards`,
                  }}
                />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      <style>{`
        @keyframes sv-toast-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
