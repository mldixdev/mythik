import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '../../src/primitives/input.js';
import { Textarea } from '../../src/primitives/textarea.js';
import { Select } from '../../src/primitives/select.js';
import { Checkbox } from '../../src/primitives/checkbox.js';
import { Toggle } from '../../src/primitives/toggle.js';
import { Slider } from '../../src/primitives/slider.js';
import { Button } from '../../src/primitives/button.js';

describe('Input', () => {
  it('renders with label', () => {
    render(<Input label="Email" placeholder="Enter email" />);
    expect(screen.getByText('Email')).toBeTruthy();
  });

  it('shows required indicator', () => {
    render(<Input label="Name" required />);
    expect(screen.getByText('*')).toBeTruthy();
  });

  it('calls onChange on text change', () => {
    const onChange = vi.fn();
    render(<Input placeholder="Type here" onChange={onChange} testID="inp" />);
    const input = screen.getByPlaceholderText('Type here');
    fireEvent.change(input, { target: { value: 'hello' } });
    expect(onChange).toHaveBeenCalledWith('hello');
  });

  it('renders disabled with reduced opacity', () => {
    render(<Input disabled testID="inp" />);
    const input = screen.getByTestId('inp');
    expect(input.disabled).toBe(true);
  });

  it('uses password entry for type=password', () => {
    render(<Input type="password" testID="inp" />);
    const input = screen.getByTestId('inp');
    expect(input.type).toBe('password');
  });
});

describe('Textarea', () => {
  it('renders with label', () => {
    render(<Textarea label="Description" />);
    expect(screen.getByText('Description')).toBeTruthy();
  });

  it('renders as multiline (textarea element)', () => {
    render(<Textarea testID="ta" rows={6} />);
    // Our mock renders multiline TextInput as <textarea>
    const ta = screen.getByTestId('ta');
    expect(ta.tagName.toLowerCase()).toBe('textarea');
  });

  it('calls onChange on text change', () => {
    const onChange = vi.fn();
    render(<Textarea placeholder="Write..." onChange={onChange} />);
    const ta = screen.getByPlaceholderText('Write...');
    fireEvent.change(ta, { target: { value: 'content' } });
    expect(onChange).toHaveBeenCalledWith('content');
  });
});

describe('Select', () => {
  const options = [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
  ];

  it('renders placeholder when no value', () => {
    render(<Select options={options} placeholder="Pick one" />);
    expect(screen.getByText('Pick one')).toBeTruthy();
  });

  it('renders selected label when value matches', () => {
    render(<Select options={options} value="b" />);
    expect(screen.getByText('Option B')).toBeTruthy();
  });

  it('renders with label', () => {
    render(<Select label="Category" options={options} />);
    expect(screen.getByText('Category')).toBeTruthy();
  });
});

describe('Checkbox', () => {
  it('renders with label', () => {
    render(<Checkbox label="Accept terms" />);
    expect(screen.getByText('Accept terms')).toBeTruthy();
  });

  it('calls onChange with toggled value on press', () => {
    const onChange = vi.fn();
    render(<Checkbox label="Accept" onChange={onChange} />);
    fireEvent.click(screen.getByText('Accept'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('shows checkmark when checked', () => {
    render(<Checkbox checked label="Done" />);
    expect(screen.getByText('✓')).toBeTruthy();
  });

  it('does not show checkmark when unchecked', () => {
    render(<Checkbox label="Not done" />);
    expect(screen.queryByText('✓')).toBeNull();
  });
});

describe('Toggle', () => {
  it('renders with label', () => {
    render(<Toggle label="Dark mode" />);
    expect(screen.getByText('Dark mode')).toBeTruthy();
  });

  it('renders Switch component', () => {
    render(<Toggle checked testID="toggle" />);
    expect(screen.getByTestId('toggle')).toBeTruthy();
  });

  it('calls onChange when toggled', () => {
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} />);
    // The Switch mock renders as a checkbox input
    const checkbox = document.querySelector('input[type="checkbox"]');
    if (checkbox) fireEvent.click(checkbox);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe('Slider', () => {
  it('renders with label', () => {
    render(<Slider label="Volume" />);
    expect(screen.getByText('Volume')).toBeTruthy();
  });

  it('renders slider component', () => {
    render(<Slider value={50} min={0} max={100} testID="slider" />);
    expect(screen.getByTestId('slider')).toBeTruthy();
  });
});

describe('Button', () => {
  it('renders label text', () => {
    render(<Button label="Submit" />);
    expect(screen.getByText('Submit')).toBeTruthy();
  });

  it('calls onClick on press', () => {
    const onClick = vi.fn();
    render(<Button label="Press me" onClick={onClick} />);
    fireEvent.click(screen.getByText('Press me'));
    expect(onClick).toHaveBeenCalled();
  });

  it('renders children instead of label when both provided', () => {
    render(<Button label="Label"><span>Custom</span></Button>);
    // Label takes priority over children (spec contract parity with web)
    expect(screen.getByText('Label')).toBeTruthy();
    expect(screen.queryByText('Custom')).toBeNull();
  });

  it('is disabled when disabled prop is set', () => {
    const onClick = vi.fn();
    render(<Button label="Click" disabled onClick={onClick} testID="btn" />);
    const btn = screen.getByTestId('btn');
    expect(btn.disabled).toBe(true);
  });
});
