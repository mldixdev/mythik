import type { CSSProperties, ReactNode } from 'react';
import { useDesignTokens } from './use-design-tokens.js';

interface WizardProps {
  currentStep?: number;
  totalSteps?: number;
  style?: CSSProperties;
  _tokens?: Record<string, unknown>;
  children?: ReactNode;
}

export function Wizard({ currentStep = 0, totalSteps = 1, style, _tokens, children }: WizardProps) {
  const t = useDesignTokens(_tokens);
  const progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;

  return (
    <div style={style}>
      <div
        role="progressbar"
        aria-valuenow={currentStep + 1}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        style={{
          width: '100%',
          height: 4,
          backgroundColor: t.colors.border,
          borderRadius: 2,
          marginBottom: t.spacing.scale.lg,
          overflow: 'hidden',
        }}
      >
        <div style={{ width: `${progress}%`, height: '100%', backgroundColor: t.colors.primary, transition: `width ${t.motion.duration.normal}ms` }} />
      </div>
      <div style={{ fontSize: t.typography.scale.xs.fontSize, color: t.colors.textMuted, marginBottom: t.spacing.scale.md }}>
        Step {currentStep + 1} of {totalSteps}
      </div>
      {children}
    </div>
  );
}
