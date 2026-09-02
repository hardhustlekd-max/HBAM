import React, { useState, useMemo, useEffect } from 'react';
import { Language, UserRole, SystemUser, SystemSettings } from '../types';
import { addAuditLogToDb, subscribeSettings, saveSettingsToDb } from '../services/dbService';

export interface RoleDefinition {
  id: string;
  roleKey: UserRole | string;
  titleAm: string;
  titleEn: string;
  userCountText: string;
  avatarBg: string;
  avatarType: 'secretary' | 'officer' | 'manager' | 'it' | 'superadmin' | 'custom';
  status: 'active' | 'inactive';
}

export type PermissionState = 'allow' | 'view_only' | 'deny';

export interface TaskPermissionItem {
  id: number;
  icon: string;
  titleAm: string;
  titleEn: string;
}

const DEFAULT_TASKS: TaskPermissionItem[] = [
  { id: 1, icon: 'person_add', titleAm: '1. አዲስ አባል / ተሽከርካሪ መመዝገብ', titleEn: '(Register New Member / Vehicle)' },
  { id: 2, icon: 'edit', titleAm: '2. የአባል መመዝገቢያ (Edit/Edit Member)', titleEn: '(Edit Member)' },
  { id: 3, icon: 'two_wheeler', titleAm: '3. የተሽከርካሪ መረጃ ማስተካከል', titleEn: '(Edit Vehicle Info)' },
  { id: 4, icon: 'attach_file', titleAm: '4. ሰነዶች መስቀል', titleEn: '(Upload Documents)' },
  { id: 5, icon: 'barcode_scanner', titleAm: '5. ባርኮድ ስካን', titleEn: '(Barcode Scan)' },
  { id: 6, icon: 'visibility', titleAm: '6. የአባል መረጃ ማየት', titleEn: '(View Member Info)' },
  { id: 7, icon: 'two_wheeler', titleAm: '7. የተሽከርካሪ መረጃ ማየት', titleEn: '(View Vehicle Info)' },
  { id: 8, icon: 'list_alt', titleAm: '8. የአባላት ዝርዝር ማየት', titleEn: '(View Members List)' },
  { id: 9, icon: 'bar_chart', titleAm: '9. የተሽከርካሪ ሁኔታን ማየት', titleEn: '(View Count/Statistics)' },
  { id: 10, icon: 'description', titleAm: '10. የፍተሻ ሪፖርቶችና ታሪክ (Verification Log Visibility)', titleEn: '(Verification Log Visibility & Reports)' },
  { id: 11, icon: 'delete', titleAm: '11. አባል መሰረዝ', titleEn: '(Delete Member)' },
  { id: 12, icon: 'database', titleAm: '12. Database ማስተዳደር', titleEn: '(DB Management)' },
  { id: 13, icon: 'group_add', titleAm: '13. ተጠቃሚ መፍጠር / ማዋቀር', titleEn: '(User Management)' },
  { id: 14, icon: 'security', titleAm: '14. ፈቃዶች ማስተዳደር', titleEn: '(Permission Management)' },
  { id: 15, icon: 'analytics', titleAm: '15. የክፍያ ደረሰኞች ስታቲስቲክስ (Payment Receipt KPIs)', titleEn: '(Payment Receipt KPIs)' },
  { id: 16, icon: 'table_view', titleAm: '16. የክፍያ ደረሰኞች መዝገብ ሰንጠረዥ (Payment Receipt Records Table)', titleEn: '(Payment Receipt Records Table)' },
];

const INITIAL_ROLES: RoleDefinition[] = [
  {
    id: 'role-secretary',
    roleKey: 'clerk',
    titleAm: 'ጸሃፊ',
    titleEn: '(Secretary)',
    userCountText: '3 ተጠቃሚ',
    avatarBg: 'bg-rose-500',
    avatarType: 'secretary',
    status: 'active',
  },
  {
    id: 'role-officer',
    roleKey: 'officer',
    titleAm: 'ኦፊሰር',
    titleEn: '(Officer)',
    userCountText: '5 ተጠቃሚ',
    avatarBg: 'bg-blue-600',
    avatarType: 'officer',
    status: 'active',
  },
  {
    id: 'role-manager',
    roleKey: 'admin',
    titleAm: 'ስራ አስኪያጅ',
    titleEn: '(Manager)',
    userCountText: '2 ተጠቃሚ',
    avatarBg: 'bg-slate-800',
    avatarType: 'manager',
    status: 'active',
  },
  {
    id: 'role-it',
    roleKey: 'it_specialist',
    titleAm: 'አይቲ ባለሙያ',
    titleEn: '(IT Specialist)',
    userCountText: '1 ተጠቃሚ',
    avatarBg: 'bg-indigo-600',
    avatarType: 'it',
    status: 'active',
  },
  {
    id: 'role-superadmin',
    roleKey: 'superadmin',
    titleAm: 'ሱፐር አድሚን',
    titleEn: '(Super Admin)',
    userCountText: '1 ተጠቃሚ',
    avatarBg: 'bg-purple-800',
    avatarType: 'superadmin',
    status: 'active',
  },
];

