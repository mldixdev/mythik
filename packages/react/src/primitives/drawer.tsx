import type { CSSProperties, ReactNode } from 'react';
import { motion } from 'motion/react';
import type { TargetAndTransition, Transition } from 'motion/react';
import { useDesignTokens } from './use-design-tokens.js';

interface MotionConfig {
  initial?: TargetAndTransition;
  animate?: TargetAndTransition;
  exit?: TargetAndTransition;
  transition?: Transition;
}

interface DrawerProps {
  visible?: boolean;
  side?: 'left' | 'right';
  width?: number | string;
  style?: CSSProperties;
  _tokens?: Record<string, unknown>;
  _motion?: MotionConfig;
  children?: ReactNode;
  onClose?: () => void;
}

export function Drawer({ visible = true, side = 'left', width = 300, style, _tokens, _motion, children, onClose }: DrawerProps) {
  if (!visible) return null;
  const t = useDesignTokens(_tokens);

  const sideStyle: CSSProperties = side === 'left'
    ? { left: 0, top: 0, bottom: 0 }
    : { right: 0, top: 0, bottom: 0 };

  const hasMotion = !!_motion;
  // Derive slide direction from side if no explicit initial.x in _motion
  const slideFrom = side === 'right' ? 60 : -60;
  const panelInitial = _motion?.initial ?? { x: slideFrom, opacity: 0 };
  const panelAnimate = _motion?.animate ?? { x: 0, opacity: 1 };
  const panelTransition = _motion?.transition ?? { duration: 0.3, ease: 'easeOut' };
  const backdropTransition = { duration: (panelTransition as { duration?: number }).duration ?? 0.3 };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 900 }}>
      {hasMotion ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={backdropTransition}
          style={{ position: 'absolute', inset: 0, backgroundColor: `rgba(0,0,0,${t.opacity.backdrop})` }}
          onClick={onClose}
          aria-hidden="true"
        />
      ) : (
        <div
          style={{ position: 'absolute', inset: 0, backgroundColor: `rgba(0,0,0,${t.opacity.backdrop})` }}
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      {hasMotion ? (
        <motion.nav
          role="navigation"
          initial={panelInitial}
          animate={panelAnimate}
          transition={panelTransition}
          style={{
            position: 'absolute',
            ...sideStyle,
            width,
            color: t.colors.text,
            overflow: 'auto',
            padding: t.spacing.scale.md,
            ...t.surface.modal,
            ...style,
          }}
        >
          {children}
        </motion.nav>
      ) : (
        <nav
          role="navigation"
          style={{
            position: 'absolute',
            ...sideStyle,
            width,
            color: t.colors.text,
            overflow: 'auto',
            padding: t.spacing.scale.md,
            ...t.surface.modal,
            ...style,
          }}
        >
          {children}
        </nav>
      )}
    </div>
  );
}
