import React from 'react';

const Slider = ({ value, minimumValue, maximumValue, step, onValueChange, disabled, minimumTrackTintColor, maximumTrackTintColor, thumbTintColor, testID, ...rest }: Record<string, unknown>) =>
  React.createElement('input', {
    type: 'range', value, min: minimumValue, max: maximumValue, step,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => onValueChange?.(Number(e.target.value)),
    disabled, 'data-testid': testID, ...rest,
  });

export default Slider;
