import { UserRole, Language } from '../types';

export const KEYS = {
  AUTH: 'bd_motor_auth_session',
  LANG: 'bd_motor_lang',
  THEME: 'bd_motor_theme',
  ACTIVE_PAGE: 'bd_motor_active_page',
  APP_STATE: 'bd_motor_app_state_cache',
  LAST_ACK_RESET_EPOCH: 'bd_motor_last_ack_reset_epoch',
};

export interface AuthSession {
  isLoggedIn: boolean;
  userBadgeId: string;
  userRole: UserRole;
}

export function getStoredItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.warn(`Error reading localStorage key "${key}":`, e);
    return defaultValue;
  }
}

export function setStoredItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Error writing localStorage key "${key}":`, e);
  }
}

export function removeStoredItem(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn(`Error removing localStorage key "${key}":`, e);
  }
}

export function getStoredLastAckResetEpoch(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(KEYS.LAST_ACK_RESET_EPOCH);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

export function saveStoredLastAckResetEpoch(epoch: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEYS.LAST_ACK_RESET_EPOCH, String(epoch));
  } catch (e) {
    console.warn('Error saving last ack reset epoch:', e);
  }
}

export function clearAllLocalStoredData(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(KEYS.APP_STATE);
  } catch (e) {
    console.warn('Error clearing local app state:', e);
  }
}

// UI & Session State
export function getStoredAuthSession(): AuthSession | null {
  return getStoredItem<AuthSession | null>(KEYS.AUTH, null);
}

export function saveAuthSession(session: AuthSession | null): void {
  if (session) {
    setStoredItem(KEYS.AUTH, session);
  } else {
    removeStoredItem(KEYS.AUTH);
  }
}

export function getStoredLang(): Language {
  return getStoredItem<Language>(KEYS.LANG, 'am');
}

export function saveLang(lang: Language): void {
  setStoredItem(KEYS.LANG, lang);
}

export function getStoredTheme(): 'light' | 'dark' {
  return getStoredItem<'light' | 'dark'>(KEYS.THEME, 'light');
}

export function saveTheme(theme: 'light' | 'dark'): void {
  setStoredItem(KEYS.THEME, theme);
}

export function getStoredActivePage(): 'dashboard' | 'forms' | 'tables' | 'workstation' | 'scan' | 'superadmin' {
  const page = getStoredItem<string>(KEYS.ACTIVE_PAGE, 'dashboard');
  if (page === 'settings') return 'dashboard';
  return page as 'dashboard' | 'forms' | 'tables' | 'workstation' | 'scan' | 'superadmin';
}

export function saveActivePage(page: 'dashboard' | 'forms' | 'tables' | 'workstation' | 'scan' | 'superadmin'): void {
  setStoredItem(KEYS.ACTIVE_PAGE, page);
}

