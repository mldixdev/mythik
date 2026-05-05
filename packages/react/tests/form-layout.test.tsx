import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Input, Select } from '../src/primitives/index.js';
import '@testing-library/jest-dom';

describe('form primitive layout safety', () => {
  it('keeps inputs inside constrained grid and panel containers', () => {
    render(<Input label="X" value="338" />);

    const input = screen.getByLabelText('X');
    const wrapper = input.parentElement;

    expect(wrapper).not.toBeNull();
    expect(wrapper?.style.minWidth).toBe('0px');
    expect(input).toHaveStyle({
      width: '100%',
      minWidth: '0',
      boxSizing: 'border-box',
    });
  });

  it('keeps select triggers inside constrained grid and panel containers', () => {
    render(<Select label="Zone" value="bar" options={[{ label: 'Bar', value: 'bar' }]} />);

    const trigger = screen.getByRole('combobox', { name: 'Zone' });
    const wrapper = trigger.parentElement;

    expect(wrapper).not.toBeNull();
    expect(wrapper?.style.minWidth).toBe('0px');
    expect(trigger).toHaveStyle({
      width: '100%',
      minWidth: '0',
      boxSizing: 'border-box',
    });
  });
});
