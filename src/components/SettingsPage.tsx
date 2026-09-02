import React, { useState, useEffect } from 'react';
import { Language, UserRole, APP_LOGO } from '../types';
import { changeOnlineUserPassword, SYSTEM_ROLE_CREDENTIALS } from '../services/authService';
import { updateSystemUserInDb, saveSettingsToDb, subscribeSettings } from '../services/dbService';

interface SettingsPageProps {
  userBadgeId: string;
  userRole: UserRole;
  currentLang: Language;
  currentTheme?: 'light' | 'dark';
  onToggleLang?: () => void;
  onToggleTheme?: () => void;
  onLogoutClick?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  userBadgeId,
  userRole,
  currentLang,
  currentTheme = 'light',
  onToggleLang,
  onToggleTheme,
  onLogoutClick,
}) => {
  const isAmharic = currentLang === 'am';

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isSavingPref, setIsSavingPref] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Preference toggles state
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [calendarSystem, setCalendarSystem] = useState<'ethiopian' | 'gregorian'>('ethiopian');
  const [savedPreferenceMsg, setSavedPreferenceMsg] = useState(false);

  // Sync settings with DB
  useEffect(() => {
    const unsub = subscribeSettings((data) => {
      if (data && data.calendarSystem) {
        setCalendarSystem(data.calendarSystem);
      }
    });
    return () => unsub();
  }, []);

  // User credentials details
  const creds = SYSTEM_ROLE_CREDENTIALS[userRole] || SYSTEM_ROLE_CREDENTIALS.clerk;
  const displayName = creds.fullName;
  const displayEmail = creds.email;

  // Password strength helper
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { label: '', score: 0, color: 'bg-slate-200' };
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 10) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 2) {
      return {
        label: isAmharic ? 'ደካማ (Weak)' : 'Weak',
        score: 33,
        color: 'bg-rose-500',
        textColor: 'text-rose-600 dark:text-rose-400',
      };
    }
    if (score <= 4) {
      return {
        label: isAmharic ? 'መካከለኛ (Medium)' : 'Medium',
        score: 66,
        color: 'bg-amber-500',
        textColor: 'text-amber-600 dark:text-amber-400',
      };
    }
    return {
      label: isAmharic ? 'በጣም ጠንካራ (Strong)' : 'Strong',
      score: 100,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600 dark:text-emerald-400',
    };
  };

  const strength = getPasswordStrength(newPassword);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!newPassword || newPassword.length < 6) {
      setFeedback({
        type: 'error',
        message: isAmharic
          ? 'አዲሱ የይለፍ ቃል ቢያንስ 6 ፊደላት ወይም ቁጥሮች መሆን አለበት!'
          : 'New password must be at least 6 characters long!',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setFeedback({
        type: 'error',
        message: isAmharic
          ? 'አዲሱ የይለፍ ቃል እና ማረጋገጫው አይመሳሰሉም!'
          : 'New password and confirmation password do not match!',
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await changeOnlineUserPassword(
        userRole,
        userBadgeId || creds.badgeId,
        currentPassword,
        newPassword
      );

      setIsLoading(false);
      if (result.success) {
        setFeedback({
          type: 'success',
          message: isAmharic
            ? 'የይለፍ ቃልዎ በተሳካ ሁኔታ ተቀይሯል! ለቀጣይ መግቢያ አዲሱን የይለፍ ቃል ይጠቀሙ።'
            : 'Password changed successfully! Use your new password for your next login.',
        });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setFeedback({
          type: 'error',
          message: result.error || (isAmharic ? 'የይለፍ ቃል መቀየር አልተሳካም!' : 'Failed to change password!'),
        });
      }
    } catch (err: any) {
      setIsLoading(false);
      setFeedback({
        type: 'error',
        message: err.message || (isAmharic ? 'የይለፍ ቃል መቀየር አልተሳካም!' : 'An error occurred while updating password.'),
      });
    }
  };

  const handleSavePreferences = async () => {
    setIsSavingPref(true);
    try {
      if (userBadgeId) {
        await updateSystemUserInDb(userBadgeId, {
          preferences: {
            soundAlerts,
            calendarSystem,
            language: currentLang,
            theme: currentTheme,
          },
        } as any);
      }
      await saveSettingsToDb({
        calendarSystem,
      } as any);

      setSavedPreferenceMsg(true);
      setTimeout(() => setSavedPreferenceMsg(false), 3000);
    } catch (err) {
      console.warn('[SettingsPage] Error saving settings to DB:', err);
    } finally {
      setIsSavingPref(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      
      {/* Top Header Card */}
      <div className="bg-[#0B1E48] text-white rounded-xl p-5 sm:p-6 shadow-md border-b-4 border-yellow-500 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-yellow-400 shrink-0 shadow-xs">
            <span className="material-symbols-outlined text-[28px]">settings</span>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-extrabold text-yellow-400 uppercase tracking-wider bg-yellow-500/20 px-2 py-0.5 rounded">
                {isAmharic ? 'የስርዓት ቅንብሮች' : 'System Settings'}
              </span>
              <span className="text-white/40 text-xs">•</span>
              <span className="text-white/80 font-mono text-[11px] font-bold">
                {userBadgeId}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
              {isAmharic ? 'የመለያ እና የስርዓት ቅንብሮች' : 'Account & System Settings'}
            </h1>
            <p className="text-xs text-yellow-200/90 font-medium mt-0.5">
              {isAmharic
                ? 'የይለፍ ቃል ለውጥ፣ የተጠቃሚ መገለጫ እና የስርዓት ምርጫዎችን ያስተዳድሩ'
                : 'Manage password credentials, profile details, and system preferences'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <span
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-xs ${
              userRole === 'superadmin'
                ? 'bg-purple-500/90 text-white border border-purple-400/50'
                : userRole === 'admin'
                ? 'bg-blue-500/90 text-white border border-blue-400/50'
                : userRole === 'officer'
                ? 'bg-amber-500/90 text-white border border-amber-400/50'
                : 'bg-emerald-500/90 text-white border border-emerald-400/50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
            {userRole === 'superadmin'
              ? 'Super Admin'
              : userRole === 'admin'
              ? 'Manager / Admin'
              : userRole === 'clerk'
              ? 'Secretary / Clerk'
              : 'Field Officer'}
          </span>
        </div>
      </div>

        {/* Grid: Left Column (Profile & Preferences) & Right Column (Password Change) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Left Column (5 Cols): Profile Info & App Preferences */}
          <div className="md:col-span-5 space-y-6">
            
            {/* User Profile Card */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-3 border-b border-outline-variant pb-3">
                <span className="material-symbols-outlined text-[#0B1E48] dark:text-yellow-400 text-[22px]">account_circle</span>
                <h2 className="text-sm font-black text-on-surface">
                  {isAmharic ? 'የተጠቃሚ መገለጫ' : 'User Profile Details'}
                </h2>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-yellow-500 flex items-center justify-center text-xl font-black text-[#0B1E48] dark:text-yellow-400 shrink-0 overflow-hidden shadow-xs">
                  <img src={APP_LOGO} alt="User Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-extrabold text-sm text-on-surface truncate">{displayName}</h3>
                  <p className="font-mono text-xs font-bold text-[#0B1E48] dark:text-yellow-400 bg-surface-container px-2 py-0.5 rounded inline-block mt-0.5">
                    {userBadgeId || creds.badgeId}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>{isAmharic ? 'ንቁ መለያ (Active Session)' : 'Active Session'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs border-t border-outline-variant/60 pt-3">
                <div className="flex justify-between items-center py-1">
                  <span className="text-outline">{isAmharic ? 'ኢሜይል' : 'Email Address'}:</span>
                  <span className="font-bold text-on-surface truncate max-w-[180px]">{displayEmail}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-outline">{isAmharic ? 'ክፍለ ከተማ' : 'Assigned Sub-City'}:</span>
                  <span className="font-bold text-on-surface">{isAmharic ? 'በላይ ዘለቀ ክፍለ ከተማ' : 'Belay Zeleke Sub-City'}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-outline">{isAmharic ? 'የስራ ድርሻ' : 'Role Access'}:</span>
                  <span className="font-bold uppercase tracking-wider text-on-surface">{userRole}</span>
                </div>
              </div>
            </div>

            {/* Application Preferences Card */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-outline-variant pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[#0B1E48] dark:text-yellow-400 text-[22px]">tune</span>
                  <h2 className="text-sm font-black text-on-surface">
                    {isAmharic ? 'የስርዓት ምርጫዎች' : 'System Preferences'}
                  </h2>
                </div>
              </div>

              <div className="space-y-3.5">
                {/* Language Switch */}
                {onToggleLang && (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-extrabold text-on-surface block">
                        {isAmharic ? 'ቋንቋ (System Language)' : 'System Language'}
                      </span>
                      <span className="text-[11px] text-outline">
                        {currentLang === 'am' ? 'አማርኛ (Amharic)' : 'English (US)'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={onToggleLang}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-[16px]">translate</span>
                      <span>{currentLang === 'am' ? 'Switch to English' : 'ወደ አማርኛ ቀይር'}</span>
                    </button>
                  </div>
                )}

                {/* Dark Mode / Light Mode Switch */}
                {onToggleTheme && (
                  <div className="flex items-center justify-between border-t border-outline-variant/60 pt-3">
                    <div>
                      <span className="text-xs font-extrabold text-on-surface block">
                        {isAmharic ? 'የገጽታ ቀለም (Theme)' : 'Theme Mode'}
                      </span>
                      <span className="text-[11px] text-outline">
                        {currentTheme === 'dark' ? (isAmharic ? 'ጨለማ ሁነታ (Dark)' : 'Dark Mode') : (isAmharic ? 'ብሩህ ሁነታ (Light)' : 'Light Mode')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={onToggleTheme}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {currentTheme === 'dark' ? 'light_mode' : 'dark_mode'}
                      </span>
                      <span>{currentTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                    </button>
                  </div>
                )}

                {/* Calendar System */}
                <div className="flex items-center justify-between border-t border-outline-variant/60 pt-3">
                  <div>
                    <span className="text-xs font-extrabold text-on-surface block">
                      {isAmharic ? 'የቀን መቁጠሪያ' : 'Calendar Format'}
                    </span>
                    <span className="text-[11px] text-outline">
                      {calendarSystem === 'ethiopian'
                        ? (isAmharic ? 'የኢትዮጵያ ዘመን አቆጣጠር' : 'Ethiopian Calendar')
                        : 'Gregorian Calendar'}
                    </span>
                  </div>
                  <select
                    value={calendarSystem}
                    onChange={(e) => setCalendarSystem(e.target.value as any)}
                    className="bg-surface-container border border-outline-variant rounded-md px-2.5 py-1 text-xs font-bold text-on-surface cursor-pointer"
                  >
                    <option value="ethiopian">{isAmharic ? 'የኢትዮጵያ' : 'Ethiopian'}</option>
                    <option value="gregorian">{isAmharic ? 'ፈረንጅ (GC)' : 'Gregorian'}</option>
                  </select>
                </div>

                {/* Notification Audio */}
                <div className="flex items-center justify-between border-t border-outline-variant/60 pt-3">
                  <div>
                    <span className="text-xs font-extrabold text-on-surface block">
                      {isAmharic ? 'የድምፅ ማስጠንቀቂያ' : 'Sound Feedback'}
                    </span>
                    <span className="text-[11px] text-outline">
                      {isAmharic ? 'ለስካን እና ለምዝገባ ድምፅ' : 'QR Scan & Action Beeps'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSoundAlerts(!soundAlerts)}
                    className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                      soundAlerts ? 'bg-[#0B1E48] dark:bg-yellow-500' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        soundAlerts ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    ></div>
                  </button>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSavePreferences}
                    disabled={isSavingPref}
                    className="w-full py-2 bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant rounded-md text-xs font-bold text-on-surface transition-all cursor-pointer shadow-2xs disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isSavingPref ? (
                      <>
                        <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                        <span>{isAmharic ? 'በማስቀመጥ ላይ...' : 'Saving...'}</span>
                      </>
                    ) : (
                      <span>{isAmharic ? 'ምርጫዎችን አጽድቅ' : 'Save Preferences'}</span>
                    )}
                  </button>
                  {savedPreferenceMsg && (
                    <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 text-center mt-1.5 animate-in fade-in">
                      {isAmharic ? 'ምርጫዎችዎ ተቀምጠዋል!' : 'Preferences saved!'}
                    </p>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Right Column (7 Cols): Password Changing Setting (Core Requirement) */}
          <div className="md:col-span-7 space-y-6">
            
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 sm:p-6 shadow-xs space-y-5">
              
              <div className="border-b border-outline-variant pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 dark:bg-amber-400/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[22px]">lock_reset</span>
                  </div>
                  <div>
                    <h2 className="text-base font-black text-on-surface">
                      {isAmharic ? 'የይለፍ ቃል መቀየሪያ' : 'Change Password'}
                    </h2>
                    <p className="text-xs text-outline mt-0.5">
                      {isAmharic
                        ? 'የመለያዎን ደህንነት ለመጠበቅ ጠንካራ የይለፍ ቃል ይምረጡ'
                        : 'Update your login password to ensure security of your role account'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Feedback Alert */}
              {feedback && (
                <div
                  className={`p-3.5 rounded-lg text-xs font-bold border flex items-start gap-2.5 animate-in fade-in ${
                    feedback.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px] shrink-0">
                    {feedback.type === 'success' ? 'check_circle' : 'error'}
                  </span>
                  <span className="pt-0.5">{feedback.message}</span>
                </div>
              )}

              {/* Password Change Form */}
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                
                {/* 1. Current Password */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-on-surface">
                    {isAmharic ? 'አሁን ያለው የይለፍ ቃል' : 'Current Password'}
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPass ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder={isAmharic ? 'የአሁኑን የይለፍ ቃል ያስገቡ' : 'Enter current password'}
                      className="w-full bg-surface-container border border-outline-variant rounded-lg px-3.5 py-2.5 text-xs text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-[#0B1E48] dark:focus:ring-yellow-400 transition-all pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showCurrentPass ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* 2. New Password */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-on-surface">
                    {isAmharic ? 'አዲስ የይለፍ ቃል' : 'New Password'}
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={isAmharic ? 'አዲስ ጠንካራ የይለፍ ቃል ያስገቡ' : 'Enter new strong password'}
                      className="w-full bg-surface-container border border-outline-variant rounded-lg px-3.5 py-2.5 text-xs text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-[#0B1E48] dark:focus:ring-yellow-400 transition-all pr-10"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showNewPass ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {newPassword && (
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-outline">{isAmharic ? 'የይለፍ ቃል ጥንካሬ:' : 'Password Strength:'}</span>
                        <span className={`font-black ${strength.textColor}`}>{strength.label}</span>
                      </div>
                      <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                        <div
                          className={`h-full ${strength.color} transition-all duration-300`}
                          style={{ width: `${strength.score}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Confirm New Password */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-on-surface">
                    {isAmharic ? 'አዲሱን የይለፍ ቃል ያረጋግጡ' : 'Confirm New Password'}
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPass ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={isAmharic ? 'አዲሱን የይለፍ ቃል በድጋሚ ያስገቡ' : 'Re-enter new password'}
                      className="w-full bg-surface-container border border-outline-variant rounded-lg px-3.5 py-2.5 text-xs text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-[#0B1E48] dark:focus:ring-yellow-400 transition-all pr-10"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showConfirmPass ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>

                  {confirmPassword && newPassword && (
                    <div className="flex items-center gap-1.5 text-[11px] pt-0.5">
                      {confirmPassword === newPassword ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px]">check_circle</span>
                          {isAmharic ? 'የይለፍ ቃሎቹ ይጣጣማሉ' : 'Passwords match'}
                        </span>
                      ) : (
                        <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px]">cancel</span>
                          {isAmharic ? 'የይለፍ ቃሎቹ አይመሳሰሉም' : 'Passwords do not match'}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Password Requirements Guide */}
                <div className="bg-surface-container p-3 rounded-lg border border-outline-variant/60 text-[11px] space-y-1 text-outline">
                  <span className="font-bold text-on-surface block">
                    {isAmharic ? 'የይለፍ ቃል መመሪያዎች:' : 'Password Requirements:'}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[10px]">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] text-yellow-500">check</span>
                      {isAmharic ? 'ቢያንስ 6 ፊደላት' : 'Min 6 characters'}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] text-yellow-500">check</span>
                      {isAmharic ? 'ትላልቅና ትናንሽ ፊደላት' : 'Upper & lowercase'}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] text-yellow-500">check</span>
                      {isAmharic ? 'ቁጥሮች (0-9)' : 'Numbers (0-9)'}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] text-yellow-500">check</span>
                      {isAmharic ? 'ልዩ ምልክቶች (@, #, $)' : 'Symbols (!, @, #)'}
                    </span>
                  </div>
                </div>

                {/* Submit Action Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[#0B1E48] hover:bg-[#112D6C] text-white font-extrabold text-xs py-3 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-98 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                    ) : (
                      <span className="material-symbols-outlined text-[18px]">lock_reset</span>
                    )}
                    <span>
                      {isLoading
                        ? (isAmharic ? 'በመቀየር ላይ...' : 'Updating...')
                        : (isAmharic ? 'የይለፍ ቃል ቀይር' : 'Update Password')}
                    </span>
                  </button>
                </div>

              </form>

            </div>

            {/* Quick Logout Card (Using non-red theme) */}
            {onLogoutClick && (
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-on-surface block">
                    {isAmharic ? 'ከሲስተም መውጣት' : 'System Sign Out'}
                  </span>
                  <span className="text-[11px] text-outline">
                    {isAmharic ? 'የአሁኑን ክፍለ ጊዜ ያጠናቅቁ' : 'End current working session'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onLogoutClick}
                  className="px-4 py-2 rounded-lg bg-[#132A5E] hover:bg-[#1A387C] text-white text-xs font-black border border-[#2A4E9B] shadow-2xs transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px] text-amber-400">logout</span>
                  <span>{isAmharic ? 'ውጣ' : 'Logout'}</span>
                </button>
              </div>
            )}

          </div>

        </div>

    </div>
  );
};
