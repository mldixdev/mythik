import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { MythikApp } from '../src/MythikApp.js';
import { MemorySpecStore, createMockAuthProvider } from 'mythik';
import type { AppSpec, Spec } from 'mythik';

// ─── Fixtures ───

const loginSpec: Spec = {
  root: 'login-form',
  elements: {
    'login-form': {
      type: 'stack',
      props: { direction: 'vertical' },
      children: ['user-input', 'pass-input', 'login-btn'],
    },
    'user-input': {
      type: 'input',
      props: { label: 'Username', placeholder: 'username', bind: '/login/username' },
    },
    'pass-input': {
      type: 'input',
      props: { label: 'PasswordHash', type: 'password', placeholder: 'password', bind: '/login/password' },
    },
    'login-btn': {
      type: 'button',
      props: { label: 'Entrar' },
      on: {
        press: {
          action: 'login',
          params: {
            username: { $state: '/login/username' },
            password: { $state: '/login/password' },
          },
        },
      },
    },
  },
};

const dashboardSpec: Spec = {
  root: 'dash',
  elements: {
    dash: { type: 'text', props: { content: 'Dashboard Content' } },
  },
};

const reportsSpec: Spec = {
  root: 'reports',
  elements: {
    reports: { type: 'text', props: { content: 'Reports Content' } },
  },
};

const appSpec: AppSpec = {
  type: 'app',
  name: 'AuthTest',
  navigation: {
    type: 'sidebar',
    initialScreen: 'dashboard',
    menu: ['dashboard'],
    auth: {
      loginScreen: 'login',
      protectedScreens: ['dashboard'],
      roleAccess: { admin: ['*'] },
      persistence: 'memory',
      tokenRefresh: false,
      authDomains: ['api.test.com'],
    },
  },
  screens: {
    login: { label: 'Login' },
    dashboard: { label: 'Dashboard' },
  },
  layout: {
    root: 'app-layout',
    elements: {
      'app-layout': {
        type: 'stack',
        props: { direction: 'horizontal' },
        children: ['sidebar-text', 'content'],
      },
      'sidebar-text': { type: 'text', props: { content: 'Sidebar' } },
      content: { type: 'screen-outlet' },
    },
  },
};

const mockUser = {
  id: 'u1',
  email: 'admin@test.com',
  name: 'Admin',
  role: 'admin',
  roles: ['admin'],
};

// ─── Helpers ───

function createTestHarness(dashOverride?: Spec) {
  const specStore = new MemorySpecStore({
    login: loginSpec,
    dashboard: dashOverride ?? dashboardSpec,
  });
  const provider = createMockAuthProvider({ user: mockUser });
  return { specStore, provider };
}

