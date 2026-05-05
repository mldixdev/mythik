import React, { useMemo } from 'react';
import { Image as RNImage, View, Text } from 'react-native';
import type { ImageStyle, ViewStyle } from 'react-native';
import { useDesignTokens } from './use-design-tokens.js';

interface ImageProps {
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
  placeholder?: string;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  style?: ImageStyle;
  testID?: string;
  _tokens?: Record<string, unknown>;
}

export function Image({ src, alt, width, height, aspectRatio, placeholder, resizeMode = 'cover', style, testID, _tokens }: ImageProps) {
  const t = useDesignTokens(_tokens);

  const cornersId = t.identity.images.corners ?? 'rounded';
  const borderRadius = (style?.borderRadius as number | undefined) ?? (
    cornersId === 'circle' ? 9999
    : cornersId === 'square' ? 0
    : cornersId === 'match-card' ? t.shape.radius.md
    : 8
  );

  const hasBorder = t.identity.images.border;
  const borderColor = t.colors.border;

  const imgStyle = useMemo(
    () => ({
      width,
      height,
      borderRadius,
      ...(aspectRatio ? { aspectRatio } : undefined),
      ...(hasBorder && !style?.borderWidth ? { borderWidth: 1, borderColor } : {}),
      ...style,
    }),
    [width, height, aspectRatio, borderRadius, hasBorder, borderColor, style],
  );

  if (!src && placeholder) {
    const placeholderStyle: ViewStyle = {
      ...imgStyle as ViewStyle,
      backgroundColor: '#e5e7eb',
      alignItems: 'center',
      justifyContent: 'center',
    };
    return (
      <View testID={testID} style={placeholderStyle}>
        <Text>{placeholder}</Text>
      </View>
    );
  }

  if (!src) return null;

  const isDecorative = !alt;

  return (
    <RNImage
      testID={testID}
      source={{ uri: src }}
      accessibilityLabel={alt}
      accessible={!isDecorative}
      style={imgStyle}
      resizeMode={resizeMode}
    />
  );
}
