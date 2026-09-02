import React, { useState, useEffect, useMemo } from 'react';
import {
  Language,
  UserRole,
  MotorcycleRegistration,
  OfficerAssignment,
  VerificationLog,
  UnregisteredVehicleReport,
  PaymentReceipt,
  SystemSettings,
} from '../types';
import {
  getStoredActivePage,
  saveActivePage,
} from '../utils/storage';
import {
  subscribeRegistrations,
  subscribeOfficers,
  subscribeVerificationLogs,
  subscribeUnregisteredReports,
  subscribePaymentReceipts,
  saveRegistrationToDb,
  updateRegistrationStatusInDb,
  saveOfficerToDb,
  saveVerificationLogToDb,
  saveUnregisteredReportToDb,
  updateUnregisteredReportStatusInDb,
  savePaymentReceiptToDb,
  deletePaymentReceiptFromDb,
  syncAllCollectionsWithDb,
  subscribeSettings,
  DEFAULT_SETTINGS,
  isTaskViewable,
  isTaskAllowed,
  getPermissionState,
} from '../services/dbService';
import { MunicipalDashboardOverview } from './MunicipalDashboardOverview';
import { FormsPage } from './FormsPage';
import { TablesPage } from './TablesPage';
import { TodaySubmissionsPage } from './TodaySubmissionsPage';
import { SharedScannerModal } from './SharedScannerModal';
import { SuperAdminInterface } from './SuperAdminInterface';
import { OfficerVerificationHistory } from './OfficerVerificationHistory';
import { UnregisteredVehicleForm } from './UnregisteredVehicleForm';
import { UnregisteredReportsList } from './UnregisteredReportsList';
import { PaymentReceiptsPage } from './PaymentReceiptsPage';
import { SettingsPage } from './SettingsPage';
import { APP_LOGO } from '../types';
import { toEthiopianDate } from '../utils/ethiopianCalendar';

