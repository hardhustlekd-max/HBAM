import React, { useState } from 'react';
import { motion } from 'motion/react';
import { formatEthiopianDate } from '../utils/ethiopianCalendar';
import {
  Language,
  UserRole,
  MotorcycleRegistration,
  VehicleCategory,
  BAHIR_DAR_SUBCITIES,
} from '../types';
import {
  saveRegistrationToDb,
  addAuditLogToDb,
  getPermissionState,
} from '../services/dbService';
import { SmartImage } from './SmartImage';
import { ZoomableDocumentContainer } from './ZoomableDocumentContainer';
import {
  FullscreenDocumentCarouselModal,
  buildRegistrationDocumentList,
  DocumentViewerItem,
} from './FullscreenDocumentCarouselModal';
import { checkDuplicateRegistration } from '../utils/validation';

interface TodaySubmissionsPageProps {
  lang: Language;
  userRole: UserRole;
  userBadgeId: string;
  registrations: MotorcycleRegistration[];
  onNavigateToNewRegistration?: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const TodaySubmissionsPage: React.FC<TodaySubmissionsPageProps> = ({
  lang,
  userRole,
  userBadgeId,
  registrations,
  onNavigateToNewRegistration,
  onShowToast,
}) => {
  const isAmharic = lang === 'am';
  const isReadOnly = getPermissionState(userRole, 2) === 'view_only';

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'today' | 'all'>('today');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals & Inspection State
  const [editingReg, setEditingReg] = useState<MotorcycleRegistration | null>(null);
  const [inspectReg, setInspectReg] = useState<MotorcycleRegistration | null>(null);
  const [carouselModal, setCarouselModal] = useState<{
    items: DocumentViewerItem[];
    initialIndex: number;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mobile collapsed card states
  const [expandedRegs, setExpandedRegs] = useState<Record<string, boolean>>({});
  const toggleRegExpand = (id: string) => {
    setExpandedRegs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Form State for Editing
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPlateNumber, setEditPlateNumber] = useState('');
  const [editEngineNo, setEditEngineNo] = useState('');
  const [editVehicleCategory, setEditVehicleCategory] = useState<VehicleCategory>('gas_under_110cc');
  const [editMotorBrand, setEditMotorBrand] = useState('');
  const [editMotorModel, setEditMotorModel] = useState('');
  const [editSubCity, setEditSubCity] = useState('Fasilo');
  const [editBloodGroup, setEditBloodGroup] = useState('A+');
  const [editUserPortrait, setEditUserPortrait] = useState('');
  const [editNationalIdPhoto, setEditNationalIdPhoto] = useState('');
  const [editNationalIdBackPhoto, setEditNationalIdBackPhoto] = useState('');
  const [editDrivingLicensePhoto, setEditDrivingLicensePhoto] = useState('');
  const [editDrivingPermitPhoto, setEditDrivingPermitPhoto] = useState('');
  const [editReSubmitPending, setEditReSubmitPending] = useState(true);

  // Today's date string (YYYY-MM-DD)
  const todayStr = new Date().toISOString().split('T')[0];

  // Open Edit Modal with selected registration values
  const handleOpenEdit = (reg: MotorcycleRegistration) => {
    setEditingReg(reg);
    setEditFullName(reg.fullName || '');
    setEditPhone(reg.phone || '');
    setEditPlateNumber(reg.plateNumber || '');
    setEditEngineNo(reg.engineOrSerialNo || '');
    setEditVehicleCategory(reg.vehicleCategory || 'gas_under_110cc');
    setEditMotorBrand(reg.motorBrand || '');
    setEditMotorModel(reg.motorModel || '');
    setEditSubCity(reg.subCity || 'Fasilo');
    setEditBloodGroup(reg.bloodGroup || 'A+');
    setEditUserPortrait(reg.userPortraitPhoto || '');
    setEditNationalIdPhoto(reg.nationalIdPhoto || '');
    setEditNationalIdBackPhoto(reg.nationalIdBackPhoto || '');
    setEditDrivingLicensePhoto(reg.drivingLicensePhoto || '');
    setEditDrivingPermitPhoto(reg.drivingPermitPhoto || '');
    setEditReSubmitPending(reg.status === 'rejected');
  };

  // Handle Photo File Upload
  const handlePhotoUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        if (result) {
          setter(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Save / Update Registration
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReg) return;

    if (isReadOnly) {
      if (onShowToast) {
        onShowToast(
          isAmharic
            ? 'ተነባቢ ብቻ ሁነታ ተተግብሯል፡ ማሻሻያዎችን ማስቀመጥ አይፈቀድም።'
            : 'Read-only mode active: Saving changes is disabled.',
          'error'
        );
      }
      return;
    }

    if (!editFullName.trim() || !editPlateNumber.trim() || !editPhone.trim()) {
      if (onShowToast) {
        onShowToast(
          isAmharic ? 'እባክዎን ባለቤት ስም፣ ስልክና የታርጋ ቁጥር ያስገቡ' : 'Please fill all required fields',
          'error'
        );
      }
      return;
    }

    // Duplicate check: Full Name and Phone Number must not be registered more than once
    const dupCheck = checkDuplicateRegistration(
      editFullName.trim(),
      editPhone.trim(),
      registrations,
      editingReg.id,
      isAmharic
    );
    if (dupCheck.hasDuplicate) {
      if (onShowToast) {
        onShowToast(dupCheck.message, 'error');
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const newStatus =
        editReSubmitPending && editingReg.status === 'rejected'
          ? 'pending_approval'
          : editingReg.status;

      const updatedRecord: MotorcycleRegistration = {
        ...editingReg,
        fullName: editFullName.trim(),
        phone: editPhone.trim(),
        plateNumber: editPlateNumber.trim().toUpperCase(),
        engineOrSerialNo: editEngineNo.trim().toUpperCase(),
        vehicleCategory: editVehicleCategory,
        motorBrand: editMotorBrand.trim(),
        motorModel: editMotorModel.trim(),
        subCity: editSubCity,
        bloodGroup: editBloodGroup,
        userPortraitPhoto: editUserPortrait || editingReg.userPortraitPhoto,
        nationalIdPhoto: editNationalIdPhoto || editingReg.nationalIdPhoto,
        nationalIdBackPhoto: editNationalIdBackPhoto || editingReg.nationalIdBackPhoto,
        drivingLicensePhoto: editDrivingLicensePhoto || editingReg.drivingLicensePhoto,
        drivingPermitPhoto: editDrivingPermitPhoto || editingReg.drivingPermitPhoto,
        status: newStatus,
        rejectionReason:
          newStatus === 'pending_approval' && editingReg.status === 'rejected'
            ? undefined
            : editingReg.rejectionReason,
      };

      await saveRegistrationToDb(updatedRecord);
      await addAuditLogToDb({
        actorBadgeId: userBadgeId || 'CLERK-01',
        actorRole: userRole,
        action: 'SUBMISSION_ADJUSTED',
        details: `Clerk updated application details for Plate ${updatedRecord.plateNumber} (${updatedRecord.fullName})`,
        severity: 'info',
      });

      if (onShowToast) {
        onShowToast(
          isAmharic
            ? `የማመልከቻ ቁጥር ${updatedRecord.plateNumber} መረጃ በተሳካ ሁኔታ ተስተካክሎ ቀርቧል!`
            : `Application ${updatedRecord.plateNumber} updated & submitted successfully!`,
          'success'
        );
      }

      setEditingReg(null);
    } catch (err: any) {
      if (onShowToast) {
        onShowToast(
          isAmharic ? 'ማስተካከያውን ማስቀመጥ አልተሳካም' : 'Failed to save application adjustment',
          'error'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Fullscreen Document Carousel
  const openDocumentCarousel = (targetUrl: string, reg: MotorcycleRegistration) => {
    if (!targetUrl) return;
    const docs = buildRegistrationDocumentList(reg, lang);
    const foundIdx = docs.findIndex((d) => d.url === targetUrl);
    setCarouselModal({
      items: docs,
      initialIndex: foundIdx >= 0 ? foundIdx : 0,
    });
  };

  // Render Status Badge matching Records Page
  const renderStatusBadge = (status?: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-2xs">
            <span className="material-symbols-outlined text-[13px] shrink-0">check_circle</span>
            <span>{isAmharic ? 'የተፈቀደ' : 'Approved'}</span>
          </span>
        );
      case 'printed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-800 shadow-2xs">
            <span className="material-symbols-outlined text-[13px] shrink-0">print</span>
            <span>{isAmharic ? 'የታተመ' : 'Printed'}</span>
          </span>
        );
      case 'ordered_print':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 shadow-2xs">
            <span className="material-symbols-outlined text-[13px] shrink-0">layers</span>
            <span>{isAmharic ? 'በሕትመት' : 'In Print'}</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800 shadow-2xs">
            <span className="material-symbols-outlined text-[13px] shrink-0">cancel</span>
            <span>{isAmharic ? 'ውድቅ' : 'Rejected'}</span>
          </span>
        );
      case 'pending_approval':
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shadow-2xs">
            <span className="material-symbols-outlined text-[13px] shrink-0">schedule</span>
            <span>{isAmharic ? 'የሚጠበቅ' : 'Pending'}</span>
          </span>
        );
    }
  };

  // 1. Role-specific filtering (clerk only sees their own submissions; hides hidden records for non-superadmin)
  const roleFilteredRegs = registrations.filter((reg) => {
    if (userRole !== 'superadmin' && userRole !== 'super_admin' && reg.hideFromOtherUsers) {
      return false;
    }
    if (userRole === 'clerk') {
      const clerkBadge = (userBadgeId || '').trim().toLowerCase();
      const regBy = (reg.registeredBy || '').trim().toLowerCase();
      return regBy === clerkBadge || (clerkBadge && regBy.includes(clerkBadge)) || (!reg.registeredBy && clerkBadge === 'clerk-001');
    }
    return true;
  });

  // 2. Filter by Date (Today vs All)
  const dateFilteredRegs = roleFilteredRegs.filter((reg) => {
    if (dateFilter === 'today') {
      const regDate = (reg.registrationDate || '').split(' ')[0];
      return !regDate || regDate === todayStr;
    }
    return true;
  });

  // Calculate Status Counts based on Date Filter
  const pendingCount = dateFilteredRegs.filter(
    (r) => r.status === 'pending_approval' || r.status === 'pending'
  ).length;

  const approvedCount = dateFilteredRegs.filter(
    (r) => r.status === 'approved' || r.status === 'printed' || r.status === 'ordered_print'
  ).length;

  const rejectedCount = dateFilteredRegs.filter(
    (r) => r.status === 'rejected'
  ).length;

  // 2. Filter by Status and Search
  const finalFilteredRegs = dateFilteredRegs.filter((reg) => {
    // Status Filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'pending_approval' && reg.status !== 'pending_approval' && reg.status !== 'pending') {
        return false;
      }
      if (statusFilter === 'approved' && reg.status !== 'approved' && reg.status !== 'printed' && reg.status !== 'ordered_print') {
        return false;
      }
      if (statusFilter === 'rejected' && reg.status !== 'rejected') {
        return false;
      }
    }

    // Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const match =
        (reg.fullName || '').toLowerCase().includes(q) ||
        (reg.plateNumber || '').toLowerCase().includes(q) ||
        (reg.phone || '').toLowerCase().includes(q) ||
        (reg.engineOrSerialNo || '').toLowerCase().includes(q) ||
        (reg.subCity || '').toLowerCase().includes(q) ||
        (reg.motorBrand || '').toLowerCase().includes(q) ||
        (reg.motorModel || '').toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  // Pagination
  const totalRegs = finalFilteredRegs.length;
  const totalPages = Math.ceil(totalRegs / pageSize) || 1;
  const activePage = Math.min(page, totalPages);
  const startIndex = (activePage - 1) * pageSize;
  const paginatedRegistrations = finalFilteredRegs.slice(startIndex, startIndex + pageSize);

  return (
    <div className="space-y-4">
      {/* SINGLE UNIFIED TABLE CONTAINER MATCHING RECORDS PAGE STYLE */}
      <div className="bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant dark:border-slate-800 rounded-lg shadow-xs overflow-hidden divide-y divide-outline-variant/60 dark:divide-slate-800">

        {/* CONTAINER SECTION HEADER (MATCHING RECORDS PAGE STYLE) */}
        <div className="p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 bg-surface-container-lowest dark:bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-[20px]">edit_note</span>
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-on-surface dark:text-white">
                {isAmharic ? 'የዛሬ ማመልከቻዎችና ማስተካከያ' : "Today's Submissions & Corrections"}
              </h3>
              <p className="hidden sm:block text-[11px] font-normal text-secondary/80 dark:text-slate-400 mt-0.5">
                {isAmharic
                  ? 'የዛሬ የተመዘገቡ ማመልከቻዎች፣ መረጃዎችን ማረሚያ እና እንደገና ማቅረቢያ'
                  : 'Registry of today’s submissions, information corrections, and re-submissions'}
              </p>
            </div>
          </div>

          {onNavigateToNewRegistration && (
            <button
              type="button"
              onClick={onNavigateToNewRegistration}
              className="px-3.5 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-[#0B1E48] font-extrabold text-xs rounded-md shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              <span>{isAmharic ? 'አዲስ ምዝገባ' : 'New Registration'}</span>
            </button>
          )}
        </div>

        {/* SUB-FILTER SLIDE BAR (SEARCH, DATE TOGGLE & STATUS SLIDE PILLS) */}
        <div className="p-2.5 sm:p-3 bg-slate-50/70 dark:bg-slate-900/60 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 border-b border-outline-variant/40 dark:border-slate-800">
          {/* Live Search Input */}
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
              <span className="material-symbols-outlined text-[16px]">search</span>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder={isAmharic ? 'በስም፣ ሰሌዳ፣ ስልክ ወይም ቻሲስ ፈልግ...' : 'Search by name, plate, phone, chassis...'}
              className="w-full pl-8 pr-8 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-2.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">close</span>
              </button>
            )}
          </div>

          {/* Status & Date Filter Segmented Slide Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Date Pill Toggle */}
            <div className="relative inline-flex items-center p-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/90 shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setDateFilter('today');
                  setPage(1);
                }}
                className={`relative z-10 px-2.5 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                  dateFilter === 'today'
                    ? 'bg-white dark:bg-slate-700 text-[#0B1E48] dark:text-white shadow-xs font-extrabold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {isAmharic ? 'የዛሬ ብቻ' : "Today's Only"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDateFilter('all');
                  setPage(1);
                }}
                className={`relative z-10 px-2.5 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                  dateFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-[#0B1E48] dark:text-white shadow-xs font-extrabold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {isAmharic ? 'ሁሉንም ቀናት' : 'All Dates'}
              </button>
            </div>

            {/* Status Filter Tabs in End-Closed With Icons Style */}
            <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar pt-1 shrink-0">
              {[
                {
                  id: 'all',
                  icon: 'list_alt',
                  label: isAmharic ? 'ሁሉም' : 'All',
                  count: dateFilteredRegs.length,
                  activeIconColor: 'text-primary',
                  badgeColor: 'bg-surface-container-highest text-secondary',
                },
                {
                  id: 'pending_approval',
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
                  id: 'approved',
                  icon: 'verified',
                  label: isAmharic ? 'የፀደቁ' : 'Approved',
                  count: approvedCount,
                  activeIconColor: 'text-emerald-600 dark:text-emerald-400',
                  badgeColor: 'bg-surface-container-highest text-secondary',
                },
                {
                  id: 'rejected',
                  icon: 'cancel',
                  label: isAmharic ? 'ውድቅ' : 'Rejected',
                  count: rejectedCount,
                  activeIconColor: 'text-rose-600 dark:text-rose-400',
                  badgeColor:
                    rejectedCount > 0
                      ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                      : 'bg-surface-container-highest text-secondary',
                },
              ].map((tab) => {
                const isActive = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setStatusFilter(tab.id);
                      setPage(1);
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
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold transition-colors ${
                        isActive
                          ? 'bg-surface-container-high dark:bg-slate-700 text-on-surface dark:text-white'
                          : tab.badgeColor
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Reset filter button if filtered */}
            {(searchQuery || statusFilter !== 'all' || dateFilter !== 'today') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setDateFilter('today');
                  setPage(1);
                }}
                className="px-2.5 py-1 rounded-full text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center gap-1 cursor-pointer"
                title={isAmharic ? 'ማጣሪያዎችን አጽዳ' : 'Reset Filters'}
              >
                <span>{isAmharic ? 'አጽዳ' : 'Clear'}</span>
              </button>
            )}
          </div>
        </div>

        {/* --- REGISTRATIONS DATA TABLE --- */}
        <div className="min-h-[500px] flex flex-col justify-between">
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
                          {isAmharic ? 'ምንም የተመዘገቡ መረጃዎች የሉም' : 'No Vehicle Submissions Found'}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {isAmharic
                            ? 'አዲስ የሞተር ብስክሌት መረጃዎች ሲመዘገቡ በዚህ ሰንጠረዥ ውስጥ ይዘረዘራሉ።'
                            : 'Submissions will appear in this table once registered.'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : finalFilteredRegs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-slate-500 dark:text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2 py-4">
                        <span className="material-symbols-outlined text-[32px] text-slate-400 dark:text-slate-600">search_off</span>
                        <span className="font-bold text-sm text-slate-700 dark:text-slate-300">
                          {isAmharic ? 'ምንም የሚመሳሰል ማመልከቻ አልተገኘም' : 'No matching applications found.'}
                        </span>
                        {dateFilter === 'today' && (
                          <button
                            type="button"
                            onClick={() => {
                              setDateFilter('all');
                              setPage(1);
                            }}
                            className="px-3 py-1.5 bg-yellow-500 text-[#0B1E48] font-extrabold text-xs rounded-md shadow-xs hover:bg-yellow-400 cursor-pointer"
                          >
                            {isAmharic ? 'ሁሉንም ቀናት አሳይ' : 'Show All Dates'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedRegistrations.map((reg, index) => {
                    return (
                      <tr key={reg.id} className="h-16 align-middle hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                        {/* Index Number */}
                        <td className="px-4 py-2.5 align-middle h-16 text-center font-mono font-bold text-slate-400">
                          {startIndex + index + 1}
                        </td>

                        {/* Owner Name & Portrait */}
                        <td className="px-4 py-2.5 align-middle h-16">
                          <div className="flex items-center gap-3">
                            <div
                              onClick={() => {
                                const imgUrl = reg.userPortraitPhoto || reg.nationalIdPhoto;
                                if (imgUrl) openDocumentCarousel(imgUrl, reg);
                              }}
                              className="relative w-10 h-10 rounded-md overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-slate-100 dark:bg-slate-800 shadow-xs cursor-pointer group"
                              title={isAmharic ? 'ፎቶ ለማጉላት ይጫኑ' : 'Click to view photo'}
                            >
                              <SmartImage
                                src={reg.userPortraitPhoto || reg.nationalIdPhoto}
                                alt={reg.fullName || 'Portrait'}
                                fallbackIcon="person"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            </div>
                            <div className="min-w-0">
                              <span className="font-black text-sm text-slate-900 dark:text-white truncate max-w-[180px] block">
                                {reg.fullName || '—'}
                              </span>
                              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block truncate">
                                {reg.phone || '—'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Plate & Category */}
                        <td className="px-4 py-2.5 align-middle h-16">
                          <span className="font-mono font-black text-xs px-2.5 py-1 rounded-md bg-yellow-100 dark:bg-yellow-950/60 text-yellow-900 dark:text-yellow-200 border border-yellow-300/80 inline-block shadow-2xs">
                            {reg.plateNumber || '—'}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                            {reg.motorBrand || ''} {reg.motorModel || ''}
                          </span>
                        </td>

                        {/* Chassis & Engine */}
                        <td className="px-4 py-2.5 align-middle h-16 font-mono text-xs text-slate-700 dark:text-slate-300">
                          <span className="font-semibold">{reg.engineOrSerialNo || '—'}</span>
                        </td>

                        {/* Sub-City & Date */}
                        <td className="px-4 py-2.5 align-middle h-16">
                          <span className="font-bold text-slate-900 dark:text-white block">{reg.subCity || '—'}</span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono block">
                            {reg.registrationDate ? formatEthiopianDate(reg.registrationDate, isAmharic ? 'am' : 'en') : '—'}
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td className="px-4 py-2.5 align-middle h-16 text-center">
                          <div className="inline-flex flex-col items-center gap-1">
                            {renderStatusBadge(reg.status)}
                            {reg.status === 'rejected' && reg.rejectionReason && (
                              <span className="text-[10px] text-rose-600 dark:text-rose-400 max-w-[140px] truncate" title={reg.rejectionReason}>
                                {reg.rejectionReason}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions (Edit & Inspect) */}
                        <td className="px-4 py-2.5 align-middle h-16 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Hide edit button for approved/printed records */}
                            {reg.status !== 'approved' && reg.status !== 'printed' && reg.status !== 'ordered_print' && (
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(reg)}
                                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:hover:bg-blue-900/80 dark:text-blue-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                                title={isAmharic ? 'ማመልከቻውን አስተካክል' : 'Edit application'}
                              >
                                <span className="material-symbols-outlined text-[16px]">edit</span>
                                <span>{isAmharic ? 'አስተካክል' : 'Edit'}</span>
                              </button>
                            )}

                            {userRole !== 'clerk' && (
                              <button
                                type="button"
                                onClick={() => setInspectReg(reg)}
                                className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                title={isAmharic ? 'ፈቃድ እይ' : 'Inspect permit card'}
                              >
                                <span className="material-symbols-outlined text-[18px]">badge</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List (< md) */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {finalFilteredRegs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                <span className="material-symbols-outlined text-[32px] text-slate-400">search_off</span>
                <p className="font-bold text-xs mt-1">{isAmharic ? 'ምንም ማመልከቻ አልተገኘም' : 'No applications found'}</p>
              </div>
            ) : (
              paginatedRegistrations.map((reg, index) => {
                const isExpanded = !!expandedRegs[reg.id];
                return (
                  <div key={reg.id} className="p-3.5 bg-surface-container-lowest dark:bg-slate-900 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          onClick={() => {
                            const imgUrl = reg.userPortraitPhoto || reg.nationalIdPhoto;
                            if (imgUrl) openDocumentCarousel(imgUrl, reg);
                          }}
                          className="w-10 h-10 rounded-md overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 shrink-0"
                        >
                          <SmartImage
                            src={reg.userPortraitPhoto || reg.nationalIdPhoto}
                            alt={reg.fullName}
                            fallbackIcon="person"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-xs text-slate-900 dark:text-white truncate">{reg.fullName}</p>
                          <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{reg.phone}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {renderStatusBadge(reg.status)}
                        <button
                          type="button"
                          onClick={() => toggleRegExpand(reg.id)}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {isExpanded ? 'expand_less' : 'expand_more'}
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-yellow-100 dark:bg-yellow-950/60 text-yellow-900 dark:text-yellow-200 border border-yellow-300/80">
                          {reg.plateNumber}
                        </span>
                        <span className="text-[11px] text-slate-500">{reg.subCity}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Hide edit button for approved/printed records */}
                        {reg.status !== 'approved' && reg.status !== 'printed' && reg.status !== 'ordered_print' && (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(reg)}
                            className="px-2.5 py-1 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-200 rounded-lg text-xs font-bold flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[14px]">edit</span>
                            <span>{isAmharic ? 'አስተካክል' : 'Edit'}</span>
                          </button>
                        )}
                        {userRole !== 'clerk' && (
                          <button
                            type="button"
                            onClick={() => setInspectReg(reg)}
                            className="p-1 text-slate-500 hover:text-slate-900 rounded-lg"
                          >
                            <span className="material-symbols-outlined text-[16px]">badge</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-md space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                        <p><span className="font-bold">{isAmharic ? 'ሞተር/ቻሲስ:' : 'Chassis/Engine:'}</span> {reg.engineOrSerialNo}</p>
                        <p><span className="font-bold">{isAmharic ? 'የሞተር ምርት/ሞዴል:' : 'Brand/Model:'}</span> {reg.motorBrand} {reg.motorModel}</p>
                        <p><span className="font-bold">{isAmharic ? 'የምዝገባ ቀን:' : 'Registered:'}</span> {reg.registrationDate ? formatEthiopianDate(reg.registrationDate, isAmharic ? 'am' : 'en') : '—'}</p>
                        {reg.status === 'rejected' && reg.rejectionReason && (
                          <p className="text-rose-600 font-semibold"><span className="font-bold">{isAmharic ? 'የውድቅ ምክንያት:' : 'Rejection Reason:'}</span> {reg.rejectionReason}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* PAGINATION BAR (MATCHING RECORDS PAGE STYLE) */}
          {totalPages > 1 && (
            <div className="p-3 sm:p-4 bg-slate-50/70 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span>{isAmharic ? 'በአንድ ገጽ:' : 'Per Page:'}</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-700 dark:text-slate-300 font-bold focus:outline-none"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span>
                  {isAmharic
                    ? `ከ ${totalRegs} ውስጥ ${startIndex + 1} - ${Math.min(startIndex + pageSize, totalRegs)}`
                    : `Showing ${startIndex + 1} - ${Math.min(startIndex + pageSize, totalRegs)} of ${totalRegs}`}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={activePage <= 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  {isAmharic ? 'ቀዳሚ' : 'Previous'}
                </button>

                <div className="px-2 font-bold text-slate-700 dark:text-slate-200">
                  {activePage} / {totalPages}
                </div>

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={activePage >= totalPages}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  {isAmharic ? 'ቀጣይ' : 'Next'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ==================== MODAL: CLERK EDIT & RE-SUBMIT APPLICATION ==================== */}
      {editingReg && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-surface-container-lowest dark:bg-slate-900 w-full max-w-2xl rounded-lg border border-outline-variant dark:border-slate-700 shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-outline-variant dark:border-slate-800 flex items-center justify-between bg-surface-container/30 dark:bg-slate-800/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-md bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-[20px]">edit_note</span>
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-on-surface dark:text-white">
                    {isAmharic ? 'የማመልከቻ መረጃ ማስተካከያና ማቅረቢያ' : 'Edit & Re-Submit Application'}
                  </h3>
                  <p className="text-[11px] text-secondary font-mono">
                    {isAmharic ? 'የታርጋ ቁጥር: ' : 'Plate No: '}
                    <span className="font-bold text-blue-600 dark:text-blue-400">{editingReg.plateNumber}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingReg(null)}
                className="text-secondary hover:text-on-surface p-1.5 rounded-lg hover:bg-surface-container dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveEdit} className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {isReadOnly && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-700 dark:text-amber-400 text-xs font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">warning</span>
                  <span>
                    {isAmharic ? 'ተነባቢ ብቻ ሁነታ ተተግብሯል፡ ማስተካከል እና ማስቀመጥ አይፈቀድም።' : 'Read-Only Mode Active: Form editing and saving is disabled.'}
                  </span>
                </div>
              )}
              <fieldset disabled={isReadOnly} className="space-y-4">
                {/* If Rejected Banner */}
                {editingReg.status === 'rejected' && (
                <div className="p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-md space-y-1.5">
                  <div className="flex items-center gap-2 text-red-800 dark:text-red-200 font-bold text-xs">
                    <span className="material-symbols-outlined text-[18px]">error</span>
                    <span>{isAmharic ? 'ውድቅ የተደረገበት ምክንያት:' : 'Rejection Reason from Manager:'}</span>
                  </div>
                  <p className="text-xs text-red-700 dark:text-red-300 pl-6">
                    {editingReg.rejectionReason || (isAmharic ? 'ተጨማሪ ማብራሪያ አልተሰጠም' : 'No rejection note specified.')}
                  </p>
                  <label className="flex items-center gap-2 pt-1 pl-6 text-xs font-bold text-on-surface dark:text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editReSubmitPending}
                      onChange={(e) => setEditReSubmitPending(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 accent-blue-600"
                    />
                    <span>{isAmharic ? 'መረጃውን አስተካክለህ እንደገና ለማፅደቂያ አቅርብ (Re-submit for Review)' : 'Re-submit as Pending Approval'}</span>
                  </label>
                </div>
              )}

              {/* Section 1: Owner Info */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-on-surface dark:text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-outline-variant/60 dark:border-slate-800 pb-1.5">
                  <span className="material-symbols-outlined text-[16px] text-blue-600">person</span>
                  <span>{isAmharic ? '1. የባለቤት መረጃ' : '1. Owner Information'}</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-on-surface dark:text-slate-300 mb-1">
                      {isAmharic ? 'ሙሉ ስም *' : 'Full Name *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      className="w-full bg-surface-container/70 dark:bg-slate-800 border border-outline-variant dark:border-slate-700 rounded-md px-3.5 py-2 text-xs font-bold text-on-surface dark:text-white focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface dark:text-slate-300 mb-1">
                      {isAmharic ? 'ስልክ ቁጥር *' : 'Phone Number *'}
                    </label>
                    <input
                      type="tel"
                      required
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full bg-surface-container/70 dark:bg-slate-800 border border-outline-variant dark:border-slate-700 rounded-md px-3.5 py-2 text-xs font-mono font-bold text-on-surface dark:text-white focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface dark:text-slate-300 mb-1">
                      {isAmharic ? 'ክፍለ ከተማ' : 'Sub-City'}
                    </label>
                    <select
                      value={editSubCity}
                      onChange={(e) => setEditSubCity(e.target.value)}
                      className="w-full bg-surface-container/70 dark:bg-slate-800 border border-outline-variant dark:border-slate-700 rounded-md px-3 py-2 text-xs font-bold text-on-surface dark:text-white focus:outline-hidden focus:border-blue-500 cursor-pointer"
                    >
                      {BAHIR_DAR_SUBCITIES.map((sc) => (
                        <option key={sc.en} value={sc.en}>
                          {isAmharic ? sc.am : sc.en}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface dark:text-slate-300 mb-1">
                      {isAmharic ? 'የደም አይነት' : 'Blood Group'}
                    </label>
                    <select
                      value={editBloodGroup}
                      onChange={(e) => setEditBloodGroup(e.target.value)}
                      className="w-full bg-surface-container/70 dark:bg-slate-800 border border-outline-variant dark:border-slate-700 rounded-md px-3 py-2 text-xs font-bold text-on-surface dark:text-white focus:outline-hidden focus:border-blue-500 cursor-pointer"
                    >
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Vehicle Info */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-black text-on-surface dark:text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-outline-variant/60 dark:border-slate-800 pb-1.5">
                  <span className="material-symbols-outlined text-[16px] text-blue-600">two_wheeler</span>
                  <span>{isAmharic ? '2. የተሽከርካሪ መረጃ' : '2. Vehicle Information'}</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-on-surface dark:text-slate-300 mb-1">
                      {isAmharic ? 'የታርጋ ቁጥር *' : 'Plate Number *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={editPlateNumber}
                      onChange={(e) => setEditPlateNumber(e.target.value)}
                      className="w-full bg-surface-container/70 dark:bg-slate-800 border border-outline-variant dark:border-slate-700 rounded-md px-3.5 py-2 text-xs font-mono font-bold text-on-surface dark:text-white uppercase focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface dark:text-slate-300 mb-1">
                      {isAmharic ? 'የሞተር / ሻንሲ ቁጥር *' : 'Engine / Chassis No *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={editEngineNo}
                      onChange={(e) => setEditEngineNo(e.target.value)}
                      className="w-full bg-surface-container/70 dark:bg-slate-800 border border-outline-variant dark:border-slate-700 rounded-md px-3.5 py-2 text-xs font-mono font-bold text-on-surface dark:text-white uppercase focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface dark:text-slate-300 mb-1">
                      {isAmharic ? 'የተሽከርካሪ ዓይነት' : 'Vehicle Category'}
                    </label>
                    <select
                      value={editVehicleCategory}
                      onChange={(e) => setEditVehicleCategory(e.target.value as VehicleCategory)}
                      className="w-full bg-surface-container/70 dark:bg-slate-800 border border-outline-variant dark:border-slate-700 rounded-md px-3 py-2 text-xs font-bold text-on-surface dark:text-white focus:outline-hidden focus:border-blue-500 cursor-pointer"
                    >
                      <option value="gas_under_110cc">{isAmharic ? 'ቤንዚን ሞተር (እስከ 110cc)' : 'Gasoline Under 110cc'}</option>
                      <option value="electric">{isAmharic ? 'የኤሌክትሪክ ሞተር (EV)' : 'Electric Motorcycle (EV)'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface dark:text-slate-300 mb-1">
                      {isAmharic ? 'የሞተር ምርት / ሞዴል' : 'Brand & Model'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Brand (e.g. Haojue)"
                        value={editMotorBrand}
                        onChange={(e) => setEditMotorBrand(e.target.value)}
                        className="w-full bg-surface-container/70 dark:bg-slate-800 border border-outline-variant dark:border-slate-700 rounded-md px-3 py-2 text-xs font-bold text-on-surface dark:text-white focus:outline-hidden focus:border-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Model (e.g. HJ-125)"
                        value={editMotorModel}
                        onChange={(e) => setEditMotorModel(e.target.value)}
                        className="w-full bg-surface-container/70 dark:bg-slate-800 border border-outline-variant dark:border-slate-700 rounded-md px-3 py-2 text-xs font-bold text-on-surface dark:text-white focus:outline-hidden focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Document Attachments Preview & Upload */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-black text-on-surface dark:text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-outline-variant/60 dark:border-slate-800 pb-1.5">
                  <span className="material-symbols-outlined text-[16px] text-blue-600">attachment</span>
                  <span>{isAmharic ? '3. ሰነዶችና ፎቶዎች' : '3. Documents & Photos'}</span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* Portrait */}
                  <div className="p-2 bg-surface-container/50 dark:bg-slate-800/60 border border-outline-variant dark:border-slate-700 rounded-md space-y-1.5 text-center">
                    <p className="text-[10px] font-bold text-on-surface dark:text-slate-300 truncate">
                      {isAmharic ? 'የባለቤት ፎቶ' : 'Driver Portrait'}
                    </p>
                    <div className="w-14 h-16 mx-auto rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-surface-container dark:bg-slate-800">
                      <SmartImage src={editUserPortrait} alt="Portrait" fallbackIcon="person" className="w-full h-full object-cover" />
                    </div>
                    <label className="block cursor-pointer">
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline">
                        {isAmharic ? 'ቀይር' : 'Change'}
                      </span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, setEditUserPortrait)} />
                    </label>
                  </div>

                  {/* National ID Front */}
                  <div className="p-2 bg-surface-container/50 dark:bg-slate-800/60 border border-outline-variant dark:border-slate-700 rounded-md space-y-1.5 text-center">
                    <p className="text-[10px] font-bold text-on-surface dark:text-slate-300 truncate">
                      {isAmharic ? 'መታወቂያ ፊት' : 'National ID Front'}
                    </p>
                    <div className="w-14 h-16 mx-auto rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-surface-container dark:bg-slate-800">
                      <SmartImage src={editNationalIdPhoto} alt="ID Front" fallbackIcon="badge" className="w-full h-full object-cover" />
                    </div>
                    <label className="block cursor-pointer">
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline">
                        {isAmharic ? 'ቀይር' : 'Change'}
                      </span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, setEditNationalIdPhoto)} />
                    </label>
                  </div>

                  {/* National ID Back */}
                  <div className="p-2 bg-surface-container/50 dark:bg-slate-800/60 border border-outline-variant dark:border-slate-700 rounded-md space-y-1.5 text-center">
                    <p className="text-[10px] font-bold text-on-surface dark:text-slate-300 truncate">
                      {isAmharic ? 'መታወቂያ ጀርባ' : 'National ID Back'}
                    </p>
                    <div className="w-14 h-16 mx-auto rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-surface-container dark:bg-slate-800">
                      <SmartImage src={editNationalIdBackPhoto} alt="ID Back" fallbackIcon="badge" className="w-full h-full object-cover" />
                    </div>
                    <label className="block cursor-pointer">
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline">
                        {isAmharic ? 'ቀይር' : 'Change'}
                      </span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, setEditNationalIdBackPhoto)} />
                    </label>
                  </div>

                  {/* Driving License */}
                  <div className="p-2 bg-surface-container/50 dark:bg-slate-800/60 border border-outline-variant dark:border-slate-700 rounded-md space-y-1.5 text-center">
                    <p className="text-[10px] font-bold text-on-surface dark:text-slate-300 truncate">
                      {isAmharic ? 'መንጃ ፍቃድ' : 'License'}
                    </p>
                    <div className="w-14 h-16 mx-auto rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-surface-container dark:bg-slate-800">
                      <SmartImage src={editDrivingLicensePhoto} alt="License" fallbackIcon="card_membership" className="w-full h-full object-cover" />
                    </div>
                    <label className="block cursor-pointer">
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline">
                        {isAmharic ? 'ቀይር' : 'Change'}
                      </span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, setEditDrivingLicensePhoto)} />
                    </label>
                  </div>
                </div>
              </div>

              </fieldset>

              {/* Modal Action Buttons */}
              <div className="pt-4 border-t border-outline-variant dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingReg(null)}
                  className="px-4 py-2 rounded-md text-xs font-bold text-secondary hover:text-on-surface dark:hover:text-white hover:bg-surface-container dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {isReadOnly ? (isAmharic ? 'ዝጋ' : 'Close') : (isAmharic ? 'ይቅር' : 'Cancel')}
                </button>

                {!isReadOnly && (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-[#0B1E48] text-xs font-black rounded-md shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    {isSubmitting ? (
                      <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                    ) : (
                      <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                    )}
                    <span>
                      {editReSubmitPending && editingReg.status === 'rejected'
                        ? (isAmharic ? 'አስተካክለህ እንደገና አቅርብ' : 'Save & Re-Submit')
                        : (isAmharic ? 'አስቀምጥና አቅርብ' : 'Save & Submit')}
                    </span>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== INSPECT PERMIT CARD MODAL ==================== */}
      {inspectReg && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <ZoomableDocumentContainer
            lang={lang}
            userRole={userRole}
            registration={inspectReg}
            onClose={() => setInspectReg(null)}
          />
        </div>
      )}

      {/* ==================== FULLSCREEN DOCUMENT CAROUSEL ==================== */}
      {carouselModal && (
        <FullscreenDocumentCarouselModal
          items={carouselModal.items}
          initialIndex={carouselModal.initialIndex}
          onClose={() => setCarouselModal(null)}
          lang={lang}
        />
      )}
    </div>
  );
};
