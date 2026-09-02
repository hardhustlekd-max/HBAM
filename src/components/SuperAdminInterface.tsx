import React, { useState, useEffect } from 'react';
import {
  Language,
  UserRole,
  SystemUser,
  SystemAuditLog,
  MotorcycleRegistration,
  OfficerAssignment,
  SystemSettings,
  BAHIR_DAR_SUBCITIES,
} from '../types';
import {
  subscribeSystemUsers,
  subscribeAuditLogs,
  saveSystemUserToDb,
  updateSystemUserInDb,
  deleteSystemUserFromDb,
  addAuditLogToDb,
  subscribeRegistrations,
  subscribeOfficers,
  syncAllCollectionsWithDb,
  updateRegistrationStatusInDb,
  updateRegistrationInDb,
  subscribeSettings,
  saveSettingsToDb,
  DEFAULT_SETTINGS,
  getPermissionState,
  resetSystemToFactoryDefaults,
  purgeRejectedRegistrations,
  clearAllAuditLogs,
  clearAllVerificationLogs,
  importFullDatabaseBackup,
} from '../services/dbService';
import { RolePermissionManagement } from './RolePermissionManagement';
import { SmartImage } from './SmartImage';

import { formatEthiopianDateTime } from '../utils/ethiopianCalendar';

interface SuperAdminInterfaceProps {
  currentLang: Language;
  currentUserBadgeId: string;
  initialTab?: 'users' | 'subcities' | 'permits' | 'maintenance';
  onShowToast?: (msg: string, type?: 'success' | 'warning' | 'info') => void;
}

