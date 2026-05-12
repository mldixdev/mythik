import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Select } from '../src/primitives/index.js';

describe('Select', () => {
  it('maps catalog-shaped options with labelKey and valueKey', () => {
    const onChange = vi.fn();

    render(React.createElement(Select as any, {
      value: '2',
      options: [
        { id: 1, nombre: 'Cambio de aceite' },
        { id: 2, nombre: 'Alineamiento' },
      ],
      labelKey: 'nombre',
      valueKey: 'id',
      onChange,
    }));

    expect(screen.getByRole('combobox').textContent).toContain('Alineamiento');

    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'Cambio de aceite' }));

    expect(onChange).toHaveBeenCalledWith('1');
  });

  it('renders malformed object options as disabled diagnostics instead of blank clickable rows', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const onChange = vi.fn();

    render(React.createElement(Select as any, {
      value: '',
      options: [{ id: 1 }, null],
      onChange,
    }));

    fireEvent.click(screen.getByRole('combobox'));
    const invalidOptions = screen.getAllByRole('option', { name: 'Invalid option' });
    const invalidOption = invalidOptions[0];

    expect(invalidOptions).toHaveLength(2);
    expect(invalidOption.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(invalidOption);
    expect(onChange).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Invalid select option'));

    warn.mockRestore();
  });

  it('renders a disabled diagnostic when the options prop is not an array', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const onChange = vi.fn();

    render(React.createElement(Select as any, {
      value: '',
      options: { id: 1 },
      onChange,
    }));

    fireEvent.click(screen.getByRole('combobox'));
    const invalidOption = screen.getByRole('option', { name: 'Invalid option' });

    expect(invalidOption.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(invalidOption);
    expect(onChange).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Invalid select options'));

    warn.mockRestore();
  });
});
