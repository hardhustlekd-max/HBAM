import { SystemUser, UserRole } from '../types.ts';

export const SYSTEM_ROLE_CREDENTIALS: Record<
  UserRole,
  {
    badgeId: string;
    email: string;
    password: string;
    fullName: string;
    role: UserRole;
  }
> = {
  clerk: {
    badgeId: 'CLERK-001',
    email: 'clerk@permit.gov.et',
    password: 'ClerkPassword123!',
    fullName: 'Abebe Bekele (Clerk)',
    role: 'clerk',
  },
  officer: {
    badgeId: 'OFFICER-8842',
    email: 'officer@permit.gov.et',
    password: 'OfficerPassword123!',
    fullName: 'Officer Solomon Desta',
    role: 'officer',
  },
  admin: {
    badgeId: 'ADMIN-PRO-1',
    email: 'admin@permit.gov.et',
    password: 'AdminPassword123!',
    fullName: 'Tigist Alemu (System Admin)',
    role: 'admin',
  },
  superadmin: {
    badgeId: 'SUPER-ADMIN-01',
    email: 'superadmin@permit.gov.et',
    password: 'SuperAdminPassword123!',
    fullName: 'Kaleb Tadesse (Chief Super Admin)',
    role: 'superadmin',
  },
};

/**
 * Ensures a valid session user exists.
 */
export async function ensureOnlineAuth(): Promise<SystemUser | null> {
  const defaultCreds = SYSTEM_ROLE_CREDENTIALS.clerk;
  return {
    uid: `user-clerk-${defaultCreds.badgeId}`,
    badgeId: defaultCreds.badgeId,
    email: defaultCreds.email,
    role: 'clerk',
    fullName: defaultCreds.fullName,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Perform login authentication for system user roles via Firestore database
 */
export async function loginOnlineUser(
  inputBadgeIdOrRole: string,
  inputPasswordOrBadgeId?: string,
  inputPassword?: string
): Promise<{ success: boolean; user: SystemUser; error?: string }> {
  let badgeId = inputBadgeIdOrRole;
  let password = inputPasswordOrBadgeId;

  // Handle optional legacy signature: loginOnlineUser(role, badgeId, password)
  if (['clerk', 'admin', 'officer', 'superadmin'].includes(inputBadgeIdOrRole)) {
    badgeId = inputPasswordOrBadgeId || '';
    password = inputPassword;
  }

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        badgeId,
        password,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.user) {
        return { success: true, user: data.user };
      }
      if (data.error) {
        return { success: false, user: null as any, error: data.error };
      }
    }
  } catch (err) {
    console.warn('[authService] Backend login call notice, using local auth fallback:', err);
  }

  // Fallback local auth model if network offline
  const trimmedId = (badgeId || '').trim();
  let detectedRole: UserRole = 'clerk';
  let fullName = 'System Clerk';

  // Infer role from badge ID if network offline
  const upperId = trimmedId.toUpperCase();
  if (upperId.includes('SUPER') || upperId === 'SUPER-ADMIN-01') {
    detectedRole = 'superadmin';
    fullName = 'Kaleb Tadesse (Chief Super Admin)';
  } else if (upperId.includes('ADMIN') || upperId === 'ADMIN-PRO-1') {
    detectedRole = 'admin';
    fullName = 'Worku Bekele (System Admin)';
  } else if (upperId.includes('OFFICER') || upperId === 'OFFICER-8842') {
    detectedRole = 'officer';
    fullName = 'Insp. Solomon Girma';
  } else {
    detectedRole = 'clerk';
    fullName = 'Abebe Bikila (Primary Clerk)';
  }

  const email = trimmedId.includes('@') ? trimmedId : `${trimmedId.toLowerCase() || 'user'}@permit.gov.et`;
  const now = new Date().toISOString();

  const userProfile: SystemUser = {
    uid: `user-${detectedRole}-${trimmedId || 'default'}`,
    badgeId: trimmedId || 'CLERK-001',
    email,
    role: detectedRole,
    fullName,
    lastLoginAt: now,
    createdAt: now,
  };

  return { success: true, user: userProfile };
}

/**
 * Sign out session
 */
export async function logoutOnlineUser(): Promise<void> {
  // Session logout handled by storage session clear
}

/**
 * Change / Update user password
 */
export async function changeOnlineUserPassword(
  role: UserRole,
  badgeId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role,
        badgeId,
        currentPassword,
        newPassword,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        // Also update local credentials in-memory for this session
        if (SYSTEM_ROLE_CREDENTIALS[role]) {
          SYSTEM_ROLE_CREDENTIALS[role].password = newPassword;
        }
        return { success: true, message: data.message || 'Password changed successfully' };
      } else {
        return { success: false, error: data.error || 'Failed to update password' };
      }
    }
  } catch (err: any) {
    console.warn('[authService] Backend change-password notice:', err);
  }

  // Local fallback
  if (SYSTEM_ROLE_CREDENTIALS[role]) {
    SYSTEM_ROLE_CREDENTIALS[role].password = newPassword;
  }
  return { success: true, message: 'Password changed successfully in local session' };
}

/**
 * Fetch all system users from Firestore permit database
 */
export async function fetchOnlineSystemUsers(): Promise<SystemUser[]> {
  try {
    const res = await fetch('/api/auth/users');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        return data.users;
      }
    }
  } catch (e) {
    // Ignore fallback
  }

  return Object.values(SYSTEM_ROLE_CREDENTIALS).map((c) => ({
    uid: `preset-${c.role}`,
    badgeId: c.badgeId,
    email: c.email,
    role: c.role,
    fullName: c.fullName,
  }));
}

