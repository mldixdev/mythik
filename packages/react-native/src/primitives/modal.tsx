import React, { useMemo } from 'react';
import { Modal as RNModal, View, Pressable, Text } from 'react-native';
import type { ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useDesignTokens } from './use-design-tokens.js';
import { toViewStyle } from './surface-utils.js';
import { MotionView } from '../motion-view.js';
import { toMotionViewProps } from '../motion-adapter.js';

interface ModalProps {
  visible?: boolean;
  title?: string;
  style?: ViewStyle;
  _tokens?: Record<string, unknown>;
  _motion?: Record<string, unknown>;
  children?: React.ReactNode;
  onClose?: () => void;
  testID?: string;
}

export function Modal({ visible = true, title, style, _tokens, _motion, children, onClose, testID }: ModalProps) {
  const t = useDesignTokens(_tokens);
  const motionProps = _motion ? toMotionViewProps(_motion) : null;

  const modalBlur = t.surface.modal.blur;
  const contentStyle = useMemo(() => ({
    borderRadius: t.shape.radius.xl,
    padding: 20,
    width: '100%' as const,
    ...toViewStyle(t.surface.modal),
    ...style,
  }), [t.surface.modal, style]);

  const ContentWrapper = motionProps ? MotionView : modalBlur ? BlurView : View;
  const blurProps = modalBlur ? { intensity: modalBlur.radius * 5, tint: 'default' as const } : {};
  const wrapperProps = motionProps
    ? { ...motionProps, style: contentStyle }
    : { ...blurProps, style: contentStyle };

  return (
    <RNModal visible={visible} transparent animationType={motionProps ? 'none' : 'fade'} onRequestClose={onClose}>
      <Pressable
        accessibilityLabel="Close modal"
        style={{ flex: 1, backgroundColor: `rgba(0,0,0,${t.opacity.backdrop})`, justifyContent: 'center', alignItems: 'center', paddingHorizontal: t.spacing.scale.md }}
        onPress={onClose}
      >
        <Pressable testID={testID} onPress={() => {}} accessibilityRole="none" style={{ width: '100%' }}>
          <ContentWrapper {...wrapperProps as any}>
            {title && <Text style={{ fontSize: t.typography.scale.lg.fontSize, fontWeight: t.typography.weight.bold, fontFamily: t.typography.fontFamily.heading, color: t.colors.text, marginBottom: t.spacing.scale.md }}>{title}</Text>}
            {children}
          </ContentWrapper>
        </Pressable>
      </Pressable>
    </RNModal>
  );
}