interface HomePageProps {
  userBadgeId: string;
  userRole: UserRole;
  currentLang: Language;
  currentTheme?: 'light' | 'dark';
  onToggleLang: () => void;
  onToggleTheme?: () => void;
  onLogout: () => void;
  onSwitchRole?: (newRole: UserRole) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  userBadgeId,
  userRole,
  currentLang,
  currentTheme = 'light',
  onToggleLang,
  onToggleTheme,
  onLogout,
  onSwitchRole,
}) => {
  const isAmharic = currentLang === 'am';

  // User profile dropdown toggle state for topbar
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // Active top page navigation
  const [activePage, setActivePage] = useState<
    | 'dashboard'
    | 'forms'
    | 'tables'
    | 'today_submissions_adjust'
    | 'workstation'
    | 'scan'
    | 'inspection_report'
    | 'report_unregistered'
    | 'unregistered_list'
    | 'payment_receipts'
    | 'superadmin_users'
    | 'superadmin_subcities'
    | 'superadmin_security'
    | 'superadmin_permits'
    | 'superadmin_maintenance'
    | 'superadmin'
    | 'settings'
  >(() => {
    const saved = getStoredActivePage();
    return saved as any;
  });

  // Role accessibility control for officer
  useEffect(() => {
    const allowedOfficerPages = ['dashboard', 'scan', 'settings', 'inspection_report', 'report_unregistered', 'tables'];
    if (userRole === 'officer' && !allowedOfficerPages.includes(activePage)) {
      setActivePage('dashboard');
      saveActivePage('dashboard');
    }
  }, [userRole, activePage]);

  // Logout confirmation modal state
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // Live real-time clock and Ethiopian Calendar state
  const [currentDateTime, setCurrentDateTime] = useState<Date>(() => new Date());
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const ethDate = useMemo(() => toEthiopianDate(currentDateTime), [currentDateTime]);

  const handleUserLogout = () => {
    saveActivePage('dashboard');
    setActivePage('dashboard');
    setIsMobileMenuOpen(false);
    onLogout();
  };

  // Mobile menu open state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Table active tab filter state passed to TablesPage
  const [tableInitialTab, setTableInitialTab] = useState<'approved' | 'pending' | 'expired'>('approved');

  // Inspection report filter state passed to OfficerVerificationHistory
  const [inspectionInitialFilter, setInspectionInitialFilter] = useState<'all' | 'verified' | 'warning' | 'flagged'>('all');

  // Universal RBAC Task Mapping for all pages
  const PAGE_TASK_MAP: Record<string, number> = {
    dashboard: 9, // View Count / Statistics / Dashboard
    forms: 1, // Register New Member / Vehicle
    today_submissions_adjust: 2, // Edit Member / Submission Correction
    tables: 8, // View Members List / Tables & Records
    inspection_report: 10, // View Reports / Inspection Report
    report_unregistered: 5, // Field Patrol & Scanner
    unregistered_list: 5, // Field Patrol & Scanner
    payment_receipts: 1, // Payment Receipt Entry & Validity Tracking
    scan: 5, // Barcode / QR Scanner
    settings: 9, // Universal Settings Page
    superadmin_users: 14,
    superadmin_subcities: 13,
    superadmin_security: 14,
    superadmin_permits: 11,
    superadmin_maintenance: 12,
    superadmin: 14,
    superadmin_owners: 11,
  };

  const currentTaskId = PAGE_TASK_MAP[activePage] || 9;
  const currentPagePermission = getPermissionState(userRole, currentTaskId);
  const isCurrentPageBlocked = currentPagePermission === 'deny';

  useEffect(() => {
    if (isCurrentPageBlocked) {
      addToast(
        isAmharic
          ? 'ይህ ክፍል በፈቃድ መቆጣጠሪያ (RBAC) ታግዷል!'
          : 'This section is currently blocked by your RBAC configuration!',
        'error'
      );
    }
  }, [activePage, isCurrentPageBlocked, isAmharic]);

  const renderBlockedPageUI = () => (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant dark:border-slate-800 rounded-xl shadow-sm space-y-6 animate-in fade-in zoom-in duration-200 my-auto">
      <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 shadow-sm animate-pulse">
        <span className="material-symbols-outlined text-[36px]">gpp_bad</span>
      </div>
      <div className="space-y-2 max-w-md">
        <h3 className="text-lg font-black text-on-surface dark:text-white">
          {isAmharic ? 'ይህ ክፍል በፈቃድ መቆጣጠሪያ (RBAC) ታግዷል' : 'Access Blocked by RBAC Matrix'}
        </h3>
        <p className="text-xs text-outline dark:text-slate-400 leading-relaxed font-medium">
          {isAmharic
            ? 'ይህ ክፍል በሪል-ታይም የሚና እና ፈቃድ መቆጣጠሪያ (RBAC) ቅንብር ምክንያት እንዳይከፈት ታግዷል። እባክዎን የሲስተም ባለቤትን ወይም ዋና አይቲ ባለሙያን ያነጋግሩ።'
            : 'Access to this specific section has been dynamically blocked by the active Role-Based Access Control (RBAC) matrix. Please contact the system owner or network administrator.'}
        </p>
      </div>
      <div className="flex items-center gap-2 text-[11px] font-black uppercase text-rose-600 dark:text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-full border border-rose-500/20">
        <span className="material-symbols-outlined text-[14px]">shield</span>
        <span>{isAmharic ? 'የደህንነት ማስጠንቀቂያ' : 'Security Alert'}</span>
      </div>
      {activePage !== 'dashboard' && getPermissionState(userRole, 9) !== 'deny' && (
        <button
          type="button"
          onClick={() => setActivePage('dashboard')}
          className="px-4 py-2 bg-[#1D61E7] hover:bg-blue-700 text-white rounded-md text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          <span>{isAmharic ? 'ወደ ዋና ገፅ ተመለስ' : 'Return to Dashboard'}</span>
        </button>
      )}
    </div>
  );

  // Dynamic Breadcrumb navigation calculation matching side menu page titles
  const breadcrumbItems = useMemo(() => {
    const homeItem = {
      label: isAmharic ? 'ዋና ገፅ' : 'Dashboard',
      page: 'dashboard',
      icon: 'space_dashboard',
    };

    if (activePage === 'dashboard') {
      return [homeItem];
    }

    if (activePage === 'forms') {
      return [
        homeItem,
        {
          label: userRole === 'clerk'
            ? (isAmharic ? 'አዲስ ምዝገባ' : 'New Registration')
            : (isAmharic ? 'ምዝገባ' : 'Registration'),
          page: 'forms',
          icon: 'how_to_reg',
        },
      ];
    }

    if (activePage === 'today_submissions_adjust') {
      return [
        homeItem,
        {
          label: isAmharic ? 'ማመልከቻ ማስተካከያ' : 'Submission Correction',
          page: 'today_submissions_adjust',
          icon: 'edit_note',
        },
      ];
    }

    if (activePage === 'tables') {
      return [
        homeItem,
        {
          label: userRole === 'clerk'
            ? (tableInitialTab === 'approved'
                ? (isAmharic ? 'የፀደቁ ተሽከርካሪዎች' : 'Approved Registry')
                : (isAmharic ? 'የቀረቡ ማመልከቻዎች' : 'View Submissions'))
            : (isAmharic ? 'ሬኮርዶች' : 'Records & Tables'),
          page: 'tables',
          icon: userRole === 'clerk' ? (tableInitialTab === 'approved' ? 'verified' : 'folder_open') : 'table_chart',
        },
      ];
    }

    if (activePage === 'inspection_report') {
      return [
        homeItem,
        {
          label: isAmharic ? 'የፍተሻ ሪፖርት' : 'Inspection Report',
          page: 'inspection_report',
          icon: 'analytics',
        },
      ];
    }

    if (activePage === 'report_unregistered') {
      return [
        homeItem,
        {
          label: isAmharic ? 'ባልተመዘገበ ተሽከርካሪ ሪፖርት' : 'Report Unregistered Vehicle',
          page: 'report_unregistered',
          icon: 'report_problem',
        },
      ];
    }

    if (activePage === 'unregistered_list') {
      return [
        homeItem,
        {
          label: isAmharic ? 'ህገ-ወጥ ሞተሮች' : 'Unlawful Motors',
          page: 'unregistered_list',
          icon: 'no_drinks',
        },
      ];
    }

    if (activePage === 'payment_receipts') {
      return [
        homeItem,
        {
          label: isAmharic ? 'የክፍያ ደረሰኞች' : 'Payment Receipts',
          page: 'payment_receipts',
          icon: 'receipt_long',
        },
      ];
    }

    if (activePage === 'scan') {
      return [
        homeItem,
        {
          label: userRole === 'clerk'
            ? (isAmharic ? 'ኮውአር ኮድ ፈትሽ' : 'Scan QR Code')
            : (isAmharic ? 'QR ፍተሻ' : 'Scan QR'),
          page: 'scan',
          icon: 'qr_code_scanner',
        },
      ];
    }

    if (activePage === 'settings') {
      return [
        homeItem,
        {
          label: isAmharic ? 'ቅንብሮች' : 'Settings',
          page: 'settings',
          icon: 'settings',
        },
      ];
    }

    if (activePage.startsWith('superadmin')) {
      const parent = {
        label: isAmharic ? 'ዋና አስተዳዳሪ' : 'Super Admin',
        page: 'superadmin_users',
        icon: 'admin_panel_settings',
      };
      let current = {
        label: isAmharic ? 'የተጠቃሚዎች አስተዳደር' : 'Users & Access Control',
        page: activePage,
        icon: 'manage_accounts',
      };

      if (activePage === 'superadmin_subcities') {
        current = {
          label: isAmharic ? 'የክፍለ ከተማ ቁጥጥር' : 'Sub-City Governance',
          page: activePage,
          icon: 'location_city',
        };
      } else if (activePage === 'superadmin_security') {
        current = {
          label: isAmharic ? 'የሴኪዩሪቲ ኦዲት' : 'Security & Audit Logs',
          page: activePage,
          icon: 'shield',
        };
      } else if (activePage === 'superadmin_permits') {
        current = {
          label: isAmharic ? 'የፈቃድ ቁጥጥር' : 'Master Permit Rules',
          page: activePage,
          icon: 'verified',
        };
      } else if (activePage === 'superadmin_maintenance') {
        current = {
          label: isAmharic ? 'ጥገናና ዳታቤዝ' : 'System Maintenance & DB',
          page: activePage,
          icon: 'database',
        };
      }

      return [homeItem, parent, current];
    }

    return [homeItem];
  }, [activePage, isAmharic, userRole, tableInitialTab]);

  // Shared System State connected to Firestore "permit" database
  const [registrations, setRegistrations] = useState<MotorcycleRegistration[]>([]);
  const [officers, setOfficers] = useState<OfficerAssignment[]>([]);
  const [verificationLogs, setVerificationLogs] = useState<VerificationLog[]>([]);
  const [unregisteredReports, setUnregisteredReports] = useState<UnregisteredVehicleReport[]>([]);
  const [paymentReceipts, setPaymentReceipts] = useState<PaymentReceipt[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);

  // Real-time Firestore subscriptions with smart, quota-safe local-first cache
  useEffect(() => {
    // Initial fetch of all collections on startup
    syncAllCollectionsWithDb();

    // Subscribe to in-memory state listeners
    const unsubRegs = subscribeRegistrations(setRegistrations);
    const unsubOffs = subscribeOfficers(setOfficers);
    const unsubLogs = subscribeVerificationLogs(setVerificationLogs);
    const unsubUnregistered = subscribeUnregisteredReports(setUnregisteredReports);
    const unsubPayments = subscribePaymentReceipts(setPaymentReceipts);
    const unsubSettings = subscribeSettings((data) => {
      if (data) setSettings(data);
    });

    return () => {
      unsubRegs();
      unsubOffs();
      unsubLogs();
      unsubUnregistered();
      unsubPayments();
      unsubSettings();
    };
  }, []);

  // Save active page tab to localStorage
  useEffect(() => {
    saveActivePage(activePage);
  }, [activePage]);

  // Toasts Notification State
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // Handlers for Firestore database updates
  const handleAddVerificationLog = async (newLog: VerificationLog, isNoteUpdate: boolean = false) => {
    try {
      await saveVerificationLogToDb(newLog);
      // Removed auto-save notification toast as requested
    } catch (err) {
      addToast(
        isAmharic ? 'የፍተሻ መዝገብ ማስቀመጥ አልተሳካም!' : 'Failed to save verification log to database!',
        'error'
      );
    }
  };

  const handleAddUnregisteredReport = async (report: UnregisteredVehicleReport) => {
    try {
      await saveUnregisteredReportToDb(report);
      addToast(
        isAmharic ? 'የባልተመዘገበ ተሽከርካሪ ሪፖርት በተሳካ ሁኔታ ተመዝግቧል!' : 'Unregistered vehicle report saved successfully!',
        'success'
      );
    } catch (err) {
      addToast(
        isAmharic ? 'ሪፖርቱን ማስቀመጥ አልተሳካም!' : 'Failed to save unregistered report!',
        'error'
      );
    }
  };

  const handleUpdateUnregisteredReportStatus = async (
    id: string,
    status: 'pending' | 'under_investigation' | 'registered' | 'resolved',
    notes?: string
  ) => {
    try {
      await updateUnregisteredReportStatusInDb(id, status, notes);
      addToast(
        isAmharic ? 'የሪፖርቱ ሁኔታ ተዘምኗል!' : 'Report status updated successfully!',
        'success'
      );
    } catch (err) {
      addToast(
        isAmharic ? 'የሪፖርቱን ሁኔታ ማዘመን አልተሳካም!' : 'Failed to update report status!',
        'error'
      );
    }
  };

  const handleAddPaymentReceipt = async (receipt: PaymentReceipt) => {
    try {
      await savePaymentReceiptToDb(receipt);
      addToast(
        isAmharic
          ? `የክፍያ ደረሰኝ ቁጥር ${receipt.receiptNumber} በተሳካ ሁኔታ ተመዝግቧል!`
          : `Payment receipt #${receipt.receiptNumber} saved successfully!`,
        'success'
      );
    } catch (err) {
      addToast(
        isAmharic ? 'የክፍያ ደረሰኙን ማስቀመጥ አልተሳካም!' : 'Failed to save payment receipt!',
        'error'
      );
    }
  };

  const handleDeletePaymentReceipt = async (id: string) => {
    try {
      await deletePaymentReceiptFromDb(id);
      addToast(
        isAmharic ? 'የክፍያ ደረሰኙ ተሰርዟል!' : 'Payment receipt deleted successfully!',
        'info'
      );
    } catch (err) {
      addToast(
        isAmharic ? 'የክፍያ ደረሰኙን መሰረዝ አልተሳካም!' : 'Failed to delete payment receipt!',
        'error'
      );
    }
  };

  const handleAddRegistration = async (
    newReg: MotorcycleRegistration,
    options?: { forceLocalOnly?: boolean }
  ) => {
    try {
      const res = await saveRegistrationToDb(newReg, options);
      if (res.success) {
        addToast(
          isAmharic
            ? `የ ${newReg.fullName} ምዝገባ በተሳካ ሁኔታ በዳታቤዝ ተቀምጧል!`
            : `Registration for ${newReg.fullName} stored successfully in Firebase Database!`,
          'success'
        );
      } else {
        addToast(
          isAmharic ? 'የኦንላይን ዳታቤዝ ማስቀመጥ አልተሳካም!' : 'Online Firebase database save failed!',
          'error'
        );
      }
      return res;
    } catch (err) {
      addToast(
        isAmharic ? 'ምዝገባውን ማስቀመጥ አልተሳካም!' : 'Failed to store registration!',
        'error'
      );
      return { success: false, error: 'Save failed' };
    }
  };

  const handleApproveRegistration = async (id: string) => {
    try {
      await updateRegistrationStatusInDb(id, 'approved');
      addToast(
        isAmharic
          ? `የምዝገባ መለያ ${id} በዳታቤዝ ውስጥ ጸድቋል!`
          : `Registration ${id} approved successfully in database!`,
        'success'
      );
    } catch (err) {
      addToast(
        isAmharic ? 'ማጽደቅ አልተሳካም!' : 'Failed to approve registration!',
        'error'
      );
    }
  };

  const handleRejectRegistration = async (id: string, reason: string) => {
    try {
      await updateRegistrationStatusInDb(id, 'rejected', reason);
      addToast(
        isAmharic
          ? `የምዝገባ መለያ ${id} ውድቅ ተደርጓል!`
          : `Registration ${id} rejected in database!`,
        'info'
      );
    } catch (err) {
      addToast(
        isAmharic ? 'ውድቅ ማድረግ አልተሳካም!' : 'Failed to reject registration!',
        'error'
      );
    }
  };

  const handleAddOfficerAssignment = async (assignment: OfficerAssignment) => {
    try {
      await saveOfficerToDb(assignment);
      addToast(
        isAmharic
          ? `ኦፊሰር ${assignment.officerName} በተሳካ ሁኔታ ተመድቧል!`
          : `Officer ${assignment.officerName} successfully assigned and saved to database!`,
        'success'
      );
    } catch (err) {
      addToast(
        isAmharic ? 'ምደባውን ማስቀመጥ አልተሳካም!' : 'Failed to save assignment in database!',
        'error'
      );
    }
  };

  const handleQuickAction = (actionKey: string) => {
    if (actionKey === 'today_submissions_adjust') {
      setActivePage('today_submissions_adjust');
    } else if (actionKey === 'quick_verify') {
      setActivePage('scan');
    } else if (actionKey === 'approved_vehicles' || actionKey === 'kpi_approved') {
      setTableInitialTab('approved');
      setActivePage('tables');
    } else if (actionKey === 'pending_approvals' || actionKey === 'kpi_pending') {
      setTableInitialTab('pending');
      setActivePage('tables');
    } else if (actionKey === 'kpi_expired' || actionKey === 'rejected_vehicles') {
      setTableInitialTab('expired');
      setActivePage('tables');
    } else if (
      actionKey === 'officer_logs_today' ||
      actionKey === 'inspection_report_all' ||
      actionKey === 'inspection_report' ||
      actionKey === 'inspection_report_full' ||
      actionKey === 'verification_logs'
    ) {
      setInspectionInitialFilter('all');
      setActivePage('inspection_report');
    } else if (actionKey === 'officer_logs_verified') {
      setInspectionInitialFilter('verified');
      setActivePage('inspection_report');
    } else if (actionKey === 'officer_logs_warning') {
      setInspectionInitialFilter('warning');
      setActivePage('inspection_report');
    } else if (actionKey === 'officer_logs_flagged') {
      setInspectionInitialFilter('flagged');
      setActivePage('inspection_report');
    } else if (actionKey === 'report_unregistered') {
      setActivePage('report_unregistered');
    } else if (
      actionKey === 'unregistered_list' ||
      actionKey === 'unregistered_reports' ||
      actionKey === 'unregistered_reports_list'
    ) {
      setActivePage('unregistered_list');
    } else if (actionKey === 'payment_receipts') {
      setActivePage('payment_receipts');
    } else if (actionKey === 'superadmin_users') {
      setActivePage('superadmin_users');
    } else if (actionKey === 'superadmin_subcities') {
      setActivePage('superadmin_subcities');
    } else if (actionKey === 'superadmin_security') {
      setActivePage('superadmin_security');
    } else if (actionKey === 'superadmin_permits') {
      setActivePage('superadmin_permits');
    } else if (actionKey === 'superadmin_maintenance') {
      setActivePage('superadmin_maintenance');
    } else if (
      actionKey === 'new_registration' ||
      actionKey === 'deploy_officer' ||
      actionKey === 'batch_print'
    ) {
      setActivePage('forms');
    } else if (
      actionKey === 'view_submissions' ||
      actionKey === 'vehicle_directory' ||
      actionKey === 'system_records' ||
      actionKey === 'officers_directory' ||
      actionKey === 'print_history'
    ) {
      setActivePage('tables');
    } else if (
      actionKey === 'print_queue' ||
      actionKey === 'inspect_proofs' ||
      actionKey === 'checkpoint_status'
    ) {
      setActivePage('workstation');
    }
  };

  // Side Menu double tap/click handler for Super Admin (triggers Registered Owners table & search bar)
  const lastSideMenuTapRef = React.useRef<{ time: number; itemKey: string }>({ time: 0, itemKey: '' });

  const handleSideMenuClick = (targetPage: any, itemKey: string = targetPage) => {
    if (userRole === 'superadmin') {
      const now = Date.now();
      const diff = now - lastSideMenuTapRef.current.time;
      if (diff < 400 && lastSideMenuTapRef.current.itemKey === itemKey) {
        // Double tap or double click detected on side menu for super admin!
        setActivePage('superadmin_owners' as any);
        setIsMobileMenuOpen(false);
        lastSideMenuTapRef.current = { time: 0, itemKey: '' };
        return;
      }
      lastSideMenuTapRef.current = { time: now, itemKey };
    }
    setActivePage(targetPage);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="h-screen h-[100dvh] max-h-screen max-h-[100dvh] overflow-hidden bg-surface text-on-surface flex flex-col font-sans">
      {/* ==================== DESKTOP SIDEBAR NAVIGATION (hidden md:flex) ==================== */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:z-50 md:bg-[#0A1838] md:text-white md:border-r md:border-[#16274E] md:p-3.5 md:justify-between md:shadow-2xl">
        <div className="flex flex-col h-full min-h-0">
          {/* Desktop Brand & Logo Header */}
          <div className="flex items-center gap-3 px-1 py-1 mb-5">
            <div className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center shrink-0 overflow-hidden border border-white/20">
              <img src={APP_LOGO} alt="Logo" className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
            </div>
            <div className="min-w-0">
              <h1 id="desktop-header-text" className="font-black text-xs text-white tracking-tight leading-tight truncate">
                {isAmharic ? 'ሕይወት ባህርዳር የሞተረኞች ማህበር' : 'HIWOT BAHIRDAR ASSOCIATION'}
              </h1>
              <p className="text-[9px] text-yellow-300 font-semibold tracking-wide truncate">
                {isAmharic ? 'በአንድነት ለአስተማማኝና ለተሻለ አገልግሎት' : 'Together for Safe and Better service'}
              </p>
            </div>
          </div>

          {/* Desktop Main Menu Items Navigation List */}
          <nav className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-thin scrollbar-thumb-white/20">
            {/* Dashboard Link */}
            <button
              type="button"
              onClick={() => handleSideMenuClick('dashboard', 'dashboard')}
              onDoubleClick={() => {
                if (userRole === 'superadmin') {
                  setActivePage('superadmin_owners' as any);
                }
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                activePage === 'dashboard'
                  ? 'bg-[#1D61E7] text-white font-black shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">space_dashboard</span>
              <span>{isAmharic ? 'ዋና ገፅ' : 'Dashboard'}</span>
            </button>

            {/* CLERK SPECIFIC SIDE MENU - EXACTLY MATCHING QUICK ACTIONS */}
            {userRole === 'clerk' ? (
              <>
                {/* 1. New Registration */}
                {isTaskViewable(userRole, 1) && (
                  <button
                    type="button"
                    onClick={() => setActivePage('forms')}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      activePage === 'forms'
                        ? 'bg-[#1D61E7] text-white font-black shadow-md'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">how_to_reg</span>
                    <span>{isAmharic ? 'አዲስ ምዝገባ' : 'New Registration'}</span>
                  </button>
                )}

                {/* 2. Submission Correction */}
                {isTaskViewable(userRole, 2) && (
                  <button
                    type="button"
                    onClick={() => setActivePage('today_submissions_adjust')}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      activePage === 'today_submissions_adjust'
                        ? 'bg-[#1D61E7] text-white font-black shadow-md'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">edit_note</span>
                    <span>{isAmharic ? 'ማመልከቻ ማስተካከያ' : 'Submission Correction'}</span>
                  </button>
                )}

                {/* 3. Scan QR Code */}
                {isTaskViewable(userRole, 5) && (
                  <button
                    type="button"
                    onClick={() => setActivePage('scan')}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      activePage === 'scan'
                        ? 'bg-[#1D61E7] text-white font-black shadow-md'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
                    <span>{isAmharic ? 'ኮውአር ኮድ ፈትሽ' : 'Scan QR Code'}</span>
                  </button>
                )}

                {/* 4. Payment Receipts Entry */}
                {isTaskViewable(userRole, 1) && (
                  <button
                    type="button"
                    onClick={() => setActivePage('payment_receipts')}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      activePage === 'payment_receipts'
                        ? 'bg-[#1D61E7] text-white font-black shadow-md'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px] text-emerald-400">receipt_long</span>
                    <span>{isAmharic ? 'የክፍያ ደረሰኞች' : 'Payment Receipts'}</span>
                  </button>
                )}

                {/* 4. Optional: View Submissions (Controlled by Super Admin toggle) */}
                {settings.showClerkSubmissionsAction && isTaskViewable(userRole, 8) && (
                  <button
                    type="button"
                    onClick={() => setActivePage('tables')}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      activePage === 'tables'
                        ? 'bg-[#1D61E7] text-white font-black shadow-md'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">folder_open</span>
                    <span>{isAmharic ? 'የቀረቡ ማመልከቻዎች' : 'View Submissions'}</span>
                  </button>
                )}

                {/* 5. Optional: Approved Motor Registry (Controlled by Super Admin toggle) */}
                {settings.showClerkApprovedVehiclesAction && isTaskViewable(userRole, 8) && (
                  <button
                    type="button"
                    onClick={() => {
                      setTableInitialTab('approved');
                      setActivePage('tables');
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      activePage === 'tables'
                        ? 'bg-[#1D61E7] text-white font-black shadow-md'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">verified</span>
                    <span>{isAmharic ? 'የፀደቁ ተሽከርካሪዎች' : 'Approved Registry'}</span>
                  </button>
                )}

                {/* 6. Inspection Report Link (if clerk permitted) */}
                {isTaskViewable(userRole, 10) && (
                  <button
                    type="button"
                    onClick={() => {
                      setInspectionInitialFilter('all');
                      setActivePage('inspection_report');
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      activePage === 'inspection_report'
                        ? 'bg-[#1D61E7] text-white font-black shadow-md'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">analytics</span>
                    <span>{isAmharic ? 'የፍተሻ ሪፖርት' : 'Inspection Report'}</span>
                  </button>
                )}
              </>
            ) : (
              /* NON-CLERK ROLES (ADMIN, OFFICER, SUPERADMIN) */
              <>
                {/* Registration Link */}
                {userRole !== 'officer' && isTaskViewable(userRole, 1) && (
                  <button
                    type="button"
                    onClick={() => setActivePage('forms')}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      activePage === 'forms'
                        ? 'bg-[#1D61E7] text-white font-black shadow-md'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">how_to_reg</span>
                    <span>{isAmharic ? 'ምዝገባ' : 'Registration'}</span>
                  </button>
                )}

                {/* Payment Receipts Link */}
                {userRole !== 'officer' && isTaskViewable(userRole, 1) && (
                  <button
                    type="button"
                    onClick={() => setActivePage('payment_receipts')}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      activePage === 'payment_receipts'
                        ? 'bg-[#1D61E7] text-white font-black shadow-md'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px] text-emerald-400">receipt_long</span>
                    <span>{isAmharic ? 'የክፍያ ደረሰኞች' : 'Payment Receipts'}</span>
                  </button>
                )}

                {/* Records Table Link */}
                {userRole !== 'officer' && isTaskViewable(userRole, 8) && (
                  <button
                    type="button"
                    onClick={() => setActivePage('tables')}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      activePage === 'tables'
                        ? 'bg-[#1D61E7] text-white font-black shadow-md'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">table_chart</span>
                    <span>{isAmharic ? 'ሬኮርዶች' : 'Records & Tables'}</span>
                  </button>
                )}

                {/* Inspection Report Link */}
                {isTaskViewable(userRole, 10) && (
                  <button
                    type="button"
                    onClick={() => {
                      setInspectionInitialFilter('all');
                      setActivePage('inspection_report');
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      activePage === 'inspection_report'
                        ? 'bg-[#1D61E7] text-white font-black shadow-md'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">analytics</span>
                    <span>{isAmharic ? 'የፍተሻ ሪፖርት' : 'Inspection Report'}</span>
                  </button>
                )}

                {/* Scan QR Scanner Link */}
                {isTaskViewable(userRole, 5) && (
                  <button
                    type="button"
                    onClick={() => setActivePage('scan')}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      activePage === 'scan'
                        ? 'bg-[#1D61E7] text-white font-black shadow-md'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
                    <span>{isAmharic ? 'QR ፍተሻ' : 'Scan QR'}</span>
                  </button>
                )}

                {/* Report Unregistered Vehicle Link */}
                <button
                  type="button"
                  onClick={() => setActivePage('report_unregistered')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    activePage === 'report_unregistered'
                      ? 'bg-[#1D61E7] text-white font-black shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px] text-amber-400">report_problem</span>
                  <span>{isAmharic ? 'ባልተመዘገበ ተሽከርካሪ ሪፖርት' : 'Report Unregistered'}</span>
                </button>

                {/* Unlawful Motors Link (Manager & Super Admin) */}
                {(userRole === 'admin' || userRole === 'superadmin' || userRole === 'super_admin') && (
                  <button
                    type="button"
                    onClick={() => setActivePage('unregistered_list')}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      activePage === 'unregistered_list'
                        ? 'bg-[#1D61E7] text-white font-black shadow-md'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px] text-red-400">no_drinks</span>
                    <span>{isAmharic ? 'ህገ-ወጥ ሞተሮች' : 'Unlawful Motors'}</span>
                  </button>
                )}
              </>
            )}

            {/* Super Admin Dedicated Governance Links (SUPER ADMIN ONLY) */}
            {(userRole === 'superadmin') && (
              <div className="pt-2 mt-2 border-t border-white/15 space-y-1">
                <p className="text-[10px] font-black text-[#60A5FA] uppercase tracking-wider px-3 mb-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">admin_panel_settings</span>
                  <span>{isAmharic ? 'ዋና አስተዳዳሪ' : 'Super Admin'}</span>
                </p>

                {/* 1. System Users & Roles */}
                <button
                  type="button"
                  onClick={() => setActivePage('superadmin_users')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    activePage === 'superadmin_users' || activePage === 'superadmin'
                      ? 'bg-[#1D61E7] text-white font-black shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
                  <span>{isAmharic ? 'ሚና እና ፈቃድ' : 'Roles & Permissions'}</span>
                </button>

                {/* 2. Sub-City Governance */}
                <button
                  type="button"
                  onClick={() => setActivePage('superadmin_subcities')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    activePage === 'superadmin_subcities'
                      ? 'bg-[#1D61E7] text-white font-black shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">location_city</span>
                  <span>{isAmharic ? 'የክፍለ ከተማ ቁጥጥር' : 'Sub-City Governance'}</span>
                </button>

                {/* 4. Master Permit Controls */}
                <button
                  type="button"
                  onClick={() => setActivePage('superadmin_permits')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    activePage === 'superadmin_permits'
                      ? 'bg-[#1D61E7] text-white font-black shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  <span>{isAmharic ? 'የፈቃድ ቁጥጥር' : 'Master Permit Rules'}</span>
                </button>

                {/* 5. System Maintenance & DB */}
                <button
                  type="button"
                  onClick={() => setActivePage('superadmin_maintenance')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    activePage === 'superadmin_maintenance'
                      ? 'bg-[#1D61E7] text-white font-black shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">database</span>
                  <span>{isAmharic ? 'የሲስተም ጥገና' : 'System Maintenance'}</span>
                </button>
              </div>
            )}

            {/* Universal Settings Page Link (For All Roles) */}
            <div className="pt-2 mt-2 border-t border-white/15">
              <button
                type="button"
                onClick={() => {
                  setActivePage('settings');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  activePage === 'settings'
                    ? 'bg-[#1D61E7] text-white font-black shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">settings</span>
                <span>{isAmharic ? 'ቅንብሮች' : 'Settings'}</span>
              </button>
            </div>
          </nav>

          {/* Sidebar Bottom Profile Card & Logout (Matching Image Exact Structure) */}
          <div className="pt-3 border-t border-[#1E3466] space-y-2 mt-auto">
            <div className="bg-[#112248] border border-[#1E3466] rounded-md p-2.5 flex items-center gap-2.5 text-white shadow-xs">
              <div className="w-9 h-9 rounded-full bg-slate-200 border-2 border-amber-400 shrink-0 overflow-hidden shadow-xs flex items-center justify-center">
                <img src={APP_LOGO} alt="User Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-black text-white block truncate leading-tight">
                  {userBadgeId ? userBadgeId : (isAmharic ? 'አቶ መፈሪያ' : 'Mr. Meferiya')}
                </span>
                <span className="text-[10px] text-slate-300 font-medium block truncate">
                  {userRole === 'superadmin' ? 'Super Admin' : userRole === 'admin' ? 'Manager' : userRole === 'clerk' ? 'Secretary' : 'Officer'}
                </span>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[10px] text-emerald-400 font-bold">Online</span>
                </div>
              </div>
            </div>

            {/* Bottom Non-Red Logout Button (With Confirmation Modal) */}
            <button
              type="button"
              onClick={() => setIsLogoutModalOpen(true)}
              className="w-full bg-[#132A5E] hover:bg-[#1A387C] text-white border border-[#2A4E9B] font-extrabold text-xs py-2.5 rounded-md flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-98"
            >
              <span className="material-symbols-outlined text-[18px] text-amber-400">logout</span>
              <span>{isAmharic ? 'ወጣ (Logout)' : 'Logout'}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ==================== MAIN CONTAINER & TOP HEADER (md:pl-64) ==================== */}
      <div className="md:pl-64 flex-1 flex flex-col min-w-0 h-full max-h-full overflow-hidden">
        
        {/* MOBILE NAVIGATION HEADER (md:hidden) */}
        <header className="sticky top-0 z-50 bg-[#0B1E48] text-white border-b-2 border-yellow-500 shadow-md px-3 sm:px-6 py-2.5 md:hidden shrink-0">
          <div className="relative z-50 max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
              
              {/* Left Logo & App Brand Title */}
              <div className="flex items-center gap-2.5 min-w-0 shrink">
                <div className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 overflow-hidden">
                  <img src={APP_LOGO} alt="Logo" className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                </div>
                <div className="min-w-0">
                  <h1 id="header-text" className="font-extrabold text-xs sm:text-sm text-white tracking-tight leading-tight truncate">
                    {isAmharic ? 'ሕይወት ባህርዳር የሞተረኞች ማህበር' : 'HIWOT BAHIRDAR ASSOCIATION'}
                  </h1>
                  <p className="text-[9px] sm:text-[10px] text-yellow-300 font-normal tracking-wide truncate">
                    {isAmharic ? 'በአንድነት ለአስተማማኝና ለተሻለ አገልግሎት' : 'Together for Safe and Better service'}
                  </p>
                </div>
              </div>

              {/* Center Navigation Tabs (Visible on Tablet / Medium screens md:flex) */}
              <nav className="hidden md:flex items-center gap-1 bg-black/20 p-1 rounded-md border border-white/20 shrink-0">
                <button
                  type="button"
                  onClick={() => setActivePage('dashboard')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activePage === 'dashboard'
                      ? 'bg-yellow-500 text-[#0B1E48] shadow-xs font-black'
                      : 'text-white/90 hover:bg-white/15'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">space_dashboard</span>
                  <span>{isAmharic ? 'ዋና ገፅ' : 'Dashboard'}</span>
                </button>

                {userRole !== 'officer' && (
                  <button
                    type="button"
                    onClick={() => setActivePage('forms')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      activePage === 'forms'
                        ? 'bg-yellow-500 text-[#0B1E48] shadow-xs font-black'
                        : 'text-white/90 hover:bg-white/15'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                    <span>{isAmharic ? 'ምዝገባ' : 'Registration'}</span>
                  </button>
                )}

                {userRole !== 'officer' && (
                  <button
                    type="button"
                    onClick={() => setActivePage('tables')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      activePage === 'tables'
                        ? 'bg-yellow-500 text-[#0B1E48] shadow-xs font-black'
                        : 'text-white/90 hover:bg-white/15'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">table_chart</span>
                    <span>{isAmharic ? 'ሬኮርዶች' : 'Records'}</span>
                  </button>
                )}

                {isTaskViewable(userRole, 10) && (
                  <button
                    type="button"
                    onClick={() => {
                      setInspectionInitialFilter('all');
                      setActivePage('inspection_report');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      activePage === 'inspection_report'
                        ? 'bg-yellow-500 text-[#0B1E48] shadow-xs font-black'
                        : 'text-white/90 hover:bg-white/15'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">analytics</span>
                    <span>{isAmharic ? 'የፍተሻ ሪፖርት' : 'Inspection'}</span>
                  </button>
                )}

                {userRole !== 'clerk' && (
                  <button
                    type="button"
                    onClick={() => setActivePage('scan')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      activePage === 'scan'
                        ? 'bg-yellow-500 text-[#0B1E48] shadow-xs font-black'
                        : 'text-white/90 hover:bg-white/15'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
                    <span>{isAmharic ? 'ፍተሻ' : 'Scan'}</span>
                  </button>
                )}
              </nav>

              {/* Right Controls (UNIFIED MENU TOGGLE BUTTON) */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Mobile Drawer Menu Toggle */}
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  aria-label="Toggle Navigation Menu"
                  className="w-9 h-9 flex items-center justify-center rounded-md bg-white/10 border border-white/20 text-white hover:bg-white/20 active:scale-95 transition-all cursor-pointer shrink-0 shadow-2xs"
                >
                  <span className="material-symbols-outlined text-[22px]">
                    {isMobileMenuOpen ? 'close' : 'menu'}
                  </span>
                </button>
              </div>

            </div>
          </header>

        {/* Mobile Backdrop & Right Slide-Out Drawer Menu (Positioned BELOW top header) */}
        {isMobileMenuOpen && (
          <div
            className="fixed top-[53px] sm:top-[57px] inset-x-0 bottom-0 z-40 bg-slate-950/65 backdrop-blur-md transition-opacity duration-300 animate-in fade-in md:hidden flex justify-end"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            {/* Right Slide-Out Drawer Panel (Reduced Width for Mobile UI) */}
            <div
              className="relative w-64 sm:w-72 max-w-[78vw] h-full bg-[#0B1E48] text-white border-l border-yellow-500/30 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300 ease-out p-4 sm:p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-4">
                {/* Mobile Simple Ethiopian Calendar Date & Time Widget */}
                <div className="bg-gradient-to-r from-white/10 to-white/5 border border-yellow-500/30 rounded-lg p-3 text-white space-y-2 shadow-inner">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-yellow-400 font-extrabold text-xs">
                      <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                      <span>{isAmharic ? ethDate.formattedAm : ethDate.formattedEn}</span>
                    </div>
                    <span className="text-[10px] bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded font-black">
                      {isAmharic ? ethDate.weekdayAm : ethDate.weekdayEn}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-300 pt-1.5 border-t border-white/10 font-mono">
                    <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                      <span className="material-symbols-outlined text-[15px]">schedule</span>
                      <span>{isAmharic ? ethDate.timeAm : ethDate.timeEn}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-extrabold">
                      GMT+3
                    </span>
                  </div>
                </div>

                {/* Mobile Main Navigation Links */}
                <div className="space-y-1">
                  <p className="text-[10px] font-extrabold text-yellow-400/80 uppercase tracking-wider px-1 mb-1.5">
                    {isAmharic ? 'ዋና ክፍሎች' : 'Navigation Pages'}
                  </p>

                  {/* Dashboard */}
                  <button
                    type="button"
                    onClick={() => {
                      setActivePage('dashboard');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      activePage === 'dashboard'
                        ? 'bg-yellow-500 text-[#0B1E48] shadow-sm font-black'
                        : 'bg-white/5 border border-white/10 text-white hover:bg-white/15'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`material-symbols-outlined text-[20px] ${activePage === 'dashboard' ? 'text-[#0B1E48]' : 'text-yellow-400'}`}>
                        space_dashboard
                      </span>
                      <span className="font-extrabold">{isAmharic ? 'ዋና ገፅ' : 'Dashboard'}</span>
                    </div>
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>

                  {/* CLERK SPECIFIC MOBILE DRAWER - MATCHING QUICK ACTIONS */}
                  {userRole === 'clerk' ? (
                    <>
                      {/* 1. New Registration */}
                      <button
                        type="button"
                        onClick={() => {
                          setActivePage('forms');
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                          activePage === 'forms'
                            ? 'bg-yellow-500 text-[#0B1E48] shadow-sm font-black'
                            : 'bg-white/5 border border-white/10 text-white hover:bg-white/15'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`material-symbols-outlined text-[20px] ${activePage === 'forms' ? 'text-[#0B1E48]' : 'text-yellow-400'}`}>
                            how_to_reg
                          </span>
                          <span className="font-extrabold">{isAmharic ? 'አዲስ ምዝገባ' : 'New Registration'}</span>
                        </div>
                        <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                      </button>

                      {/* 2. Submission Correction */}
                      <button
                        type="button"
                        onClick={() => {
                          setActivePage('today_submissions_adjust');
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                          activePage === 'today_submissions_adjust'
                            ? 'bg-yellow-500 text-[#0B1E48] shadow-sm font-black'
                            : 'bg-white/5 border border-white/10 text-white hover:bg-white/15'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`material-symbols-outlined text-[20px] ${activePage === 'today_submissions_adjust' ? 'text-[#0B1E48]' : 'text-yellow-400'}`}>
                            edit_note
                          </span>
                          <span className="font-extrabold">{isAmharic ? 'ማመልከቻ ማስተካከያ' : 'Submission Correction'}</span>
                        </div>
                        <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                      </button>

                      {/* 3. Scan QR Code */}
                      <button
                        type="button"
                        onClick={() => {
                          setActivePage('scan');
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                          activePage === 'scan'
                            ? 'bg-yellow-500 text-[#0B1E48] shadow-sm font-black'
                            : 'bg-white/5 border border-white/10 text-white hover:bg-white/15'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`material-symbols-outlined text-[20px] ${activePage === 'scan' ? 'text-[#0B1E48]' : 'text-yellow-400'}`}>
                            qr_code_scanner
                          </span>
                          <span className="font-extrabold">{isAmharic ? 'ኮውአር ኮድ ፈትሽ' : 'Scan QR Code'}</span>
                        </div>
                        <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                      </button>

                      {/* 4. Optional: View Submissions */}
                      {settings.showClerkSubmissionsAction && (
                        <button
                          type="button"
                          onClick={() => {
                            setActivePage('tables');
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                            activePage === 'tables'
                              ? 'bg-yellow-500 text-[#0B1E48] shadow-sm font-black'
                              : 'bg-white/5 border border-white/10 text-white hover:bg-white/15'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={`material-symbols-outlined text-[20px] ${activePage === 'tables' ? 'text-[#0B1E48]' : 'text-yellow-400'}`}>
                              folder_open
                            </span>
                            <span className="font-extrabold">{isAmharic ? 'የቀረቡ ማመልከቻዎች' : 'View Submissions'}</span>
                          </div>
                          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                        </button>
                      )}

                      {/* 5. Optional: Approved Registry */}
                      {settings.showClerkApprovedVehiclesAction && (
                        <button
                          type="button"
                          onClick={() => {
                            setTableInitialTab('approved');
                            setActivePage('tables');
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                            activePage === 'tables'
                              ? 'bg-yellow-500 text-[#0B1E48] shadow-sm font-black'
                              : 'bg-white/5 border border-white/10 text-white hover:bg-white/15'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={`material-symbols-outlined text-[20px] ${activePage === 'tables' ? 'text-[#0B1E48]' : 'text-yellow-400'}`}>
                              verified
                            </span>
                            <span className="font-extrabold">{isAmharic ? 'የፀደቁ ተሽከርካሪዎች' : 'Approved Registry'}</span>
                          </div>
                          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                        </button>
                      )}
                    </>
                  ) : (
                    /* NON-CLERK MOBILE MENU */
                    <>
                      {/* Registration */}
                      {userRole !== 'officer' && (
                        <button
                          type="button"
                          onClick={() => {
                            setActivePage('forms');
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                            activePage === 'forms'
                              ? 'bg-yellow-500 text-[#0B1E48] shadow-sm font-black'
                              : 'bg-white/5 border border-white/10 text-white hover:bg-white/15'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={`material-symbols-outlined text-[20px] ${activePage === 'forms' ? 'text-[#0B1E48]' : 'text-yellow-400'}`}>
                              how_to_reg
                            </span>
                            <span className="font-extrabold">{isAmharic ? 'ምዝገባ' : 'Registration'}</span>
                          </div>
                          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                        </button>
                      )}

                      {/* Database Records */}
                      {userRole !== 'officer' && (
                        <button
                          type="button"
                          onClick={() => {
                            setActivePage('tables');
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                            activePage === 'tables'
                              ? 'bg-yellow-500 text-[#0B1E48] shadow-sm font-black'
                              : 'bg-white/5 border border-white/10 text-white hover:bg-white/15'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={`material-symbols-outlined text-[20px] ${activePage === 'tables' ? 'text-[#0B1E48]' : 'text-yellow-400'}`}>
                              table_chart
                            </span>
                            <span className="font-extrabold">{isAmharic ? 'ሬኮርዶች' : 'Records & Database'}</span>
                          </div>
                          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                        </button>
                      )}

                      {/* Inspection Report */}
                      {isTaskViewable(userRole, 10) && (
                        <button
                          type="button"
                          onClick={() => {
                            setInspectionInitialFilter('all');
                            setActivePage('inspection_report');
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                            activePage === 'inspection_report'
                              ? 'bg-yellow-500 text-[#0B1E48] shadow-sm font-black'
                              : 'bg-white/5 border border-white/10 text-white hover:bg-white/15'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={`material-symbols-outlined text-[20px] ${activePage === 'inspection_report' ? 'text-[#0B1E48]' : 'text-yellow-400'}`}>
                              analytics
                            </span>
                            <span className="font-extrabold">{isAmharic ? 'የፍተሻ ሪፖርት' : 'Inspection Report'}</span>
                          </div>
                          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                        </button>
                      )}

                      {/* Scan QR */}
                      <button
                        type="button"
                        onClick={() => {
                          setActivePage('scan');
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                          activePage === 'scan'
                            ? 'bg-yellow-500 text-[#0B1E48] shadow-sm font-black'
                            : 'bg-white/5 border border-white/10 text-white hover:bg-white/15'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`material-symbols-outlined text-[20px] ${activePage === 'scan' ? 'text-[#0B1E48]' : 'text-yellow-400'}`}>
                            qr_code_scanner
                          </span>
                          <span className="font-extrabold">{isAmharic ? 'QR ፍተሻ' : 'Scan QR'}</span>
                        </div>
                        <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                      </button>

                      {/* Unlawful Motors (Manager & Super Admin) */}
                      {(userRole === 'admin' || userRole === 'superadmin' || userRole === 'super_admin') && (
                        <button
                          type="button"
                          onClick={() => {
                            setActivePage('unregistered_list');
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                            activePage === 'unregistered_list'
                              ? 'bg-yellow-500 text-[#0B1E48] shadow-sm font-black'
                              : 'bg-white/5 border border-white/10 text-white hover:bg-white/15'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={`material-symbols-outlined text-[20px] ${activePage === 'unregistered_list' ? 'text-[#0B1E48]' : 'text-red-400'}`}>
                              no_drinks
                            </span>
                            <span className="font-extrabold">{isAmharic ? 'ህገ-ወጥ ሞተሮች' : 'Unlawful Motors'}</span>
                          </div>
                          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                        </button>
                      )}
                    </>
                  )}

                  {/* Separate Super Admin Functions Menu */}
                  {(userRole === 'superadmin') && (
                    <div className="pt-3 mt-3 border-t border-white/15 space-y-1">
                      <p className="text-[10px] font-extrabold text-amber-300 uppercase tracking-wider px-1 mb-1.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">admin_panel_settings</span>
                        <span>{isAmharic ? 'ዋና አስተዳዳሪ' : 'Super Admin'}</span>
                      </p>

                      <button
                        type="button"
                        onClick={() => {
                          setActivePage('superadmin_users');
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 p-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
                          activePage === 'superadmin_users' || activePage === 'superadmin'
                            ? 'bg-amber-400 text-[#0B1E48] font-black shadow-sm'
                            : 'bg-purple-950/40 border border-purple-500/30 text-purple-200 hover:bg-purple-900/40'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
                        <span>{isAmharic ? 'ሚና እና ፈቃድ' : 'Roles & Permissions'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActivePage('superadmin_subcities');
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 p-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
                          activePage === 'superadmin_subcities'
                            ? 'bg-amber-400 text-[#0B1E48] font-black shadow-sm'
                            : 'bg-purple-950/40 border border-purple-500/30 text-purple-200 hover:bg-purple-900/40'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">location_city</span>
                        <span>{isAmharic ? 'የክፍለ ከተማ ቁጥጥር' : 'Sub-City Governance'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActivePage('superadmin_permits');
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 p-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
                          activePage === 'superadmin_permits'
                            ? 'bg-amber-400 text-[#0B1E48] font-black shadow-sm'
                            : 'bg-purple-950/40 border border-purple-500/30 text-purple-200 hover:bg-purple-900/40'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">verified</span>
                        <span>{isAmharic ? 'የፈቃድ ቁጥጥር' : 'Master Permit Rules'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActivePage('superadmin_maintenance');
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 p-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
                          activePage === 'superadmin_maintenance'
                            ? 'bg-amber-400 text-[#0B1E48] font-black shadow-sm'
                            : 'bg-purple-950/40 border border-purple-500/30 text-purple-200 hover:bg-purple-900/40'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">database</span>
                        <span>{isAmharic ? 'የሲስተም ጥገና' : 'System Maintenance'}</span>
                      </button>
                    </div>
                  )}

                  {/* Settings Link for All Roles */}
                  <div className="pt-2 mt-2 border-t border-white/15">
                    <button
                      type="button"
                      onClick={() => {
                        setActivePage('settings');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        activePage === 'settings'
                          ? 'bg-yellow-500 text-[#0B1E48] shadow-sm font-black'
                          : 'bg-white/5 border border-white/10 text-white hover:bg-white/15'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`material-symbols-outlined text-[20px] ${activePage === 'settings' ? 'text-[#0B1E48]' : 'text-yellow-400'}`}>
                          settings
                        </span>
                        <span className="font-extrabold">{isAmharic ? 'ቅንብሮች' : 'Settings'}</span>
                      </div>
                      <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Drawer Bottom Actions */}
              <div className="space-y-3 pt-3 border-t border-white/15">
                <p className="text-[10px] font-extrabold text-yellow-400/80 uppercase tracking-wider px-1">
                  {isAmharic ? 'የስርዓት ማስተካከያ' : 'System Preferences'}
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {/* Language Toggle */}
                  <button
                    type="button"
                    onClick={onToggleLang}
                    className="flex items-center justify-between px-3 py-2 rounded-md bg-white/10 border border-white/20 text-xs font-bold text-white hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px]">translate</span>
                      <span>{currentLang === 'am' ? 'English' : 'አማርኛ'}</span>
                    </div>
                  </button>

                  {/* Theme Toggle */}
                  {onToggleTheme && (
                    <button
                      type="button"
                      onClick={onToggleTheme}
                      className="flex items-center justify-between px-3 py-2 rounded-md bg-white/10 border border-white/20 text-xs font-bold text-white hover:bg-white/20 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px]">
                          {currentTheme === 'dark' ? 'dark_mode' : 'light_mode'}
                        </span>
                        <span>{currentTheme === 'dark' ? 'Light' : 'Dark'}</span>
                      </div>
                    </button>
                  )}
                </div>

                {/* Mobile Non-Red Logout Button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsLogoutModalOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-[#132A5E] hover:bg-[#1A387C] border border-[#2A4E9B] text-white rounded-md text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  <span className="material-symbols-outlined text-[18px] text-amber-400">logout</span>
                  <span>{isAmharic ? 'ውጣ' : 'Sign Out'}</span>
                </button>
              </div>

            </div>
          </div>
        )}

        {/* DESKTOP TOP BAR (hidden md:flex) */}
        <header className="hidden md:flex items-center justify-between px-4 sm:px-6 py-3 bg-white text-slate-900 border-b border-slate-200/90 sticky top-0 z-40 shadow-2xs">
          {/* Left Side: Active Page Title */}
          <div className="flex items-center gap-3">
            <h2 className="font-black text-base text-[#0B1E48] tracking-tight flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[#1D61E7] text-[24px]">
                {activePage === 'dashboard' && 'space_dashboard'}
                {activePage === 'forms' && 'how_to_reg'}
                {activePage === 'today_submissions_adjust' && 'edit_note'}
                {activePage === 'tables' && 'table_chart'}
                {activePage === 'inspection_report' && 'analytics'}
                {activePage === 'workstation' && 'badge'}
                {activePage === 'scan' && 'qr_code_scanner'}
                {(activePage === 'superadmin_users' || activePage === 'superadmin') && 'manage_accounts'}
                {activePage === 'superadmin_subcities' && 'location_city'}
                {activePage === 'superadmin_security' && 'shield'}
                {activePage === 'superadmin_permits' && 'verified'}
                {activePage === 'superadmin_maintenance' && 'database'}
                {activePage === 'settings' && 'settings'}
              </span>
              <span>
                {activePage === 'dashboard' && (isAmharic ? 'ምግባር እና ፈቃድ አስተዳደር' : 'Role & Permission Management')}
                {activePage === 'forms' && (isAmharic ? 'የምዝገባ ቅጽ' : 'Motorcycle Registration Form')}
                {activePage === 'today_submissions_adjust' && (isAmharic ? 'የዛሬ ማመልከቻዎች ማስተካከያ' : "Today's Submissions & Corrections")}
                {activePage === 'tables' && (isAmharic ? 'የስርዓት መረጃዎችና ሬኮርዶች' : 'System Database & Records')}
                {activePage === 'inspection_report' && (isAmharic ? 'የፍተሻ ሪፖርት ማዕከል' : 'Inspection Report')}
                {activePage === 'workstation' && (isAmharic ? 'የተጠቃሚ ሚና ስራ ማዕከል' : 'Role Workstation')}
                {activePage === 'scan' && (isAmharic ? 'የQR ኮድ ፍተሻ ማዕከል' : 'QR Verification Scanner')}
                {(activePage === 'superadmin_users' || activePage === 'superadmin') && (isAmharic ? 'ሚና እና ፈቃድ' : 'Roles & Permissions')}
                {activePage === 'superadmin_subcities' && (isAmharic ? 'የክፍለ ከተሞች ቁጥጥር' : 'Sub-City Governance')}
                {activePage === 'superadmin_security' && (isAmharic ? 'የሴኪዩሪቲና ኦዲት ሬኮርዶች' : 'Security Audit & Log Center')}
                {activePage === 'superadmin_permits' && (isAmharic ? 'የፈቃድ ሰነዶች ቁጥጥር' : 'Master Permit Control')}
                {activePage === 'superadmin_maintenance' && (isAmharic ? 'የሲስተም ጥገናና ዳታቤዝ' : 'System Maintenance & Backups')}
                {activePage === 'settings' && (isAmharic ? 'የስርዓት እና የተጠቃሚ ቅንብሮች' : 'Account & System Settings')}
              </span>
            </h2>
          </div>

          {/* Right Side Tools: Notifications, Mail, Date Dropdown, User Dropdown */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Notification Bell Icon Button with Count Badge 5 */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200/90 flex items-center justify-center text-slate-700 transition-colors cursor-pointer"
                title="Notifications"
              >
                <span className="material-symbols-outlined text-[20px]">notifications</span>
                <span className="bg-rose-500 text-white text-[10px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center absolute -top-1 -right-1 shadow-2xs border-2 border-white">
                  5
                </span>
              </button>
            </div>

            {/* Real Working Ethiopian Calendar Date & Time Selector Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/90 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold px-3 py-1.5 rounded-md flex items-center gap-2 cursor-pointer transition-all shadow-2xs select-none"
                title={isAmharic ? 'የኢትዮጵያ ቀን መቁጠሪያ' : 'Ethiopian Calendar'}
              >
                <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-[18px]">calendar_month</span>
                <span className="font-extrabold">{isAmharic ? ethDate.formattedAm : ethDate.formattedEn}</span>
                <span className="hidden lg:inline text-[10px] bg-amber-500/15 text-amber-800 dark:text-amber-300 font-mono px-1.5 py-0.5 rounded font-bold">
                  {isAmharic ? ethDate.timeAm : ethDate.timeEn}
                </span>
                <span className="material-symbols-outlined text-slate-400 text-[16px]">
                  {isDateDropdownOpen ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {/* Interactive Ethiopian Calendar Dropdown */}
              {isDateDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-80 sm:w-88 bg-surface-container-lowest border border-outline-variant/80 rounded-xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-on-surface"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Municipal Calendar Header */}
                  <div className="bg-[#0B1E48] text-white p-3.5 rounded-lg border-b-2 border-yellow-500 space-y-1 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-yellow-400 uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">event</span>
                        {isAmharic ? 'የኢትዮጵያ ቀን መቁጠሪያ' : 'Ethiopian National Calendar'}
                      </span>
                      <span className="text-[11px] font-black bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded">
                        {ethDate.weekdayAm} ({ethDate.weekdayEn})
                      </span>
                    </div>
                    <div className="text-base font-black tracking-tight text-white">
                      {ethDate.monthNameAm} {ethDate.day} ቀን {ethDate.year} ዓ.ም
                    </div>
                    <div className="text-xs text-slate-300 font-medium">
                      {ethDate.monthNameEn} {ethDate.day}, {ethDate.year} EC
                    </div>
                  </div>

                  {/* Real-time Digital Clocks */}
                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                    <div className="bg-surface-container p-2.5 rounded-lg border border-outline-variant/60">
                      <span className="text-[10px] text-outline block font-medium">
                        {isAmharic ? 'መደበኛ ሰዓት' : 'Standard Time'}
                      </span>
                      <span className="font-mono font-black text-xs text-primary flex items-center gap-1 mt-0.5">
                        <span className="material-symbols-outlined text-[14px] text-amber-500">schedule</span>
                        {isAmharic ? ethDate.timeAm : ethDate.timeEn}
                      </span>
                    </div>

                    <div className="bg-surface-container p-2.5 rounded-lg border border-outline-variant/60">
                      <span className="text-[10px] text-outline block font-medium">
                        {isAmharic ? 'የሀገር ባህል ሰዓት' : 'Ethiopian Local Time'}
                      </span>
                      <span className="font-mono font-black text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1 mt-0.5">
                        <span className="material-symbols-outlined text-[14px]">sunny</span>
                        {ethDate.traditionalTimeAm}
                      </span>
                    </div>
                  </div>

                  {/* Ethiopian Calendar Date & GMT+3 Standard */}
                  <div className="mt-3 bg-surface-container/60 p-2.5 rounded-lg border border-outline-variant/40 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-outline block">
                        {isAmharic ? 'የኢትዮጵያ ካሌንደር (GMT+3)' : 'Ethiopian Calendar (GMT+3)'}
                      </span>
                      <span className="font-bold text-on-surface">
                        {isAmharic ? ethDate.formattedAm : ethDate.formattedEn}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-extrabold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
                      GMT+3
                    </span>
                  </div>

                  {/* Calendar Quick Month Navigation Grid for Visual Display */}
                  <div className="mt-3 pt-3 border-t border-outline-variant/60">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-on-surface">
                        {isAmharic ? `የወሩ ቀናት (${ethDate.monthNameAm})` : `Days of ${ethDate.monthNameEn}`}
                      </span>
                      <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                        {isAmharic ? 'ዛሬ: ' + ethDate.day : 'Today: ' + ethDate.day}
                      </span>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold">
                      {['እ', 'ሰ', 'ማ', 'ረ', 'ሐ', 'ዓ', 'ቅ'].map((day, idx) => (
                        <div key={idx} className="text-outline text-[9px] py-0.5">
                          {day}
                        </div>
                      ))}
                      {Array.from({ length: ethDate.isPagume ? 6 : 30 }, (_, i) => i + 1).map((d) => (
                        <div
                          key={d}
                          className={`py-1 rounded font-mono ${
                            d === ethDate.day
                              ? 'bg-[#0B1E48] text-yellow-300 font-black shadow-xs ring-1 ring-yellow-400'
                              : 'text-on-surface/80 hover:bg-surface-container'
                          }`}
                        >
                          {d}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Close / Dismiss */}
                  <div className="mt-3 pt-2 border-t border-outline-variant/40 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsDateDropdownOpen(false)}
                      className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface transition-colors cursor-pointer"
                    >
                      {isAmharic ? 'ዝጋ' : 'Close'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Top-Right Active User Dropdown Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="bg-slate-100 border border-slate-200/90 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-md flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
              >
                <div className="w-6 h-6 rounded-full bg-[#0B1E48] text-white flex items-center justify-center shrink-0 border border-slate-200">
                  <span className="material-symbols-outlined text-[14px]">person</span>
                </div>
                <div className="text-left hidden sm:block">
                  <span className="text-xs font-black text-slate-900 block leading-tight">
                    {userBadgeId ? userBadgeId : (isAmharic ? 'አቶ መፈሪያ' : 'Mr. Meferiya')}
                  </span>
                </div>
                <span className="material-symbols-outlined text-slate-500 text-[18px]">expand_more</span>
              </button>

              {/* User Dropdown Menu */}
              {isUserDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-black text-slate-900">
                      {userBadgeId ? userBadgeId : (isAmharic ? 'አቶ መፈሪያ' : 'Mr. Meferiya')}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium capitalize">
                      {userRole === 'superadmin' ? 'Super Admin' : userRole === 'admin' ? 'Manager' : userRole === 'clerk' ? 'Secretary' : 'Officer'}
                    </p>
                  </div>

                  {/* Role Switcher in Dropdown */}
                  {onSwitchRole && (
                    <div className="px-3 py-2 border-b border-slate-100 space-y-1">
                      <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                        {isAmharic ? 'ሚና ቀይር' : 'Switch Role'}
                      </p>
                      <div className="grid grid-cols-2 gap-1">
                        {(['clerk', 'admin', 'officer', 'superadmin'] as UserRole[]).map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => {
                              onSwitchRole(r);
                              setIsUserDropdownOpen(false);
                            }}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold capitalize text-left transition-all ${
                              userRole === r
                                ? 'bg-[#1D61E7] text-white font-extrabold'
                                : 'text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {r === 'admin' ? (isAmharic ? 'ሥራ አስኪያጅ' : 'Manager') : r === 'superadmin' ? (isAmharic ? 'ዋና አስተዳዳሪ' : 'Super Admin') : r}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Settings and Sign out options in User Dropdown */}
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setActivePage('settings');
                        setIsUserDropdownOpen(false);
                      }}
                      className="w-full px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-2 text-left cursor-pointer transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px] text-slate-500">settings</span>
                      <span>{isAmharic ? 'ቅንብሮች (Settings)' : 'Settings'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        setIsLogoutModalOpen(true);
                      }}
                      className="w-full px-3 py-2 text-xs font-bold text-[#0B1E48] hover:bg-slate-100 flex items-center gap-2 text-left cursor-pointer transition-colors border-t border-slate-100"
                    >
                      <span className="material-symbols-outlined text-[18px] text-amber-500">logout</span>
                      <span>{isAmharic ? 'ውጣ (Sign Out)' : 'Sign Out'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className={
          activePage === 'scan'
            ? "flex-1 w-full mx-auto p-0 max-w-none h-full min-h-0 max-h-full flex flex-col overflow-hidden"
            : "flex-1 overflow-y-auto w-full max-w-7xl md:max-w-[1600px] p-2.5 sm:p-3 md:p-6 pb-16 md:pb-8 space-y-3 md:space-y-6 mx-auto min-h-0"
        }>
          {/* BREADCRUMB NAVIGATION MENU */}
          {activePage !== 'scan' && (
            <nav aria-label="Breadcrumb" className="bg-transparent px-0.5 py-0.5 flex items-center overflow-x-auto scrollbar-none transition-all">
              <ol className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-medium text-slate-400 dark:text-slate-500 min-w-0">
                {breadcrumbItems.map((item, index) => {
                  const isLast = index === breadcrumbItems.length - 1;
                  return (
                    <li key={index} className="flex items-center gap-1 sm:gap-1.5 min-w-0 shrink-0">
                      {index > 0 && (
                        <span className="material-symbols-outlined text-[12px] sm:text-[13px] text-slate-300 dark:text-slate-600 shrink-0">
                          chevron_right
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setActivePage(item.page as any)}
                        disabled={isLast}
                        className={`flex items-center gap-1 py-0.5 px-2 rounded-md transition-all text-[11px] sm:text-xs font-medium ${
                          isLast
                            ? 'text-slate-400 dark:text-slate-500 cursor-default'
                            : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200/40 dark:hover:bg-slate-800/40 cursor-pointer'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px] sm:text-[15px] shrink-0 opacity-70">
                          {item.icon}
                        </span>
                        <span className="truncate max-w-[130px] sm:max-w-[220px]">{item.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>
          )}

          {isCurrentPageBlocked ? (
            renderBlockedPageUI()
          ) : (
            <>
              {/* PAGE 1: UNIVERSAL DASHBOARD OVERVIEW */}
              {activePage === 'dashboard' && (
                <MunicipalDashboardOverview
                  userBadgeId={userBadgeId}
                  userRole={userRole}
                  lang={currentLang}
                  registrations={registrations}
                  officers={officers}
                  verificationLogs={verificationLogs}
                  unregisteredReports={unregisteredReports}
                  paymentReceipts={paymentReceipts}
                  onQuickAction={handleQuickAction}
                  onAddVerificationLog={handleAddVerificationLog}
                />
              )}

              {/* PAGE 2: DEDICATED FORMS PAGE */}
              {activePage === 'forms' && (
                <FormsPage
                  lang={currentLang}
                  userRole={userRole}
                  userBadgeId={userBadgeId}
                  registrations={registrations}
                  officers={officers}
                  onAddRegistration={handleAddRegistration}
                  onViewRegistered={() => setActivePage('today_submissions_adjust')}
                  onAddOfficerAssignment={handleAddOfficerAssignment}
                />
              )}

              {/* PAGE: TODAY'S SUBMISSIONS / EDITING & CORRECTION */}
              {activePage === 'today_submissions_adjust' && (
                <TodaySubmissionsPage
                  lang={currentLang}
                  userRole={userRole}
                  userBadgeId={userBadgeId}
                  registrations={registrations}
                  onNavigateToNewRegistration={() => setActivePage('forms')}
                  onShowToast={(msg, type) => addToast(msg, type === 'warning' ? 'error' : type)}
                />
              )}

              {/* PAGE 3: DEDICATED TABLES & RECORDS PAGE */}
              {activePage === 'tables' && (
                <TablesPage
                  lang={currentLang}
                  userRole={userRole}
                  userBadgeId={userBadgeId}
                  registrations={registrations}
                  officers={officers}
                  verificationLogs={verificationLogs}
                  onApproveRegistration={handleApproveRegistration}
                  onRejectRegistration={handleRejectRegistration}
                  onAddVerificationLog={handleAddVerificationLog}
                  initialTableTab={tableInitialTab}
                />
              )}

              {/* PAGE: DEDICATED INSPECTION REPORT (VERIFICATION LOG) PAGE */}
              {activePage === 'inspection_report' && (
                <OfficerVerificationHistory
                  lang={currentLang}
                  userRole={userRole}
                  userBadgeId={userBadgeId}
                  registrations={registrations}
                  verificationLogs={verificationLogs}
                  onAddVerificationLog={handleAddVerificationLog}
                  initialStatusFilter={inspectionInitialFilter}
                />
              )}

              {/* PAGE: UNREGISTERED VEHICLE REPORT FORM */}
              {activePage === 'report_unregistered' && (
                <UnregisteredVehicleForm
                  lang={currentLang}
                  userRole={userRole}
                  userBadgeId={userBadgeId}
                  officerName={userRole === 'officer' ? 'Traffic Patrol Officer' : 'System Officer'}
                  onSubmitReport={handleAddUnregisteredReport}
                  onCancel={() => setActivePage('unregistered_list')}
                />
              )}

              {/* PAGE: UNREGISTERED VEHICLE REPORTS LIST */}
              {activePage === 'unregistered_list' && (
                <UnregisteredReportsList
                  lang={currentLang}
                  userRole={userRole}
                  userBadgeId={userBadgeId}
                  unregisteredReports={unregisteredReports}
                  onUpdateStatus={handleUpdateUnregisteredReportStatus}
                  onNewReportClick={() => setActivePage('report_unregistered')}
                  onOpenRegisterForm={() => setActivePage('forms')}
                />
              )}

              {/* PAGE: PAYMENT RECEIPT ENTRY & EXPIRATION METRICS */}
              {activePage === 'payment_receipts' && (
                <PaymentReceiptsPage
                  lang={currentLang}
                  userRole={userRole}
                  userBadgeId={userBadgeId}
                  paymentReceipts={paymentReceipts}
                  registrations={registrations}
                  onSaveReceipt={handleAddPaymentReceipt}
                  onAddPaymentReceipt={handleAddPaymentReceipt}
                  onDeleteReceipt={handleDeletePaymentReceipt}
                  onDeletePaymentReceipt={handleDeletePaymentReceipt}
                />
              )}

              {/* PAGE 7: SUPER ADMIN GOVERNANCE SEPARATE PAGES */}
              {activePage.startsWith('superadmin') && userRole === 'superadmin' && (
                <SuperAdminInterface
                  currentLang={currentLang}
                  currentUserBadgeId={userBadgeId}
                  initialTab={
                    activePage === 'superadmin_subcities'
                      ? 'subcities'
                      : activePage === 'superadmin_owners'
                      ? 'owners'
                      : activePage === 'superadmin_permits'
                      ? 'permits'
                      : activePage === 'superadmin_maintenance'
                      ? 'maintenance'
                      : 'users'
                  }
                  onShowToast={(msg, type) => addToast(msg, type === 'warning' ? 'error' : type)}
                />
              )}

              {/* PAGE 6: FULL-SCREEN QR SCANNER & VERIFICATION PAGE */}
              {activePage === 'scan' && (
                <SharedScannerModal
                  isOpen={true}
                  onClose={() => setActivePage('dashboard')}
                  lang={currentLang}
                  registrations={registrations}
                  userBadgeId={userBadgeId}
                  onAddVerificationLog={handleAddVerificationLog}
                  isPage={true}
                />
              )}

              {/* PAGE 8: UNIVERSAL USER & SYSTEM SETTINGS PAGE (ALL ROLES) */}
              {activePage === 'settings' && (
                <SettingsPage
                  userBadgeId={userBadgeId}
                  userRole={userRole}
                  currentLang={currentLang}
                  currentTheme={currentTheme}
                  onToggleLang={onToggleLang}
                  onToggleTheme={onToggleTheme}
                  onLogoutClick={() => setIsLogoutModalOpen(true)}
                />
              )}
            </>
          )}
        </main>

        {/* Modern, elegant system footer containing language and theme selectors */}
        <footer className="w-full border-t border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 mt-auto">
          <div className="text-slate-400 dark:text-slate-500 text-[11px] font-medium text-center sm:text-left">
            {isAmharic ? '© 2016 የግንቦት 12 የባህር ዳር ክፍለ ከተሞች ፈቃድ ቁጥጥር ስርዓት። መብቱ የተጠበቀ ነው።' : '© 2026 Bahir Dar Sub-City Permit Governance System. All rights reserved.'}
          </div>
          
          <div className="flex items-center gap-3">
            {/* Language Selector */}
            <button
              type="button"
              onClick={onToggleLang}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 transition-all cursor-pointer shadow-2xs"
            >
              <span className="material-symbols-outlined text-[16px] text-slate-500 dark:text-slate-400">translate</span>
              <span>{currentLang === 'am' ? 'English' : 'አማርኛ'}</span>
            </button>

            {/* Theme Selector */}
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 transition-all cursor-pointer shadow-2xs"
              >
                <span className="material-symbols-outlined text-[16px] text-slate-500 dark:text-slate-400">
                  {currentTheme === 'dark' ? 'light_mode' : 'dark_mode'}
                </span>
                <span>{currentTheme === 'dark' ? (isAmharic ? 'ብርሃን (Light)' : 'Light Mode') : (isAmharic ? 'ጨለማ (Dark)' : 'Dark Mode')}</span>
              </button>
            )}
          </div>
        </footer>
      </div>

      {/* Floating Toast Notification Stack */}
      <div id="toast-notifications-container" className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 w-full max-w-[360px] pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-lg shadow-lg border animate-fadeIn transition-all duration-300 ${
              toast.type === 'success'
                ? 'bg-surface-container-lowest text-on-surface border-emerald-500 border-l-4'
                : toast.type === 'info'
                ? 'bg-surface-container-lowest text-on-surface border-primary border-l-4'
                : 'bg-surface-container-lowest text-on-surface border-rose-500 border-l-4'
            }`}
          >
            <span className={`material-symbols-outlined text-[20px] shrink-0 mt-0.5 ${
              toast.type === 'success' ? 'text-emerald-500' : toast.type === 'info' ? 'text-primary' : 'text-rose-500'
            }`}>
              {toast.type === 'success' ? 'check_circle' : toast.type === 'info' ? 'info' : 'error'}
            </span>
            <div className="flex-1">
              <p className="text-xs font-bold leading-snug">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-secondary hover:text-on-surface shrink-0 cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-[16px] font-bold">close</span>
            </button>
          </div>
        ))}
      </div>

      {/* Universal Logout Confirmation Modal for All Users */}
      {isLogoutModalOpen && (
        <div
          className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsLogoutModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-xl shadow-2xl p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-200 text-on-surface"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-[#0B1E48] text-amber-400 flex items-center justify-center shrink-0 border border-yellow-500/40 shadow-xs">
                <span className="material-symbols-outlined text-[26px]">logout</span>
              </div>
              <div>
                <h3 className="text-base font-black text-on-surface tracking-tight">
                  {isAmharic ? 'ከሲስተም መውጣት ማረጋገጫ' : 'Confirm System Logout'}
                </h3>
                <p className="text-xs text-outline mt-0.5">
                  {isAmharic ? 'የስራ ክፍለ ጊዜዎን ማጠናቀቅ ይፈልጋሉ?' : 'Are you sure you want to end your active session?'}
                </p>
              </div>
            </div>

            <div className="bg-surface-container p-3.5 rounded-lg border border-outline-variant/60 text-xs space-y-1.5">
              <div className="flex justify-between items-center text-on-surface font-bold">
                <span className="text-outline">{isAmharic ? 'ተጠቃሚ መለያ:' : 'Logged User:'}</span>
                <span className="font-mono bg-surface-container-high px-2 py-0.5 rounded text-[11px] font-extrabold text-[#0B1E48] dark:text-yellow-400">
                  {userBadgeId || 'System User'}
                </span>
              </div>
              <div className="flex justify-between items-center text-on-surface font-bold">
                <span className="text-outline">{isAmharic ? 'የስራ ሚና:' : 'System Role:'}</span>
                <span className="uppercase text-[10px] tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-black">
                  {userRole}
                </span>
              </div>
              <p className="text-[11px] text-outline pt-1">
                {isAmharic
                  ? 'ከሲስተሙ ሲወጡ የአሁኑ የስራ ክፍለ ጊዜዎ ይዘጋል።'
                  : 'You will be safely signed out from your active workspace session.'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                className="px-4 py-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant text-xs font-bold text-on-surface transition-all cursor-pointer shadow-2xs active:scale-98"
              >
                {isAmharic ? 'ይቅር / ተመለስ' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLogoutModalOpen(false);
                  handleUserLogout();
                }}
                className="px-5 py-2.5 rounded-lg bg-[#132A5E] hover:bg-[#1A387C] text-white border border-[#2A4E9B] text-xs font-black shadow-sm transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px] text-amber-400">logout</span>
                <span>{isAmharic ? 'አዎ፣ ውጣ' : 'Yes, Sign Out'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
