import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import type { ViewStyle } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useDesignTokens } from './use-design-tokens.js';
import type { StateStore } from 'mythik';

interface Notification {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  duration?: number | null;
  timestamp: number;
}

interface ToastContainerProps {
  store: StateStore;
  onDismiss: (id: string) => void;
  position?: string;
  duration?: number;
  maxVisible?: number;
  renderIcon?: (name: string, size: number, color: string) => React.ReactNode;
  _tokens?: Record<string, unknown>;
  testID?: string;
}

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  success: { bg: '#f0fdf4', border: '#22c55e', text: '#15803d' },
  error: { bg: '#fef2f2', border: '#ef4444', text: '#b91c1c' },
  warning: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' },
  info: { bg: '#eff6ff', border: '#3b82f6', text: '#1d4ed8' },
};

export function ToastContainer({ store, onDismiss, duration = 4000, maxVisible = 5, _tokens, testID }: ToastContainerProps) {
  const t = useDesignTokens(_tokens);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    return store.subscribePath('/ui/notifications', (value) => {
      const items = (value as Notification[] | undefined) ?? [];
      setNotifications(items.slice(-maxVisible));
    });
  }, [store, maxVisible]);

  // Auto-dismiss timers
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const n of notifications) {
      if (n.duration === null) continue; // Persistent notification
      const delay = n.duration ?? duration;
      const elapsed = Date.now() - n.timestamp;
      const remaining = delay - elapsed;
      if (remaining > 0) {
        timers.push(setTimeout(() => onDismiss(n.id), remaining));
      } else {
        // Already expired — dismiss on next tick
        timers.push(setTimeout(() => onDismiss(n.id), 0));
      }
    }
    return () => timers.forEach(clearTimeout);
  }, [notifications, duration, onDismiss]);

  if (notifications.length === 0) return null;

  return (
    <View
      testID={testID}
      style={{
        position: 'absolute',
        top: 60,
        left: t.spacing.scale.md,
        right: t.spacing.scale.md,
        gap: t.spacing.scale.sm,
        zIndex: 9999,
      }}
    >
      {notifications.map((n) => {
        const colors = TYPE_COLORS[n.type ?? 'info'];
        return (
          <Animated.View
            key={n.id}
            entering={FadeInUp.duration(200)}
            exiting={FadeOutUp.duration(200)}
          >
            <Pressable
              onPress={() => onDismiss(n.id)}
              style={{
                backgroundColor: colors.bg,
                borderLeftWidth: 4,
                borderLeftColor: colors.border,
                borderRadius: t.shape.radius.md,
                padding: 12,
                ...t.elevation.lg,
              }}
            >
              {n.title && <Text style={{ fontSize: t.typography.scale.sm.fontSize, fontWeight: t.typography.weight.semibold, fontFamily: t.typography.fontFamily.base, color: colors.text, marginBottom: t.spacing.unit }}>{n.title}</Text>}
              <Text style={{ fontSize: t.typography.scale.sm.fontSize, fontFamily: t.typography.fontFamily.base, color: colors.text }}>{n.message}</Text>
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}
