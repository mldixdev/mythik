import type { CSSProperties, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import type { TargetAndTransition, Transition } from 'motion/react';
import { useDesignTokens } from './use-design-tokens.js';

interface MotionConfig {
  initial?: TargetAndTransition;
  animate?: TargetAndTransition;
  exit?: TargetAndTransition;
  transition?: Transition;
}

interface ModalProps {
  visible?: boolean;
  title?: string;
  style?: CSSProperties;
  _tokens?: Record<string, unknown>;
  _motion?: MotionConfig;
  children?: ReactNode;
  onClose?: () => void;
}

export function Modal({ visible = true, title, style, _tokens, _motion, children, onClose }: ModalProps) {
  if (!visible) return null;
  const t = useDesignTokens(_tokens);

  const hasMotion = !!_motion;
  const backdropTransition = _motion?.transition
    ? { duration: (_motion.transition.duration as number) ?? 0.25 }
    : { duration: 0.25 };

  // Portal to document.body so `position: fixed` escapes any ancestor that
  // creates a containing block (transform, filter, perspective, etc.) — most
  // commonly CSS mount animations with `fill-mode: both` leave a final
  // transform that traps fixed positioning inside the spec tree.
  const tree = (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: t.spacing.scale.lg,
      }}
    >
      {hasMotion ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={backdropTransition}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: `rgba(0,0,0,${t.opacity.backdrop})`,
          }}
          onClick={onClose}
          aria-hidden="true"
        />
      ) : (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: `rgba(0,0,0,${t.opacity.backdrop})`,
          }}
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      {hasMotion ? (
        <motion.div
          initial={_motion!.initial}
          animate={_motion!.animate}
          transition={_motion!.transition}
          style={{
            position: 'relative',
            color: t.colors.text,
            borderRadius: t.radius(t.shape.radius.xl),
            padding: t.spacing.scale.lg + t.spacing.unit,
            width: '100%',
            maxWidth: 600,
            maxHeight: 'calc(100vh - 48px)',
            overflowY: 'auto' as const,
            ...t.surface.modal,
            ...style,
          }}
        >
          {title && (
            <h2 style={{ margin: 0, marginBottom: t.spacing.scale.md, fontSize: t.typography.scale.lg.fontSize, fontWeight: t.typography.weight.bold, fontFamily: t.typography.fontFamily.heading, color: t.colors.text }}>{title}</h2>
          )}
          {children}
        </motion.div>
      ) : (
        <div
          style={{
            position: 'relative',
            color: t.colors.text,
            borderRadius: t.radius(t.shape.radius.xl),
            padding: t.spacing.scale.lg + t.spacing.unit,
            width: '100%',
            maxWidth: 600,
            maxHeight: 'calc(100vh - 48px)',
            overflowY: 'auto',
            ...t.surface.modal,
            ...style,
          }}
        >
          {title && (
            <h2 style={{ margin: 0, marginBottom: t.spacing.scale.md, fontSize: t.typography.scale.lg.fontSize, fontWeight: t.typography.weight.bold, fontFamily: t.typography.fontFamily.heading, color: t.colors.text }}>{title}</h2>
          )}
          {children}
        </div>
      )}
    </div>
  );

  if (typeof document === 'undefined') return tree;
  return createPortal(tree, document.body);
}
