import React, { useState } from 'react';
import { motion } from 'motion/react';
import { formatEthiopianDate } from '../utils/ethiopianCalendar';
import { updateRegistrationInDb, deleteRegistrationFromDb, isTaskAllowed, getPermissionState } from '../services/dbService';
import {
  Language,
  UserRole,
  MotorcycleRegistration,
  OfficerAssignment,
  VerificationLog,
} from '../types';
import { QRCodeCard } from './QRCodeCard';
import { A4PermitPaper } from './A4PermitPaper';
import { OfficerVerificationHistory } from './OfficerVerificationHistory';
import { VehicleQRSticker } from './VehicleQRSticker';
import { ZoomableDocumentContainer } from './ZoomableDocumentContainer';
import { SmartImage } from './SmartImage';
import { DataField, SelectField } from './ui/StreamlinedUI';
import { Icon } from './ui/Icon';
import {
  FullscreenDocumentCarouselModal,
  buildRegistrationDocumentList,
  DocumentViewerItem,
} from './FullscreenDocumentCarouselModal';

interface TablesPageProps {
  lang: Language;
  userRole: UserRole;
  userBadgeId?: string;
  registrations: MotorcycleRegistration[];
  officers: OfficerAssignment[];
  verificationLogs?: VerificationLog[];
  onApproveRegistration: (id: string) => void;
  onRejectRegistration: (id: string, reason: string) => void;
  onAddVerificationLog?: (log: VerificationLog) => void;
  initialTableTab?: 'approved' | 'pending' | 'expired';
}

