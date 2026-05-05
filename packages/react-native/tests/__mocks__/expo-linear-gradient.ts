import React from 'react';

export const LinearGradient = ({ children, colors, style, ...rest }: Record<string, unknown>) =>
  React.createElement('div', { style, 'data-gradient-colors': JSON.stringify(colors), ...rest }, children);