// Initial Permissions for each role matching image
const INITIAL_PERMISSIONS: Record<string, Record<number, PermissionState>> = {
  'role-secretary': {
    1: 'allow',
    2: 'allow',
    3: 'allow',
    4: 'allow',
    5: 'deny',
    6: 'allow',
    7: 'allow',
    8: 'allow',
    9: 'allow',
    10: 'allow',
    11: 'deny',
    12: 'deny',
    13: 'deny',
    14: 'deny',
    15: 'deny',
    16: 'deny',
  },
  'role-officer': {
    1: 'deny',
    2: 'deny',
    3: 'deny',
    4: 'deny',
    5: 'allow',
    6: 'allow',
    7: 'allow',
    8: 'view_only',
    9: 'view_only',
    10: 'deny',
    11: 'deny',
    12: 'deny',
    13: 'deny',
    14: 'deny',
    15: 'deny',
    16: 'deny',
  },
  'role-manager': {
    1: 'allow',
    2: 'allow',
    3: 'allow',
    4: 'allow',
    5: 'allow',
    6: 'allow',
    7: 'allow',
    8: 'allow',
    9: 'allow',
    10: 'allow',
    11: 'view_only',
    12: 'view_only',
    13: 'deny',
    14: 'deny',
    15: 'allow',
    16: 'allow',
  },
  'role-it': {
    1: 'view_only',
    2: 'view_only',
    3: 'view_only',
    4: 'view_only',
    5: 'allow',
    6: 'view_only',
    7: 'view_only',
    8: 'view_only',
    9: 'view_only',
    10: 'view_only',
    11: 'allow',
    12: 'allow',
    13: 'allow',
    14: 'allow',
    15: 'allow',
    16: 'allow',
  },
  'role-superadmin': {
    1: 'allow',
    2: 'allow',
    3: 'allow',
    4: 'allow',
    5: 'allow',
    6: 'allow',
    7: 'allow',
    8: 'allow',
    9: 'allow',
    10: 'allow',
    11: 'allow',
    12: 'allow',
    13: 'allow',
    14: 'allow',
    15: 'allow',
    16: 'allow',
  },
};

interface RolePermissionManagementProps {
  currentLang: Language;
  currentUserBadgeId: string;
  users?: SystemUser[];
  settings?: SystemSettings;
  onToggleClerkSetting?: (
    key: 'showClerkPermitStatus' | 'showClerkSubmissionsAction' | 'showClerkApprovedVehiclesAction'
  ) => void;
  onShowToast?: (msg: string, type?: 'success' | 'warning' | 'info') => void;
  onOpenUsersTable?: () => void;
}

