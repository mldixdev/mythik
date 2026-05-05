import { describe, it, expect } from 'vitest';
import { createRouter } from '../../src/navigation/router.js';
import { createStateStore } from '../../src/state/store.js';
import type { NavigationConfig, AuthConfig } from '../../src/navigation/router.js';

describe('Router', () => {
  const navConfig: NavigationConfig = {
    type: 'stack',
    initialScreen: 'home',
    screens: {
      home: { config: 'screens/home.json' },
      'patient-list': { config: 'screens/patient-list.json' },
      'patient-detail': { config: 'screens/patient-detail.json', params: ['id'] },
      reports: { config: 'screens/reports.json' },
      login: { config: 'screens/login.json' },
    },
  };

  const authConfig: AuthConfig = {
    loginScreen: 'login',
    protectedScreens: ['patient-detail', 'reports'],
    roleAccess: {
      admin: ['*'],
      doctor: ['home', 'patient-list', 'patient-detail'],
      nurse: ['home', 'patient-list'],
    },
  };

  describe('navigation', () => {
    it('starts at initial screen', () => {
      const store = createStateStore({});
      const router = createRouter(navConfig, store);
      expect(router.getCurrentScreen()).toBe('home');
    });

    it('navigates to a screen', () => {
      const store = createStateStore({});
      const router = createRouter(navConfig, store);
      router.navigate('patient-list');
      expect(router.getCurrentScreen()).toBe('patient-list');
    });

    it('navigates with params', () => {
      const store = createStateStore({});
      const router = createRouter(navConfig, store);
      router.navigate('patient-detail', { id: '123' });
      expect(router.getCurrentScreen()).toBe('patient-detail');
      expect(router.getParams()).toEqual({ id: '123' });
    });

    it('maintains history', () => {
      const store = createStateStore({});
      const router = createRouter(navConfig, store);
      router.navigate('patient-list');
      router.navigate('patient-detail', { id: '1' });
      expect(router.getHistory()).toEqual(['home', 'patient-list', 'patient-detail']);
    });

    it('goes back to previous screen', () => {
      const store = createStateStore({});
      const router = createRouter(navConfig, store);
      router.navigate('patient-list');
      router.navigate('patient-detail', { id: '1' });
      router.goBack();
      expect(router.getCurrentScreen()).toBe('patient-list');
      expect(router.getHistory()).toEqual(['home', 'patient-list']);
    });

    it('does not go back past first screen', () => {
      const store = createStateStore({});
      const router = createRouter(navConfig, store);
      router.goBack();
      expect(router.getCurrentScreen()).toBe('home');
    });

    it('throws for undefined screen', () => {
      const store = createStateStore({});
      const router = createRouter(navConfig, store);
      expect(() => router.navigate('nonexistent')).toThrow('Screen "nonexistent" is not defined');
    });

    it('persists navigation state in store', () => {
      const store = createStateStore({});
      const router = createRouter(navConfig, store);
      router.navigate('patient-list');
      expect(store.get('/navigation/currentScreen')).toBe('patient-list');
    });
  });

  describe('auth & roles', () => {
    it('admin can access everything', () => {
      const store = createStateStore({});
      const router = createRouter(navConfig, store, authConfig);
      expect(router.canAccess('reports', 'admin')).toBe(true);
      expect(router.canAccess('patient-detail', 'admin')).toBe(true);
      expect(router.canAccess('home', 'admin')).toBe(true);
    });

    it('doctor can access allowed screens', () => {
      const store = createStateStore({});
      const router = createRouter(navConfig, store, authConfig);
      expect(router.canAccess('patient-detail', 'doctor')).toBe(true);
      expect(router.canAccess('reports', 'doctor')).toBe(false);
    });

    it('nurse has limited access', () => {
      const store = createStateStore({});
      const router = createRouter(navConfig, store, authConfig);
      expect(router.canAccess('home', 'nurse')).toBe(true);
      expect(router.canAccess('patient-list', 'nurse')).toBe(true);
      expect(router.canAccess('patient-detail', 'nurse')).toBe(false);
    });

    it('unknown role has no access', () => {
      const store = createStateStore({});
      const router = createRouter(navConfig, store, authConfig);
      expect(router.canAccess('home', 'unknown')).toBe(false);
    });

    it('identifies protected screens', () => {
      const store = createStateStore({});
      const router = createRouter(navConfig, store, authConfig);
      expect(router.isProtected('patient-detail')).toBe(true);
      expect(router.isProtected('reports')).toBe(true);
      expect(router.isProtected('home')).toBe(false);
    });

    it('all screens accessible without auth config', () => {
      const store = createStateStore({});
      const router = createRouter(navConfig, store);
      expect(router.canAccess('reports', 'anyone')).toBe(true);
      expect(router.isProtected('reports')).toBe(false);
    });
  });
});
