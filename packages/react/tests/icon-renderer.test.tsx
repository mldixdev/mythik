import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemorySpecStore } from 'mythik';
import type { AppSpec } from 'mythik';
import { MythikApp } from '../src/MythikApp.js';

const appSpec: AppSpec = {
  type: 'app',
  name: 'IconRendererTest',
  navigation: {
    type: 'sidebar',
    initialScreen: 'home',
    menu: ['home'],
  },
  screens: {
    home: { label: 'Home' },
  },
  layout: {
    root: 'root',
    elements: {
      root: {
        type: 'stack',
        props: {},
        children: ['calendar-icon'],
      },
      'calendar-icon': {
        type: 'icon',
        props: { name: 'calendar', size: 18 },
      },
    },
  },
};

describe('icon renderer plugins', () => {
  it('uses plugins.setIconRenderer from MythikApp.onPlugins', () => {
    function TestIcon({ name }: { name: string }) {
      return <span data-testid="custom-icon">{name}</span>;
    }

    render(
      <MythikApp
        appSpec={appSpec}
        specStore={new MemorySpecStore()}
        onPlugins={(plugins) => plugins.setIconRenderer(TestIcon)}
      />,
    );

    expect(screen.getByTestId('custom-icon').textContent).toBe('calendar');
  });
});