export const RolePermissionManagement: React.FC<RolePermissionManagementProps> = ({
  currentLang,
  currentUserBadgeId,
  users = [],
  settings: propSettings,
  onToggleClerkSetting: propOnToggleClerkSetting,
  onShowToast,
  onOpenUsersTable,
}) => {
  const isAmharic = currentLang === 'am';

  const [roles, setRoles] = useState<RoleDefinition[]>(() => {
    const saved = localStorage.getItem('permit_role_definitions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_ROLES;
      }
    }
    return INITIAL_ROLES;
  });
  const [selectedRoleId, setSelectedRoleId] = useState<string>('role-secretary');
  const [roleSearch, setRoleSearch] = useState<string>('');
  const [localSettings, setLocalSettings] = useState<SystemSettings>(() => {
    return (
      propSettings || {
        registrationFreeze: false,
        maintenanceMode: false,
        emailAlerts: true,
        security2FA: true,
        highRiskAlerts: true,
        showClerkPermitStatus: false,
        showClerkSubmissionsAction: false,
        showClerkApprovedVehiclesAction: false,
        frozenSubCities: {},
      }
    );
  });

  useEffect(() => {
    if (propSettings) {
      setLocalSettings(propSettings);
    } else {
      const unsub = subscribeSettings((data) => {
        if (data) setLocalSettings(data);
      });
      return () => unsub();
    }
  }, [propSettings]);

  const currentSettings = propSettings || localSettings;

  const handleToggleClerk = async (
    key: 'showClerkPermitStatus' | 'showClerkSubmissionsAction' | 'showClerkApprovedVehiclesAction'
  ) => {
    if (propOnToggleClerkSetting) {
      propOnToggleClerkSetting(key);
      return;
    }

    const newVal = !currentSettings[key];
    const updated = { ...currentSettings, [key]: newVal };
    setLocalSettings(updated);
    await saveSettingsToDb(updated);
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

  const [permissionsMatrix, setPermissionsMatrix] = useState<Record<string, Record<number, PermissionState>>>(() => {
    const saved = localStorage.getItem('permit_role_permissions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_PERMISSIONS;
      }
    }
    return INITIAL_PERMISSIONS;
  });

  const [showNewRoleModal, setShowNewRoleModal] = useState(false);
  const [newRoleTitleAm, setNewRoleTitleAm] = useState('');
  const [newRoleTitleEn, setNewRoleTitleEn] = useState('');
  const [newRoleTemplate, setNewRoleTemplate] = useState('role-secretary');

  // Selected role object
  const selectedRole = useMemo(() => {
    return roles.find((r) => r.id === selectedRoleId) || roles[0];
  }, [roles, selectedRoleId]);

  // Dynamic user count computation if users are provided
  const dynamicRoles = useMemo(() => {
    return roles.map((r) => {
      if (users.length > 0) {
        const count = users.filter((u) => u.role === r.roleKey).length;
        if (count > 0) {
          return {
            ...r,
            userCountText: `${count} ${isAmharic ? 'ተጠቃሚ' : 'Users'}`,
          };
        }
      }
      return r;
    });
  }, [roles, users, isAmharic]);

  // Filtered Roles
  const filteredRoles = useMemo(() => {
    return dynamicRoles.filter(
      (r) =>
        r.titleAm.toLowerCase().includes(roleSearch.toLowerCase()) ||
        r.titleEn.toLowerCase().includes(roleSearch.toLowerCase())
    );
  }, [dynamicRoles, roleSearch]);

  // Current permissions for the selected role
  const currentRolePerms = permissionsMatrix[selectedRoleId] || INITIAL_PERMISSIONS['role-secretary'];

  const handleSetPermission = (taskId: number, state: PermissionState) => {
    setPermissionsMatrix((prev) => ({
      ...prev,
      [selectedRoleId]: {
        ...(prev[selectedRoleId] || INITIAL_PERMISSIONS[selectedRoleId] || {}),
        [taskId]: state,
      },
    }));
  };

  const handleSavePermissions = async () => {
    localStorage.setItem('permit_role_permissions', JSON.stringify(permissionsMatrix));

    await addAuditLogToDb({
      actorBadgeId: currentUserBadgeId || 'SUPER-ADMIN-01',
      actorRole: 'superadmin',
      action: 'ROLE_PERMISSIONS_UPDATED',
      details: `Updated permissions matrix for role: ${selectedRole.titleAm} ${selectedRole.titleEn}`,
      severity: 'warning',
    });

    if (onShowToast) {
      onShowToast(
        isAmharic
        ? `የ${selectedRole.titleAm} ሚና ፈቃዶች በተሳካ ሁኔታ ተቀምጠዋል`
        : `Permissions for ${selectedRole.titleEn} successfully saved`,
        'success'
      );
    }
  };

  const handleResetPermissions = () => {
    const defaultForRole = INITIAL_PERMISSIONS[selectedRoleId] || INITIAL_PERMISSIONS['role-secretary'];
    setPermissionsMatrix((prev) => ({
      ...prev,
      [selectedRoleId]: { ...defaultForRole },
    }));

    if (onShowToast) {
      onShowToast(
        isAmharic ? 'ፈቃዶች ወደ መጀመሪያው ሁኔታ ተመልሰዋል' : 'Permissions reset to default',
        'info'
      );
    }
  };

  const handleCreateNewRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleTitleAm.trim()) return;

    const newId = `role-custom-${Date.now()}`;
    const newRole: RoleDefinition = {
      id: newId,
      roleKey: 'custom',
      titleAm: newRoleTitleAm.trim(),
      titleEn: newRoleTitleEn.trim() ? `(${newRoleTitleEn.trim()})` : `(${newRoleTitleAm.trim()})`,
      userCountText: `0 ${isAmharic ? 'ተጠቃሚ' : 'Users'}`,
      avatarBg: 'bg-teal-600',
      avatarType: 'custom',
      status: 'active',
    };

    const templatePerms = permissionsMatrix[newRoleTemplate] || INITIAL_PERMISSIONS['role-secretary'];

    setRoles((prev) => {
      const updated = [...prev, newRole];
      localStorage.setItem('permit_role_definitions', JSON.stringify(updated));
      return updated;
    });
    setPermissionsMatrix((prev) => {
      const updatedMatrix = {
        ...prev,
        [newId]: { ...templatePerms },
      };
      localStorage.setItem('permit_role_permissions', JSON.stringify(updatedMatrix));
      return updatedMatrix;
    });
    setSelectedRoleId(newId);
    setShowNewRoleModal(false);
    setNewRoleTitleAm('');
    setNewRoleTitleEn('');

    if (onShowToast) {
      onShowToast(
        isAmharic ? `አዲስ ሚና "${newRole.titleAm}" ተፈጥሯል` : `New role "${newRole.titleAm}" created`,
        'success'
      );
    }
  };

  // Avatar renderer matching the visual archetype in image
  const renderAvatar = (type: RoleDefinition['avatarType'], bg: string) => {
    switch (type) {
      case 'secretary':
        return (
          <div className="w-11 h-11 rounded-full bg-slate-900 border-2 border-slate-700 overflow-hidden flex items-center justify-center shrink-0 shadow-xs relative">
            <span className="material-symbols-outlined text-[28px] text-amber-200">face_3</span>
          </div>
        );
      case 'officer':
        return (
          <div className="w-11 h-11 rounded-full bg-[#102A6B] border-2 border-blue-400 overflow-hidden flex items-center justify-center shrink-0 shadow-xs relative">
            <span className="material-symbols-outlined text-[26px] text-white">local_police</span>
          </div>
        );
      case 'manager':
        return (
          <div className="w-11 h-11 rounded-full bg-[#1E293B] border-2 border-slate-600 overflow-hidden flex items-center justify-center shrink-0 shadow-xs relative">
            <span className="material-symbols-outlined text-[26px] text-amber-400">person_filled</span>
          </div>
        );
      case 'it':
        return (
          <div className="w-11 h-11 rounded-full bg-slate-900 border-2 border-indigo-400 overflow-hidden flex items-center justify-center shrink-0 shadow-xs relative">
            <span className="material-symbols-outlined text-[24px] text-cyan-400">code</span>
          </div>
        );
      case 'superadmin':
        return (
          <div className="w-11 h-11 rounded-full bg-[#0B1E48] border-2 border-amber-400 overflow-hidden flex items-center justify-center shrink-0 shadow-xs relative">
            <span className="material-symbols-outlined text-[26px] text-amber-300">verified_user</span>
          </div>
        );
      default:
        return (
          <div className={`w-11 h-11 rounded-full ${bg} border-2 border-white/50 overflow-hidden flex items-center justify-center shrink-0 shadow-xs text-white`}>
            <span className="material-symbols-outlined text-[24px]">shield_person</span>
          </div>
        );
    }
  };

  return (
    <div className="space-y-4 font-sans text-on-surface">
      {/* 2-Column Responsive Layout matching the uploaded design */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        
        {/* ================= LEFT COLUMN: ROLES LIST (lg:col-span-4 or 5) ================= */}
        <div className="lg:col-span-4 bg-surface-container-lowest rounded-lg border border-outline-variant/80 shadow-xs overflow-hidden flex flex-col">
          {/* Left Card Header */}
          <div className="p-4 border-b border-outline-variant/60 flex items-center justify-between gap-2">
            <h3 className="text-sm sm:text-base font-extrabold text-on-surface flex items-center gap-1.5">
              <span>{isAmharic ? 'ሚናዎች (Roles)' : 'Roles'}</span>
            </h3>

            <button
              type="button"
              onClick={() => setShowNewRoleModal(true)}
              className="px-3 py-1.5 bg-[#1D61E7] hover:bg-blue-700 active:scale-95 text-white rounded-lg text-xs font-black transition-all flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>{isAmharic ? 'አዲስ ሚና ፍጠር' : 'Create Role'}</span>
            </button>
          </div>

          {/* Search Input Box */}
          <div className="p-3 border-b border-outline-variant/50">
            <div className="relative flex items-center">
              <input
                type="text"
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
                placeholder={isAmharic ? 'ሚና ፈልግ...' : 'Search roles...'}
                className="w-full bg-surface-container/60 border border-outline-variant/80 rounded-md pl-3.5 pr-9 py-2 text-xs font-semibold text-on-surface placeholder:text-slate-400 focus:outline-hidden focus:border-[#1D61E7]"
              />
              <button
                type="button"
                className="absolute right-2.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                <span className="material-symbols-outlined text-[18px]">search</span>
              </button>
            </div>
          </div>

          {/* Roles List */}
          <div className="p-3 space-y-2.5 divide-y-0">
            {filteredRoles.map((role) => {
              const isSelected = role.id === selectedRoleId;
              return (
                <div
                  key={role.id}
                  onClick={() => setSelectedRoleId(role.id)}
                  className={`w-full p-3 rounded-md border transition-all flex items-center justify-between gap-3 cursor-pointer select-none ${
                    isSelected
                      ? 'bg-blue-50/70 dark:bg-blue-950/40 border-[#0B1E48] shadow-xs ring-1 ring-[#0B1E48]/40'
                      : 'bg-surface-container-lowest hover:bg-surface-container/50 border-outline-variant/60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {renderAvatar(role.avatarType, role.avatarBg)}
                    <div className="min-w-0 text-left">
                      <div className="text-xs sm:text-sm font-black text-on-surface leading-tight truncate">
                        {role.titleAm}
                      </div>
                      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-tight truncate">
                        {role.titleEn}
                      </div>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60 text-[11px] font-black shrink-0">
                    {role.userCountText}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Bottom Pagination matching screenshot `< 1 >` */}
          <div className="p-3 border-t border-outline-variant/60 flex items-center justify-center gap-2 mt-auto">
            <button
              type="button"
              disabled
              className="w-7 h-7 rounded-lg border border-outline-variant/80 flex items-center justify-center text-slate-400 opacity-50 cursor-not-allowed text-xs"
            >
              &lt;
            </button>
            <span className="w-7 h-7 rounded-lg bg-[#0B1E48] text-white flex items-center justify-center text-xs font-black shadow-2xs">
              1
            </span>
            <button
              type="button"
              disabled
              className="w-7 h-7 rounded-lg border border-outline-variant/80 flex items-center justify-center text-slate-400 opacity-50 cursor-not-allowed text-xs"
            >
              &gt;
            </button>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: PERMISSION MATRIX (lg:col-span-8) ================= */}
        <div className="lg:col-span-8 bg-surface-container-lowest rounded-lg border border-outline-variant/80 shadow-xs overflow-hidden flex flex-col">
          
          {/* Top Bar: Selected Role & Active Status */}
          <div className="p-3.5 sm:p-4 border-b border-outline-variant/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container/30">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 w-full sm:w-auto">
              <span className="text-xs sm:text-sm font-bold text-on-surface shrink-0">
                {isAmharic ? 'የተመረጠ ሚና:' : 'Selected Role:'}
              </span>

              {/* Desktop/Tablet Selected Role Chip Box */}
              <div className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant rounded-md px-2.5 py-1 shadow-2xs">
                <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center shrink-0">
                  {renderAvatar(selectedRole.avatarType, selectedRole.avatarBg)}
                </div>
                <span className="text-xs font-extrabold text-on-surface">
                  {selectedRole.titleAm} {selectedRole.titleEn}
                </span>
              </div>

              {/* Mobile Quick Role Selector Dropdown */}
              <select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="lg:hidden w-full bg-surface-container-lowest border border-outline-variant rounded-md px-2.5 py-1 text-xs font-bold text-on-surface cursor-pointer focus:outline-hidden focus:border-[#1D61E7]"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.titleAm} {r.titleEn}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {isAmharic ? 'ሁኔታ:' : 'Status:'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 text-xs font-extrabold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{isAmharic ? 'ንቁ (Active)' : 'Active'}</span>
              </span>
            </div>
          </div>

          {/* Info Banner Container */}
          <div className="p-3.5 mx-4 my-3 bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 rounded-md flex items-center gap-2.5 text-blue-900 dark:text-blue-200 text-xs font-semibold">
            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[18px] shrink-0">
              info
            </span>
            <span>
              {isAmharic
                ? 'ከታች በተዘረዘሩት ተግባራት ላይ ለዚህ ሚና የሚፈቀዱትን ወይም የሚከለከሉትን ይምረጡ:'
                : 'Select allowed, view-only, or denied permissions for this role on the activities below:'}
            </span>
          </div>

          {/* Permissions Matrix Table */}
          <div className="px-4 pb-4 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[560px]">
              <thead>
                <tr className="border-b border-outline-variant/70 text-xs font-black text-slate-700 dark:text-slate-200">
                  <th className="py-2.5 px-2 w-12 text-center">{isAmharic ? 'ተ.ቁ' : 'No.'}</th>
                  <th className="py-2.5 px-3">{isAmharic ? 'ተግባር / ስራ' : 'Activity / Task'}</th>
                  <th className="py-2.5 px-3 w-28 text-center text-emerald-600 dark:text-emerald-400 font-extrabold">
                    {isAmharic ? 'ፈቃድ (Allow)' : 'Allow'}
                  </th>
                  <th className="py-2.5 px-3 w-32 text-center text-amber-600 dark:text-amber-400 font-extrabold">
                    {isAmharic ? 'ማየት ብቻ (View Only)' : 'View Only'}
                  </th>
                  <th className="py-2.5 px-3 w-28 text-center text-rose-600 dark:text-rose-400 font-extrabold">
                    {isAmharic ? 'ክልከል (Deny)' : 'Deny'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40 text-xs font-semibold">
                {DEFAULT_TASKS.map((task) => {
                  const state = currentRolePerms[task.id] || 'deny';

                  return (
                    <tr key={task.id} className="hover:bg-surface-container/30 transition-colors">
                      {/* Icon & Index Column */}
                      <td className="py-2 px-2 text-center text-slate-500">
                        <span className="material-symbols-outlined text-[16px] text-slate-600 dark:text-slate-400 align-middle">
                          {task.icon}
                        </span>
                      </td>

                      {/* Task Name */}
                      <td className="py-2 px-3 text-on-surface">
                        <span className="font-extrabold">{task.titleAm}</span>{' '}
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                          {task.titleEn}
                        </span>
                      </td>

                      {/* 1. Allow Toggle Column */}
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleSetPermission(task.id, 'allow')}
                          className={`w-10 h-5 rounded-full transition-all inline-flex items-center p-0.5 cursor-pointer ${
                            state === 'allow'
                              ? 'bg-emerald-500 justify-end shadow-xs'
                              : 'bg-slate-200 dark:bg-slate-700 justify-start opacity-40 hover:opacity-75'
                          }`}
                          title="Allow"
                        >
                          <span className="w-4 h-4 rounded-full bg-white shadow-xs block transition-transform" />
                        </button>
                      </td>

                      {/* 2. View Only Toggle Column */}
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleSetPermission(task.id, 'view_only')}
                          className={`w-10 h-5 rounded-full transition-all inline-flex items-center p-0.5 cursor-pointer ${
                            state === 'view_only'
                              ? 'bg-amber-500 justify-end shadow-xs'
                              : 'bg-slate-200 dark:bg-slate-700 justify-start opacity-40 hover:opacity-75'
                          }`}
                          title="View Only"
                        >
                          <span className="w-4 h-4 rounded-full bg-white shadow-xs block transition-transform" />
                        </button>
                      </td>

                      {/* 3. Deny Toggle Column */}
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleSetPermission(task.id, 'deny')}
                          className={`w-10 h-5 rounded-full transition-all inline-flex items-center p-0.5 cursor-pointer ${
                            state === 'deny'
                              ? 'bg-rose-500 justify-end shadow-xs'
                              : 'bg-slate-200 dark:bg-slate-700 justify-start opacity-40 hover:opacity-75'
                          }`}
                          title="Deny"
                        >
                          <span className="w-4 h-4 rounded-full bg-white shadow-xs block transition-transform" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom Legend matching image */}
          <div className="px-5 py-3 border-t border-outline-variant/60 bg-surface-container/20 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="space-y-1">
              <div className="font-extrabold text-xs text-on-surface">
                {isAmharic ? 'መግለጫ (Legend)' : 'Legend'}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="font-bold text-emerald-700 dark:text-emerald-300">
                    {isAmharic ? 'ፈቃድ (Allow)' : 'Allow'}:
                  </span>
                  <span>{isAmharic ? 'ሙሉ ፈቃድ አለው' : 'Full permission granted'}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="font-bold text-amber-700 dark:text-amber-300">
                    {isAmharic ? 'ማየት ብቻ (View Only)' : 'View Only'}:
                  </span>
                  <span>{isAmharic ? 'ማየት ብቻ ይችላል' : 'Can view records only'}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                  <span className="font-bold text-rose-700 dark:text-rose-300">
                    {isAmharic ? 'ክልከል (Deny)' : 'Deny'}:
                  </span>
                  <span>{isAmharic ? 'ሙሉ ክልክል አለበት' : 'Action completely prohibited'}</span>
                </div>
              </div>
            </div>

            {onOpenUsersTable && (
              <button
                type="button"
                onClick={onOpenUsersTable}
                className="text-xs font-bold text-[#1D61E7] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">manage_accounts</span>
                <span>{isAmharic ? 'የተጠቃሚዎች አካውንት ዝርዝር ክፈት' : 'Open User Accounts List'}</span>
              </button>
            )}
          </div>

          {/* Action Buttons Footer matching image */}
          <div className="p-3.5 sm:p-4 border-t border-outline-variant/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 bg-surface-container/40">
            <button
              type="button"
              onClick={handleResetPermissions}
              className="w-full sm:w-auto px-4 py-2.5 bg-slate-500 hover:bg-slate-600 active:scale-95 text-white font-extrabold text-xs rounded-md transition-all shadow-xs cursor-pointer text-center"
            >
              {isAmharic ? 'ዳግም አስጀምር (Reset)' : 'Reset'}
            </button>

            <button
              type="button"
              onClick={handleSavePermissions}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#0B1E48] hover:bg-[#0D2B5C] active:scale-95 text-white font-black text-xs rounded-md transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">save</span>
              <span>{isAmharic ? 'ፈቃድ አስቀምጥ (Save Permissions)' : 'Save Permissions'}</span>
            </button>
          </div>

        </div>

      </div>

      {/* ================= CLERK DASHBOARD & FEATURE VISIBILITY GOVERNANCE ================= */}
      <div className="bg-surface-container-lowest p-4 sm:p-5 rounded-lg border border-blue-200/80 dark:border-blue-900/50 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-blue-500/10 text-blue-600 border border-blue-500/20 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">badge</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-black text-on-surface uppercase tracking-wider">
                  {isAmharic ? 'የፀሀፊ ዳሽቦርድና የፈቃድ መረጃ ታይነት ቁጥጥር' : 'Clerk Dashboard & Feature Visibility Governance'}
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px] font-black">
                  {isAmharic ? 'የፀሀፊ ሚና (Clerk RBAC)' : 'Clerk Role RBAC'}
                </span>
              </div>
              <p className="text-[10px] text-secondary font-medium">
                {isAmharic
                  ? 'በነባሪነት የተደበቁትን የፈቃድ ሁኔታዎችና አቋራጮች ለፀሀፊ ሚና ለማብራት ወይም ለማጥፋት'
                  : 'Control visibility of permit status and action shortcuts on the Clerk dashboard (hidden by default)'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Toggle 1: Permit Status */}
          <div className="p-3.5 rounded-md border border-outline-variant/80 bg-surface-container/40 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="font-extrabold text-xs text-on-surface">
                {isAmharic ? 'የፈቃድ ሁኔታና ስታቲስቲክስ' : 'Show Permit Status & Metrics'}
              </div>
              <div className="text-[10px] text-secondary">
                {isAmharic ? 'በፀሀፊ ዳሽቦርድ ላይ የፈቃድ ማጠቃለያ ካርዶች እንዲታዩ ይፈቅዳል' : 'Display permit metrics cards on clerk dashboard'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleToggleClerk('showClerkPermitStatus')}
              className={`w-11 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                currentSettings.showClerkPermitStatus ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                  currentSettings.showClerkPermitStatus ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Toggle 2: View Submissions Quick Action */}
          <div className="p-3.5 rounded-md border border-outline-variant/80 bg-surface-container/40 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="font-extrabold text-xs text-on-surface">
                {isAmharic ? '"የቀረቡ ማመልከቻዎች" አቋራጭ' : "Show 'View Submissions' Action"}
              </div>
              <div className="text-[10px] text-secondary">
                {isAmharic ? 'በፀሀፊ አቋራጭ ላይ የቀረቡ ማመልከቻዎች ቁልፍ እንዲታይ ይፈቅዳል' : "Allow 'View Submissions' in clerk quick actions"}
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleToggleClerk('showClerkSubmissionsAction')}
              className={`w-11 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                currentSettings.showClerkSubmissionsAction ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                  currentSettings.showClerkSubmissionsAction ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Toggle 3: Approved Vehicles Quick Action */}
          <div className="p-3.5 rounded-md border border-outline-variant/80 bg-surface-container/40 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="font-extrabold text-xs text-on-surface">
                {isAmharic ? '"የፀደቁ ተሽከርካሪዎች" አቋራጭ' : "Show 'Approved Vehicles' Action"}
              </div>
              <div className="text-[10px] text-secondary">
                {isAmharic ? 'በፀሀፊ አቋራጭ ላይ የፀደቁ ተሽከርካሪዎች መዝገብ እንዲታይ ይፈቅዳል' : "Allow 'Approved Vehicles' in clerk quick actions"}
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleToggleClerk('showClerkApprovedVehiclesAction')}
              className={`w-11 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                currentSettings.showClerkApprovedVehiclesAction ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                  currentSettings.showClerkApprovedVehiclesAction ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* ================= MODAL: ADD NEW ROLE ================= */}
      {showNewRoleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-lg border border-outline-variant shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <h3 className="font-black text-base text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-[#1D61E7] text-[22px]">add_moderator</span>
                <span>{isAmharic ? 'አዲስ የስራ ሚና መፍጠሪያ' : 'Create New System Role'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowNewRoleModal(false)}
                className="text-slate-400 hover:text-on-surface p-1 rounded-lg"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateNewRole} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  {isAmharic ? 'የሚና ስም (በአማርኛ)' : 'Role Title (Amharic)'}
                </label>
                <input
                  type="text"
                  required
                  value={newRoleTitleAm}
                  onChange={(e) => setNewRoleTitleAm(e.target.value)}
                  placeholder="ምሳሌ፡ ኦዲተር ወይም ሱፐርቫይዘር"
                  className="w-full bg-surface-container border border-outline-variant rounded-md px-3.5 py-2 text-xs font-semibold focus:outline-hidden focus:border-[#1D61E7]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  {isAmharic ? 'የሚና ስም (በእንግሊዝኛ)' : 'Role Title (English)'}
                </label>
                <input
                  type="text"
                  value={newRoleTitleEn}
                  onChange={(e) => setNewRoleTitleEn(e.target.value)}
                  placeholder="e.g. Auditor / Supervisor"
                  className="w-full bg-surface-container border border-outline-variant rounded-md px-3.5 py-2 text-xs font-semibold focus:outline-hidden focus:border-[#1D61E7]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  {isAmharic ? 'የመጀመሪያ ፈቃዶች አብነት' : 'Initial Permissions Template'}
                </label>
                <select
                  value={newRoleTemplate}
                  onChange={(e) => setNewRoleTemplate(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant rounded-md px-3 py-2 text-xs font-bold focus:outline-hidden focus:border-[#1D61E7]"
                >
                  <option value="role-secretary">{isAmharic ? 'እንደ ጸሃፊ (Secretary Template)' : 'Secretary Template'}</option>
                  <option value="role-officer">{isAmharic ? 'እንደ ኦፊሰር (Officer Template)' : 'Officer Template'}</option>
                  <option value="role-manager">{isAmharic ? 'እንደ ስራ አስኪያጅ (Manager Template)' : 'Manager Template'}</option>
                  <option value="role-it">{isAmharic ? 'እንደ አይቲ ባለሙያ (IT Specialist Template)' : 'IT Specialist Template'}</option>
                  <option value="role-superadmin">{isAmharic ? 'እንደ ሱፐር አድሚን (Full Super Admin)' : 'Super Admin Template'}</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewRoleModal(false)}
                  className="px-4 py-2 bg-surface-container hover:bg-surface-container-high rounded-md text-xs font-bold text-on-surface"
                >
                  {isAmharic ? 'ሰርዝ' : 'Cancel'}
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1D61E7] hover:bg-blue-700 text-white rounded-md text-xs font-extrabold shadow-md active:scale-95"
                >
                  {isAmharic ? 'ሚናውን ፍጠር' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
