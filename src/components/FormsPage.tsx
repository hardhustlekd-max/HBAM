import React from 'react';
import {
  Language,
  UserRole,
  MotorcycleRegistration,
  OfficerAssignment,
} from '../types';
import { MultiStepRegistrationForm } from './MultiStepRegistrationForm';
import { getPermissionState } from '../services/dbService';

interface FormsPageProps {
  lang: Language;
  userRole: UserRole;
  userBadgeId: string;
  registrations: MotorcycleRegistration[];
  officers: OfficerAssignment[];
  onAddRegistration: (
    newReg: MotorcycleRegistration,
    options?: { forceLocalOnly?: boolean }
  ) => Promise<any> | any;
  onViewRegistered?: () => void;
  onAddOfficerAssignment: (assignment: OfficerAssignment) => void;
}

export const FormsPage: React.FC<FormsPageProps> = ({
  lang,
  userRole,
  userBadgeId,
  registrations,
  onAddRegistration,
  onViewRegistered,
}) => {
  const isAmharic = lang === 'am';
  const permission = getPermissionState(userRole, 1);
  const isReadOnly = permission === 'view_only';

  const handleAddWithPermission = async (
    newReg: MotorcycleRegistration,
    options?: { forceLocalOnly?: boolean }
  ) => {
    if (isReadOnly) {
      alert(
        isAmharic
          ? 'ተነባቢ ብቻ ሁነታ ተተግብሯል፡ አዲስ ምዝገባ ማስገባት አይችሉም።'
          : 'Read-only mode active: You are not allowed to submit new registrations.'
      );
      return { success: false, error: 'Read-only mode active' };
    }
    return onAddRegistration(newReg, options);
  };

  return (
    <div className="space-y-6">
      {isReadOnly && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-700 dark:text-amber-400 text-xs font-bold flex items-center gap-2.5 shadow-2xs">
          <span className="material-symbols-outlined text-[18px] animate-pulse">warning</span>
          <span>
            {isAmharic
              ? 'ተነባቢ ብቻ ሁነታ ተተግብሯል፡ በእርስዎ ሚና ፈቃዶች መሰረት ማስተካከል እና አዲስ ምዝገባ ማስገባት አይቻልም።'
              : 'Read-Only Mode Active: Form editing and submissions are disabled based on your role permissions.'}
          </span>
        </div>
      )}

      {/* Main Registration Form Body */}
      <div className={isReadOnly ? 'pointer-events-none opacity-80 select-none' : ''}>
        <MultiStepRegistrationForm
          lang={lang}
          registrations={registrations}
          onAddRegistration={handleAddWithPermission}
          onViewRegistered={onViewRegistered}
          userBadgeId={userBadgeId}
        />
      </div>
    </div>
  );
};