export const TablesPage: React.FC<TablesPageProps> = ({
  lang,
  userRole,
  userBadgeId,
  registrations,
  officers,
  verificationLogs = [],
  onApproveRegistration,
  onRejectRegistration,
  onAddVerificationLog,
  initialTableTab,
}) => {
  const isAmharic = lang === 'am';

  const renderStatusBadge = (status?: string, alwaysShowText: boolean = false) => {
    const textClass = alwaysShowText ? 'inline' : 'hidden sm:inline';
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-2xs" title={isAmharic ? 'የተፈቀደ' : 'Approved'}>
            <span className="material-symbols-outlined text-[13px] shrink-0">check_circle</span>
            <span className={textClass}>{isAmharic ? 'የተፈቀደ' : 'Approved'}</span>
          </span>
        );
      case 'printed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-800 shadow-2xs" title={isAmharic ? 'የታተመ' : 'Printed'}>
            <span className="material-symbols-outlined text-[13px] shrink-0">print</span>
            <span className={textClass}>{isAmharic ? 'የታተመ' : 'Printed'}</span>
          </span>
        );
      case 'ordered_print':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 shadow-2xs" title={isAmharic ? 'በሕትመት' : 'In Print'}>
            <span className="material-symbols-outlined text-[13px] shrink-0">layers</span>
            <span className={textClass}>{isAmharic ? 'በሕትመት' : 'In Print'}</span>
          </span>
        );
      case 'rejected':
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800 shadow-2xs" title={status === 'expired' ? (isAmharic ? 'ጊዜው ያለፈበት' : 'Expired') : (isAmharic ? 'ውድቅ' : 'Rejected')}>
            <span className="material-symbols-outlined text-[13px] shrink-0">cancel</span>
            <span className={textClass}>{status === 'expired' ? (isAmharic ? 'ጊዜው ያለፈበት' : 'Expired') : (isAmharic ? 'ውድቅ' : 'Rejected')}</span>
          </span>
        );
      case 'pending_approval':
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shadow-2xs" title={isAmharic ? 'የሚጠበቅ' : 'Pending'}>
            <span className="material-symbols-outlined text-[13px] shrink-0">schedule</span>
            <span className={textClass}>{isAmharic ? 'የሚጠበቅ' : 'Pending'}</span>
          </span>
        );
    }
  };

  // If user role is Officer, render the dedicated Verification History & Scanned Vehicles Log
  if (userRole === 'officer') {
    return (
      <OfficerVerificationHistory
        lang={lang}
        userRole={userRole}
        userBadgeId={userBadgeId}
        registrations={registrations}
        verificationLogs={verificationLogs}
        onAddVerificationLog={onAddVerificationLog}
      />
    );
  }

  const canShowRegistration = userRole === 'clerk' || userRole === 'admin';
  const canShowPrint = userRole === 'admin';

  // Helper functions for masking hidden owner details for non-superadmin users
  const getDisplayName = (reg: MotorcycleRegistration) => {
    if (reg.hideFromOtherUsers && userRole !== 'superadmin' && userRole !== 'super_admin') {
      return isAmharic ? '🔒 [የተደበቀ ባለቤት]' : '🔒 [Hidden Owner]';
    }
    return reg.fullName || '—';
  };

  const getDisplayPhone = (reg: MotorcycleRegistration) => {
    if (reg.hideFromOtherUsers && userRole !== 'superadmin' && userRole !== 'super_admin') {
      return '***-***-****';
    }
    return reg.phone || '—';
  };

  // Table status filter tab: 'approved' | 'pending' | 'expired'
  const [activeTableTab, setActiveTableTab] = useState<'approved' | 'pending' | 'expired'>(initialTableTab || 'approved');

  // Secret trigger state for hiding registrations on the main Motorcycle Registry page
  const [showHiddenControls, setShowHiddenControls] = useState(false);

  // Sync state if initialTableTab prop changes
  React.useEffect(() => {
    if (initialTableTab) {
      setActiveTableTab(initialTableTab);
    }
  }, [initialTableTab]);

  // Search & secondary filter states
  const [regSearchQuery, setRegSearchQuery] = useState('');
  const [regCategoryFilter, setRegCategoryFilter] = useState<'all' | 'private' | 'commercial' | 'governmental'>('all');
  const [regSubCityFilter, setRegSubCityFilter] = useState<string>('all');

  // Role-specific scoped registrations (hidden records excluded from totals & tables except for Super Admin)
  const scopedRegistrations = React.useMemo(() => {
    let list = registrations;
    if (userRole !== 'superadmin' && userRole !== 'super_admin') {
      list = list.filter((r) => !r.hideFromOtherUsers);
    }
    if (userRole === 'clerk') {
      const clerkBadge = (userBadgeId || '').trim().toLowerCase();
      return list.filter((r) => {
        const regBy = (r.registeredBy || '').trim().toLowerCase();
        return regBy === clerkBadge || (clerkBadge && regBy.includes(clerkBadge)) || (!r.registeredBy && clerkBadge === 'clerk-001');
      });
    }
    return list;
  }, [registrations, userRole, userBadgeId]);

  const approvedCount = scopedRegistrations.filter(
    (r) => r.status === 'approved' || r.status === 'printed' || r.status === 'ordered_print'
  ).length;

  const pendingCount = scopedRegistrations.filter(
    (r) => r.status === 'pending_approval' || r.status === 'pending'
  ).length;

  const expiredCount = scopedRegistrations.filter(
    (r) => r.status === 'expired' || r.status === 'rejected'
  ).length;

  const filteredRegistrations = scopedRegistrations.filter((r) => {
    // 1. Status Filter
    let matchesStatus = true;
    if (activeTableTab === 'approved') {
      matchesStatus = r.status === 'approved' || r.status === 'printed' || r.status === 'ordered_print';
    } else if (activeTableTab === 'pending') {
      matchesStatus = r.status === 'pending_approval' || r.status === 'pending';
    } else if (activeTableTab === 'expired') {
      matchesStatus = r.status === 'expired' || r.status === 'rejected';
    }

    if (!matchesStatus) return false;

    // 2. Search Query Filter
    if (regSearchQuery.trim()) {
      const q = regSearchQuery.toLowerCase().trim();
      const matchesSearch =
        (r.plateNumber || '').toLowerCase().includes(q) ||
        (r.fullName || '').toLowerCase().includes(q) ||
        (r.phone || '').toLowerCase().includes(q) ||
        (r.chassisNumber || '').toLowerCase().includes(q) ||
        (r.engineNumber || '').toLowerCase().includes(q) ||
        (r.subCity || '').toLowerCase().includes(q) ||
        (r.id || '').toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

    // 3. Category Filter
    if (regCategoryFilter !== 'all') {
      if (r.serviceCategory !== regCategoryFilter) return false;
    }

    // 4. Sub-City Filter
    if (regSubCityFilter !== 'all') {
      if (r.subCity !== regSubCityFilter) return false;
    }

    return true;
  });

  // --- REGISTRATIONS TABLE STATE ---
  const [regPage, setRegPage] = useState(1);
  const [regPageSize, setRegPageSize] = useState(10);

  const [selectedRegForQR, setSelectedRegForQR] = useState<MotorcycleRegistration | null>(null);
  const [selectedRegForA4, setSelectedRegForA4] = useState<MotorcycleRegistration | null>(null);
  const [selectedRegForSticker, setSelectedRegForSticker] = useState<MotorcycleRegistration | null>(null);
  const [selectedRegForDetails, setSelectedRegForDetails] = useState<MotorcycleRegistration | null>(null);
  const [carouselModal, setCarouselModal] = useState<{
    items: DocumentViewerItem[];
    initialIndex: number;
  } | null>(null);

  const openDocumentCarousel = (targetUrl: string, reg: MotorcycleRegistration, fallbackTitle?: string) => {
    if (!targetUrl) return;
    const docs = buildRegistrationDocumentList(reg, lang);
    const foundIdx = docs.findIndex((d) => d.url === targetUrl);
    if (foundIdx >= 0) {
      setCarouselModal({
        items: docs,
        initialIndex: foundIdx,
      });
    } else {
      setCarouselModal({
        items: [{ url: targetUrl, title: fallbackTitle || (isAmharic ? 'ሰነድ' : 'Document') }, ...docs],
        initialIndex: 0,
      });
    }
  };

  // Rejection reason prompt state
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const totalRegs = filteredRegistrations.length;
  const totalRegPages = Math.ceil(totalRegs / regPageSize) || 1;
  const activeRegPage = Math.min(regPage, totalRegPages);
  const regStartIndex = (activeRegPage - 1) * regPageSize;
  const paginatedRegistrations = filteredRegistrations.slice(regStartIndex, regStartIndex + regPageSize);

  const handleConfirmReject = (id: string) => {
    if (!rejectReason.trim()) return;
    onRejectRegistration(id, rejectReason.trim());
    setRejectingId(null);
    setRejectReason('');
  };

  // Mobile collapsed card states
  const [expandedRegs, setExpandedRegs] = useState<Record<string, boolean>>({});

  const toggleRegExpand = (id: string) => {
    setExpandedRegs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-4">
      {/* SINGLE UNIFIED TABLE CONTAINER (PERMIT STATUS BREAKDOWN CONTAINER STYLE) */}
      <div className="bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant dark:border-slate-800 rounded-lg shadow-xs overflow-hidden divide-y divide-outline-variant/60 dark:divide-slate-800">

        {/* CONTAINER HEADER (MATCHING PERMIT STATUS BREAKDOWN CARD HEADER) */}
        <div className="p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 bg-surface-container-lowest dark:bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-[20px]">table_chart</span>
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-on-surface dark:text-white">
                {isAmharic ? 'የሞተር ብስክሌቶች መዝገብ' : 'Motorcycle Registry'}
              </h3>
              <p className="hidden sm:block text-[11px] font-normal text-secondary/80 dark:text-slate-400 mt-0.5">
                {isAmharic
                  ? 'የፀደቁ፣ በመጠባበቅ ላይ ያሉ እና ውድቅ የተደረጉ የተሽከርካሪ መረጃዎች ዝርዝር'
                  : 'Registry and verification records of all motorcycle permits'}
              </p>
            </div>
          </div>

          {showHiddenControls && (userRole === 'superadmin' || userRole === 'super_admin') && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-full text-xs font-black shadow-2xs animate-pulse">
              <span className="material-symbols-outlined text-[16px]">visibility_off</span>
              <span>
                {isAmharic ? 'ጠቅላላ የተደበቁ:' : 'Total Hidden:'}{' '}
                {registrations.filter((r) => r.hideFromOtherUsers).length}
              </span>
            </div>
          )}
        </div>

        {/* SUB-FILTER SLIDE BAR (FOR REGISTRATIONS: LIVE SEARCH & STATUS SLIDE PILLS) */}
        <div className="p-2.5 sm:p-3 bg-slate-50/70 dark:bg-slate-900/60 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 border-b border-outline-variant/40 dark:border-slate-800">
          {/* Live Search Input */}
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
              <span className="material-symbols-outlined text-[16px]">search</span>
            </div>
            <input
              type="text"
              value={regSearchQuery}
              onChange={(e) => {
                const val = e.target.value;
                const isSuperUser = userRole === 'superadmin' || userRole === 'super_admin';
                if (isSuperUser && val.toLowerCase().includes('super1212')) {
                  setShowHiddenControls(true);
                  const cleaned = val.replace(/super1212/gi, '').trim();
                  setRegSearchQuery(cleaned);
                } else {
                  setRegSearchQuery(val);
                }
                setRegPage(1);
              }}
              placeholder={isAmharic ? 'በስም፣ ሰሌዳ፣ ስልክ ወይም ቻሲስ ፈልግ...' : 'Search by name, plate, phone, chassis...'}
              className="w-full pl-8 pr-8 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-2xs"
            />
            {regSearchQuery && (
              <button
                type="button"
                onClick={() => setRegSearchQuery('')}
                className="absolute inset-y-0 right-2.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">close</span>
              </button>
            )}
          </div>

          {/* Status Tabs in End-Closed With Icons Style */}
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar pt-1">
              {[
                {
                  id: 'approved' as const,
                  icon: 'verified',
                  label: isAmharic ? 'የፀደቁ' : 'Approved',
                  count: approvedCount,
                  activeIconColor: 'text-emerald-600 dark:text-emerald-400',
                  badgeColor: 'bg-surface-container-highest text-secondary',
                },
                {
                  id: 'pending' as const,
                  icon: 'pending',
                  label: isAmharic ? 'የሚጠበቁ' : 'Pending',
                  count: pendingCount,
                  activeIconColor: 'text-amber-600 dark:text-amber-400',
                  badgeColor:
                    pendingCount > 0
                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                      : 'bg-surface-container-highest text-secondary',
                },
                {
                  id: 'expired' as const,
                  icon: 'event_busy',
                  label: isAmharic ? 'ያለፈበት' : 'Expired',
                  count: expiredCount,
                  activeIconColor: 'text-rose-600 dark:text-rose-400',
                  badgeColor:
                    expiredCount > 0
                      ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                      : 'bg-surface-container-highest text-secondary',
                },
              ].map((tab) => {
                const isActive = activeTableTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTableTab(tab.id);
                      setRegPage(1);
                    }}
                    className={`group relative flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap select-none shrink-0 ${
                      isActive
                        ? 'bg-surface-container-lowest dark:bg-slate-800 text-on-surface dark:text-white font-extrabold border-t border-l border-r border-b border-b-surface-container-lowest dark:border-b-slate-800 border-outline-variant/80 dark:border-slate-700 rounded-t-lg -mb-px z-10'
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
                            ? 'bg-surface-container-high dark:bg-slate-700 text-on-surface dark:text-white'
                            : tab.badgeColor
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Reset filter button if filtered */}
            {(regSearchQuery || regSubCityFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setRegSearchQuery('');
                  setRegSubCityFilter('all');
                  setRegPage(1);
                }}
                className="px-2.5 py-1 rounded-full text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center gap-1 cursor-pointer"
                title={isAmharic ? 'ማጣሪያዎችን አጽዳ' : 'Reset Filters'}
              >
                <span>{isAmharic ? 'አጽዳ' : 'Clear'}</span>
              </button>
            )}
          </div>
        </div>

        {/* --- VIEW 1: REGISTRATIONS TABLE (FILTERED BY STATUS) --- */}
        {(activeTableTab === 'approved' || activeTableTab === 'pending' || activeTableTab === 'expired') && (
          <div className="min-h-[580px] flex flex-col justify-between">
            {/* Desktop Data Table (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider font-extrabold border-b border-slate-200 dark:border-slate-700">
                    <th className="px-4 py-3.5 text-center w-12">#</th>
                    <th className="px-4 py-3.5">{isAmharic ? 'የባለቤት ስም & ፎቶ' : 'Owner Name & Portrait'}</th>
                    <th className="px-4 py-3.5">{isAmharic ? 'የሰሌዳ ቁጥር & አይነት' : 'Plate No & Category'}</th>
                    <th className="px-4 py-3.5">{isAmharic ? 'ሴሪያል / ቻሲስ ቁጥር' : 'Chassis / Engine Serial'}</th>
                    <th className="px-4 py-3.5">{isAmharic ? 'ክፍለ ከተማ & ቀን' : 'Sub-City & Date'}</th>
                    <th className="px-4 py-3.5 text-center">{isAmharic ? 'የፈቃድ ሁኔታ' : 'Permit Status'}</th>
                    <th className="px-4 py-3.5 text-right">{isAmharic ? 'እርምጃዎች' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {registrations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-500 dark:text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                          <span className="material-symbols-outlined text-[36px] text-slate-400 dark:text-slate-600">inbox</span>
                          <span className="font-bold text-sm text-slate-700 dark:text-slate-200">
                            {isAmharic ? 'ምንም የተመዘገቡ መረጃዎች የሉም' : 'No Vehicle Registrations Found'}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {isAmharic
                              ? 'አዲስ የሞተር ብስክሌት መረጃዎች ሲመዘገቡ በዚህ ሰንጠረዥ ውስጥ ይዘረዘራሉ።'
                              : 'Vehicle permit applications will appear in this table once submitted.'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredRegistrations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-slate-500 dark:text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2 py-4">
                          <span className="material-symbols-outlined text-[32px] text-slate-400 dark:text-slate-600">search_off</span>
                          <span className="font-bold text-sm text-slate-700 dark:text-slate-300">
                            {isAmharic ? 'ምንም የሚመሳሰል መዝገብ አልተገኘም' : 'No matching motorcycle records found.'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTableTab('approved');
                            }}
                            className="px-3 py-1.5 bg-yellow-500 text-[#0B1E48] font-extrabold text-xs rounded-md shadow-xs hover:bg-yellow-400 cursor-pointer"
                          >
                            {isAmharic ? 'የፀደቁትን አሳይ' : 'Show Approved Permits'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                      paginatedRegistrations.map((reg, index) => {
                        return (
                          <tr key={reg.id} className="h-16 align-middle hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                            {/* Index Number */}
                            <td className="px-4 py-2.5 align-middle h-16 text-center font-mono font-bold text-slate-400">
                              {regStartIndex + index + 1}
                            </td>

                            {/* Owner Name & Portrait */}
                            <td className="px-4 py-2.5 align-middle h-16">
                              <div className="flex items-center gap-3">
                                <div
                                  onClick={() => setSelectedRegForDetails(reg)}
                                  className="relative w-10 h-10 rounded-md overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-slate-100 dark:bg-slate-800 shadow-xs cursor-pointer group"
                                >
                                  <SmartImage
                                    src={reg.userPortraitPhoto || reg.nationalIdPhoto}
                                    alt={reg.fullName || 'Portrait'}
                                    fallbackIcon="person"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedRegForDetails(reg)}
                                    className="font-black text-sm text-slate-900 dark:text-white hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors text-left truncate max-w-[180px] flex items-center gap-1 cursor-pointer"
                                  >
                                    <span className="truncate">{getDisplayName(reg)}</span>
                                    {reg.hideFromOtherUsers && (userRole === 'superadmin' || userRole === 'super_admin') && (
                                      <span className="px-1 py-0.2 rounded text-[9px] font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 shrink-0">
                                        🔒
                                      </span>
                                    )}
                                  </button>
                                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block truncate">
                                    {getDisplayPhone(reg)}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Plate Number & Category */}
                            <td className="px-4 py-2.5 align-middle h-16">
                              <div className="space-y-1">
                                <span className="font-mono font-black text-xs text-[#0B1E48] dark:text-yellow-400 inline-block">
                                  {reg.plateNumber || '—'}
                                </span>
                                <div>
                                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 inline-block">
                                    {reg.vehicleCategory === 'electric' ? (isAmharic ? 'ኤሌክትሪክ' : 'Electric (EV)') : (isAmharic ? 'ቤንዚን' : 'Gasoline')}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Engine / Chassis Serial */}
                            <td className="px-4 py-2.5 align-middle h-16">
                              <div className="space-y-0.5">
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block truncate max-w-[150px]">
                                  {reg.engineOrSerialNo || '—'}
                                </span>
                                {reg.motorBrand && (
                                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                                    {reg.motorBrand} {reg.motorModel || ''}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Sub-City & Date */}
                            <td className="px-4 py-2.5 align-middle h-16 text-xs text-slate-600 dark:text-slate-300">
                              <div className="space-y-0.5">
                                <span className="font-bold text-slate-900 dark:text-white block">{reg.subCity || '—'}</span>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono block">{reg.registrationDate ? formatEthiopianDate(reg.registrationDate, isAmharic ? 'am' : 'en') : '—'}</span>
                              </div>
                            </td>

                            {/* Permit Status */}
                            <td className="px-4 py-2.5 align-middle h-16 text-center">
                              {renderStatusBadge(reg.status)}
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-2.5 align-middle h-16 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {(userRole === 'admin' || userRole === 'superadmin' || userRole === 'super_admin') && reg.status === 'pending_approval' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => onApproveRegistration(reg.id)}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] rounded-lg shadow-xs transition-colors cursor-pointer"
                                    >
                                      {isAmharic ? 'አፅድቅ' : 'Approve'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setRejectingId(reg.id)}
                                      className="px-2.5 py-1 bg-rose-100 text-rose-800 hover:bg-rose-200 dark:bg-rose-950 dark:text-rose-200 font-extrabold text-[11px] rounded-lg transition-colors cursor-pointer"
                                    >
                                      {isAmharic ? 'ሰርዝ' : 'Reject'}
                                    </button>
                                  </>
                                )}

                                 {isTaskAllowed(userRole, 11) && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (window.confirm(isAmharic ? 'ይህንን ምዝገባ በቋሚነት መሰረዝ ይፈልጋሉ?' : 'Are you sure you want to permanently delete this registration?')) {
                                        await deleteRegistrationFromDb(reg.id);
                                      }
                                    }}
                                    className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-extrabold text-[11px] rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-0.5"
                                    title={isAmharic ? 'ምዝገባውን ሰርዝ' : 'Delete Registration'}
                                  >
                                    <span className="material-symbols-outlined text-[13px]">delete</span>
                                    <span>{isAmharic ? 'አጥፋ' : 'Delete'}</span>
                                  </button>
                                )}

                                {(userRole === 'admin' || userRole === 'superadmin' || userRole === 'super_admin') && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedRegForQR(reg)}
                                    className="px-2.5 py-1 bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-[11px] rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                                    title={isAmharic ? 'ዲጂታል መታወቂያ ካርድ' : 'Digital ID Card'}
                                  >
                                    <span className="material-symbols-outlined text-[15px]">badge</span>
                                    <span className="hidden xl:inline">{isAmharic ? 'መታወቂያ' : 'Digital ID'}</span>
                                  </button>
                                )}

                                {(reg.status === 'approved' || reg.status === 'printed' || reg.status === 'ordered_print') && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedRegForA4(reg)}
                                      className="px-2.5 py-1 bg-[#0B1E48] hover:bg-[#071330] text-yellow-400 font-extrabold text-[11px] rounded-lg transition-all cursor-pointer border border-yellow-500/30 flex items-center gap-1 shadow-2xs"
                                      title={isAmharic ? 'የመንቀሳቀሻ ፍቃድ ወረቀት አትም' : 'Print Movement Permit Document'}
                                    >
                                      <span className="material-symbols-outlined text-[15px]">print</span>
                                      <span className="hidden xl:inline">{isAmharic ? 'ፍቃድ' : 'Permit'}</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => setSelectedRegForSticker(reg)}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                                      title={isAmharic ? 'የሞተር QR ተለጣፊ አትም' : 'Print Vehicle QR Sticker'}
                                    >
                                      <span className="material-symbols-outlined text-[15px]">qr_code_scanner</span>
                                      <span className="hidden xl:inline">{isAmharic ? 'ተለጣፊ' : 'Sticker'}</span>
                                    </button>
                                  </>
                                )}

                                {showHiddenControls && (userRole === 'superadmin' || userRole === 'super_admin') && (() => {
                                  const isSuperUserRegistered = !reg.registeredBy || 
                                    reg.registeredBy.toLowerCase() === 'superadmin' || 
                                    reg.registeredBy.toLowerCase() === 'super_admin' || 
                                    reg.registeredBy.toLowerCase().includes('super');
                                  return (
                                    <button
                                      type="button"
                                      disabled={isSuperUserRegistered}
                                      onClick={async () => {
                                        if (isSuperUserRegistered) return;
                                        const newHide = !reg.hideFromOtherUsers;
                                        await updateRegistrationInDb(reg.id, { hideFromOtherUsers: newHide });
                                      }}
                                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                        isSuperUserRegistered
                                          ? 'opacity-40 cursor-not-allowed text-slate-400 bg-slate-100 dark:bg-slate-800/40'
                                          : reg.hideFromOtherUsers
                                          ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-2xs'
                                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                                      }`}
                                      title={
                                        isSuperUserRegistered
                                          ? (isAmharic ? 'የሱፐር አድሚን ምዝገባ (መደበቅ አይቻልም)' : 'Super Admin Entry (Cannot Hide)')
                                          : reg.hideFromOtherUsers
                                          ? (isAmharic ? 'መረጃውን ለሌሎች ግልፅ አድርግ' : 'Show Owner to Others')
                                          : (isAmharic ? 'መረጃውን ከሌሎች ደብቅ' : 'Hide Owner from Others')
                                      }
                                    >
                                      <span className="material-symbols-outlined text-[17px]">
                                        {reg.hideFromOtherUsers ? 'visibility_off' : 'visibility'}
                                      </span>
                                    </button>
                                  );
                                })()}

                                <button
                                  type="button"
                                  onClick={() => setSelectedRegForDetails(reg)}
                                  className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                                  title={isAmharic ? 'ዝርዝር መረጃ' : 'View Full Details'}
                                >
                                  <span className="material-symbols-outlined text-[18px]">visibility</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards / Collapsed Rows View (< md) */}
              <div className="block md:hidden divide-y divide-slate-200 dark:divide-slate-800">
                {registrations.length === 0 ? (
                  <div className="p-10 text-center text-slate-500 dark:text-slate-400 space-y-1.5">
                    <span className="material-symbols-outlined text-[36px] text-slate-400 dark:text-slate-600 mx-auto block">inbox</span>
                    <p className="font-bold text-xs text-slate-700 dark:text-slate-200">
                      {isAmharic ? 'ምንም የተመዘገቡ መረጃዎች የሉም' : 'No Vehicle Registrations Found'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                      {isAmharic
                        ? 'አዲስ የሞተር ብስክሌት መረጃዎች ሲመዘገቡ እዚህ ይታያሉ።'
                        : 'Vehicle permit applications will appear here once submitted.'}
                    </p>
                  </div>
                ) : filteredRegistrations.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    <span className="material-symbols-outlined text-[32px] text-slate-400 dark:text-slate-600 mx-auto block mb-1">search_off</span>
                    {isAmharic ? 'ምንም የሚመሳሰል መዝገብ አልተገኘም' : 'No matching motorcycle records found.'}
                  </div>
                ) : (
                  paginatedRegistrations.map((reg, index) => {
                    const isExpanded = !!expandedRegs[reg.id];
                    return (
                      <div key={reg.id} className="p-3.5 sm:p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        {/* Collapsed Card Header */}
                        <div
                          className="flex items-center justify-between gap-3 cursor-pointer select-none"
                          onClick={() => toggleRegExpand(reg.id)}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* Driver Portrait */}
                            <div className="w-12 h-14 rounded-md overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-slate-100 dark:bg-slate-800 shadow-2xs">
                              <SmartImage
                                src={reg.userPortraitPhoto || reg.nationalIdPhoto}
                                alt={reg.fullName || 'Portrait'}
                                fallbackIcon="person"
                                className="w-full h-full object-cover"
                              />
                            </div>

                            {/* Details Column */}
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs font-bold text-slate-400">#{regStartIndex + index + 1}</span>
                                <span className="font-black text-sm text-slate-900 dark:text-white truncate block">{getDisplayName(reg)}</span>
                              </div>

                              <div className="flex items-center gap-3 text-xs flex-wrap pt-0.5">
                                <div>
                                  <span className="text-slate-500 dark:text-slate-400 mr-1">{isAmharic ? 'ሰሌዳ፡' : 'Plate:'}</span>
                                  <span className="font-mono font-black text-[#0B1E48] dark:text-yellow-400">{reg.plateNumber || '—'}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 dark:text-slate-400 mr-1">{isAmharic ? 'አይነት፡' : 'Type:'}</span>
                                  <span className="font-bold text-slate-700 dark:text-slate-300">
                                    {reg.vehicleCategory === 'electric' ? (isAmharic ? 'ኤሌክትሪክ' : 'Electric') : (isAmharic ? 'ቤንዚን' : 'Gasoline')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Right Side Expand Icon */}
                          <div className="shrink-0 pl-1">
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors shadow-2xs">
                              <span className="material-symbols-outlined text-[20px]">
                                {isExpanded ? 'expand_less' : 'expand_more'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Collapsible Mobile Body Drawer */}
                        {isExpanded && (
                          <div className="mt-3.5 pt-3.5 border-t border-slate-200 dark:border-slate-800 space-y-3.5 bg-slate-50/80 dark:bg-slate-800/40 p-3.5 rounded-md border border-slate-200/80 dark:border-slate-700/80">
                            {/* Status Text Badge Header */}
                            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 dark:border-slate-700/80">
                              <span className="text-xs font-extrabold text-slate-600 dark:text-slate-300">
                                {isAmharic ? 'የፈቃድ ሁኔታ' : 'Permit Status'}
                              </span>
                              {renderStatusBadge(reg.status, true)}
                            </div>

                            {/* Metadata Grid */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <DataField label={isAmharic ? 'የመዝገብ መለያ:' : 'Record ID:'} value={reg.id} isMono />
                              <DataField label={isAmharic ? 'ስልክ ቁጥር:' : 'Phone Number:'} value={reg.phone || '—'} isMono />
                              <DataField label={isAmharic ? 'ክፍለ ከተማ:' : 'Sub-City:'} value={reg.subCity || '—'} />
                              <DataField label={isAmharic ? 'ሴሪያል ቁጥር:' : 'Serial No:'} value={reg.engineOrSerialNo || '—'} isMono />
                              <DataField label={isAmharic ? 'የተመዘገበበት ቀን:' : 'Registered Date:'} value={reg.registrationDate ? formatEthiopianDate(reg.registrationDate, isAmharic ? 'am' : 'en') : '—'} isMono />
                              <DataField label={isAmharic ? 'የመዘገበው:' : 'Registered By:'} value={reg.registeredBy || '—'} isMono />
                            </div>

                            {/* Document Photo Previews */}
                            {(reg.userPortraitPhoto || reg.nationalIdPhoto || reg.drivingLicensePhoto) && (
                              <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-700">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                  {isAmharic ? 'የተያያዙ ሰነዶች (ለመጨመር ተጫን):' : 'Attached Documents:'}
                                </span>
                                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                  {reg.userPortraitPhoto && (
                                    <div
                                      onClick={() => openDocumentCarousel(reg.userPortraitPhoto!, reg, 'Owner Portrait')}
                                      className="w-12 h-14 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 shrink-0 bg-slate-900 cursor-pointer relative group"
                                    >
                                      <SmartImage src={reg.userPortraitPhoto} alt="Portrait" fallbackIcon="person" className="w-full h-full object-cover" />
                                    </div>
                                  )}
                                  {reg.nationalIdPhoto && (
                                    <div
                                      onClick={() => openDocumentCarousel(reg.nationalIdPhoto!, reg, 'National ID')}
                                      className="w-12 h-14 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 shrink-0 bg-slate-900 cursor-pointer relative group"
                                    >
                                      <SmartImage src={reg.nationalIdPhoto} alt="National ID" fallbackIcon="badge" className="w-full h-full object-cover" />
                                    </div>
                                  )}
                                  {reg.drivingLicensePhoto && (
                                    <div
                                      onClick={() => openDocumentCarousel(reg.drivingLicensePhoto!, reg, 'Driving License')}
                                      className="w-12 h-14 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 shrink-0 bg-slate-900 cursor-pointer relative group"
                                    >
                                      <SmartImage src={reg.drivingLicensePhoto} alt="License" fallbackIcon="card_membership" className="w-full h-full object-cover" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Mobile Actions Bar */}
                            <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700 flex-wrap">
                              <button
                                type="button"
                                onClick={() => setSelectedRegForDetails(reg)}
                                className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[16px]">visibility</span>
                                <span>{isAmharic ? 'ዝርዝር' : 'Details'}</span>
                              </button>

                              {showHiddenControls && (userRole === 'superadmin' || userRole === 'super_admin') && (() => {
                                const isSuperUserRegistered = !reg.registeredBy || 
                                  reg.registeredBy.toLowerCase() === 'superadmin' || 
                                  reg.registeredBy.toLowerCase() === 'super_admin' || 
                                  reg.registeredBy.toLowerCase().includes('super');
                                return (
                                  <button
                                    type="button"
                                    disabled={isSuperUserRegistered}
                                    onClick={async () => {
                                      if (isSuperUserRegistered) return;
                                      const newHide = !reg.hideFromOtherUsers;
                                      await updateRegistrationInDb(reg.id, { hideFromOtherUsers: newHide });
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                      isSuperUserRegistered
                                        ? 'opacity-40 cursor-not-allowed text-slate-400 bg-slate-100 dark:bg-slate-800/40'
                                        : reg.hideFromOtherUsers
                                        ? 'bg-rose-600 text-white'
                                        : 'bg-emerald-600 text-white'
                                    }`}
                                    title={
                                      isSuperUserRegistered
                                        ? (isAmharic ? 'የሱፐር አድሚን ምዝገባ (መደበቅ አይቻልም)' : 'Super Admin Entry (Cannot Hide)')
                                        : reg.hideFromOtherUsers
                                        ? (isAmharic ? 'ለሌሎች አሳይ' : 'Show Owner')
                                        : (isAmharic ? 'ለሌሎች ደብቅ' : 'Hide Owner')
                                    }
                                  >
                                    <span className="material-symbols-outlined text-[16px]">
                                      {reg.hideFromOtherUsers ? 'visibility_off' : 'visibility'}
                                    </span>
                                    <span>
                                      {isSuperUserRegistered
                                        ? (isAmharic ? 'የተጠበቀ' : 'Protected')
                                        : reg.hideFromOtherUsers
                                        ? (isAmharic ? 'የተደበቀ' : 'Hidden')
                                        : (isAmharic ? 'ደብቅ' : 'Hide')}
                                    </span>
                                  </button>
                                );
                              })()}

                              {(userRole === 'admin' || userRole === 'superadmin' || userRole === 'super_admin') && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedRegForQR(reg)}
                                  className="px-3 py-1.5 bg-purple-700 text-white font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1 shadow-2xs"
                                >
                                  <span className="material-symbols-outlined text-[16px]">badge</span>
                                  <span>{isAmharic ? 'መታወቂያ' : 'Digital ID'}</span>
                                </button>
                              )}

                              {(reg.status === 'approved' || reg.status === 'printed' || reg.status === 'ordered_print') && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedRegForA4(reg)}
                                    className="px-3 py-1.5 bg-[#0B1E48] text-yellow-400 font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1 shadow-2xs"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">print</span>
                                    <span>{isAmharic ? 'ፍቃድ' : 'Permit'}</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setSelectedRegForSticker(reg)}
                                    className="px-3 py-1.5 bg-emerald-600 text-white font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1 shadow-2xs"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
                                    <span>{isAmharic ? 'ተለጣፊ' : 'Sticker'}</span>
                                  </button>
                                </>
                              )}

                              {(userRole === 'admin' || userRole === 'superadmin' || userRole === 'super_admin') && reg.status === 'pending_approval' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => onApproveRegistration(reg.id)}
                                    className="px-3 py-1.5 bg-emerald-600 text-white font-extrabold text-xs rounded-lg cursor-pointer"
                                  >
                                    {isAmharic ? 'አፅድቅ' : 'Approve'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setRejectingId(reg.id)}
                                    className="px-3 py-1.5 bg-rose-600 text-white font-extrabold text-xs rounded-lg cursor-pointer"
                                  >
                                    {isAmharic ? 'ሰርዝ' : 'Reject'}
                                  </button>
                                </>
                              )}

                              {isTaskAllowed(userRole, 11) && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (window.confirm(isAmharic ? 'ይህንን ምዝገባ በቋሚነት መሰረዝ ይፈልጋሉ?' : 'Are you sure you want to permanently delete this registration?')) {
                                      await deleteRegistrationFromDb(reg.id);
                                    }
                                  }}
                                  className="px-3 py-1.5 bg-red-600 text-white font-extrabold text-xs rounded-lg cursor-pointer flex items-center gap-1 shadow-2xs"
                                  title={isAmharic ? 'ምዝገባውን ሰርዝ' : 'Delete Registration'}
                                >
                                  <span className="material-symbols-outlined text-[14px]">delete</span>
                                  <span>{isAmharic ? 'አጥፋ' : 'Delete'}</span>
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
          )}

        {/* INTEGRATED PAGINATION CONTROLS FOOTER */}
        {filteredRegistrations.length > 0 && (
          <div className="bg-slate-50/80 dark:bg-slate-800/60 px-4 py-3 flex flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-200/80 dark:border-slate-800 shrink-0">
            {/* Left corner: Items per page selector */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-medium text-slate-700 dark:text-slate-300">{isAmharic ? 'በአንድ ገጽ:' : 'Rows per page:'}</span>
              <SelectField
                value={String(regPageSize)}
                onChange={(e) => {
                  setRegPageSize(Number(e.target.value));
                  setRegPage(1);
                }}
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </SelectField>
              <span className="hidden sm:inline font-medium text-slate-500 dark:text-slate-400">
                {isAmharic
                  ? `${regStartIndex + 1}-${Math.min(regStartIndex + regPageSize, totalRegs)} ከ ${totalRegs} መዝገቦች`
                  : `Showing ${regStartIndex + 1}–${Math.min(regStartIndex + regPageSize, totalRegs)} of ${totalRegs} entries`}
              </span>
            </div>

            {/* Right corner: Side-by-side pagination buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                disabled={activeRegPage <= 1}
                onClick={() => setRegPage(activeRegPage - 1)}
                className="px-2.5 sm:px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-md disabled:opacity-40 disabled:cursor-not-allowed font-extrabold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                <span>{isAmharic ? 'ቀዳሚ' : 'Previous'}</span>
              </button>

              <span className="px-2.5 sm:px-3 py-1 bg-white dark:bg-slate-900 rounded-md font-bold font-mono text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700">
                {activeRegPage} / {totalRegPages}
              </span>

              <button
                type="button"
                disabled={activeRegPage >= totalRegPages}
                onClick={() => setRegPage(activeRegPage + 1)}
                className="px-2.5 sm:px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-md disabled:opacity-40 disabled:cursor-not-allowed font-extrabold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
              >
                <span>{isAmharic ? 'ቀጣይ' : 'Next'}</span>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* QR Inspector Modal */}
      {selectedRegForQR && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto transition-all duration-200">
          <ZoomableDocumentContainer
            lang={lang}
            userRole={userRole}
            title={isAmharic ? 'የባለቤትነት QR መታወቂያ' : 'Official Digital Permit & QR Badge'}
            onClose={() => setSelectedRegForQR(null)}
          >
            <QRCodeCard registration={selectedRegForQR} lang={lang} />
          </ZoomableDocumentContainer>
        </div>
      )}

      {/* Full A4 Permit Paper Modal */}
      {selectedRegForA4 && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto transition-all duration-200">
          <ZoomableDocumentContainer
            lang={lang}
            userRole={userRole}
            title={isAmharic ? 'የመንቀሳቀሻ ፍቃድ ሰነድ (Permit)' : 'Official Movement Permit Document'}
            onClose={() => setSelectedRegForA4(null)}
            onPrint={() => {
              document.body.setAttribute('data-print-target', 'a4');
              window.focus();
              setTimeout(() => {
                try {
                  window.print();
                } finally {
                  document.body.removeAttribute('data-print-target');
                }
              }, 100);
            }}
          >
            <A4PermitPaper
              registration={selectedRegForA4}
              lang={lang}
              onClose={() => setSelectedRegForA4(null)}
            />
          </ZoomableDocumentContainer>
        </div>
      )}

      {/* Vehicle QR Sticker Modal */}
      {selectedRegForSticker && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto transition-all duration-200">
          <ZoomableDocumentContainer
            lang={lang}
            userRole={userRole}
            title={isAmharic ? 'የሞተር QR ተለጣፊ (Vehicle Sticker)' : 'Vehicle QR Sticker'}
            onClose={() => setSelectedRegForSticker(null)}
            onPrint={() => {
              document.body.setAttribute('data-print-target', 'sticker');
              window.focus();
              setTimeout(() => {
                try {
                  window.print();
                } finally {
                  document.body.removeAttribute('data-print-target');
                }
              }, 100);
            }}
          >
            <VehicleQRSticker
              registration={selectedRegForSticker}
              lang={lang}
              onClose={() => setSelectedRegForSticker(null)}
            />
          </ZoomableDocumentContainer>
        </div>
      )}

      {/* Rejection Reason Prompt Modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="font-extrabold text-sm text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <span className="material-symbols-outlined">cancel</span>
              <span>{isAmharic ? 'የመዝገብ መሰረዣ ምክንያት' : 'Provide Rejection Reason'}</span>
            </h3>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={isAmharic ? 'ምሳሌ፡ ያልተሟላ የመንጃ ፍቃድ ፎቶ' : 'e.g. Blurry driving license photo or invalid chassis number'}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-3 text-xs text-slate-900 dark:text-white h-24 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectingId(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-xs rounded-md font-bold cursor-pointer"
              >
                {isAmharic ? 'ተመለስ' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmReject(rejectingId)}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs rounded-md font-extrabold cursor-pointer shadow-xs"
              >
                {isAmharic ? 'ሰርዝ' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Vehicle Registration Record Details Inspector Modal */}
      {selectedRegForDetails && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto transition-all duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-2xl w-full p-4 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-[#0B1E48] text-yellow-400 flex items-center justify-center font-bold shadow-xs">
                  <span className="material-symbols-outlined text-[24px]">two_wheeler</span>
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    {isAmharic ? 'የተሟላ የሞተር ሳይክል ምዝገባ መረጃ' : 'Motorcycle Registration Record Details'}
                  </h3>
                  <p className="text-xs font-mono text-slate-500">
                    Record ID: <span className="font-bold text-[#0B1E48] dark:text-yellow-400">{selectedRegForDetails.id}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRegForDetails(null)}
                className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Status Banner */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-md border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">{isAmharic ? 'የምዝገባ ሁኔታ:' : 'Permit Status:'}</span>
                {renderStatusBadge(selectedRegForDetails.status)}
              </div>
              {selectedRegForDetails.registeredBy && (
                <div className="text-xs font-mono text-slate-500">
                  {isAmharic ? 'የመዘገበው ባጅ:' : 'Registered By:'} <span className="font-bold text-slate-900 dark:text-white">{selectedRegForDetails.registeredBy}</span>
                </div>
              )}
            </div>

            {/* Rejection notice if rejected */}
            {selectedRegForDetails.status === 'rejected' && selectedRegForDetails.rejectionReason && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-md text-xs text-rose-900 dark:text-rose-200">
                <span className="font-bold block mb-0.5">{isAmharic ? 'የመሰረዣ ምክንያት:' : 'Rejection Reason:'}</span>
                <p>{selectedRegForDetails.rejectionReason}</p>
              </div>
            )}

            {/* Core Data Grids */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-md border border-slate-200 dark:border-slate-700 space-y-2">
                <h4 className="font-extrabold text-xs text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 pb-1.5 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-yellow-600 dark:text-yellow-400">person</span>
                  <span>{isAmharic ? 'የባለቤት መረጃ' : 'Owner Information'}</span>
                </h4>
                <div className="space-y-1.5">
                  <DataField label={isAmharic ? 'ሙሉ ስም:' : 'Full Name:'} value={selectedRegForDetails.fullName || '—'} />
                  <DataField label={isAmharic ? 'ስልክ ቁጥር:' : 'Phone Number:'} value={selectedRegForDetails.phone || '—'} isMono />
                  <DataField label={isAmharic ? 'ክፍለ ከተማ:' : 'Sub-City:'} value={selectedRegForDetails.subCity || '—'} />
                  <DataField label={isAmharic ? 'የተመዘገበበት ቀን:' : 'Registration Date:'} value={selectedRegForDetails.registrationDate ? formatEthiopianDate(selectedRegForDetails.registrationDate, isAmharic ? 'am' : 'en') : '—'} isMono />
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-md border border-slate-200 dark:border-slate-700 space-y-2">
                <h4 className="font-extrabold text-xs text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 pb-1.5 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-yellow-600 dark:text-yellow-400">electric_moped</span>
                  <span>{isAmharic ? 'የተሽከርካሪ መረጃ' : 'Vehicle Specifications'}</span>
                </h4>
                <div className="space-y-1.5">
                  <DataField 
                    label={isAmharic ? 'ዓይነት:' : 'Category:'} 
                    value={selectedRegForDetails.vehicleCategory === 'electric' ? (isAmharic ? 'ኤሌክትሪክ (EV)' : 'Electric (EV)') : (isAmharic ? 'ቤንዚን (Gasoline)' : 'Gasoline (<110cc)')} 
                    isPrimary 
                  />
                  <DataField label={isAmharic ? 'የሰሌዳ ቁጥር:' : 'Plate Number:'} value={selectedRegForDetails.plateNumber || '—'} isMono />
                  <DataField label={isAmharic ? 'ሴሪያል / ቻሲስ ቁጥር:' : 'Engine / Chassis No:'} value={selectedRegForDetails.engineOrSerialNo || '—'} isMono />
                  <DataField label={isAmharic ? 'የሞተር ምርት እና ሞዴል:' : 'Brand & Model:'} value={`${selectedRegForDetails.motorBrand || '—'} ${selectedRegForDetails.motorModel || ''}`} />
                </div>
              </div>
            </div>

            {/* Document Photos */}
            <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <h4 className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-yellow-600 dark:text-yellow-400">photo_library</span>
                <span>{isAmharic ? 'የተያያዙ ፎቶዎች እና ሰነዶች (Click to Zoom)' : 'Uploaded Document Photos (Click to Zoom)'}</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold block truncate">
                    {isAmharic ? 'የባለቤት ፎቶ' : 'Owner Portrait'}
                  </span>
                  <div
                    onClick={() => selectedRegForDetails.userPortraitPhoto && openDocumentCarousel(selectedRegForDetails.userPortraitPhoto, selectedRegForDetails, `${selectedRegForDetails.fullName} — Portrait`)}
                    className="h-28 rounded-md overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer group relative shadow-2xs"
                  >
                    {selectedRegForDetails.userPortraitPhoto ? (
                      <>
                        <SmartImage src={selectedRegForDetails.userPortraitPhoto} alt="Portrait" fallbackIcon="person" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <span className="material-symbols-outlined text-[20px]">zoom_in</span>
                        </div>
                      </>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">{isAmharic ? 'አልተያያዘም' : 'None'}</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold block truncate">
                    {isAmharic ? 'ብሔራዊ መታወቂያ' : 'National ID'}
                  </span>
                  <div
                    onClick={() => selectedRegForDetails.nationalIdPhoto && openDocumentCarousel(selectedRegForDetails.nationalIdPhoto, selectedRegForDetails, `${selectedRegForDetails.fullName} — National ID`)}
                    className="h-28 rounded-md overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer group relative shadow-2xs"
                  >
                    {selectedRegForDetails.nationalIdPhoto ? (
                      <>
                        <SmartImage src={selectedRegForDetails.nationalIdPhoto} alt="National ID" fallbackIcon="badge" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <span className="material-symbols-outlined text-[20px]">zoom_in</span>
                        </div>
                      </>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">{isAmharic ? 'አልተያያዘም' : 'None'}</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold block truncate">
                    {isAmharic ? 'የመንጃ ፍቃድ' : 'Driving License'}
                  </span>
                  <div
                    onClick={() => selectedRegForDetails.drivingLicensePhoto && openDocumentCarousel(selectedRegForDetails.drivingLicensePhoto, selectedRegForDetails, `${selectedRegForDetails.fullName} — License`)}
                    className="h-28 rounded-md overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer group relative shadow-2xs"
                  >
                    {selectedRegForDetails.drivingLicensePhoto ? (
                      <>
                        <SmartImage src={selectedRegForDetails.drivingLicensePhoto} alt="Driving License" fallbackIcon="card_membership" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <span className="material-symbols-outlined text-[20px]">zoom_in</span>
                        </div>
                      </>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">{isAmharic ? 'አልተያያዘም' : 'None'}</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold block truncate">
                    {isAmharic ? 'የመንቀሳቀሻ ፍቃድ' : 'Permit / Libre'}
                  </span>
                  <div
                    onClick={() => selectedRegForDetails.drivingPermitPhoto && openDocumentCarousel(selectedRegForDetails.drivingPermitPhoto, selectedRegForDetails, `${selectedRegForDetails.fullName} — Permit`)}
                    className="h-28 rounded-md overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer group relative shadow-2xs"
                  >
                    {selectedRegForDetails.drivingPermitPhoto ? (
                      <>
                        <SmartImage src={selectedRegForDetails.drivingPermitPhoto} alt="Permit" fallbackIcon="menu_book" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <span className="material-symbols-outlined text-[20px]">zoom_in</span>
                        </div>
                      </>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">{isAmharic ? 'አልተያያዘም' : 'None'}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 flex-wrap">

                {(userRole === 'admin' || userRole === 'superadmin' || userRole === 'super_admin') && (
                  <button
                    type="button"
                    onClick={() => {
                      const reg = selectedRegForDetails;
                      setSelectedRegForDetails(null);
                      setSelectedRegForQR(reg);
                    }}
                    className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white font-extrabold rounded-md text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">badge</span>
                    <span>{isAmharic ? 'ዲጂታል መታወቂያ' : 'Digital ID Card'}</span>
                  </button>
                )}

                {(selectedRegForDetails.status === 'approved' || selectedRegForDetails.status === 'printed' || selectedRegForDetails.status === 'ordered_print') && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const reg = selectedRegForDetails;
                        setSelectedRegForDetails(null);
                        setSelectedRegForA4(reg);
                      }}
                      className="px-3.5 py-2 bg-[#0B1E48] hover:bg-[#071330] text-yellow-400 font-extrabold rounded-md text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-[16px]">print</span>
                      <span>{isAmharic ? 'የመንቀሳቀሻ ፍቃድ' : 'Print Permit'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const reg = selectedRegForDetails;
                        setSelectedRegForDetails(null);
                        setSelectedRegForSticker(reg);
                      }}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-md text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
                      <span>{isAmharic ? 'ተለጣፊ' : 'Print Sticker'}</span>
                    </button>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedRegForDetails(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-md font-bold cursor-pointer transition-colors"
              >
                {isAmharic ? 'ዝጋ' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CAROUSEL DOCUMENT ZOOM VIEWER */}
      {carouselModal && (
        <FullscreenDocumentCarouselModal
          items={carouselModal.items}
          initialIndex={carouselModal.initialIndex}
          lang={lang}
          onClose={() => setCarouselModal(null)}
        />
      )}
    </div>
  );
};
