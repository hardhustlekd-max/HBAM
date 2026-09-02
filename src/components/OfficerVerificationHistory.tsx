import React, { useState, useEffect, useRef } from 'react';
import { formatEthiopianDateTime } from '../utils/ethiopianCalendar';
import { Scanner } from '@yudiel/react-qr-scanner';
import jsQR from 'jsqr';
import { Language, MotorcycleRegistration, UserRole, VerificationLog } from '../types';
import { QRCodeCard } from './QRCodeCard';
import { ZoomableDocumentContainer } from './ZoomableDocumentContainer';
import { SharedScannerModal } from './SharedScannerModal';
import { SmartImage } from './SmartImage';
import { DataField, SelectField } from './ui/StreamlinedUI';


interface OfficerVerificationHistoryProps {
  lang: Language;
  userRole: UserRole;
  userBadgeId?: string;
  registrations: MotorcycleRegistration[];
  verificationLogs: VerificationLog[];
  onAddVerificationLog?: (log: VerificationLog) => void;
  initialStatusFilter?: 'all' | 'verified' | 'warning' | 'flagged';
}

export const OfficerVerificationHistory: React.FC<OfficerVerificationHistoryProps> = ({
  lang,
  userRole,
  userBadgeId,
  registrations,
  verificationLogs,
  onAddVerificationLog,
  initialStatusFilter = 'all',
}) => {
  const isAmharic = lang === 'am';

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'warning' | 'flagged'>(initialStatusFilter);

  useEffect(() => {
    if (initialStatusFilter) {
      setStatusFilter(initialStatusFilter);
      setCurrentPage(1);
    }
  }, [initialStatusFilter]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedLogForDetails, setSelectedLogForDetails] = useState<VerificationLog | null>(null);
  const [zoomedImage, setZoomedImage] = useState<{ url: string; title: string } | null>(null);

  // Collapsible state for mobile
  const [expandedLogIds, setExpandedLogIds] = useState<Record<string, boolean>>({});

  const toggleLogExpand = (id: string) => {
    setExpandedLogIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Scanner modal state
  const [showInlineScanner, setShowInlineScanner] = useState(false);
  const [scanPlateInput, setScanPlateInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scannedRegResult, setScannedRegResult] = useState<MotorcycleRegistration | null>(null);
  const [scanOfficerNotes, setScanOfficerNotes] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showFullCardInModal, setShowFullCardInModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter logs: verification logs for hidden registrations remain invisible and not tracked across all roles EXCEPT officer role and super user role
  const filteredLogs = verificationLogs.filter((log) => {
    // Check if this log corresponds to a hidden registration
    const isHidden = registrations.some((r) => r.hideFromOtherUsers && (
      (r.plateNumber && r.plateNumber.trim() !== '' && r.plateNumber.toLowerCase() === log.plateNumber?.toLowerCase()) ||
      (r.engineOrSerialNo && r.engineOrSerialNo.trim() !== '' && r.engineOrSerialNo.toLowerCase() === log.engineOrSerialNo?.toLowerCase())
    ));

    if (isHidden && userRole !== 'superadmin' && userRole !== 'super_admin' && userRole !== 'officer' && userRole !== 'admin') {
      return false;
    }

    const matchesSearch =
      (log.plateNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.phone || '').includes(searchTerm) ||
      (log.engineOrSerialNo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.officerNotes && log.officerNotes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' ? true : log.verificationStatus === statusFilter;
    const matchesCategory =
      categoryFilter === 'all'
        ? true
        : categoryFilter === 'gasoline' || categoryFilter === 'gas_under_110cc'
        ? log.vehicleCategory === 'gas_under_110cc' || (log.vehicleCategory as string) === 'gasoline'
        : log.vehicleCategory === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Calculate pagination slices
  const totalItems = filteredLogs.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const activePage = Math.min(currentPage, totalPages);
  const startIndex = (activePage - 1) * pageSize;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + pageSize);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleStartCameraScan = () => {
    setIsScanning(true);
    setScannedRegResult(null);
    setCameraError(null);
  };

  const processQRData = (qrData: string) => {
    const cleanData = qrData.trim();
    if (!cleanData) return;

    const cleanLower = cleanData.toLowerCase();

    // Smart matching across qrCodeData, plateNumber, id, engineOrSerialNo, fullName, phone
    const match = registrations.find((r) => {
      const q = (r.qrCodeData || '').toLowerCase();
      const p = (r.plateNumber || '').toLowerCase();
      const id = (r.id || '').toLowerCase();
      const e = (r.engineOrSerialNo || '').toLowerCase();
      const name = (r.fullName || '').toLowerCase();
      const phoneDigits = (r.phone || '').replace(/\D/g, '');
      const inputDigits = cleanLower.replace(/\D/g, '');

      return (
        (q && (cleanLower.includes(q) || q.includes(cleanLower))) ||
        (p && (cleanLower.includes(p) || p.includes(cleanLower))) ||
        (id && (cleanLower.includes(id) || id.includes(cleanLower))) ||
        (e && (cleanLower.includes(e) || e.includes(cleanLower))) ||
        (name && cleanLower.includes(name)) ||
        (phoneDigits && phoneDigits.length > 5 && inputDigits.includes(phoneDigits))
      );
    });

    if (match) {
      setIsScanning(false);
      setScannedRegResult(match);
      setShowFullCardInModal(false);
    } else {
      alert(
        isAmharic
          ? `የተቃኘው QR ኮድ በሲስተሙ አልተገኘም! (${cleanData})`
          : `Scanned QR code not found in system! (${cleanData})`
      );
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1000;
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });
          if (code) {
            processQRData(code.data);
          } else {
            alert(isAmharic ? 'ምንም QR ኮድ በምስሉ ላይ አልተገኘም!' : 'No QR code found in the image!');
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    // reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleScanResult = (detectedCodes: any[]) => {
    if (detectedCodes.length > 0) {
      const qrData = detectedCodes[0].rawValue;
      setIsScanning(false);
      processQRData(qrData);
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanPlateInput.trim()) return;
    const match = registrations.find(
      (r) =>
        (r.plateNumber || '').toLowerCase().includes(scanPlateInput.trim().toLowerCase()) ||
        (r.fullName || '').toLowerCase().includes(scanPlateInput.trim().toLowerCase()) ||
        (r.engineOrSerialNo || '').toLowerCase().includes(scanPlateInput.trim().toLowerCase())
    );
    if (match) {
      setScannedRegResult(match);
    } else {
      alert(isAmharic ? 'የተፈለገው ሰሌዳ በሲስተሙ አልተገኘም!' : 'No matching vehicle record found!');
    }
  };

  const handleSaveScanLog = () => {
    if (!scannedRegResult) return;

    const isPass = scannedRegResult.status === 'approved' || scannedRegResult.status === 'printed';

    const newLog: VerificationLog = {
      id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      scannedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      plateNumber: scannedRegResult.plateNumber,
      fullName: scannedRegResult.fullName,
      phone: scannedRegResult.phone,
      vehicleCategory: scannedRegResult.vehicleCategory,
      engineOrSerialNo: scannedRegResult.engineOrSerialNo,
      permitStatus: scannedRegResult.status,
      verificationStatus: isPass ? 'verified' : 'warning',
      officerNotes: scanOfficerNotes || (isPass ? 'Physical sticker & QR hash verified.' : 'Missing approved permit.'),
      officerBadgeId: userBadgeId || 'OFF-8842',
      locationName: 'Bole Road Roundabout Checkpoint',
      userPortraitPhoto: scannedRegResult.userPortraitPhoto || scannedRegResult.nationalIdPhoto,
      nationalIdPhoto: scannedRegResult.nationalIdPhoto,
      drivingLicensePhoto: scannedRegResult.drivingLicensePhoto,
      drivingPermitPhoto: scannedRegResult.drivingPermitPhoto,
    };

    if (onAddVerificationLog) {
      onAddVerificationLog(newLog);
    }

    setShowInlineScanner(false);
    setScannedRegResult(null);
    setScanOfficerNotes('');
    setScanPlateInput('');
  };

  // Match actual registration if present, otherwise construct fallback from log
  const actualReg = selectedLogForDetails
    ? registrations.find((r) =>
        (r.plateNumber && r.plateNumber.trim() !== '' && r.plateNumber.toLowerCase() === selectedLogForDetails.plateNumber?.toLowerCase()) ||
        (r.engineOrSerialNo && r.engineOrSerialNo.trim() !== '' && r.engineOrSerialNo.toLowerCase() === selectedLogForDetails.engineOrSerialNo?.toLowerCase()) ||
        r.id === selectedLogForDetails.id
      )
    : null;

  const selectedRegForCard: MotorcycleRegistration | null = selectedLogForDetails
    ? (actualReg
        ? {
            ...actualReg,
            status: selectedLogForDetails.permitStatus || actualReg.status,
            userPortraitPhoto: selectedLogForDetails.userPortraitPhoto || actualReg.userPortraitPhoto,
            nationalIdPhoto: selectedLogForDetails.nationalIdPhoto || actualReg.nationalIdPhoto,
            drivingLicensePhoto: selectedLogForDetails.drivingLicensePhoto || actualReg.drivingLicensePhoto,
            drivingPermitPhoto: selectedLogForDetails.drivingPermitPhoto || actualReg.drivingPermitPhoto,
          }
        : {
            id: selectedLogForDetails.id,
            fullName: selectedLogForDetails.fullName,
            phone: selectedLogForDetails.phone,
            vehicleCategory: selectedLogForDetails.vehicleCategory,
            engineOrSerialNo: selectedLogForDetails.engineOrSerialNo,
            plateNumber: selectedLogForDetails.plateNumber,
            registrationDate: selectedLogForDetails.scannedAt,
            status: selectedLogForDetails.permitStatus,
            qrCodeData: `PERMIT-${selectedLogForDetails.plateNumber}-${selectedLogForDetails.fullName}`,
            registeredBy: 'SYSTEM-OFFICER',
            nationalIdPhoto: selectedLogForDetails.nationalIdPhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
            drivingLicensePhoto: selectedLogForDetails.drivingLicensePhoto || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=300',
            drivingPermitPhoto: selectedLogForDetails.drivingPermitPhoto || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300',
            userPortraitPhoto: selectedLogForDetails.userPortraitPhoto,
          })
    : null;

  return (
    <div className="space-y-4">
      {/* Single Unified Container connecting Tabbar & Tabcontainer */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-xs overflow-hidden divide-y divide-outline-variant/60">
        {/* Filter and Search Bar Container */}
        <div className="p-3 bg-surface-container-lowest flex flex-col sm:flex-row justify-between items-center gap-3">
          {/* Search */}
          <div className="relative w-full sm:w-80">
            <div className="absolute inset-y-0 left-3 flex items-center justify-center pointer-events-none text-secondary">
              <span className="material-symbols-outlined text-[18px]">search</span>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isAmharic ? 'በሰሌዳ፣ ስም ወይም ማስታወሻ ፈልግ...' : 'Search plate, owner name, notes...'}
              className="w-full bg-surface border border-outline-variant rounded-md pl-10 pr-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Status & Category Filter Badges */}
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto flex-wrap">
            <SelectField
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">{isAmharic ? 'ሁሉም አይነቶች' : 'All Vehicle Types'}</option>
              <option value="electric">{isAmharic ? 'ኢቪ' : 'Electric (EV)'}</option>
              <option value="gasoline">{isAmharic ? 'ቤንዚን' : 'Gasoline'}</option>
            </SelectField>

            {/* Status Filter Tabs in End-Closed With Icons Style */}
            <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar pt-1 shrink-0">
              {[
                {
                  id: 'all' as const,
                  icon: 'history',
                  label: isAmharic ? 'ሁሉም' : 'All Logs',
                  activeIconColor: 'text-primary',
                },
                {
                  id: 'verified' as const,
                  icon: 'check_circle',
                  label: isAmharic ? 'የተረጋገጡ' : 'Verified',
                  activeIconColor: 'text-emerald-600 dark:text-emerald-400',
                },
                {
                  id: 'warning' as const,
                  icon: 'warning',
                  label: isAmharic ? 'ማስጠንቀቂያ' : 'Warning',
                  activeIconColor: 'text-amber-600 dark:text-amber-400',
                },
                {
                  id: 'flagged' as const,
                  icon: 'flag',
                  label: isAmharic ? 'የተከለከሉ' : 'Flagged',
                  activeIconColor: 'text-rose-600 dark:text-rose-400',
                },
              ].map((tab) => {
                const isActive = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setStatusFilter(tab.id);
                      setCurrentPage(1);
                    }}
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
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Verification Logs Table / Grid Container (Connected View) */}
        <div className="bg-surface-container-lowest overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <span className="material-symbols-outlined text-outline text-[44px]">manage_search</span>
            <p className="font-bold text-xs text-on-surface">
              {isAmharic ? 'ምንም የማረጋገጫ ታሪክ አልተገኘም' : 'No verification history records found.'}
            </p>
            <p className="hidden sm:block text-[11px] text-secondary">
              {isAmharic ? 'በሞባይል ካሜራ አዲስ QR በመቃኘት ማረጋገጫ ያስመዝግቡ።' : 'Scan a vehicle permit QR code to generate a new verification log.'}
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-outline-variant">
              {paginatedLogs.map((log) => {
                const isExpanded = !!expandedLogIds[log.id];
                return (
                  <div key={log.id} className="p-3 sm:p-4 hover:bg-surface-container/30 transition-colors">
                    {/* Collapsed Header / Mobile Compact Row */}
                    <div className="flex items-center justify-between gap-3 cursor-pointer select-none" onClick={() => toggleLogExpand(log.id)}>
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {/* Driver Portrait Photo Badge */}
                        <div className="relative w-10 h-11 sm:w-12 sm:h-14 rounded-md overflow-hidden border border-outline-variant shrink-0 bg-surface-container shadow-2xs">
                          <SmartImage
                            src={log.userPortraitPhoto || log.nationalIdPhoto}
                            alt={log.fullName}
                            fallbackIcon="person"
                            className="w-full h-full object-cover"
                          />
                          <div className={`absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center border border-white text-white font-bold shadow-xs ${
                            log.verificationStatus === 'verified'
                              ? 'bg-emerald-600'
                              : log.verificationStatus === 'warning'
                              ? 'bg-amber-600'
                              : 'bg-red-600'
                          }`}>
                            <span className="material-symbols-outlined text-[10px] sm:text-[12px]">
                              {log.verificationStatus === 'verified'
                                ? 'check'
                                : log.verificationStatus === 'warning'
                                ? 'priority_high'
                                : 'close'}
                            </span>
                          </div>
                        </div>

                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-extrabold text-xs sm:text-sm text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 shrink-0">
                              {log.plateNumber}
                            </span>
                            <span className="font-bold text-xs text-on-surface truncate max-w-[140px] sm:max-w-none">{log.fullName}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold ${
                              log.vehicleCategory === 'electric' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25' : 'bg-surface-container text-on-surface border border-outline-variant'
                            }`}>
                              {log.vehicleCategory === 'electric' ? 'EV' : 'Gasoline'}
                            </span>
                          </div>
                          <div className="text-[10px] text-secondary flex items-center gap-2">
                            <span>{log.scannedAt ? formatEthiopianDateTime(log.scannedAt, isAmharic ? 'am' : 'en') : '—'}</span>
                            <span>•</span>
                            <span className="font-bold text-primary">{log.locationName || 'Checkpoint'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Collapsible Toggle Button */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          log.permitStatus === 'printed' || log.permitStatus === 'approved'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                            : 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                        }`}>
                          {log.permitStatus}
                        </span>
                        <button
                          type="button"
                          className="w-8 h-8 rounded-full bg-surface-container/60 hover:bg-surface-container flex items-center justify-center text-outline cursor-pointer transition-colors"
                          title="Toggle Row Details"
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            {isExpanded ? 'expand_less' : 'expand_more'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Expandable Details Body */}
                    <div className={`${isExpanded ? 'block' : 'hidden md:block'} mt-3 pt-3 border-t border-outline-variant/50 space-y-2`}>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                          <DataField label={isAmharic ? 'ማስታወሻ፡' : 'Officer Notes:'} value={log.officerNotes || 'No notes attached.'} className="col-span-2" />
                          <DataField label={isAmharic ? 'ስልክ፡' : 'Phone:'} value={log.phone} isMono />
                          <DataField label={isAmharic ? 'ሴሪያል፡' : 'Serial:'} value={log.engineOrSerialNo} isMono />
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-1 md:pt-0">
                          <span className={`sm:hidden px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            log.permitStatus === 'printed' || log.permitStatus === 'approved'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                              : 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                          }`}>
                            {log.permitStatus}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLogForDetails(log);
                            }}
                            className="bg-primary hover:bg-primary-hover text-white font-bold text-xs px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                          >
                            <span className="material-symbols-outlined text-[16px]">visibility</span>
                            <span>{isAmharic ? 'ዝርዝር መረጃ' : 'View Scanned Vehicle'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls Bar */}
            <div className="bg-surface-container/30 border-t border-outline-variant px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-secondary font-medium">
              <div className="flex items-center gap-2">
                <span>{isAmharic ? 'በአንድ ገጽ:' : 'Per page:'}</span>
                <SelectField
                  value={String(pageSize)}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </SelectField>
                <span>
                  {isAmharic
                    ? `${startIndex + 1}-${Math.min(startIndex + pageSize, totalItems)} ከ ${totalItems} መዝገቦች`
                    : `Showing ${startIndex + 1}-${Math.min(startIndex + pageSize, totalItems)} of ${totalItems} entries`}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={activePage <= 1}
                  onClick={() => handlePageChange(activePage - 1)}
                  className="px-2.5 py-1 bg-surface hover:bg-surface-container border border-outline-variant rounded-lg disabled:opacity-40 disabled:cursor-not-allowed font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                  <span>{isAmharic ? 'ቀዳሚ' : 'Prev'}</span>
                </button>

                <span className="px-2 font-bold font-mono text-on-surface">
                  {activePage} / {totalPages}
                </span>

                <button
                  type="button"
                  disabled={activePage >= totalPages}
                  onClick={() => handlePageChange(activePage + 1)}
                  className="px-2.5 py-1 bg-surface hover:bg-surface-container border border-outline-variant rounded-lg disabled:opacity-40 disabled:cursor-not-allowed font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>{isAmharic ? 'ቀጣይ' : 'Next'}</span>
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
              </div>
            </div>
          </>
        )}
        </div>
      </div>

      {/* MODAL 1: DETAILED SCANNED VEHICLE INSPECTION */}
      {selectedLogForDetails && selectedRegForCard && (
        <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 transition-all duration-200">
          <div className="bg-surface-container-lowest sm:border border-outline-variant rounded-none sm:rounded-lg p-5 max-w-xl w-full h-full sm:h-auto space-y-4 shadow-xl sm:max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-outline-variant pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">directions_car</span>
                <h3 className="font-bold text-sm text-on-surface">
                  {isAmharic ? 'የተፈተሸ ተሽከርካሪ ዝርዝር መረጃ' : 'Scanned Vehicle & Permit Audit Details'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLogForDetails(null)}
                className="text-secondary hover:text-on-surface p-1 rounded-lg"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Officer Audit Badge & Driver Portrait Card */}
            <div className="p-3.5 bg-primary/10 border border-primary/20 rounded-md space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <p className="font-extrabold text-on-surface">{selectedLogForDetails.locationName || 'Checkpoint Scan'}</p>
                  <p className="text-secondary text-[11px]">
                    Scanned At: <span className="font-mono font-bold">{selectedLogForDetails.scannedAt}</span>
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                  selectedLogForDetails.verificationStatus === 'verified'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-amber-600 text-white'
                }`}>
                  {selectedLogForDetails.verificationStatus}
                </span>
              </div>

              {/* Driver Portrait Photo Cross-Verification Banner */}
              <div className="pt-2 border-t border-outline-variant flex items-center gap-3.5">
                <div
                  onClick={() => {
                    const imgUrl = selectedLogForDetails.userPortraitPhoto || selectedLogForDetails.nationalIdPhoto;
                    if (imgUrl) {
                      setZoomedImage({
                        url: imgUrl,
                        title: `${selectedLogForDetails.fullName} — ${isAmharic ? 'የባለቤት ፎቶ' : 'Driver Portrait'}`
                      });
                    }
                  }}
                  className="relative w-16 h-20 rounded-md overflow-hidden border-2 border-primary/40 shadow-sm shrink-0 bg-surface-container cursor-pointer group hover:opacity-90 transition-all"
                  title={isAmharic ? 'ለማጉላት ይጫኑ' : 'Click to Zoom Photo'}
                >
                  <SmartImage
                    src={selectedLogForDetails.userPortraitPhoto || selectedLogForDetails.nationalIdPhoto}
                    alt={selectedLogForDetails.fullName}
                    fallbackIcon="person"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <span className="material-symbols-outlined text-[18px]">zoom_in</span>
                  </div>
                  <span className="absolute bottom-0 inset-x-0 bg-primary/90 text-white text-[8px] font-black text-center py-0.5 tracking-wider uppercase">
                    VERIFIED
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/20 px-2 py-0.5 rounded-md">
                    <span className="material-symbols-outlined text-[14px]">badge</span>
                    <span>{isAmharic ? 'የባለቤት መታወቂያ ፎቶ' : 'Driver / Owner ID Portrait'}</span>
                  </span>
                  <h4 className="font-extrabold text-sm text-on-surface leading-tight">
                    {selectedLogForDetails.fullName}
                  </h4>
                  <p className="text-[11px] text-secondary font-medium">
                    {isAmharic ? 'የሰሌዳ ቁጥር:' : 'Plate:'} <span className="font-mono font-bold text-primary">{selectedLogForDetails.plateNumber}</span> • {selectedLogForDetails.phone}
                  </p>
                  <p className="text-[10px] text-secondary font-medium">
                    {isAmharic ? 'የተቆጣጣሪው ባጅ:' : 'Inspector Officer:'} <span className="font-mono font-bold">{selectedLogForDetails.officerBadgeId || userBadgeId || 'OFF-8842'}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Render Digital Permit Card with 100% Zoomable Container */}
            <div className="w-full">
              <ZoomableDocumentContainer
                lang={lang}
                userRole={userRole}
                title={isAmharic ? 'የባለቤትነት QR መታወቂያ' : 'Official Digital Permit & QR Badge'}
                onClose={() => setSelectedLogForDetails(null)}
              >
                <QRCodeCard registration={selectedRegForCard} lang={lang} />
              </ZoomableDocumentContainer>
            </div>

            {/* Officer Notes */}
            <div className="p-3 bg-surface-container rounded-md text-xs space-y-1">
              <p className="font-bold text-on-surface">{isAmharic ? 'የተቆጣጣሪው ማረጋገጫ ማስታወሻ:' : 'Officer Field Verification Notes:'}</p>
              <p className="text-secondary italic">"{selectedLogForDetails.officerNotes}"</p>
            </div>

            <button
              type="button"
              onClick={() => setSelectedLogForDetails(null)}
              className="w-full bg-primary text-white font-bold py-2.5 rounded-md text-xs cursor-pointer hover:bg-primary-hover transition-colors"
            >
              {isAmharic ? 'ዝጋ' : 'Close Details'}
            </button>
          </div>
        </div>
      )}

      {/* LIGHTBOX MODAL FOR EXPANDED DOCUMENT INSPECTION */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150 overflow-y-auto"
          onClick={() => setZoomedImage(null)}
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-4xl">
            <ZoomableDocumentContainer
              lang={lang}
              title={zoomedImage.title}
              onClose={() => setZoomedImage(null)}
              requireClerkRequest={false}
            >
              <img
                src={zoomedImage.url}
                alt={zoomedImage.title}
                referrerPolicy="no-referrer"
                className="max-h-[70vh] w-auto object-contain rounded-lg shadow-lg"
              />
            </ZoomableDocumentContainer>
          </div>
        </div>
      )}
    </div>
  );
};
