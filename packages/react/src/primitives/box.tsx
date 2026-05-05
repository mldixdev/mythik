import React, { useMemo, useRef, useState } from 'react';
import type {
  CSSProperties,
  FocusEvent,
  MouseEvent,
  ReactNode,
} from 'react';
import { useDesignTokens } from './use-design-tokens.js';
import { ANIMATION_RECIPES } from 'mythik';
import type {
  ElementAnimations,
} from 'mythik';
import { useElementAnimations } from '../animation/useElementAnimations.js';

interface BoxProps {
  surface?: 'card' | 'modal';
  style?: CSSProperties;
  className?: string;
  _tokens?: Record<string, unknown>;
  children?: ReactNode;
  animations?: ElementAnimations | null;
  animationStaggerIndex?: number;
  tabIndex?: number;
  onMouseEnter?: (e: MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (e: MouseEvent<HTMLDivElement>) => void;
  onMouseDown?: (e: MouseEvent<HTMLDivElement>) => void;
  onMouseUp?: (e: MouseEvent<HTMLDivElement>) => void;
  onFocus?: (e: FocusEvent<HTMLDivElement>) => void;
  onBlur?: (e: FocusEvent<HTMLDivElement>) => void;
}

// State-setter runs FIRST so our internal isHovered/isFocused/isActive flags
// stay consistent even if the user-supplied handler throws. The user handler
// runs after — their exception will still propagate normally.
function compose<E>(
  a: ((e: E) => void) | undefined,
  b: (e: E) => void,
): (e: E) => void {
  return (e: E) => {
    b(e);
    a?.(e);
  };
}

export function Box({
  surface,
  style,
  className,
  _tokens,
  children,
  animations,
  animationStaggerIndex,
  tabIndex,
  onMouseEnter,
  onMouseLeave,
  onMouseDown,
  onMouseUp,
  onFocus,
  onBlur,
}: BoxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setHovered] = useState(false);
  const [isFocused, setFocused] = useState(false);
  const [isActive, setActive] = useState(false);

  useElementAnimations(ref, animations ?? undefined, {
    recipes: ANIMATION_RECIPES,
    staggerIndex: animationStaggerIndex,
    isHovered,
    isFocused,
    isActive,
  });

  // Auto-focusable when a focus animation is declared and the consumer didn't
  // override tabIndex — otherwise a plain <div> is unfocusable and the trigger
  // silently never fires. Explicit consumer tabIndex always wins (incl. -1).
  const effectiveTabIndex =
    tabIndex !== undefined ? tabIndex : animations?.focus != null ? 0 : undefined;

  const handlers = useMemo(
    () => ({
      onMouseEnter: compose(onMouseEnter, () => setHovered(true)),
      onMouseLeave: compose(onMouseLeave, () => setHovered(false)),
      onMouseDown: compose(onMouseDown, () => setActive(true)),
      onMouseUp: compose(onMouseUp, () => setActive(false)),
      onFocus: compose(onFocus, () => setFocused(true)),
      onBlur: compose(onBlur, () => setFocused(false)),
    }),
    [onMouseEnter, onMouseLeave, onMouseDown, onMouseUp, onFocus, onBlur],
  );

  if (!surface) {
    return (
      <div
        ref={ref}
        style={style}
        className={className}
        tabIndex={effectiveTabIndex}
        {...handlers}
      >
        {children}
      </div>
    );
  }

  // Plan 3 Task 21 — `backgroundBlobs` prop + legacy per-element blob
  // rendering removed (along with resolveBlobStyles + its dangerouslySetInnerHTML
  // keyframe injection). App-level background now mounts at
  // MythikRenderer via <BackgroundStack>. Box only owns surface styling.
  const t = useDesignTokens(_tokens);
  const surfaceStyles = t.surface[surface];

  return (
    <div
      ref={ref}
      style={{
        borderRadius: t.radius(t.shape.radius.md),
        ...surfaceStyles,
        ...style,
      }}
      className={className}
      tabIndex={tabIndex}
      {...handlers}
    >
      {children}
    </div>
  );
}