/** Login helper — fills form and clicks Entrar, waits for dashboard text */
async function performLogin(dashText = 'Dashboard Content') {
  await waitFor(() => {
    expect(screen.getByPlaceholderText('username')).toBeTruthy();
  });

  await act(async () => {
    fireEvent.change(screen.getByPlaceholderText('username'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByPlaceholderText('password'), { target: { value: 'pass123' } });
  });

  await act(async () => {
    fireEvent.click(screen.getByText('Entrar'));
    await new Promise((r) => setTimeout(r, 100));
  });

  await waitFor(() => {
    expect(screen.getByText(dashText)).toBeTruthy();
  });
}

// ─── Dashboard Spec Variants ───

const dashWithLogout: Spec = {
  root: 'dash',
  elements: {
    dash: {
      type: 'stack',
      props: { direction: 'vertical' },
      children: ['title', 'logout-btn'],
    },
    title: { type: 'text', props: { content: 'Dashboard Content' } },
    'logout-btn': {
      type: 'button',
      props: { label: 'Cerrar Sesión' },
      on: { press: { action: 'logout' } },
    },
  },
};

// ─── Tests ───

describe('Auth Pipeline Integration', () => {
  let originalFetch: typeof globalThis.fetch;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: 'ok' }), { status: 200 }),
    );
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // ── Test 1: Login screen fullscreen ──

  it('renders login screen fullscreen when unauthenticated', async () => {
    const { specStore, provider } = createTestHarness();

    render(<MythikApp appSpec={appSpec} specStore={specStore} auth={{ provider }} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('username')).toBeTruthy();
    });

    expect(screen.getByText('Entrar')).toBeTruthy();
    expect(screen.queryByText('Sidebar')).toBeNull();
  });

  // ── Test 2: Login transitions to app layout ──

  it('login action authenticates and transitions to app layout', async () => {
    const { specStore, provider } = createTestHarness();

    render(<MythikApp appSpec={appSpec} specStore={specStore} auth={{ provider }} />);

    await performLogin();

    expect(screen.getByText('Sidebar')).toBeTruthy();
    expect(screen.getByText('Dashboard Content')).toBeTruthy();
    expect(screen.queryByPlaceholderText('username')).toBeNull();
  });

  // ── Test 3: Bearer token on fetch ──

  it('login action works under React.StrictMode', async () => {
    const { specStore, provider } = createTestHarness();

    render(
      <React.StrictMode>
        <MythikApp appSpec={appSpec} specStore={specStore} auth={{ provider }} />
      </React.StrictMode>,
    );

    await performLogin();

    expect(screen.getByText('Sidebar')).toBeTruthy();
    expect(screen.getByText('Dashboard Content')).toBeTruthy();
    expect(screen.queryByPlaceholderText('username')).toBeNull();
  });

  it('does not cancel deferred cleanup when MythikApp replaces its app engine', () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const { specStore } = createTestHarness();
    const nextAppSpec: AppSpec = {
      ...appSpec,
      name: 'AuthTestNext',
      layout: {
        ...appSpec.layout,
        elements: {
          ...appSpec.layout.elements,
          'sidebar-text': { type: 'text', props: { content: 'Next Sidebar' } },
        },
      },
    };

    try {
      const { rerender, unmount } = render(<MythikApp appSpec={appSpec} specStore={specStore} />);

      clearTimeoutSpy.mockClear();
      rerender(<MythikApp appSpec={nextAppSpec} specStore={specStore} />);

      expect(clearTimeoutSpy).not.toHaveBeenCalled();

      act(() => {
        vi.runOnlyPendingTimers();
      });
      unmount();
      act(() => {
        vi.runOnlyPendingTimers();
      });
    } finally {
      clearTimeoutSpy.mockRestore();
      vi.useRealTimers();
    }
  });

  it('login action falls back to first accessible screen when initialScreen is denied', async () => {
    const specStore = new MemorySpecStore({
      login: loginSpec,
      dashboard: dashboardSpec,
      reports: reportsSpec,
    });
    const provider = createMockAuthProvider({
      user: { ...mockUser, role: 'viewer', roles: ['viewer'] },
    });
    const viewerAppSpec: AppSpec = {
      ...appSpec,
      navigation: {
        ...appSpec.navigation,
        menu: ['dashboard', 'reports'],
        auth: {
          ...appSpec.navigation.auth!,
          roleAccess: { viewer: ['reports'] },
        },
      },
      screens: {
        ...appSpec.screens,
        reports: { label: 'Reports' },
      },
    };

    render(<MythikApp appSpec={viewerAppSpec} specStore={specStore} auth={{ provider }} />);

    await performLogin('Reports Content');

    expect(screen.getByText('Sidebar')).toBeTruthy();
    expect(screen.getByText('Reports Content')).toBeTruthy();
    expect(screen.queryByText('Dashboard Content')).toBeNull();
  });

  it('fetch requests carry Bearer token after login', async () => {
    const dashWithFetch: Spec = {
      root: 'dash',
      initialActions: [
        { action: 'fetch', params: { url: 'https://api.test.com/data', resultPath: '/data' } },
      ],
      elements: {
        dash: { type: 'text', props: { content: 'Dashboard Content' } },
      },
    };
    const { specStore, provider } = createTestHarness(dashWithFetch);

    render(<MythikApp appSpec={appSpec} specStore={specStore} auth={{ provider }} />);

    mockFetch.mockClear();

    await performLogin();

    // Allow initialActions to fire
    await act(async () => {
      await new Promise((r) => setTimeout(r, 150));
    });

    const apiCalls = mockFetch.mock.calls.filter(
      ([url]: [string]) => typeof url === 'string' && url.includes('api.test.com'),
    );

    expect(apiCalls.length).toBeGreaterThan(0);

    const [, options] = apiCalls[0];
    const authHeader = options?.headers?.['Authorization'] ?? options?.headers?.get?.('Authorization');
    expect(authHeader).toMatch(/^Bearer mock-token-.+/);
  });

  // ── Test 4: User context in rendered specs ──

  it('user context available in rendered specs after login', async () => {
    const dashWithUser: Spec = {
      root: 'dash',
      elements: {
        dash: {
          type: 'text',
          props: { content: { $template: 'Welcome, ${/auth/user/name}!' } },
        },
      },
    };
    const { specStore, provider } = createTestHarness(dashWithUser);

    render(<MythikApp appSpec={appSpec} specStore={specStore} auth={{ provider }} />);

    await performLogin('Welcome, Admin!');

    expect(screen.getByText('Welcome, Admin!')).toBeTruthy();
  });

  // ── Test 5: Logout returns to login ──

  it('logout clears auth state and returns to login screen', async () => {
    const { specStore, provider } = createTestHarness(dashWithLogout);

    render(<MythikApp appSpec={appSpec} specStore={specStore} auth={{ provider }} />);

    await performLogin();

    await act(async () => {
      fireEvent.click(screen.getByText('Cerrar Sesión'));
      await new Promise((r) => setTimeout(r, 100));
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('username')).toBeTruthy();
    });

    expect(screen.queryByText('Sidebar')).toBeNull();
    expect(screen.queryByText('Dashboard Content')).toBeNull();
  });

  // ── Test 6: Logout clears form ──

  it('logout clears login form — no credential persistence', async () => {
    const { specStore, provider } = createTestHarness(dashWithLogout);

    render(<MythikApp appSpec={appSpec} specStore={specStore} auth={{ provider }} />);

    await performLogin();

    await act(async () => {
      fireEvent.click(screen.getByText('Cerrar Sesión'));
      await new Promise((r) => setTimeout(r, 100));
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('username')).toBeTruthy();
    });

    const usernameInput = screen.getByPlaceholderText('username') as HTMLInputElement;
    const passwordInput = screen.getByPlaceholderText('password') as HTMLInputElement;

    expect(usernameInput.value).toBe('');
    expect(passwordInput.value).toBe('');
  });

  // ── Test 7: Auth state fully cleared ──

  it('auth state fully cleared after logout', async () => {
    const dashWithAuthStatus: Spec = {
      root: 'dash',
      elements: {
        dash: {
          type: 'stack',
          props: { direction: 'vertical' },
          children: ['title', 'auth-status', 'logout-btn'],
        },
        title: { type: 'text', props: { content: 'Dashboard Content' } },
        'auth-status': {
          type: 'text',
          props: { content: { $template: 'Auth: ${/auth/isAuthenticated}' } },
        },
        'logout-btn': {
          type: 'button',
          props: { label: 'Cerrar Sesión' },
          on: { press: { action: 'logout' } },
        },
      },
    };
    const { specStore, provider } = createTestHarness(dashWithAuthStatus);

    render(<MythikApp appSpec={appSpec} specStore={specStore} auth={{ provider }} />);

    await performLogin();

    expect(screen.getByText('Auth: true')).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByText('Cerrar Sesión'));
      await new Promise((r) => setTimeout(r, 100));
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('username')).toBeTruthy();
    });

    expect(screen.queryByText('Auth: true')).toBeNull();
  });

  // ── Test 8: Mount gate spinner ──

  it('shows loading spinner while auth session is restoring', async () => {
    const specStore = new MemorySpecStore({
      login: loginSpec,
      dashboard: dashboardSpec,
    });

    const slowProvider = createMockAuthProvider({
      user: mockUser,
      delay: 200,
    });

    render(
      <MythikApp appSpec={appSpec} specStore={specStore} auth={{ provider: slowProvider }} />,
    );

    // While AuthEngine.mount() is in progress — neither login nor app layout visible
    expect(screen.queryByPlaceholderText('username')).toBeNull();
    expect(screen.queryByText('Sidebar')).toBeNull();

    // After mount completes, login screen appears
    await waitFor(() => {
      expect(screen.getByPlaceholderText('username')).toBeTruthy();
    }, { timeout: 1000 });
  });
});