export const SuperAdminInterface: React.FC<SuperAdminInterfaceProps> = ({
  currentLang,
  currentUserBadgeId,
  initialTab = 'users',
  onShowToast,
}) => {
  const isAmharic = currentLang === 'am';

  // State
  const [activeTab, setActiveTab] = useState<'users' | 'subcities' | 'permits' | 'maintenance'>(
    initialTab as any
  );

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab as any);
    }
  }, [initialTab]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<SystemAuditLog[]>([]);
  const [registrations, setRegistrations] = useState<MotorcycleRegistration[]>([]);
  const [officers, setOfficers] = useState<OfficerAssignment[]>([]);

  // Sub-view mode for Tab 1 (Role & Permission Matrix vs User List)
  const [userViewMode, setUserViewMode] = useState<'matrix' | 'table'>('matrix');

  // User Filter & Search
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Modals
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<SystemUser | null>(null);

  // Danger Zone & Maintenance State
  const [dangerActionType, setDangerActionType] = useState<
    'reset' | 'purge_rejected' | 'clear_audit' | 'clear_verifications' | null
  >(null);
  const [dangerConfirmInput, setDangerConfirmInput] = useState('');
  const [dangerError, setDangerError] = useState('');
  const [isDangerExecuting, setIsDangerExecuting] = useState(false);
  const [isSyncingLiveDb, setIsSyncingLiveDb] = useState(false);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);

  // Audit Logs Filter & Search
  const [auditSearch, setAuditSearch] = useState('');
  const [auditSeverityFilter, setAuditSeverityFilter] = useState<'all' | 'info' | 'warning' | 'critical'>('all');
  const [auditViewLimit, setAuditViewLimit] = useState(25);

  // Form State for New User
  const [newFullName, setNewFullName] = useState('');
  const [newBadgeId, setNewBadgeId] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('clerk');
  const [newSubCity, setNewSubCity] = useState(BAHIR_DAR_SUBCITIES[0].en);
  const [newPassword, setNewPassword] = useState('DefaultPass123!');

  // Security Toggles State
  const [enforce2FA, setEnforce2FA] = useState(true);
  const [highRiskDetection, setHighRiskDetection] = useState(true);
  const [autoLockdown, setAutoLockdown] = useState(false);
  const [logPolling, setLogPolling] = useState(true);

  // Sub-City status state
  const [frozenSubCities, setFrozenSubCities] = useState<Record<string, boolean>>({});

  // Mobile Expanded Users State
  const [expandedUserIds, setExpandedUserIds] = useState<Record<string, boolean>>({});

  const toggleUserExpand = (uid: string) => {
    setExpandedUserIds((prev) => ({ ...prev, [uid]: !prev[uid] }));
  };

  // System Settings state for Clerk Role Dashboard & Visibility Toggles
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);

  // Subscriptions
  useEffect(() => {
    const unsubUsers = subscribeSystemUsers((data) => setUsers(data || []));
    const unsubAudit = subscribeAuditLogs((data) => setAuditLogs(data || []));
    const unsubRegs = subscribeRegistrations((data) => setRegistrations(data || []));
    const unsubOffs = subscribeOfficers((data) => setOfficers(data || []));
    const unsubSettings = subscribeSettings((data) => {
      if (data) {
        setSettings(data);
        if (data.frozenSubCities) {
          setFrozenSubCities(data.frozenSubCities);
        }
      }
    });

    return () => {
      unsubUsers();
      unsubAudit();
      unsubRegs();
      unsubOffs();
      unsubSettings();
    };
  }, []);

  // TAB TASK MAP and Block Check
  const TAB_TASK_MAP: Record<string, number> = {
    users: 14,
    subcities: 13,
    permits: 11,
    maintenance: 12,
  };

  const currentTaskId = TAB_TASK_MAP[activeTab] || 14;
  const permissionState = getPermissionState('superadmin', currentTaskId);
  const isBlocked = permissionState === 'deny';

  useEffect(() => {
    if (isBlocked && onShowToast) {
      onShowToast(
        isAmharic
          ? 'ይህ ክፍል በፈቃድ መቆጣጠሪያ (RBAC) ታግዷል!'
          : 'This section is currently blocked by your RBAC configuration!',
        'warning'
      );
    }
  }, [activeTab, isBlocked, isAmharic]);

  const renderBlockedUI = () => (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm space-y-6 animate-in fade-in zoom-in duration-200">
      <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 shadow-sm animate-pulse">
        <span className="material-symbols-outlined text-[36px]">gpp_bad</span>
      </div>
      <div className="space-y-2 max-w-md">
        <h3 className="text-lg font-black text-on-surface">
          {isAmharic ? 'ይህ ክፍል በፈቃድ መቆጣጠሪያ (RBAC) ታግዷል' : 'Access Blocked by RBAC Matrix'}
        </h3>
        <p className="text-xs text-outline leading-relaxed font-medium">
          {isAmharic
            ? 'ይህ የሱፐር አድሚን ክፍል በሪል-ታይም የሚና እና ፈቃድ መቆጣጠሪያ (RBAC) ቅንብር ምክንያት እንዳይከፈት ታግዷል። እባክዎን የሲስተም ባለቤትን ወይም ዋና አይቲ ባለሙያን ያነጋግሩ።'
            : 'Access to this specific Super Admin interface has been dynamically blocked by the active Role-Based Access Control (RBAC) matrix. Please contact the system owner or network administrator.'}
        </p>
      </div>
      <div className="flex items-center gap-2 text-[11px] font-black uppercase text-rose-600 dark:text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-full border border-rose-500/20">
        <span className="material-symbols-outlined text-[14px]">shield</span>
        <span>{isAmharic ? 'የደህንነት ማስጠንቀቂያ' : 'Security Alert'}</span>
      </div>
    </div>
  );

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.fullName || '').toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.badgeId || '').toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.subCity || '').toLowerCase().includes(userSearch.toLowerCase());

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Action Handlers
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim() || !newBadgeId.trim()) {
      if (onShowToast) onShowToast(isAmharic ? 'እባክዎን ስምና መታወቂያ ያስገቡ' : 'Please provide name and badge ID', 'warning');
      return;
    }

    const newUser: SystemUser = {
      uid: `user-${newRole}-${newBadgeId.trim().toUpperCase()}`,
      badgeId: newBadgeId.trim().toUpperCase(),
      email: newEmail.trim() || `${newBadgeId.trim().toLowerCase()}@permit.gov.et`,
      role: newRole,
      fullName: newFullName.trim(),
      subCity: newSubCity,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    await saveSystemUserToDb(newUser);
    await addAuditLogToDb({
      actorBadgeId: currentUserBadgeId || 'SUPER-ADMIN-01',
      actorRole: 'superadmin',
      action: 'USER_CREATED',
      details: `Created new ${newRole.toUpperCase()} account for ${newFullName} (${newBadgeId})`,
      severity: 'info',
    });

    if (onShowToast) {
      onShowToast(
        isAmharic
          ? `አዲስ ተጠቃሚ ${newFullName} በተሳካ ሁኔታ ተመዝግቧል`
          : `New user ${newFullName} successfully registered`,
        'success'
      );
    }

    // Reset Form
    setNewFullName('');
    setNewBadgeId('');
    setNewEmail('');
    setNewRole('clerk');
    setShowAddUserModal(false);
  };

  const handleToggleUserStatus = async (user: SystemUser) => {
    const newStatus = user.status === 'disabled' ? 'active' : 'disabled';
    await updateSystemUserInDb(user.uid, { status: newStatus });
    await addAuditLogToDb({
      actorBadgeId: currentUserBadgeId || 'SUPER-ADMIN-01',
      actorRole: 'superadmin',
      action: 'USER_STATUS_CHANGED',
      details: `Changed account status of ${user.fullName} (${user.badgeId}) to ${newStatus.toUpperCase()}`,
      severity: newStatus === 'disabled' ? 'warning' : 'info',
    });

    if (onShowToast) {
      onShowToast(
        isAmharic
          ? `የተጠቃሚ ${user.fullName} ሁኔታ ወደ ${newStatus === 'active' ? 'ንቁ' : 'የታገደ'} ተቀይሯል`
          : `User ${user.fullName} account status updated to ${newStatus}`,
        'info'
      );
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    await deleteSystemUserFromDb(deletingUser.uid);
    await addAuditLogToDb({
      actorBadgeId: currentUserBadgeId || 'SUPER-ADMIN-01',
      actorRole: 'superadmin',
      action: 'USER_DELETED',
      details: `Permanently deleted account of ${deletingUser.fullName} (${deletingUser.badgeId})`,
      severity: 'critical',
    });

    if (onShowToast) {
      onShowToast(
        isAmharic
          ? `ተጠቃሚ ${deletingUser.fullName} ከአስፈላጊ ዝርዝር ተሰርዟል`
          : `User ${deletingUser.fullName} removed from system`,
        'success'
      );
    }
    setDeletingUser(null);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    await updateSystemUserInDb(editingUser.uid, editingUser);
    await addAuditLogToDb({
      actorBadgeId: currentUserBadgeId || 'SUPER-ADMIN-01',
      actorRole: 'superadmin',
      action: 'USER_UPDATED',
      details: `Updated user profile for ${editingUser.fullName} (${editingUser.badgeId})`,
      severity: 'info',
    });

    if (onShowToast) {
      onShowToast(
        isAmharic
          ? `የተጠቃሚ ${editingUser.fullName} መረጃ ታድሷል`
          : `User ${editingUser.fullName} updated successfully`,
        'success'
      );
    }
    setEditingUser(null);
  };

  const handleToggleSubCityFreeze = async (subCityEn: string) => {
    const updated = { ...frozenSubCities, [subCityEn]: !frozenSubCities[subCityEn] };
    const isFrozen = updated[subCityEn];
    setFrozenSubCities(updated);

    const updatedSettings: SystemSettings = {
      ...settings,
      frozenSubCities: updated,
    };
    setSettings(updatedSettings);
    await saveSettingsToDb(updatedSettings);

    const subCityObj = BAHIR_DAR_SUBCITIES.find((s) => s.en.toLowerCase() === subCityEn.toLowerCase());
    const displayName = isAmharic ? (subCityObj?.am || subCityEn) : (subCityObj?.en || subCityEn);

    await addAuditLogToDb({
      actorBadgeId: currentUserBadgeId || 'SUPER-ADMIN-01',
      actorRole: 'superadmin',
      action: 'SUBCITY_PERMIT_LOCK',
      details: `${isFrozen ? 'FROZE' : 'UNFROZE'} permit registrations for Sub-City ${subCityEn}`,
      severity: isFrozen ? 'warning' : 'info',
    });

    if (onShowToast) {
      onShowToast(
        isAmharic
          ? `${displayName} ክፍለ ከተማ የፈቃድ ምዝገባ ${isFrozen ? 'ታግዷል (Frozen)' : 'ተከፍቷል (Active)'}`
          : `Sub-city ${displayName} permit registration is now ${isFrozen ? 'FROZEN' : 'ACTIVE'}`,
        isFrozen ? 'warning' : 'success'
      );
    }
  };

  const handleToggleClerkSetting = async (
    key: 'showClerkPermitStatus' | 'showClerkSubmissionsAction' | 'showClerkApprovedVehiclesAction'
  ) => {
    const newVal = !settings[key];
    const updatedSettings: SystemSettings = {
      ...settings,
      [key]: newVal,
    };
    setSettings(updatedSettings);
    await saveSettingsToDb(updatedSettings);
    await addAuditLogToDb({
      actorBadgeId: currentUserBadgeId || 'SUPER-ADMIN-01',
      actorRole: 'superadmin',
      action: 'CLERK_PERMISSIONS_CHANGED',
      details: `Super Admin toggled ${key} to ${newVal ? 'ENABLED' : 'DISABLED'}`,
      severity: 'info',
    });
    if (onShowToast) {
      onShowToast(
        isAmharic
          ? `የፀሀፊ ታይነት ቅንብር ${newVal ? 'በርቷል (ተፈቅዷል)' : 'ጠፍቷል (ተደብቋል)'}`
          : `Clerk dashboard visibility setting ${newVal ? 'ENABLED' : 'DISABLED'}`,
        'success'
      );
    }
  };

  const handleExportFullDatabaseBackup = () => {
    const backupData = {
      exportedAt: new Date().toISOString(),
      exportedBy: currentUserBadgeId || 'SUPER-ADMIN-01',
      version: '2.0.0',
      users,
      registrations,
      officers,
      auditLogs,
      settings,
    };
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PERMIT_SYSTEM_FULL_BACKUP_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (onShowToast) {
      onShowToast(
        isAmharic
          ? 'ሙሉ የሲስተም ዳታቤዝ ባክአፕ በተሳካ ሁኔታ ወርዷል'
          : 'Full system database backup exported successfully',
        'success'
      );
    }
  };

  const handleImportBackupJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsRestoringBackup(true);
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!parsed || (typeof parsed !== 'object')) {
        throw new Error('Invalid JSON format');
      }

      const result = await importFullDatabaseBackup(parsed);
      await addAuditLogToDb({
        actorBadgeId: currentUserBadgeId || 'SUPER-ADMIN-01',
        actorRole: 'superadmin',
        action: 'RESTORE_BACKUP',
        details: `Super Admin restored database backup. Imported: ${result.importedCounts.registrations || 0} registrations, ${result.importedCounts.users || 0} users, ${result.importedCounts.officers || 0} officers.`,
        severity: 'warning',
      });

      if (onShowToast) {
        onShowToast(
          isAmharic
            ? `ባክአፕ በተሳካ ሁኔታ ተመልሷል! (${result.importedCounts.registrations || 0} ምዝገባዎች)`
            : `Backup restored successfully! (${result.importedCounts.registrations || 0} registrations)`,
          'success'
        );
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast(
          isAmharic
            ? `ባክአፕ ማንበብ አልተሳካም፡ ${err?.message || 'ትክክለኛ የ JSON ፋይል አይደለም'}`
            : `Failed to restore backup: ${err?.message || 'Invalid JSON file'}`,
          'error' as any
        );
      }
    } finally {
      setIsRestoringBackup(false);
      e.target.value = '';
    }
  };

  const handleExportAuditTrail = () => {
    if (!auditLogs || auditLogs.length === 0) {
      if (onShowToast) onShowToast(isAmharic ? 'ምንም የኦዲት መዝገብ የለም' : 'No audit records available', 'info');
      return;
    }

    const headers = ['Timestamp', 'Actor Badge', 'Role', 'Action', 'Severity', 'Details'];
    const rows = auditLogs.map((log) => [
      `"${log.timestamp}"`,
      `"${log.actorBadgeId}"`,
      `"${log.actorRole}"`,
      `"${log.action}"`,
      `"${log.severity || 'info'}"`,
      `"${(log.details || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AUDIT_TRAIL_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (onShowToast) {
      onShowToast(
        isAmharic ? 'የኦዲት መዝገብ በ CSV ቅርጸት ወርዷል' : 'Audit trail CSV downloaded',
        'success'
      );
    }
  };

  const handleExecuteDangerAction = async () => {
    if (!dangerActionType) return;
    setDangerError('');
    setIsDangerExecuting(true);

    try {
      if (dangerActionType === 'reset') {
        const requiredWord = isAmharic ? 'ሪሴት' : 'RESET';
        const typed = dangerConfirmInput.trim();
        if (typed.toUpperCase() !== 'RESET' && typed !== 'ሪሴት') {
          setDangerError(
            isAmharic
              ? 'እባክዎ በትክክል "ሪሴት" ወይም "RESET" ብለው ይተይቡ'
              : 'Please type "RESET" exactly to confirm system reset.'
          );
          setIsDangerExecuting(false);
          return;
        }

        await resetSystemToFactoryDefaults();
        setRegistrations([]);
        setOfficers([]);
        await addAuditLogToDb({
          actorBadgeId: currentUserBadgeId || 'SUPER-ADMIN-01',
          actorRole: 'superadmin',
          action: 'FACTORY_SYSTEM_RESET',
          details: 'Super Admin executed full system factory reset.',
          severity: 'critical',
        });

        if (onShowToast) {
          onShowToast(
            isAmharic
              ? 'ሲስተሙ ወደ መጀመሪያው ንጹህ ደረጃ ሪሴት ተደርጓል!'
              : 'System has been reset to pristine factory state!',
            'success'
          );
        }
      } else if (dangerActionType === 'purge_rejected') {
        const typed = dangerConfirmInput.trim();
        if (typed.toUpperCase() !== 'PURGE' && typed !== 'አጥፋ') {
          setDangerError(
            isAmharic
              ? 'እባክዎ በትክክል "አጥፋ" ወይም "PURGE" ብለው ይተይቡ'
              : 'Please type "PURGE" exactly to confirm.'
          );
          setIsDangerExecuting(false);
          return;
        }

        const count = await purgeRejectedRegistrations();
        setRegistrations((prev) => prev.filter((r) => r.status !== 'rejected'));
        await addAuditLogToDb({
          actorBadgeId: currentUserBadgeId || 'SUPER-ADMIN-01',
          actorRole: 'superadmin',
          action: 'PURGE_REJECTED_PERMITS',
          details: `Super Admin purged ${count} rejected registration records.`,
          severity: 'warning',
        });

        if (onShowToast) {
          onShowToast(
            isAmharic
              ? `${count} ውድቅ የተደረጉ ፈቃዶች በዘላቂነት ተሰርዘዋል!`
              : `Purged ${count} rejected registration records!`,
            'success'
          );
        }
      } else if (dangerActionType === 'clear_audit') {
        await clearAllAuditLogs();
        setAuditLogs([]);
        if (onShowToast) {
          onShowToast(
            isAmharic ? 'የኦዲት መዝገቦች በሙሉ ጸድተዋል!' : 'All audit logs cleared!',
            'success'
          );
        }
      } else if (dangerActionType === 'clear_verifications') {
        await clearAllVerificationLogs();
        await addAuditLogToDb({
          actorBadgeId: currentUserBadgeId || 'SUPER-ADMIN-01',
          actorRole: 'superadmin',
          action: 'CLEAR_VERIFICATIONS',
          details: 'Super Admin cleared roadside verification inspection history.',
          severity: 'warning',
        });
        if (onShowToast) {
          onShowToast(
            isAmharic ? 'የፍተሻ ታሪክ በሙሉ ጸድቷል!' : 'All verification logs cleared!',
            'success'
          );
        }
      }

      setDangerActionType(null);
      setDangerConfirmInput('');
      setDangerError('');
    } catch (err: any) {
      setDangerError(err?.message || 'Action failed');
    } finally {
      setIsDangerExecuting(false);
    }
  };

  const handleMasterApproveAllPending = async () => {
    const pending = registrations.filter((r) => r.status === 'pending_approval');
    if (pending.length === 0) {
      if (onShowToast) onShowToast(isAmharic ? 'ምንም የሚጠብቁ ምዝገባዎች የሉም' : 'No pending registrations found', 'info');
      return;
    }

    for (const reg of pending) {
      await updateRegistrationStatusInDb(reg.id, 'approved');
    }

    await addAuditLogToDb({
      actorBadgeId: currentUserBadgeId || 'SUPER-ADMIN-01',
      actorRole: 'superadmin',
      action: 'MASTER_BATCH_APPROVE',
      details: `Super Admin bulk approved ${pending.length} pending motorcycle registrations`,
      severity: 'warning',
    });

    if (onShowToast) {
      onShowToast(
        isAmharic
          ? `${pending.length} የሚጠብቁ ፈቃዶች በሙሉ በዋና አስተዳዳሪ ተጸድቀዋል`
          : `Bulk approved ${pending.length} pending registrations`,
        'success'
      );
    }
  };

  const handleForceSyncDatabase = async () => {
    try {
      setIsSyncingLiveDb(true);
      await syncAllCollectionsWithDb();
      if (onShowToast) {
        onShowToast(
          isAmharic
            ? 'ከፋየርቤዝ ዳታቤዝ ጋር ሙሉ በሙሉ ተመሳስሏል'
            : 'Database forcefully synchronized with Cloud Firestore',
          'success'
        );
      }
    } catch (err) {
      if (onShowToast) {
        onShowToast(
          isAmharic ? 'ማመሳሰል አልተሳካም' : 'Synchronization failed',
          'error' as any
        );
      }
    } finally {
      setIsSyncingLiveDb(false);
    }
  };

  const subCitiesList = BAHIR_DAR_SUBCITIES;

  return (
    <div className="space-y-6 pb-12 font-sans text-on-surface">
      {/* Container with header with icon and header text */}
      <div className="bg-surface-container-lowest rounded-lg border border-outline-variant shadow-sm overflow-hidden">
        {/* Header with Icon and Text */}
        <div className="px-4 sm:px-5 py-3.5 sm:py-4 bg-surface-container border-b border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-[22px] sm:text-[24px] shrink-0">
              {activeTab === 'users' && 'manage_accounts'}
              {activeTab === 'subcities' && 'location_city'}
              {activeTab === 'permits' && 'verified'}
              {activeTab === 'maintenance' && 'database'}
            </span>
            <h2 className="text-xs sm:text-base font-black text-on-surface truncate">
              {activeTab === 'users' && (isAmharic ? 'ሚና እና ፈቃድ አስተዳደር (RBAC)' : 'Role & Permission Management (RBAC)')}
              {activeTab === 'subcities' && (isAmharic ? 'የክፍለ ከተሞች ቁጥጥርና ምደባ' : 'Sub-City Governance & Jurisdictions')}
              {activeTab === 'permits' && (isAmharic ? 'የፈቃድ ሰነዶች የበላይ ቁጥጥር' : 'Master Permit Rules & Serial Controls')}
              {activeTab === 'maintenance' && (isAmharic ? 'የዳታቤዝ ጥገናና ባክአፕ ማዕከል' : 'System Maintenance & DB Backups')}
            </h2>
          </div>

          {activeTab === 'users' && (
            <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto justify-center sm:justify-start pt-1">
              {[
                {
                  id: 'matrix' as const,
                  icon: 'shield_person',
                  label: isAmharic ? 'የሚና ፈቃድ' : 'Permission Matrix',
                  activeIconColor: 'text-primary',
                },
                {
                  id: 'table' as const,
                  icon: 'group',
                  label: isAmharic ? 'ተጠቃሚዎች' : 'Users List',
                  count: users.length,
                  activeIconColor: 'text-blue-600 dark:text-blue-400',
                },
              ].map((tab) => {
                const isActive = userViewMode === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setUserViewMode(tab.id)}
                    className={`group relative flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap select-none shrink-0 ${
                      isActive
                        ? 'bg-surface-container-lowest dark:bg-surface-container-lowest text-on-surface font-extrabold border-t border-l border-r border-b border-b-surface-container-lowest dark:border-b-surface-container-lowest border-outline-variant/80 dark:border-outline-variant/60 rounded-t-lg -mb-px z-10'
                        : 'text-secondary hover:text-on-surface hover:bg-surface-container-high/40 rounded-t-lg border-t border-l border-r border-transparent font-medium'
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[17px] transition-colors ${
                        isActive ? tab.activeIconColor : 'text-secondary group-hover:text-on-surface'
                      }`}
                    >
                      {tab.icon}
                    </span>
                    <span className="tracking-tight">{tab.label}</span>
                    {typeof tab.count === 'number' && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold transition-colors ${
                          isActive
                            ? 'bg-surface-container-high text-on-surface'
                            : 'bg-surface-container-highest text-secondary'
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          
          {activeTab === 'maintenance' && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleForceSyncDatabase}
                className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant rounded-lg text-[11px] font-bold transition-all flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[15px]">sync</span>
                <span>{isAmharic ? 'ዳታቤዝ አድስ' : 'Sync DB'}</span>
              </button>
              <button
                onClick={handleExportFullDatabaseBackup}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-lg text-[11px] font-black transition-all flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[15px]">download</span>
                <span>{isAmharic ? 'ባክአፕ አውርድ' : 'Export'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Body Container holding page content */}
        <div className="p-4 sm:p-5">
          {isBlocked ? renderBlockedUI() : (
            <>

      {/* ================= TAB 1: USERS & RBAC GOVERNANCE ================= */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {userViewMode === 'matrix' ? (
            <RolePermissionManagement
              currentLang={currentLang}
              currentUserBadgeId={currentUserBadgeId}
              users={users}
              settings={settings}
              onToggleClerkSetting={handleToggleClerkSetting}
              onShowToast={onShowToast}
              onOpenUsersTable={() => setUserViewMode('table')}
            />
          ) : (
            <div className="space-y-4">
              {/* Controls & Search Bar */}
              <div className="bg-surface-container-lowest p-4 rounded-lg border border-outline-variant shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="flex-1 flex flex-col sm:flex-row items-center gap-2.5">
                  <div className="relative w-full sm:w-80">
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder={
                        isAmharic
                          ? 'በስም፣ መታወቂያ ወይም ኢሜይል ፈልግ...'
                          : 'Search by name, badge ID, or email...'
                      }
                      className="w-full bg-surface-container border border-outline-variant rounded-md pl-9 pr-4 py-2 text-xs font-semibold text-on-surface focus:outline-hidden focus:border-[#0B1E48]"
                    />
                    <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                      search
                    </span>
                  </div>

                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="w-full sm:w-48 bg-surface-container border border-outline-variant rounded-md px-3 py-2 text-xs font-bold text-on-surface cursor-pointer focus:outline-hidden focus:border-[#0B1E48]"
                  >
                    <option value="all">{isAmharic ? 'ሁሉም ሚናዎች (All Roles)' : 'All Roles'}</option>
                    <option value="superadmin">{isAmharic ? 'ዋና አስተዳዳሪ (Super Admin)' : 'Super Admin'}</option>
                    <option value="admin">{isAmharic ? 'ሥራ አስኪያጅ (Admin/Manager)' : 'Admin / Manager'}</option>
                    <option value="clerk">{isAmharic ? 'ፀሀፊ (Clerk)' : 'Clerk'}</option>
                    <option value="officer">{isAmharic ? 'ተቆጣጣሪ (Traffic Officer)' : 'Traffic Officer'}</option>
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <button
                    onClick={() => setUserViewMode('matrix')}
                    className="w-full sm:w-auto px-3.5 py-2 bg-surface-container hover:bg-surface-container-high border border-outline-variant rounded-md text-xs font-bold text-on-surface transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">shield_person</span>
                    <span>{isAmharic ? 'ወደ ፈቃድ ማዋቀር' : 'Permissions Matrix'}</span>
                  </button>

                  <button
                    onClick={() => setShowAddUserModal(true)}
                    className="w-full sm:w-auto px-4 py-2 bg-[#0B1E48] hover:bg-[#162B5B] text-white rounded-md text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 shrink-0 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">person_add</span>
                    <span>{isAmharic ? 'አዲስ ተጠቃሚ መዝግብ' : 'Add System User'}</span>
                  </button>
                </div>
              </div>

              {/* Users Responsive Table & Mobile Cards */}
              <div className="bg-surface-container-lowest rounded-lg border border-outline-variant shadow-sm overflow-hidden">
                {/* Desktop View Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container text-on-surface-variant text-[11px] font-black uppercase tracking-wider border-b border-outline-variant">
                        <th className="p-3.5 pl-4">{isAmharic ? 'ተጠቃሚ' : 'User Details'}</th>
                        <th className="p-3.5">{isAmharic ? 'የመታወቂያ ቁጥር' : 'Badge ID'}</th>
                        <th className="p-3.5">{isAmharic ? 'ሚና' : 'Role'}</th>
                        <th className="p-3.5">{isAmharic ? 'ክፍለ ከተማ' : 'Sub-City'}</th>
                        <th className="p-3.5">{isAmharic ? 'ሁኔታ' : 'Status'}</th>
                        <th className="p-3.5 text-right pr-4">{isAmharic ? 'ተግባራት' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/60 text-xs font-semibold">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center p-8 text-outline">
                            <span className="material-symbols-outlined text-4xl block mb-2 opacity-40">person_off</span>
                            {isAmharic ? 'ምንም ተጠቃሚ አልተገኘም' : 'No users matching criteria'}
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((user) => (
                          <tr key={user.uid} className="hover:bg-surface-container/50 transition-colors">
                            <td className="p-3.5 pl-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs text-white shrink-0 shadow-2xs ${
                                    user.role === 'superadmin'
                                      ? 'bg-purple-600'
                                      : user.role === 'admin'
                                      ? 'bg-blue-600'
                                      : user.role === 'officer'
                                      ? 'bg-amber-600'
                                      : 'bg-emerald-600'
                                  }`}
                                >
                                  {(user.fullName || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-extrabold text-on-surface">{user.fullName}</div>
                                  <div className="text-[11px] text-outline font-normal">{user.email}</div>
                                </div>
                              </div>
                            </td>

                            <td className="p-3.5 font-mono font-bold text-on-surface">{user.badgeId}</td>

                            <td className="p-3.5">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  user.role === 'superadmin'
                                    ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                    : user.role === 'admin'
                                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                    : user.role === 'officer'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                }`}
                              >
                                <span className="material-symbols-outlined text-[12px]">
                                  {user.role === 'superadmin'
                                    ? 'verified_user'
                                    : user.role === 'admin'
                                    ? 'admin_panel_settings'
                                    : user.role === 'officer'
                                    ? 'local_police'
                                    : 'edit_note'}
                                </span>
                                {user.role}
                              </span>
                            </td>

                            <td className="p-3.5 text-on-surface-variant">{user.subCity || 'በላይ ዘለቀ ክፍለ ከተማ'}</td>

                            <td className="p-3.5">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                                  user.status === 'disabled'
                                    ? 'bg-red-100 text-red-800 border border-red-200'
                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                }`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                {user.status === 'disabled'
                                  ? isAmharic
                                    ? 'የታገደ'
                                    : 'Disabled'
                                  : isAmharic
                                  ? 'ንቁ'
                                  : 'Active'}
                              </span>
                            </td>

                            <td className="p-3.5 text-right pr-4">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setEditingUser(user)}
                                  title={isAmharic ? 'አስተካክል' : 'Edit User'}
                                  className="p-1.5 hover:bg-surface-container rounded-lg text-outline hover:text-on-surface transition-colors cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[18px]">edit</span>
                                </button>

                                <button
                                  onClick={() => handleToggleUserStatus(user)}
                                  title={
                                    user.status === 'disabled'
                                      ? isAmharic
                                        ? 'አካውንት ክፈት'
                                        : 'Enable Account'
                                      : isAmharic
                                      ? 'አካውንት እገድ'
                                      : 'Disable Account'
                                  }
                                  className={`p-1.5 hover:bg-surface-container rounded-lg transition-colors cursor-pointer ${
                                    user.status === 'disabled' ? 'text-emerald-600' : 'text-amber-600'
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-[18px]">
                                    {user.status === 'disabled' ? 'check_circle' : 'block'}
                                  </span>
                                </button>

                                {user.role !== 'superadmin' && (
                                  <button
                                    onClick={() => setDeletingUser(user)}
                                    title={isAmharic ? 'ሰርዝ' : 'Delete User'}
                                    className="p-1.5 hover:bg-red-50 rounded-lg text-red-600 transition-colors cursor-pointer"
                                  >
                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View: Responsive Cards (Mirrors Motorcycle Registry Table Design) */}
                <div className="block md:hidden divide-y divide-outline-variant/60">
                  {filteredUsers.length === 0 ? (
                    <div className="text-center p-8 text-outline">
                      <span className="material-symbols-outlined text-4xl block mb-2 opacity-40">person_off</span>
                      {isAmharic ? 'ምንም ተጠቃሚ አልተገኘም' : 'No users matching criteria'}
                    </div>
                  ) : (
                    filteredUsers.map((user, index) => {
                      const isExpanded = !!expandedUserIds[user.uid];
                      return (
                        <div key={user.uid} className="p-3.5 sm:p-4 hover:bg-surface-container/40 transition-colors">
                          {/* Collapsed Card Header */}
                          <div
                            className="flex items-center justify-between gap-3 cursor-pointer select-none"
                            onClick={() => toggleUserExpand(user.uid)}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              {/* User Avatar */}
                              <div
                                className={`w-11 h-11 rounded-full flex items-center justify-center font-black text-sm text-white shrink-0 shadow-sm ${
                                  user.role === 'superadmin'
                                    ? 'bg-purple-600'
                                    : user.role === 'admin'
                                    ? 'bg-blue-600'
                                    : user.role === 'officer'
                                    ? 'bg-amber-600'
                                    : 'bg-emerald-600'
                                }`}
                              >
                                {(user.fullName || 'U').charAt(0).toUpperCase()}
                              </div>

                              {/* Primary User Details */}
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-xs font-bold text-outline">#{index + 1}</span>
                                  <span className="font-black text-sm text-on-surface truncate block">{user.fullName}</span>
                                </div>

                                <div className="flex items-center gap-2 text-xs flex-wrap pt-0.5">
                                  <span className="font-mono font-bold text-[#0B1E48] dark:text-yellow-400 bg-surface-container px-1.5 py-0.5 rounded text-[11px]">
                                    {user.badgeId}
                                  </span>
                                  <span
                                    className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                      user.role === 'superadmin'
                                        ? 'bg-purple-100 text-purple-800'
                                        : user.role === 'admin'
                                        ? 'bg-blue-100 text-blue-800'
                                        : user.role === 'officer'
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-emerald-100 text-emerald-800'
                                    }`}
                                  >
                                    {user.role}
                                  </span>
                                  <span
                                    className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-extrabold ${
                                      user.status === 'disabled'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-emerald-100 text-emerald-800'
                                    }`}
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                    {user.status === 'disabled' ? (isAmharic ? 'የታገደ' : 'Disabled') : (isAmharic ? 'ንቁ' : 'Active')}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Right Side Expand Icon */}
                            <div className="shrink-0 pl-1">
                              <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-outline hover:text-on-surface transition-colors shadow-2xs">
                                <span className="material-symbols-outlined text-[20px]">
                                  {isExpanded ? 'expand_less' : 'expand_more'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Collapsible Mobile Body Drawer */}
                          {isExpanded && (
                            <div className="mt-3.5 pt-3.5 border-t border-outline-variant space-y-3 bg-surface-container/60 p-3.5 rounded-lg border">
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-outline text-[11px] block">{isAmharic ? 'ኢሜይል' : 'Email Address'}</span>
                                  <span className="font-semibold text-on-surface truncate block">{user.email || '—'}</span>
                                </div>
                                <div>
                                  <span className="text-outline text-[11px] block">{isAmharic ? 'ክፍለ ከተማ' : 'Sub-City'}</span>
                                  <span className="font-bold text-on-surface">{user.subCity || 'በላይ ዘለቀ ክፍለ ከተማ'}</span>
                                </div>
                              </div>

                              {/* Mobile Actions Toolbar */}
                              <div className="pt-2 border-t border-outline-variant flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingUser(user)}
                                  className="px-3 py-1.5 rounded-md bg-surface-container hover:bg-surface-container-high border border-outline-variant text-xs font-bold text-on-surface flex items-center gap-1 transition-all cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[16px]">edit</span>
                                  <span>{isAmharic ? 'አስተካክል' : 'Edit'}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleToggleUserStatus(user)}
                                  className={`px-3 py-1.5 rounded-md border text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                    user.status === 'disabled'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                                      : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300'
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-[16px]">
                                    {user.status === 'disabled' ? 'check_circle' : 'block'}
                                  </span>
                                  <span>
                                    {user.status === 'disabled'
                                      ? isAmharic
                                        ? 'ክፈት'
                                        : 'Enable'
                                      : isAmharic
                                      ? 'እገድ'
                                      : 'Disable'}
                                  </span>
                                </button>

                                {user.role !== 'superadmin' && (
                                  <button
                                    type="button"
                                    onClick={() => setDeletingUser(user)}
                                    className="px-3 py-1.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                    <span>{isAmharic ? 'ሰርዝ' : 'Delete'}</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: SUBCITY GOVERNANCE ================= */}
      {activeTab === 'subcities' && (
        <div className="space-y-5">
          <div className="bg-surface-container-lowest p-5 rounded-lg border border-outline-variant shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-[22px]">location_city</span>
                <h3 className="font-black text-base text-on-surface">
                  {isAmharic ? 'የባህር ዳር ክፍለ ከተሞች አስተዳደር እና ቁጥጥር' : 'Bahir Dar Sub-City Governance & Permit Freeze'}
                </h3>
              </div>
              <p className="text-xs text-outline mt-1 font-medium">
                {isAmharic
                  ? 'የእያንዳንዱን 6ቱ የባህር ዳር ክፍለ ከተሞች ምዝገባ ይቆጣጠሩ፣ የሞተር ብዛት ይመልከቱ ወይም ምዝገባ በጊዜያዊነት ያግዱ'
                  : 'Monitor permit volumes across all 6 Bahir Dar sub-cities and toggle registration freeze states in real-time.'}
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="px-3 py-1.5 rounded-md bg-surface-container text-xs font-bold text-on-surface border border-outline-variant">
                {subCitiesList.length} {isAmharic ? 'ክፍለ ከተሞች' : 'Sub-Cities'}
              </span>
              <span className="px-3 py-1.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-500/20">
                {Object.values(frozenSubCities).filter(Boolean).length} {isAmharic ? 'የታገዱ' : 'Frozen'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subCitiesList.map((sc) => {
              const isFrozen = Boolean(frozenSubCities[sc.en] || frozenSubCities[sc.am]);
              const regCount = registrations.filter(
                (r) =>
                  r.subCity &&
                  (r.subCity.toLowerCase().includes(sc.en.toLowerCase()) ||
                    r.subCity.includes(sc.am))
              ).length;
              const pendingCount = registrations.filter(
                (r) =>
                  r.status === 'pending_approval' &&
                  r.subCity &&
                  (r.subCity.toLowerCase().includes(sc.en.toLowerCase()) ||
                    r.subCity.includes(sc.am))
              ).length;
              const approvedCount = registrations.filter(
                (r) =>
                  r.status === 'approved' &&
                  r.subCity &&
                  (r.subCity.toLowerCase().includes(sc.en.toLowerCase()) ||
                    r.subCity.includes(sc.am))
              ).length;

              return (
                <div
                  key={sc.en}
                  className={`bg-surface-container-lowest p-5 rounded-lg border transition-all duration-200 flex flex-col justify-between ${
                    isFrozen
                      ? 'border-red-300 dark:border-red-900/60 bg-red-50/20 dark:bg-red-950/10 shadow-xs'
                      : 'border-outline-variant hover:border-outline shadow-xs'
                  }`}
                >
                  <div className="space-y-3.5">
                    {/* Header: Sub-City Names & Status Pill */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-emerald-500 ring-2 ring-emerald-100 dark:ring-emerald-950" style={{ backgroundColor: isFrozen ? '#ef4444' : '#10b981' }} />
                          <h4 className="font-black text-base text-on-surface leading-tight">
                            {isAmharic ? sc.am : sc.en}
                          </h4>
                        </div>
                        <p className="text-[11px] text-outline font-semibold pl-4.5">
                          {isAmharic ? sc.en : sc.am}
                        </p>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-black tracking-wide shrink-0 ${
                          isFrozen
                            ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {isFrozen ? (isAmharic ? 'ምዝገባ ታግዷል' : 'FROZEN') : (isAmharic ? 'ምዝገባ ክፍት' : 'ACTIVE')}
                      </span>
                    </div>

                    {/* Stats metrics */}
                    <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-md bg-surface-container/60 border border-outline-variant/50 text-center">
                      <div>
                        <div className="text-[10px] text-outline font-bold uppercase tracking-wider">{isAmharic ? 'ጠቅላላ' : 'Total'}</div>
                        <div className="text-sm font-black text-on-surface">{regCount}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">{isAmharic ? 'በመጠባበቅ' : 'Pending'}</div>
                        <div className="text-sm font-black text-amber-600 dark:text-amber-400">{pendingCount}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">{isAmharic ? 'የጸደቀ' : 'Approved'}</div>
                        <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">{approvedCount}</div>
                      </div>
                    </div>
                  </div>

                  {/* Toggle Switch Footer */}
                  <div className="mt-4 pt-3.5 border-t border-outline-variant flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-on-surface block">
                        {isAmharic ? 'የምዝገባ ሁኔታ' : 'Freeze Registrations'}
                      </span>
                      <span className="text-[10px] text-outline font-medium">
                        {isFrozen
                          ? (isAmharic ? 'ተጠቃሚዎች በዚህ ክ/ከተማ እንዳይመዘገቡ ተከልክሏል' : 'Registrations currently blocked')
                          : (isAmharic ? 'አዳዲስ ምዝገባዎች እየተፈቀዱ ነው' : 'Open for new motorcycle registrations')}
                      </span>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={isFrozen}
                      onClick={() => handleToggleSubCityFreeze(sc.en)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                        isFrozen ? 'bg-red-600' : 'bg-surface-container-high'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          isFrozen ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 3: SECURITY & AUDIT LOGS ================= */}
      {activeTab === 'security' && (
        <div className="space-y-4">
          {/* Security Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-surface-container-lowest p-4 rounded-lg border border-outline-variant shadow-sm flex items-center justify-between">
              <div>
                <div className="font-extrabold text-xs text-on-surface">{isAmharic ? '2FA አስገዳጅነት' : 'Enforce 2FA'}</div>
                <div className="text-[10px] text-outline">{isAmharic ? 'ለሁሉም የአድሚን አካውንቶች' : 'All Admin Roles'}</div>
              </div>
              <button
                onClick={() => setEnforce2FA(!enforce2FA)}
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  enforce2FA ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                    enforce2FA ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="bg-surface-container-lowest p-4 rounded-lg border border-outline-variant shadow-sm flex items-center justify-between">
              <div>
                <div className="font-extrabold text-xs text-on-surface">{isAmharic ? 'የስጋት መለየት (AI)' : 'High Risk Auto-Flag'}</div>
                <div className="text-[10px] text-outline">{isAmharic ? 'ተደጋጋሚ መታወቂያዎች' : 'Duplicate Chassis Alert'}</div>
              </div>
              <button
                onClick={() => setHighRiskDetection(!highRiskDetection)}
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  highRiskDetection ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                    highRiskDetection ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="bg-surface-container-lowest p-4 rounded-lg border border-outline-variant shadow-sm flex items-center justify-between">
              <div>
                <div className="font-extrabold text-xs text-on-surface">{isAmharic ? 'ሎንግ ፖሊንግ (Long Polling)' : 'Firestore Polling'}</div>
                <div className="text-[10px] text-outline">{isAmharic ? 'የኔትወርክ መረጋጋት' : 'Stable Realtime Sync'}</div>
              </div>
              <button
                onClick={() => setLogPolling(!logPolling)}
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  logPolling ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                    logPolling ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="bg-surface-container-lowest p-4 rounded-lg border border-outline-variant shadow-sm flex items-center justify-between">
              <div>
                <div className="font-extrabold text-xs text-on-surface">{isAmharic ? 'አውቶማቲክ እገዳ' : 'Auto Emergency Lock'}</div>
                <div className="text-[10px] text-outline">{isAmharic ? 'ከ3 ያልተሳኩ ሙከራዎች በኋላ' : 'After 3 Failed Logins'}</div>
              </div>
              <button
                onClick={() => setAutoLockdown(!autoLockdown)}
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  autoLockdown ? 'bg-red-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                    autoLockdown ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Real-Time Audit Log Table */}
          <div className="bg-surface-container-lowest rounded-lg border border-outline-variant shadow-sm overflow-hidden">
            <div className="p-4 border-b border-outline-variant flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-purple-600">history</span>
                {isAmharic ? 'የሲስተም ኦዲት ታሪክ (System Audit Logs)' : 'System Audit Trail'}
              </h3>
              <span className="text-xs text-outline font-mono">{auditLogs.length} Records</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-surface-container text-on-surface-variant font-black uppercase tracking-wider border-b border-outline-variant text-[10px]">
                    <th className="p-3 pl-4">{isAmharic ? 'ጊዜ' : 'Timestamp'}</th>
                    <th className="p-3">{isAmharic ? 'ፈጻሚ' : 'Actor'}</th>
                    <th className="p-3">{isAmharic ? 'ተግባር' : 'Action'}</th>
                    <th className="p-3">{isAmharic ? 'ዝርዝር መረጃ' : 'Details'}</th>
                    <th className="p-3 pr-4">{isAmharic ? 'ስጋት ደረጃ' : 'Severity'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/60 font-semibold">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center p-8 text-outline">
                        {isAmharic ? 'ምንም የኦዲት መዝገብ አልተመዘገበም' : 'No audit records logged yet.'}
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-surface-container/50 transition-colors">
                        <td className="p-3 pl-4 font-mono text-[11px] text-outline">
                          {formatEthiopianDateTime(log.timestamp, isAmharic ? 'am' : 'en')}
                        </td>
                        <td className="p-3 font-mono font-bold text-on-surface">{log.actorBadgeId}</td>
                        <td className="p-3 font-mono font-extrabold text-purple-700">{log.action}</td>
                        <td className="p-3 text-on-surface">{log.details}</td>
                        <td className="p-3 pr-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              log.severity === 'critical'
                                ? 'bg-red-100 text-red-800'
                                : log.severity === 'warning'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {log.severity}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: MASTER PERMITS CONTROLS ================= */}
      {activeTab === 'permits' && (
        <div className="space-y-4">
          <div className="bg-surface-container-lowest p-5 rounded-lg border border-outline-variant shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-base text-on-surface">
                  {isAmharic ? 'የሞተር ብስክሌቶች ፈቃድ የበላይ ውሳኔ' : 'Master Registration Approvals & Overrides'}
                </h3>
                <p className="text-xs text-outline">
                  {isAmharic
                    ? 'በዋና አስተዳዳሪ ደረጃ የሚደረጉ የጅምላ ማጽደቂያዎችና ውሳኔዎች'
                    : 'Execute master bulk actions and force override status on any registration.'}
                </p>
              </div>

              <button
                onClick={handleMasterApproveAllPending}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-md transition-all shadow-md active:scale-95 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">done_all</span>
                {isAmharic ? 'የሚጠብቁትን ሁሉ በጅምላ አጽድቅ' : 'Bulk Approve Pending Permits'}
              </button>
            </div>

            {/* Quick Master Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded-md bg-surface-container text-center">
                <div className="text-xs text-outline">{isAmharic ? 'የሚጠብቁ' : 'Pending Review'}</div>
                <div className="text-xl font-black text-amber-600">
                  {registrations.filter((r) => r.status === 'pending_approval').length}
                </div>
              </div>
              <div className="p-3 rounded-md bg-surface-container text-center">
                <div className="text-xs text-outline">{isAmharic ? 'የጸደቁ' : 'Approved'}</div>
                <div className="text-xl font-black text-emerald-600">
                  {registrations.filter((r) => r.status === 'approved').length}
                </div>
              </div>
              <div className="p-3 rounded-md bg-surface-container text-center">
                <div className="text-xs text-outline">{isAmharic ? 'የተከለከሉ' : 'Rejected'}</div>
                <div className="text-xl font-black text-red-600">
                  {registrations.filter((r) => r.status === 'rejected').length}
                </div>
              </div>
              <div className="p-3 rounded-md bg-surface-container text-center">
                <div className="text-xs text-outline">{isAmharic ? 'የታተሙ' : 'Printed'}</div>
                <div className="text-xl font-black text-blue-600">
                  {registrations.filter((r) => r.status === 'printed').length}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 5: SYSTEM MAINTENANCE & DANGER ZONE ================= */}
      {activeTab === 'maintenance' && (
        <div className="space-y-6">
          {/* Section 1: Live Database Health & Cloud Synchronization Hub */}
          <div className="bg-surface-container-lowest p-5 rounded-lg border border-outline-variant shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant pb-3">
              <div>
                <h3 className="font-black text-base text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#1D61E7] text-[22px]">database</span>
                  {isAmharic ? 'የዳታቤዝ ሁኔታና የቀጥታ ማመሳሰያ (Database & Cloud Sync)' : 'Database Health & Cloud Sync'}
                </h3>
                <p className="text-xs text-outline mt-0.5">
                  {isAmharic
                    ? 'ከፋየርቤዝ ክላውድ (Firestore) እና ከአካባቢያዊ መሸጎጫ (IndexedDB) ጋር ያለው የቀጥታ ሁኔታ'
                    : 'Real-time synchronization status with Firebase Firestore and persistent IndexedDB storage.'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleForceSyncDatabase}
                disabled={isSyncingLiveDb}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#0B1E48] hover:bg-[#162B5B] text-white rounded-md text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-[18px] ${isSyncingLiveDb ? 'animate-spin' : ''}`}>
                  sync
                </span>
                <span>
                  {isSyncingLiveDb
                    ? isAmharic ? 'በማመሳሰል ላይ...' : 'Synchronizing...'
                    : isAmharic ? 'አሁን ዳታቤዙን አድስ' : 'Resync Live Database'}
                </span>
              </button>
            </div>

            {/* Live Health Indicators */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-surface-container border border-outline-variant/60">
                <div className="flex items-center gap-1.5 text-xs text-outline mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-bold">{isAmharic ? 'የዳታቤዝ ግንኙነት' : 'Cloud Status'}</span>
                </div>
                <div className="text-sm font-black text-emerald-600">
                  {isAmharic ? 'የተገናኘ (Live)' : 'Connected'}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-surface-container border border-outline-variant/60">
                <div className="flex items-center gap-1.5 text-xs text-outline mb-1">
                  <span className="material-symbols-outlined text-[16px] text-blue-500">two_wheeler</span>
                  <span className="font-bold">{isAmharic ? 'የተመዘገቡ ሞተሮች' : 'Total Vehicles'}</span>
                </div>
                <div className="text-sm font-black text-on-surface">
                  {registrations.length} {isAmharic ? 'ተሽከርካሪዎች' : 'records'}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-surface-container border border-outline-variant/60">
                <div className="flex items-center gap-1.5 text-xs text-outline mb-1">
                  <span className="material-symbols-outlined text-[16px] text-purple-500">badge</span>
                  <span className="font-bold">{isAmharic ? 'የሲስተም ተጠቃሚዎች' : 'System Users'}</span>
                </div>
                <div className="text-sm font-black text-on-surface">
                  {users.length} {isAmharic ? 'አባላት' : 'users'}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-surface-container border border-outline-variant/60">
                <div className="flex items-center gap-1.5 text-xs text-outline mb-1">
                  <span className="material-symbols-outlined text-[16px] text-amber-500">history</span>
                  <span className="font-bold">{isAmharic ? 'የኦዲት መዝገቦች' : 'Audit Logs'}</span>
                </div>
                <div className="text-sm font-black text-on-surface">
                  {auditLogs.length} {isAmharic ? 'ክስተቶች' : 'events'}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Backup & Restoration Center */}
          <div className="bg-surface-container-lowest p-5 rounded-lg border border-outline-variant shadow-sm space-y-4">
            <h3 className="font-black text-base text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-600 text-[22px]">backup</span>
              {isAmharic ? 'የሲስተም ዳታቤዝ ባክአፕና መልሶ ማግኛ (Backup & Restore)' : 'System Backup & Restoration'}
            </h3>
            <p className="text-xs text-outline">
              {isAmharic
                ? 'ሁሉንም የተመዘገቡ ተሽከርካሪዎች፣ ተጠቃሚዎች፣ ኦፊሰሮችና የኦዲት መዝገቦች በ JSON ፋይል ማውረድ ወይም ከቀድሞ ባክአፕ መመለስ ይችላሉ።'
                : 'Safely export all database collections into a standardized JSON backup file or restore previously exported data.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Backup Card */}
              <div className="p-4 rounded-lg border border-outline-variant bg-surface-container/40 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-[20px]">download</span>
                    <h4 className="font-bold text-sm text-on-surface">
                      {isAmharic ? 'ሙሉ ዳታቤዝ ባክአፕ አውርድ (Export)' : 'Export Full Database (.JSON)'}
                    </h4>
                  </div>
                  <p className="text-xs text-outline">
                    {isAmharic
                      ? 'የተመዘገቡ ሞተሮችን፣ ኦፊሰሮችን፣ ተጠቃሚዎችንና ቅንብሮችን የያዘ ንጹህ የ JSON ፋይል ያውርዱ።'
                      : 'Download a full snapshot of all database records, user profiles, assignments, and settings.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleExportFullDatabaseBackup}
                  className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-xs font-extrabold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <span className="material-symbols-outlined text-[18px]">cloud_download</span>
                  <span>{isAmharic ? 'ባክአፕ ፋይል አውርድ (JSON)' : 'Download Backup (.JSON)'}</span>
                </button>
              </div>

              {/* Restore Card */}
              <div className="p-4 rounded-lg border border-outline-variant bg-surface-container/40 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-600 text-[20px]">upload_file</span>
                    <h4 className="font-bold text-sm text-on-surface">
                      {isAmharic ? 'ከባክአፕ ፋይል መልስ (Restore)' : 'Restore / Import from Backup'}
                    </h4>
                  </div>
                  <p className="text-xs text-outline">
                    {isAmharic
                      ? 'ቀደም ሲል የወረደውን የዳታቤዝ JSON ባክአፕ ፋይል በመምረጥ ዳታዎችን ይመልሱ።'
                      : 'Upload a previously generated system backup JSON file to merge or restore lost records.'}
                  </p>
                </div>

                <label className="w-full py-2.5 bg-[#0B1E48] hover:bg-[#162B5B] text-white rounded-md text-xs font-extrabold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98">
                  <span className={`material-symbols-outlined text-[18px] ${isRestoringBackup ? 'animate-spin' : ''}`}>
                    {isRestoringBackup ? 'sync' : 'restore_page'}
                  </span>
                  <span>
                    {isRestoringBackup
                      ? isAmharic ? 'በመጫን ላይ...' : 'Restoring Backup...'
                      : isAmharic ? 'ባክአፕ ፋይል ምረጥና መልስ' : 'Select Backup File to Restore'}
                  </span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleImportBackupJsonFile}
                    disabled={isRestoringBackup}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Section 3: Live System Audit Trail */}
          <div className="bg-surface-container-lowest p-5 rounded-lg border border-outline-variant shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant pb-3">
              <div>
                <h3 className="font-black text-base text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-600 text-[22px]">history_edu</span>
                  {isAmharic ? 'የሲስተም አጠቃቀም የኦዲት መዝገብ (System Audit Trail)' : 'System Audit Trail'}
                </h3>
                <p className="text-xs text-outline mt-0.5">
                  {isAmharic
                    ? 'በዋና አስተዳዳሪዎችና ፀሐፊዎች የተከናወኑ የደህንነትና የፈቃድ ለውጦች ሙሉ ታሪክ'
                    : 'Real-time trace of administrative actions, permission overrides, and permit reviews.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportAuditTrail}
                  className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px] text-emerald-600">table_chart</span>
                  <span>{isAmharic ? 'CSV አውርድ' : 'Export CSV'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDangerActionType('clear_audit')}
                  className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                  <span>{isAmharic ? 'መዝገብ አጥፋ' : 'Clear Logs'}</span>
                </button>
              </div>
            </div>

            {/* Audit Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="w-full sm:w-72 relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-outline text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder={isAmharic ? 'በመታወቂያ ወይም በድርጊት ፈልግ...' : 'Search by badge, action, details...'}
                  className="w-full pl-9 pr-3 py-2 bg-surface-container border border-outline-variant rounded-md text-xs font-semibold focus:outline-hidden focus:border-[#0B1E48]"
                />
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                {(['all', 'info', 'warning', 'critical'] as const).map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setAuditSeverityFilter(sev)}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all capitalize cursor-pointer ${
                      auditSeverityFilter === sev
                        ? 'bg-[#0B1E48] text-white shadow-xs'
                        : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    {sev === 'all'
                      ? isAmharic ? 'ሁሉም' : 'All'
                      : sev === 'critical'
                      ? isAmharic ? 'አስጊ (Critical)' : 'Critical'
                      : sev === 'warning'
                      ? isAmharic ? 'ማስጠንቀቂያ' : 'Warning'
                      : isAmharic ? 'መረጃ (Info)' : 'Info'}
                  </button>
                ))}
              </div>
            </div>

            {/* Audit Logs Table */}
            <div className="border border-outline-variant rounded-md overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-surface-container sticky top-0 z-10 border-b border-outline-variant">
                  <tr>
                    <th className="p-2.5 font-extrabold text-on-surface">{isAmharic ? 'ቀንና ሰዓት' : 'Timestamp'}</th>
                    <th className="p-2.5 font-extrabold text-on-surface">{isAmharic ? 'ፈጻሚ (Actor)' : 'Actor'}</th>
                    <th className="p-2.5 font-extrabold text-on-surface">{isAmharic ? 'ድርጊት (Action)' : 'Action'}</th>
                    <th className="p-2.5 font-extrabold text-on-surface">{isAmharic ? 'ደረጃ (Severity)' : 'Severity'}</th>
                    <th className="p-2.5 font-extrabold text-on-surface">{isAmharic ? 'ዝርዝር መግለጫ' : 'Details'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/50 font-medium">
                  {auditLogs
                    .filter((log) => {
                      if (auditSeverityFilter !== 'all' && (log.severity || 'info') !== auditSeverityFilter) {
                        return false;
                      }
                      if (!auditSearch) return true;
                      const q = auditSearch.toLowerCase();
                      return (
                        log.actorBadgeId?.toLowerCase().includes(q) ||
                        log.action?.toLowerCase().includes(q) ||
                        log.details?.toLowerCase().includes(q)
                      );
                    })
                    .slice(0, auditViewLimit)
                    .map((log) => (
                      <tr key={log.id} className="hover:bg-surface-container/60 transition-colors">
                        <td className="p-2.5 text-outline text-[11px] whitespace-nowrap">
                          {formatEthiopianDateTime(log.timestamp, currentLang)}
                        </td>
                        <td className="p-2.5 font-mono font-bold text-on-surface whitespace-nowrap">
                          {log.actorBadgeId} <span className="text-[10px] text-outline font-sans">({log.actorRole})</span>
                        </td>
                        <td className="p-2.5 font-bold text-on-surface whitespace-nowrap">
                          <span className="px-2 py-0.5 bg-surface-container rounded-sm border border-outline-variant/60 font-mono text-[10px]">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              log.severity === 'critical'
                                ? 'bg-red-100 text-red-800 border border-red-300'
                                : log.severity === 'warning'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-blue-100 text-blue-800 border border-blue-300'
                            }`}
                          >
                            {log.severity || 'info'}
                          </span>
                        </td>
                        <td className="p-2.5 text-on-surface text-[11px] max-w-xs truncate" title={log.details}>
                          {log.details}
                        </td>
                      </tr>
                    ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-xs text-outline font-medium">
                        {isAmharic ? 'ምንም የኦዲት መዝገብ አልተገኘም' : 'No audit trail logs recorded yet.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {auditLogs.length > auditViewLimit && (
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setAuditViewLimit((prev) => prev + 50)}
                  className="text-xs font-bold text-[#1D61E7] hover:underline"
                >
                  {isAmharic ? 'ተጨማሪ የኦዲት መዝገቦችን አሳይ' : 'Load more audit records'}
                </button>
              </div>
            )}
          </div>

          {/* Section 4: DANGER ZONE */}
          <div className="bg-red-50/40 border-2 border-red-300 rounded-lg p-5 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-red-200 pb-3">
              <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">warning</span>
              </div>
              <div>
                <h3 className="font-black text-base text-red-900">
                  {isAmharic ? 'አደገኛ ቀጠና (Danger Zone Operations)' : 'Danger Zone Operations'}
                </h3>
                <p className="text-xs text-red-700 mt-0.5">
                  {isAmharic
                    ? 'እነዚህ ተግባራት በዳታቤዝ ላይ ዘላቂ ለውጥ ያመጣሉ፤ እባክዎ ከመፈጸምዎ በፊት አስቀድመው ባክአፕ ይያዙ።'
                    : 'Destructive system maintenance tasks. Actions cannot be undone without a recent JSON backup.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Danger Option 1: Factory Reset */}
              <div className="p-4 rounded-lg bg-white border border-red-200 shadow-xs flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <h4 className="font-extrabold text-xs text-red-900 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-red-600">restart_alt</span>
                    {isAmharic ? 'ሙሉ የሲስተም ሪሴት (Factory Reset)' : 'Factory System Reset'}
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {isAmharic
                      ? 'ሁሉንም የምዝገባ መዝገቦች፣ የህትመት ትዕዛዞችና የፍተሻ ዳታዎችን ወደ መጀመሪያው ንጹህ ደረጃ ይመልሳል።'
                      : 'Clears all registration records, print batches, and test data back to factory state.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDangerActionType('reset');
                    setDangerConfirmInput('');
                    setDangerError('');
                  }}
                  className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-98"
                >
                  {isAmharic ? 'ሙሉ ሪሴት አድርግ' : 'Execute System Reset'}
                </button>
              </div>

              {/* Danger Option 2: Purge Rejected Permits */}
              <div className="p-4 rounded-lg bg-white border border-red-200 shadow-xs flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <h4 className="font-extrabold text-xs text-red-900 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-red-600">cleaning_services</span>
                    {isAmharic ? 'ውድቅ የተደረጉ ፈቃዶችን አፅዳ' : 'Purge Rejected Permits'}
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {isAmharic
                      ? 'የተከለከሉ (Rejected) የሞተር ምዝገባዎችን በዘላቂነት ከዳታቤዝ በመሰረዝ ቦታ ያስለቅቃል።'
                      : 'Permanently deletes all rejected permit applications to free up quota and database storage.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDangerActionType('purge_rejected');
                    setDangerConfirmInput('');
                    setDangerError('');
                  }}
                  className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-98"
                >
                  {isAmharic ? 'ውድቅ የሆኑትን ሰርዝ' : 'Purge Rejected Permits'}
                </button>
              </div>

              {/* Danger Option 3: Clear Verification Logs */}
              <div className="p-4 rounded-lg bg-white border border-red-200 shadow-xs flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <h4 className="font-extrabold text-xs text-red-900 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-red-600">delete_sweep</span>
                    {isAmharic ? 'የመንገድ ላይ ፍተሻ ታሪክን አጥፋ' : 'Clear Verification History'}
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {isAmharic
                      ? 'በኦፊሰሮች የተከናወኑ የመንገድ ላይ የ QR ስካን ፍተሻ ታሪኮችን በሙሉ ያጸዳል።'
                      : 'Clears all officer roadside scan verification history from local cache and cloud storage.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDangerActionType('clear_verifications');
                    setDangerConfirmInput('');
                    setDangerError('');
                  }}
                  className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-98"
                >
                  {isAmharic ? 'የፍተሻ ታሪክ አጥፋ' : 'Clear Scan Logs'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

            </>
          )}
        </div> {/* End of Body Container holding page content */}
      </div> {/* End of Container with header with icon and header text */}

      {/* ================= MODAL: ADD SYSTEM USER ================= */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-lg border border-outline-variant shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <h3 className="font-black text-base text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-600 text-[20px]">person_add</span>
                {isAmharic ? 'አዲስ የሲስተም ተጠቃሚ መመዝገቢያ' : 'Register New System User'}
              </h3>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-outline hover:text-on-surface p-1 rounded-lg"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  {isAmharic ? 'ሙሉ ስም' : 'Full Name'}
                </label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="e.g. ዮሐንስ ተስፋዬ"
                  className="w-full bg-surface-container border border-outline-variant rounded-md px-3.5 py-2 text-xs font-semibold focus:outline-hidden focus:border-[#0B1E48]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">
                    {isAmharic ? 'መታወቂያ ቁጥር' : 'Badge ID'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newBadgeId}
                    onChange={(e) => setNewBadgeId(e.target.value)}
                    placeholder="e.g. CLERK-501"
                    className="w-full bg-surface-container border border-outline-variant rounded-md px-3.5 py-2 text-xs font-mono font-bold focus:outline-hidden focus:border-[#0B1E48]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">
                    {isAmharic ? 'የተጠቃሚ ሚና' : 'User Role'}
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full bg-surface-container border border-outline-variant rounded-md px-3 py-2 text-xs font-bold focus:outline-hidden focus:border-[#0B1E48]"
                  >
                    <option value="clerk">{isAmharic ? 'ፀሀፊ (Clerk)' : 'Clerk'}</option>
                    <option value="admin">{isAmharic ? 'ሥራ አስኪያጅ (Admin)' : 'Admin'}</option>
                    <option value="officer">{isAmharic ? 'ተቆጣጣሪ (Officer)' : 'Officer'}</option>
                    <option value="superadmin">{isAmharic ? 'ዋና አስተዳዳሪ (Super Admin)' : 'Super Admin'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  {isAmharic ? 'ኢሜይል አድራሻ' : 'Email Address'}
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. yohannes@permit.gov.et"
                  className="w-full bg-surface-container border border-outline-variant rounded-md px-3.5 py-2 text-xs font-semibold focus:outline-hidden focus:border-[#0B1E48]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  {isAmharic ? 'ክፍለ ከተማ' : 'Sub-City'}
                </label>
                <select
                  value={newSubCity}
                  onChange={(e) => setNewSubCity(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant rounded-md px-3 py-2 text-xs font-semibold focus:outline-hidden focus:border-[#0B1E48]"
                >
                  {subCitiesList.map((sc) => (
                    <option key={sc.en} value={sc.en}>
                      {isAmharic ? `${sc.am} (${sc.en})` : `${sc.en} (${sc.am})`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 bg-surface-container hover:bg-surface-container-high rounded-md text-xs font-bold text-on-surface"
                >
                  {isAmharic ? 'ሰርዝ' : 'Cancel'}
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0B1E48] hover:bg-[#162B5B] text-white rounded-md text-xs font-extrabold shadow-md active:scale-95"
                >
                  {isAmharic ? 'ተጠቃሚውን አስመዝግብ' : 'Create User Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT USER ================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-lg border border-outline-variant shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <h3 className="font-black text-base text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 text-[20px]">edit</span>
                {isAmharic ? 'የተጠቃሚ መረጃ ማስተካከያ' : 'Edit System User Profile'}
              </h3>
              <button onClick={() => setEditingUser(null)} className="text-outline hover:text-on-surface p-1 rounded-lg">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">{isAmharic ? 'ሙሉ ስም' : 'Full Name'}</label>
                <input
                  type="text"
                  required
                  value={editingUser.fullName}
                  onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })}
                  className="w-full bg-surface-container border border-outline-variant rounded-md px-3.5 py-2 text-xs font-semibold focus:outline-hidden focus:border-[#0B1E48]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">{isAmharic ? 'መታወቂያ' : 'Badge ID'}</label>
                  <input
                    type="text"
                    disabled
                    value={editingUser.badgeId}
                    className="w-full bg-surface-container/60 border border-outline-variant rounded-md px-3.5 py-2 text-xs font-mono font-bold text-outline cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">{isAmharic ? 'ሚና' : 'Role'}</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                    className="w-full bg-surface-container border border-outline-variant rounded-md px-3 py-2 text-xs font-bold focus:outline-hidden focus:border-[#0B1E48]"
                  >
                    <option value="clerk">Clerk</option>
                    <option value="admin">Admin</option>
                    <option value="officer">Officer</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">{isAmharic ? 'ኢሜይል' : 'Email'}</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full bg-surface-container border border-outline-variant rounded-md px-3.5 py-2 text-xs font-semibold focus:outline-hidden focus:border-[#0B1E48]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">{isAmharic ? 'ክፍለ ከተማ' : 'Sub-City'}</label>
                <select
                  value={editingUser.subCity || BAHIR_DAR_SUBCITIES[0].en}
                  onChange={(e) => setEditingUser({ ...editingUser, subCity: e.target.value })}
                  className="w-full bg-surface-container border border-outline-variant rounded-md px-3 py-2 text-xs font-semibold focus:outline-hidden focus:border-[#0B1E48]"
                >
                  {subCitiesList.map((sc) => (
                    <option key={sc.en} value={sc.en}>
                      {isAmharic ? `${sc.am} (${sc.en})` : `${sc.en} (${sc.am})`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-surface-container hover:bg-surface-container-high rounded-md text-xs font-bold text-on-surface"
                >
                  {isAmharic ? 'ሰርዝ' : 'Cancel'}
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0B1E48] hover:bg-[#162B5B] text-white rounded-md text-xs font-extrabold shadow-md active:scale-95"
                >
                  {isAmharic ? 'ለውጦችን መዝግብ' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: DELETE CONFIRM ================= */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-sm rounded-lg border border-red-200 shadow-2xl p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[28px]">warning</span>
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-base text-on-surface">
                {isAmharic ? 'ተጠቃሚውን የመሰረዝ ማረጋገጫ' : 'Confirm User Deletion'}
              </h3>
              <p className="text-xs text-outline">
                {isAmharic
                  ? `ተጠቃሚ ${deletingUser.fullName} (${deletingUser.badgeId}) ከአስፈላጊ ዝርዝር በዘላቂነት ይሰረዛል?`
                  : `Are you sure you want to permanently delete user ${deletingUser.fullName} (${deletingUser.badgeId})?`}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 bg-surface-container hover:bg-surface-container-high rounded-md text-xs font-bold text-on-surface"
              >
                {isAmharic ? 'ተመለስ' : 'Cancel'}
              </button>

              <button
                onClick={handleDeleteUser}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-extrabold shadow-md active:scale-95"
              >
                {isAmharic ? 'በዘላቂነት ሰርዝ' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: DANGER ZONE CONFIRMATION ================= */}
      {dangerActionType && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-lg border-2 border-red-400 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-red-100 pb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">warning</span>
              </div>
              <div>
                <h3 className="font-black text-base text-red-900">
                  {dangerActionType === 'reset'
                    ? isAmharic ? 'ሙሉ የሲስተም ሪሴት ማረጋገጫ' : 'Confirm Factory Reset'
                    : dangerActionType === 'purge_rejected'
                    ? isAmharic ? 'ውድቅ የሆኑ ፈቃዶችን የመሰረዝ ማረጋገጫ' : 'Confirm Purging Rejected Permits'
                    : dangerActionType === 'clear_audit'
                    ? isAmharic ? 'የኦዲት መዝገብ የማጥፋት ማረጋገጫ' : 'Confirm Clearing Audit Logs'
                    : isAmharic ? 'የፍተሻ ታሪክ የማጥፋት ማረጋገጫ' : 'Confirm Clearing Verification History'}
                </h3>
                <p className="text-[11px] text-red-700">
                  {isAmharic ? 'ይህ ተግባር ወደኋላ አይመለስም!' : 'This action is permanent and irreversible.'}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-700 bg-red-50/50 p-3 rounded-md border border-red-200">
              {dangerActionType === 'reset' && (
                <p>
                  {isAmharic
                    ? 'ሁሉንም የምዝገባዎች፣ የባች ትዕዛዞች፣ ኦፊሰሮችና የፍተሻ ታሪክ ዳታዎች ከዳታቤዝ ላይ ይጠፋሉ እና ወደ ፋብሪካ ደረጃ ይመለሳሉ።'
                    : 'All registration records, print batches, and scan logs will be permanently deleted and restored to empty state.'}
                </p>
              )}
              {dangerActionType === 'purge_rejected' && (
                <p>
                  {isAmharic
                    ? 'በዳታቤዝ ውስጥ ያሉ ሁሉም ውድቅ የተደረጉ (Rejected) የሞተርሳይክል ፈቃድ ማመልከቻዎች በዘላቂነት ይሰረዛሉ።'
                    : 'All rejected permit registration applications across all sub-cities will be permanently removed.'}
                </p>
              )}
              {dangerActionType === 'clear_audit' && (
                <p>
                  {isAmharic
                    ? 'እስካሁን የተመዘገቡ የሲስተም ኦዲት መዝገቦች በሙሉ ይጸዳሉ።'
                    : 'All historic audit trail logs will be cleared.'}
                </p>
              )}
              {dangerActionType === 'clear_verifications' && (
                <p>
                  {isAmharic
                    ? 'በኦፊሰሮች የተደረጉ የፍተሻ ታሪኮች በሙሉ ይጸዳሉ።'
                    : 'All roadside QR scan verification logs will be cleared.'}
                </p>
              )}
            </div>

            {(dangerActionType === 'reset' || dangerActionType === 'purge_rejected') && (
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-bold text-slate-800">
                  {dangerActionType === 'reset'
                    ? isAmharic
                      ? 'ለማረጋገጥ "RESET" ወይም "ሪሴት" ብለው ይጻፉ፡'
                      : 'Type "RESET" to confirm:'
                    : isAmharic
                    ? 'ለማረጋገጥ "PURGE" ወይም "አጥፋ" ብለው ይጻፉ፡'
                    : 'Type "PURGE" to confirm:'}
                </label>
                <input
                  type="text"
                  value={dangerConfirmInput}
                  onChange={(e) => {
                    setDangerConfirmInput(e.target.value);
                    setDangerError('');
                  }}
                  placeholder={
                    dangerActionType === 'reset'
                      ? isAmharic ? 'ሪሴት ወይም RESET' : 'RESET'
                      : isAmharic ? 'አጥፋ ወይም PURGE' : 'PURGE'
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:border-red-500 uppercase"
                />
              </div>
            )}

            {dangerError && (
              <div className="p-2 bg-red-100 border border-red-300 text-red-800 text-xs rounded-md font-semibold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>{dangerError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setDangerActionType(null);
                  setDangerConfirmInput('');
                  setDangerError('');
                }}
                disabled={isDangerExecuting}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-bold transition-all cursor-pointer"
              >
                {isAmharic ? 'ተመለስ' : 'Cancel'}
              </button>

              <button
                type="button"
                onClick={handleExecuteDangerAction}
                disabled={isDangerExecuting}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-extrabold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-98"
              >
                {isDangerExecuting && (
                  <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                )}
                <span>
                  {isDangerExecuting
                    ? isAmharic ? 'በመፈጸም ላይ...' : 'Executing...'
                    : isAmharic ? 'አረጋግጥና ፈጽም' : 'Confirm & Execute'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
