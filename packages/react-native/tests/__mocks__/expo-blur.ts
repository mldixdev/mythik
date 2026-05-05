import React from 'react';

export const BlurView = ({ children, intensity, tint, style, ...rest }: Record<string, unknown>) =>
  React.createElement('div', { style, 'data-blur-intensity': intensity, 'data-blur-tint': tint, ...rest }, children);
