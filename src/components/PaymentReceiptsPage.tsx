import React, { useState, useMemo } from 'react';
import { Language, UserRole, MotorcycleRegistration, PaymentReceipt } from '../types';
import { calculateOneMonthExpiration, getPaymentReceiptStatus } from '../utils/paymentUtils';
import { SmartImage } from './SmartImage';
import { getPermissionState, savePaymentReceiptToDb, deletePaymentReceiptFromDb } from '../services/dbService';
import { formatEthiopianDate } from '../utils/ethiopianCalendar';

interface PaymentReceiptsPageProps {
  userBadgeId: string;
  userRole: UserRole;
  lang: Language;
  registrations: MotorcycleRegistration[];
  paymentReceipts: PaymentReceipt[];
  initialFilter?: 'all' | 'active' | 'expiring_soon' | 'expired';
  onSaveReceipt?: (receipt: PaymentReceipt) => Promise<void>;
  onAddPaymentReceipt?: (receipt: PaymentReceipt) => Promise<void>;
  onDeleteReceipt?: (id: string) => Promise<void>;
  onDeletePaymentReceipt?: (id: string) => Promise<void>;
}

export const PaymentReceiptsPage: React.FC<PaymentReceiptsPageProps> = ({
  userBadgeId,
  userRole,
  lang,
  registrations,
  paymentReceipts,
  initialFilter = 'all',
  onSaveReceipt,
  onAddPaymentReceipt,
  onDeleteReceipt,
  onDeletePaymentReceipt,
}) => {
  const isAmharic = lang === 'am';

  // RBAC Permission checks for KPIs and Table
  const canViewKPIs = getPermissionState(userRole, 15) !== 'deny';
  const canViewTable = getPermissionState(userRole, 16) !== 'deny';

  // Toggle state for new receipt entry modal (Default to OPEN for clerk role)
  const [isFormOpen, setIsFormOpen] = useState(() => userRole === 'clerk');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [submitError, setSubmitError] = useState('');

  // Form Fields
  const [receiptNumber, setReceiptNumber] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [selectedRegId, setSelectedRegId] = useState<string>('');
  const [ownerName, setOwnerName] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [isAutoFilled, setIsAutoFilled] = useState(false);
  const currentDateStr = new Date().toISOString().split('T')[0];
  const paymentDate = currentDateStr;
  const [amount, setAmount] = useState<string>('500');
  const [receiptScreenshot, setReceiptScreenshot] = useState<string>('');
  const [notes, setNotes] = useState('');

  // Calculate 1 month expiration date live from paymentDate state
  const calculatedExpirationDate = useMemo(() => {
    return calculateOneMonthExpiration(paymentDate);
  }, [paymentDate]);

  // Derived state for fetched owner info, last expiration, and auto-calculated unpaid debt
  const selectedRegInfo = useMemo(() => {
    const val = regNumber.trim().toLowerCase();
    if (!val) return null;

    const found = registrations.find(
      (r) =>
        r.id.toLowerCase() === val ||
        (r.plateNumber && r.plateNumber.toLowerCase() === val) ||
        (r.engineOrSerialNo && r.engineOrSerialNo.toLowerCase() === val) ||
        r.fullName.toLowerCase() === val
    );

    if (!found) return null;

    // Find previous payment receipts for this owner registration ID or plate number
    const prevReceipts = paymentReceipts.filter(
      (rc) =>
        (rc.ownerRegistrationId && rc.ownerRegistrationId === found.id) ||
        (rc.plateNumber && found.plateNumber && rc.plateNumber.toLowerCase() === found.plateNumber.toLowerCase()) ||
        rc.ownerName.toLowerCase() === found.fullName.toLowerCase()
    );

    // Sort by expirationDate descending
    const sortedReceipts = [...prevReceipts].sort((a, b) => {
      return new Date(b.expirationDate).getTime() - new Date(a.expirationDate).getTime();
    });

    const latestReceipt = sortedReceipts[0] || null;

    let expirationStatusText = '';
    let expirationStatusType: 'active' | 'expiring_soon' | 'expired' | 'none' = 'none';
    let daysRemaining = 0;
    let unpaidDebtAmount = 0;
    let overdueMonths = 0;

    if (latestReceipt && latestReceipt.expirationDate) {
      const statusInfo = getPaymentReceiptStatus(latestReceipt.expirationDate);
      expirationStatusType = statusInfo.status;
      daysRemaining = statusInfo.daysRemaining;

      if (statusInfo.status === 'expired') {
        const daysOverdue = Math.abs(daysRemaining);
        overdueMonths = Math.max(1, Math.ceil(daysOverdue / 30));
        unpaidDebtAmount = overdueMonths * 500;
      } else {
        unpaidDebtAmount = 0;
      }
    } else {
      // No previous payment receipt on file
      expirationStatusType = 'none';
      unpaidDebtAmount = 500; // standard single term fee due
    }

    return {
      registration: found,
      latestReceipt,
      expirationStatusType,
      daysRemaining,
      unpaidDebtAmount,
      overdueMonths,
    };
  }, [regNumber, registrations, paymentReceipts]);

  // Filter & Search state for table
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expiring_soon' | 'expired'>(
    initialFilter
  );

  // Modal viewer state for full receipt screenshot inspection
  const [previewReceipt, setPreviewReceipt] = useState<PaymentReceipt | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Handle typing or selecting Registration Number
  const handleRegNumberChange = (value: string) => {
    setRegNumber(value);
    const val = value.trim().toLowerCase();

    if (!val) {
      setSelectedRegId('');
      setOwnerName('');
      setPlateNumber('');
      setPhone('');
      setIsAutoFilled(false);
      return;
    }

    // Lookup in database registrations by Registration ID, Plate Number, or Engine/Serial Number
    const found = registrations.find(
      (r) =>
        r.id.toLowerCase() === val ||
        (r.plateNumber && r.plateNumber.toLowerCase() === val) ||
        (r.engineOrSerialNo && r.engineOrSerialNo.toLowerCase() === val) ||
        r.fullName.toLowerCase() === val
    );

    if (found) {
      setSelectedRegId(found.id);
      setOwnerName(found.fullName || '');
      setPlateNumber(found.plateNumber || '');
      setPhone(found.phone || '');
      setIsAutoFilled(true);
    } else {
      setSelectedRegId('');
      setIsAutoFilled(false);
    }
  };

  // Image screenshot file upload handler
  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert(
        isAmharic
          ? 'የምስሉ መጠን ከ 8MB መብለጥ የለበትም።'
          : 'File size exceeds 8MB. Please choose a smaller image.'
      );
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptScreenshot(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submit payment receipt entry form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');

    if (!receiptNumber.trim()) {
      setSubmitError(
        isAmharic
          ? 'እባክዎን የደረሰኝ ቁጥር ያስገቡ!'
          : 'Please enter a valid receipt number!'
      );
      return;
    }

    if (!ownerName.trim()) {
      setSubmitError(
        isAmharic
          ? 'እባክዎን ትክክለኛ የምዝገባ ቁጥር ከመዝገቡ ይምረጡ!'
          : 'Please select or enter a valid Registration ID from the database!'
      );
      return;
    }

    // Check if owner already paid and current status is active
    if (selectedRegInfo && selectedRegInfo.expirationStatusType === 'active') {
      setSubmitError(
        isAmharic
          ? 'ይህ ባለቤት ክፍያ አስቀድሞ ፈፅሟል! የክፍያ ጊዜው ንቁ በመሆኑ ድጋሚ ክፍያ መፈፀም አይቻልም።'
          : 'This owner has already paid! Active payment term is valid. Re-payment is prevented.'
      );
      return;
    }

    // Check for duplicate receipt number
    const isDuplicateReceipt = paymentReceipts.some(
      (rc) => rc.receiptNumber.trim().toLowerCase() === receiptNumber.trim().toLowerCase()
    );
    if (isDuplicateReceipt) {
      setSubmitError(
        isAmharic
          ? 'ይህ የደረሰኝ ቁጥር አስቀድሞ ተመዝግቧል! እባክዎን ሌላ የደረሰኝ ቁጥር ያስገቡ።'
          : 'This receipt number has already been registered! Please enter a unique receipt number.'
      );
      return;
    }

    if (!paymentDate) {
      setSubmitError(
        isAmharic
          ? 'እባክዎን የክፍያ ቀን ይምረጡ!'
          : 'Please select a valid payment date!'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const expDate = calculateOneMonthExpiration(paymentDate);
      const newReceipt: PaymentReceipt = {
        id: `PAY-${Date.now().toString().slice(-6)}`,
        receiptNumber: receiptNumber.trim(),
        ownerRegistrationId: selectedRegId || undefined,
        ownerName: ownerName.trim(),
        plateNumber: plateNumber.trim() || undefined,
        phone: phone.trim() || undefined,
        paymentDate: paymentDate,
        expirationDate: expDate,
        amount: amount ? `${amount} ETB` : undefined,
        receiptScreenshot: receiptScreenshot || undefined,
        notes: notes.trim() || undefined,
        enteredBy: userBadgeId || 'Clerk',
        createdAt: new Date().toISOString(),
      };

      const saveFn = onSaveReceipt || onAddPaymentReceipt;
      if (typeof saveFn === 'function') {
        await saveFn(newReceipt);
      } else {
        await savePaymentReceiptToDb(newReceipt);
      }

      setSubmitSuccess(
        isAmharic
          ? 'የክፍያ ደረሰኝ በተሳካ ሁኔታ ተመዝግቧል!'
          : 'Payment receipt entered and saved successfully!'
      );

      // Reset form
      setReceiptNumber('');
      setRegNumber('');
      setSelectedRegId('');
      setOwnerName('');
      setPlateNumber('');
      setPhone('');
      setIsAutoFilled(false);
      setAmount('500');
      setReceiptScreenshot('');
      setNotes('');
      setIsFormOpen(false);
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to save payment receipt.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate Expiration Metrics across all recorded payment receipts
  const metrics = useMemo(() => {
    let total = paymentReceipts.length;
    let activeCount = 0;
    let expiringSoonCount = 0;
    let expiredCount = 0;

    paymentReceipts.forEach((rc) => {
      const { status } = getPaymentReceiptStatus(rc.expirationDate);
      if (status === 'active') activeCount++;
      else if (status === 'expiring_soon') expiringSoonCount++;
      else if (status === 'expired') expiredCount++;
    });

    return { total, activeCount, expiringSoonCount, expiredCount };
  }, [paymentReceipts]);

  // Filtered payment receipts list for the main table
  const filteredReceipts = useMemo(() => {
    return paymentReceipts.filter((rc) => {
      // Status filter
      const { status } = getPaymentReceiptStatus(rc.expirationDate);
      if (statusFilter !== 'all' && status !== statusFilter) {
        return false;
      }

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        rc.receiptNumber.toLowerCase().includes(q) ||
        rc.ownerName.toLowerCase().includes(q) ||
        (rc.plateNumber && rc.plateNumber.toLowerCase().includes(q)) ||
        (rc.phone && rc.phone.includes(q)) ||
        (rc.notes && rc.notes.toLowerCase().includes(q)) ||
        (rc.enteredBy && rc.enteredBy.toLowerCase().includes(q))
      );
    });
  }, [paymentReceipts, statusFilter, searchQuery]);

  const handleDeleteConfirmed = async () => {
    if (!deleteConfirmId) return;
    try {
      const delFn = onDeleteReceipt || onDeletePaymentReceipt;
      if (typeof delFn === 'function') {
        await delFn(deleteConfirmId);
      } else {
        await deletePaymentReceiptFromDb(deleteConfirmId);
      }
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Failed to delete receipt:', err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header & Action Bar */}
      <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#1D61E7]/10 text-[#1D61E7] border border-[#1D61E7]/20 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[24px]">receipt_long</span>
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-on-surface uppercase tracking-wide">
              {isAmharic ? 'የክፍያ ደረሰኞች መመዝገቢያ' : 'Payment Receipt Registry'}
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsFormOpen(!isFormOpen);
            setSubmitError('');
            setSubmitSuccess('');
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#1D61E7] hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">
            {isFormOpen ? 'close' : 'add_circle'}
          </span>
          <span>
            {isFormOpen
              ? isAmharic
                ? 'ፎርሙን ዝጋ'
                : 'Close Form'
              : isAmharic
              ? 'አዲስ ደረሰኝ መዝግብ'
              : 'New Payment Receipt'}
          </span>
        </button>
      </div>

      {/* Global Success Banner */}
      {submitSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-emerald-600 text-[22px]">check_circle</span>
            <span>{submitSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setSubmitSuccess('')}
            className="text-emerald-700 dark:text-emerald-400 hover:opacity-80 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* EXPIRATION METRICS DASHBOARD CARDS */}
      {canViewKPIs && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {/* Total Receipts */}
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-[#1D61E7] text-white border-blue-600 shadow-md ring-2 ring-blue-400'
                : 'bg-surface-container-lowest border-outline-variant hover:border-blue-300 text-on-surface'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">
                {isAmharic ? 'ጠቅላላ ደረሰኞች' : 'Total Receipts'}
              </span>
              <span className="material-symbols-outlined text-[22px] opacity-80">payments</span>
            </div>
            <div className="text-2xl font-black mt-2">{metrics.total}</div>
            <div className="text-[10px] opacity-75 mt-1 font-medium">
              {isAmharic ? 'በሲስተሙ የተመዘገቡ' : 'Logged in database'}
            </div>
          </button>

          {/* Active Receipts */}
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-400'
                : 'bg-emerald-500/5 dark:bg-emerald-950/30 border-emerald-500/30 hover:border-emerald-500 text-emerald-900 dark:text-emerald-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-90">
                {isAmharic ? 'ትክክለኛ (ህጋዊ)' : 'Active (Valid)'}
              </span>
              <span className="material-symbols-outlined text-[22px] text-emerald-500">verified</span>
            </div>
            <div className="text-2xl font-black mt-2 text-emerald-700 dark:text-emerald-300">
              {metrics.activeCount}
            </div>
            <div className="text-[10px] opacity-80 mt-1 font-semibold">
              {isAmharic ? 'ከ 5 ቀን በላይ የቀራቸው' : 'Valid > 5 days'}
            </div>
          </button>

          {/* Expiring Soon Receipts */}
          <button
            type="button"
            onClick={() => setStatusFilter('expiring_soon')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              statusFilter === 'expiring_soon'
                ? 'bg-amber-600 text-white border-amber-700 shadow-md ring-2 ring-amber-400'
                : 'bg-amber-500/5 dark:bg-amber-950/30 border-amber-500/30 hover:border-amber-500 text-amber-900 dark:text-amber-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-90">
                {isAmharic ? 'ሊያልቅ የደረሰ' : 'Expiring Soon'}
              </span>
              <span className="material-symbols-outlined text-[22px] text-amber-500 animate-pulse">
                alarm
              </span>
            </div>
            <div className="text-2xl font-black mt-2 text-amber-700 dark:text-amber-300">
              {metrics.expiringSoonCount}
            </div>
            <div className="text-[10px] opacity-80 mt-1 font-semibold">
              {isAmharic ? 'በ 5 ቀን ውስጥ የሚያልቅ' : 'Expires within 5 days'}
            </div>
          </button>

          {/* Expired Receipts */}
          <button
            type="button"
            onClick={() => setStatusFilter('expired')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              statusFilter === 'expired'
                ? 'bg-rose-600 text-white border-rose-700 shadow-md ring-2 ring-rose-400'
                : 'bg-rose-500/5 dark:bg-rose-950/30 border-rose-500/30 hover:border-rose-500 text-rose-900 dark:text-rose-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-90">
                {isAmharic ? 'ጊዜው ያለፈበት' : 'Expired'}
              </span>
              <span className="material-symbols-outlined text-[22px] text-rose-500">cancel</span>
            </div>
            <div className="text-2xl font-black mt-2 text-rose-700 dark:text-rose-300">
              {metrics.expiredCount}
            </div>
            <div className="text-[10px] opacity-80 mt-1 font-semibold">
              {isAmharic ? 'የ1 ወር ቫሊዲቲው ያለፈ' : '1 month period passed'}
            </div>
          </button>
        </div>
      )}

      {/* PAYMENT RECEIPT ENTRY FORM CARD */}
      {isFormOpen && (
        <form
          onSubmit={handleSubmitForm}
          className="bg-surface-container-lowest border-2 border-[#1D61E7]/40 rounded-xl p-4 sm:p-6 shadow-md space-y-5 animate-in fade-in slide-in-from-top-4 duration-200"
        >
          <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#1D61E7] text-[22px]">post_add</span>
              <h2 className="text-sm font-black text-on-surface uppercase tracking-wider">
                {isAmharic ? 'አዲስ የክፍያ ደረሰኝ መመዝገቢያ ፎርም' : 'New Payment Receipt Entry Form'}
              </h2>
            </div>
            <span className="text-[11px] font-extrabold text-slate-500">
              {isAmharic ? 'መዝጋቢ፦ ' : 'Clerk: '}
              <span className="text-[#1D61E7] font-black">{userBadgeId}</span>
            </span>
          </div>

          {submitError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{submitError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Receipt Number (Required) */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-on-surface uppercase tracking-wide">
                {isAmharic ? 'የደረሰኝ / ባንክ ቁጥር *' : 'Receipt / Ref Number *'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  placeholder={isAmharic ? 'ምሳሌ፦ FT24083091122' : 'e.g. FT24083091122 or REC-9921'}
                  className="w-full pl-9 pr-3 py-2 bg-surface-container/50 border border-outline-variant rounded-lg text-xs font-mono font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-[#1D61E7]"
                />
                <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-[18px] text-secondary">
                  receipt
                </span>
              </div>
            </div>

            {/* Registration Number Input Field */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-on-surface uppercase tracking-wide flex items-center justify-between">
                <span>{isAmharic ? 'የምዝገባ ቁጥር (ከሲስተም ይፈልጉ) *' : 'Registration ID (Fetch from DB) *'}</span>
                {regNumber && (
                  <button
                    type="button"
                    onClick={() => {
                      setRegNumber('');
                      setSelectedRegId('');
                      setOwnerName('');
                      setPlateNumber('');
                      setPhone('');
                      setIsAutoFilled(false);
                    }}
                    className="text-[10px] text-rose-600 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[12px]">cancel</span>
                    <span>{isAmharic ? 'አፅዳ' : 'Clear'}</span>
                  </button>
                )}
              </label>

              <div className="relative">
                <input
                  type="text"
                  required
                  value={regNumber}
                  onChange={(e) => handleRegNumberChange(e.target.value)}
                  list="reg-numbers-datalist"
                  placeholder={
                    isAmharic
                      ? 'የምዝገባ ቁጥር፣ ሰሌዳ፣ ወይም ሞተር ቁጥር አስገባ...'
                      : 'Enter Registration #, Plate #, or Engine #'
                  }
                  className="w-full pl-9 pr-3 py-2 bg-surface-container/50 border border-outline-variant rounded-lg text-xs font-mono font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-[#1D61E7]"
                />
                <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-[18px] text-secondary">
                  badge
                </span>
              </div>
              <datalist id="reg-numbers-datalist">
                {registrations.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.fullName} ({r.plateNumber || 'No Plate'})
                  </option>
                ))}
                {registrations
                  .filter((r) => r.plateNumber)
                  .map((r) => (
                    <option key={`plate-${r.id}`} value={r.plateNumber}>
                      {r.fullName} — Reg #: {r.id}
                    </option>
                  ))}
              </datalist>
            </div>
          </div>

          {/* FETCHED OWNER INFORMATION & AUTO-CALCULATED FINANCIAL / EXPIRATION STATUS */}
          <div className="bg-surface-container/30 border border-outline-variant/70 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-outline-variant/40 pb-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#1D61E7] text-[20px]">person_pin</span>
                <h3 className="text-xs font-black text-on-surface uppercase tracking-wider">
                  {isAmharic ? 'ከመዝገብ የተወጣጣ የባለቤት መረጃ & የክፍያ ሁኔታ' : 'Fetched Owner Info & Expiration Status'}
                </h3>
              </div>
              {selectedRegInfo ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">verified</span>
                  <span>{isAmharic ? 'ተገኝቷል' : 'Fetched from DB'}</span>
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 font-bold italic">
                  {isAmharic ? 'ምዝገባ ቁጥር ያስገቡ' : 'Enter Reg ID above'}
                </span>
              )}
            </div>

            {selectedRegInfo ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                {/* Fetched Owner Full Name */}
                <div className="bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/60">
                  <span className="block text-[10px] font-bold text-secondary uppercase">
                    {isAmharic ? 'የባለቤቱ ሙሉ ስም (ከDB የተወሰደ)' : 'Owner Full Name (Fetched)'}
                  </span>
                  <div className="text-xs font-black text-on-surface mt-1 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-blue-600">person</span>
                    <span>{selectedRegInfo.registration.fullName}</span>
                  </div>
                </div>

                {/* Fetched Plate Number */}
                <div className="bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/60">
                  <span className="block text-[10px] font-bold text-secondary uppercase">
                    {isAmharic ? 'የሰሌዳ ቁጥር (ከDB የተወሰደ)' : 'Plate Number (Fetched)'}
                  </span>
                  <div className="text-xs font-mono font-black text-on-surface mt-1 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-blue-600">numbers</span>
                    <span>{selectedRegInfo.registration.plateNumber || (isAmharic ? 'ሰሌዳ የለውም' : 'No Plate')}</span>
                  </div>
                </div>

                {/* Auto-Calculated Last Payment Expiration Status */}
                <div className="bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/60">
                  <span className="block text-[10px] font-bold text-secondary uppercase">
                    {isAmharic ? 'የመጨረሻ ክፍያ ማብቂያ ሁኔታ' : 'Last Payment Expiration Status'}
                  </span>
                  <div className="mt-1">
                    {selectedRegInfo.expirationStatusType === 'active' && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                        <span>
                          {isAmharic ? 'ህጋዊ' : 'Active'} ({selectedRegInfo.daysRemaining} {isAmharic ? 'ቀን ይቀራል' : 'days left'})
                        </span>
                      </span>
                    )}
                    {selectedRegInfo.expirationStatusType === 'expiring_soon' && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-black uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse">
                        <span className="material-symbols-outlined text-[14px]">alarm</span>
                        <span>
                          {isAmharic ? 'ሊያልቅ ነው' : 'Expiring Soon'} ({selectedRegInfo.daysRemaining} {isAmharic ? 'ቀን' : 'days'})
                        </span>
                      </span>
                    )}
                    {selectedRegInfo.expirationStatusType === 'expired' && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-black uppercase bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                        <span className="material-symbols-outlined text-[14px]">error</span>
                        <span>
                          {isAmharic ? 'ጊዜው አልፏል' : 'Expired'} ({Math.abs(selectedRegInfo.daysRemaining)} {isAmharic ? 'ቀን አልፏል' : 'days ago'})
                        </span>
                      </span>
                    )}
                    {selectedRegInfo.expirationStatusType === 'none' && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-black uppercase bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                        <span className="material-symbols-outlined text-[14px]">info</span>
                        <span>{isAmharic ? 'ቀደመ ክፍያ የለም' : 'No Previous Payment Recorded'}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Auto-Calculated Unpaid Debt */}
                <div className="bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/60">
                  <span className="block text-[10px] font-bold text-secondary uppercase">
                    {isAmharic ? 'ያልተከፈለ ዕዳ (በስሌት የተገኘ)' : 'Auto-Calculated Unpaid Debt'}
                  </span>
                  <div className="mt-1">
                    {selectedRegInfo.unpaidDebtAmount > 0 ? (
                      selectedRegInfo.overdueMonths > 0 ? (
                        <div className="text-xs font-black text-rose-600 dark:text-rose-400 flex items-center gap-1.5 bg-rose-500/10 px-2.5 py-1 rounded border border-rose-500/30">
                          <span className="material-symbols-outlined text-[16px]">warning</span>
                          <span>
                            {selectedRegInfo.unpaidDebtAmount} ETB ({selectedRegInfo.overdueMonths} {isAmharic ? 'ወር ያለፈበት' : 'Month(s) Overdue'})
                          </span>
                        </div>
                      ) : (
                        <div className="text-xs font-black text-amber-600 dark:text-amber-400 flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/30">
                          <span className="material-symbols-outlined text-[16px]">schedule</span>
                          <span>{selectedRegInfo.unpaidDebtAmount} ETB ({isAmharic ? 'አዲስ ክፍያ' : 'Current Term Due'})</span>
                        </div>
                      )
                    ) : (
                      <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/30">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        <span>0 ETB ({isAmharic ? 'ዕዳ የለበትም' : 'Payment Up to Date'})</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-slate-400 dark:text-slate-500 space-y-1">
                <span className="material-symbols-outlined text-[28px] text-slate-300 dark:text-slate-600">search_hands_free</span>
                <p className="text-xs font-bold">
                  {isAmharic
                    ? 'ከላይ የምዝገባ ቁጥር ሲያስገቡ የባለቤቱ ስም፣ ሰሌዳ፣ የክፍያ ማብቂያ ሁኔታ እና ዕዳ በራስ-ሰር ይታያል።'
                    : 'Enter or select a Registration ID above to auto-fetch Owner Name, Plate Number, Expiration Status, and Unpaid Debt.'}
                </p>
              </div>
            )}

            {/* Already Paid Warning Alert Box */}
            {selectedRegInfo && selectedRegInfo.expirationStatusType === 'active' && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2.5 text-amber-900 dark:text-amber-200 animate-fadeIn">
                <span className="material-symbols-outlined text-amber-600 text-[22px] shrink-0 mt-0.5">verified_user</span>
                <div className="space-y-0.5 text-xs">
                  <span className="font-extrabold block">
                    {isAmharic ? 'ባለቤቱ አስቀድሞ ክፍያ ፈፅሟል (Already Paid!)' : 'Owner Has Already Paid!'}
                  </span>
                  <p className="text-[11px] font-medium leading-relaxed">
                    {isAmharic
                      ? `የዚህ ባለቤት ክፍያ በንቃት ላይ ይገኛል (ቀሪ ቀን፦ ${selectedRegInfo.daysRemaining} ቀን)። የክፍያ ጊዜው ስላላለቀ ድጋሚ ክፍያ መክፈል አይቻልም።`
                      : `This owner's payment term is currently active (${selectedRegInfo.daysRemaining} days remaining). Re-payment is avoided.`}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Payment Amount */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-on-surface uppercase tracking-wide">
                {isAmharic ? 'የተከፈለው መጠን (ብር) *' : 'Amount Paid (ETB) *'}
              </label>
              <input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="500"
                className="w-full px-3 py-2 bg-surface-container/50 border border-outline-variant rounded-lg text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-[#1D61E7]"
              />
            </div>

            {/* Payment Date Display Badge (Auto-filled Today) */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-on-surface uppercase tracking-wide flex items-center justify-between">
                <span>{isAmharic ? 'የክፍያ ቀን (በራስ-ሰር የዛሬ ይሞላል)' : 'Payment Date (Auto-Filled Today)'}</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase">
                  {isAmharic ? 'በራስ-ሰር' : 'Auto-Filled'}
                </span>
              </label>
              <div className="w-full px-3.5 py-2 bg-surface-container/80 border border-outline-variant rounded-lg text-xs font-mono font-bold text-on-surface flex items-center justify-between">
                <span>{formatEthiopianDate(currentDateStr, isAmharic ? 'am' : 'en')} ({currentDateStr})</span>
                <span className="material-symbols-outlined text-[16px] text-emerald-600">today</span>
              </div>
            </div>

            {/* CALCULATED EXPIRATION DATE DISPLAY (1 MONTH TERM) */}
            <div className="space-y-1 md:col-span-2">
              <label className="block text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wide flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">event_available</span>
                <span>{isAmharic ? 'አዲስ የ1 ወር ማብቂያ ቀን (ከዛሬ ጀምሮ በስሌት የተገኘ)' : 'New 1 Month Expiry (Calculated from Today)'}</span>
              </label>
              <div className="w-full px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-lg text-xs font-black text-emerald-900 dark:text-emerald-300 flex items-center justify-between shadow-2xs">
                <span className="font-mono text-sm">{formatEthiopianDate(calculatedExpirationDate, isAmharic ? 'am' : 'en')} ({calculatedExpirationDate})</span>
                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-extrabold bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100">
                  +1 {isAmharic ? 'ወር' : 'Month'}
                </span>
              </div>
            </div>
          </div>

          {/* Screenshot Upload Dropzone */}
          <div className="space-y-2 pt-2 border-t border-outline-variant/60">
            <label className="block text-xs font-bold text-on-surface uppercase tracking-wide">
              {isAmharic ? 'የደረሰኝ ስክሪንሾት / ፎቶ (Receipt Screenshot Upload)' : 'Receipt Screenshot Upload'}
            </label>

            <div className="flex flex-col sm:flex-row items-center gap-4 bg-surface-container/40 p-3 rounded-lg border border-dashed border-outline-variant">
              {receiptScreenshot ? (
                <div className="relative w-32 h-24 rounded-lg overflow-hidden border border-outline-variant shadow-xs shrink-0 bg-black">
                  <img
                    src={receiptScreenshot}
                    alt="Receipt Screenshot"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setReceiptScreenshot('')}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs shadow-md cursor-pointer hover:bg-red-700"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="w-32 h-24 rounded-lg border border-outline-variant bg-surface-container flex flex-col items-center justify-center text-secondary shrink-0">
                  <span className="material-symbols-outlined text-[28px]">receipt</span>
                  <span className="text-[10px] font-bold mt-1">
                    {isAmharic ? 'ስክሪንሾት የለም' : 'No Screenshot'}
                  </span>
                </div>
              )}

              <div className="space-y-1.5 text-center sm:text-left">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleScreenshotUpload}
                  id="receipt-screenshot-upload"
                  className="hidden"
                />
                <label
                  htmlFor="receipt-screenshot-upload"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1D61E7] hover:bg-blue-700 text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
                >
                  <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                  <span>{isAmharic ? 'ስክሪንሾት / ደረሰኝ ፎቶ ስቀል' : 'Upload Receipt Screenshot'}</span>
                </label>
                <p className="text-[11px] text-secondary">
                  {isAmharic
                    ? 'የቴሌብር/የባንክ ማረጋገጫ ስክሪንሾት ወይም የወረቀት ደረሰኙን ፎቶ ያያይዙ።'
                    : 'Upload Telebirr, CBE, or physical paper treasury receipt screenshot.'}
                </p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-on-surface uppercase tracking-wide">
              {isAmharic ? 'ተጨማሪ ማብራሪያ' : 'Notes & Remarks'}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isAmharic ? 'ተጨማሪ መረጃ ካለ ያስገቡ...' : 'Add optional clerk notes...'}
              className="w-full px-3 py-2 bg-surface-container/50 border border-outline-variant rounded-lg text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-[#1D61E7]"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold transition-all cursor-pointer"
            >
              {isAmharic ? 'ሰርዝ' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || selectedRegInfo?.expirationStatusType === 'active'}
              className="px-5 py-2.5 rounded-lg bg-[#1D61E7] hover:bg-blue-700 disabled:bg-slate-400 dark:disabled:bg-slate-700 text-white text-xs font-black transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-75"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">
                    progress_activity
                  </span>
                  <span>{isAmharic ? 'እየተመዘገበ...' : 'Saving Receipt...'}</span>
                </>
              ) : selectedRegInfo?.expirationStatusType === 'active' ? (
                <>
                  <span className="material-symbols-outlined text-[18px]">block</span>
                  <span>{isAmharic ? 'ክፍያ አስቀድሞ ተፈፅሟል' : 'Already Paid (Prevented)'}</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  <span>{isAmharic ? 'የክፍያ ደረሰኝ መዝግብ' : 'Save Payment Receipt'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* TABLE SECTION TOOLBAR & FILTERS - Single Unified Container */}
      {canViewTable && (
        <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl shadow-2xs overflow-hidden divide-y divide-outline-variant/60">
          <div className="p-4 bg-surface-container-lowest flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Live Search Input */}
            <div className="relative flex-1 min-w-0 max-w-md">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-secondary">
                <span className="material-symbols-outlined text-[18px]">search</span>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isAmharic
                    ? 'በደረሰኝ #፣ በስም፣ ወይም በሰሌዳ ፈልግ...'
                    : 'Search receipt #, owner name, or plate...'
                }
                className="w-full pl-9 pr-8 py-2 bg-surface-container/50 border border-outline-variant rounded-lg text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-[#1D61E7]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-2.5 flex items-center text-secondary hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>

            {/* Status Filter Tabs in End-Closed With Icons Style */}
            <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar pt-1 shrink-0">
              {[
                {
                  id: 'all' as const,
                  icon: 'receipt_long',
                  label: isAmharic ? 'ሁሉም' : 'All',
                  count: metrics.total,
                  activeIconColor: 'text-primary',
                  badgeColor: 'bg-surface-container-highest text-secondary',
                },
                {
                  id: 'active' as const,
                  icon: 'check_circle',
                  label: isAmharic ? 'ትክክለኛ' : 'Active',
                  count: metrics.activeCount,
                  activeIconColor: 'text-emerald-600 dark:text-emerald-400',
                  badgeColor: 'bg-surface-container-highest text-secondary',
                },
                {
                  id: 'expiring_soon' as const,
                  icon: 'alarm',
                  label: isAmharic ? 'ሊያልቅ የደረሰ' : 'Expiring Soon',
                  count: metrics.expiringSoonCount,
                  activeIconColor: 'text-amber-600 dark:text-amber-400',
                  badgeColor:
                    metrics.expiringSoonCount > 0
                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                      : 'bg-surface-container-highest text-secondary',
                },
                {
                  id: 'expired' as const,
                  icon: 'event_busy',
                  label: isAmharic ? 'ጊዜው ያለፈበት' : 'Expired',
                  count: metrics.expiredCount,
                  activeIconColor: 'text-rose-600 dark:text-rose-400',
                  badgeColor:
                    metrics.expiredCount > 0
                      ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                      : 'bg-surface-container-highest text-secondary',
                },
              ].map((tab) => {
                const isActive = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
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
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold transition-colors ${
                        isActive
                          ? 'bg-surface-container-high text-on-surface'
                          : tab.badgeColor
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PAYMENT RECEIPTS TABLE - Connected View */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container/70 border-b border-outline-variant/70 text-[11px] font-black uppercase text-secondary tracking-wider">
                  <th className="p-3">{isAmharic ? 'የደረሰኝ ቁጥር' : 'Receipt #'}</th>
                  <th className="p-3">{isAmharic ? 'የባለቤት ስም & ሰሌዳ' : 'Owner & Vehicle'}</th>
                  <th className="p-3">{isAmharic ? 'የተከፈለበት ቀን' : 'Payment Date'}</th>
                  <th className="p-3">{isAmharic ? 'የ1 ወር ማብቂያ ቀን & ሁኔታ' : 'Expiration & Status'}</th>
                  <th className="p-3">{isAmharic ? 'መጠን (ብር)' : 'Amount'}</th>
                  <th className="p-3 text-center">{isAmharic ? 'ስክሪንሾት' : 'Proof'}</th>
                  <th className="p-3">{isAmharic ? 'መዝጋቢ' : 'Clerk'}</th>
                  <th className="p-3 text-right">{isAmharic ? 'ተግባራት' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40 text-xs font-medium text-on-surface">
                {filteredReceipts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-secondary">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <span className="material-symbols-outlined text-[36px] text-slate-400">
                          find_in_page
                        </span>
                        <p className="font-bold text-sm">
                          {isAmharic
                            ? 'ምንም የተመዘገበ የክፍያ ደረሰኝ አልተገኘም።'
                            : 'No payment receipts found matching criteria.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredReceipts.map((rc) => {
                    const { status, daysRemaining } = getPaymentReceiptStatus(rc.expirationDate);

                    return (
                      <tr
                        key={rc.id}
                        className="hover:bg-surface-container/30 transition-colors"
                      >
                        {/* Receipt Number */}
                        <td className="p-3 font-mono font-black text-on-surface">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 font-bold">
                            <span className="material-symbols-outlined text-[14px]">receipt</span>
                            <span>{rc.receiptNumber}</span>
                          </span>
                        </td>

                        {/* Owner & Vehicle Details */}
                        <td className="p-3 space-y-0.5">
                          <div className="font-extrabold text-on-surface">{rc.ownerName}</div>
                          <div className="flex items-center gap-2 text-[11px] text-secondary">
                            {rc.plateNumber && (
                              <span className="font-mono font-bold bg-surface-container px-1.5 py-0.5 rounded border border-outline-variant text-on-surface">
                                {rc.plateNumber}
                              </span>
                            )}
                            {rc.phone && <span>{rc.phone}</span>}
                          </div>
                        </td>

                        {/* Payment Date */}
                        <td className="p-3 font-medium whitespace-nowrap">
                          <div className="font-bold">{formatEthiopianDate(rc.paymentDate, isAmharic ? 'am' : 'en')}</div>
                        </td>

                        {/* Expiration Date & Status Badge */}
                        <td className="p-3 whitespace-nowrap">
                          <div className="font-mono font-bold text-on-surface">{formatEthiopianDate(rc.expirationDate, isAmharic ? 'am' : 'en')}</div>
                          <div className="mt-1">
                            {status === 'active' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                <span className="material-symbols-outlined text-[12px]">verified</span>
                                <span>
                                  {isAmharic ? 'ህጋዊ' : 'Active'} ({daysRemaining} {isAmharic ? 'ቀን ይቀራል' : 'd left'})
                                </span>
                              </span>
                            )}
                            {status === 'expiring_soon' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse">
                                <span className="material-symbols-outlined text-[12px]">alarm</span>
                                <span>
                                  {isAmharic ? 'ሊያልቅ ነው' : 'Expiring Soon'} ({daysRemaining} {isAmharic ? 'ቀን' : 'd'})
                                </span>
                              </span>
                            )}
                            {status === 'expired' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                                <span className="material-symbols-outlined text-[12px]">error</span>
                                <span>{isAmharic ? 'ጊዜው አልፏል' : 'Expired'}</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="p-3 font-extrabold whitespace-nowrap">
                          {rc.amount || '500 ETB'}
                        </td>

                        {/* Proof Screenshot Thumbnail */}
                        <td className="p-3 text-center">
                          {rc.receiptScreenshot ? (
                            <button
                              type="button"
                              onClick={() => setPreviewReceipt(rc)}
                              className="inline-block relative w-10 h-10 rounded-lg overflow-hidden border border-outline-variant shadow-2xs hover:scale-105 transition-transform cursor-pointer group"
                              title={isAmharic ? 'ስክሪንሾት በትልቅ መጠን ይመልከቱ' : 'View screenshot'}
                            >
                              <img
                                src={rc.receiptScreenshot}
                                alt="Receipt Proof"
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 flex items-center justify-center text-white">
                                <span className="material-symbols-outlined text-[14px]">zoom_in</span>
                              </div>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold italic">
                              {isAmharic ? 'ምንም ፎቶ የለም' : 'No Proof'}
                            </span>
                          )}
                        </td>

                        {/* Entered By Clerk */}
                        <td className="p-3 whitespace-nowrap">
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                            {rc.enteredBy}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="p-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {rc.receiptScreenshot && (
                              <button
                                type="button"
                                onClick={() => setPreviewReceipt(rc)}
                                className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-all cursor-pointer"
                                title={isAmharic ? 'እይታ' : 'View Proof'}
                              >
                                <span className="material-symbols-outlined text-[18px]">visibility</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(rc.id)}
                              className="p-1.5 rounded-md text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all cursor-pointer"
                              title={isAmharic ? 'ሰርዝ' : 'Delete'}
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
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
        </div>
      )}

      {/* FULLSCREEN RECEIPT PROOF INSPECTOR MODAL */}
      {previewReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl max-w-2xl w-full p-5 space-y-4 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div>
                <h3 className="text-base font-black text-on-surface uppercase tracking-wide flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600 text-[22px]">receipt</span>
                  <span>{isAmharic ? 'የክፍያ ደረሰኝ ስክሪንሾት' : 'Payment Receipt Screenshot'}</span>
                </h3>
                <p className="text-xs text-secondary font-mono mt-0.5">
                  #{previewReceipt.receiptNumber} — {previewReceipt.ownerName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewReceipt(null)}
                className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Proof Screenshot Image */}
            <div className="max-h-[60vh] overflow-auto rounded-xl bg-black/90 flex items-center justify-center p-2 border border-outline-variant">
              {previewReceipt.receiptScreenshot ? (
                <img
                  src={previewReceipt.receiptScreenshot}
                  alt="Full Receipt Proof"
                  className="max-h-[55vh] w-auto object-contain rounded-lg"
                />
              ) : (
                <div className="p-12 text-center text-slate-400">
                  {isAmharic ? 'ምንም ስክሪንሾት አልተያያዘም።' : 'No screenshot attached.'}
                </div>
              )}
            </div>

            {/* Receipt Summary Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-surface-container/50 p-3 rounded-xl text-xs">
              <div>
                <span className="block text-[10px] text-secondary font-bold uppercase">{isAmharic ? 'የክፍያ ቀን' : 'Payment Date'}</span>
                <span className="font-extrabold text-on-surface">{previewReceipt.paymentDate}</span>
              </div>
              <div>
                <span className="block text-[10px] text-secondary font-bold uppercase">{isAmharic ? 'የ1 ወር ማብቂያ' : 'Expiration Date'}</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{previewReceipt.expirationDate}</span>
              </div>
              <div>
                <span className="block text-[10px] text-secondary font-bold uppercase">{isAmharic ? 'መጠን' : 'Amount'}</span>
                <span className="font-extrabold text-on-surface">{previewReceipt.amount || '500 ETB'}</span>
              </div>
              <div>
                <span className="block text-[10px] text-secondary font-bold uppercase">{isAmharic ? 'መዝጋቢ' : 'Clerk'}</span>
                <span className="font-extrabold text-on-surface">{previewReceipt.enteredBy}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setPreviewReceipt(null)}
                className="px-5 py-2 rounded-lg bg-[#1D61E7] text-white text-xs font-bold hover:bg-blue-700 transition-all cursor-pointer"
              >
                {isAmharic ? 'ዝጋ' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-rose-600">
              <span className="material-symbols-outlined text-[28px]">warning</span>
              <h3 className="text-base font-black uppercase tracking-wide">
                {isAmharic ? 'የክፍያ ደረሰኝ ሰርዝ?' : 'Delete Payment Receipt?'}
              </h3>
            </div>
            <p className="text-xs text-secondary leading-relaxed">
              {isAmharic
                ? 'ይህንን የተመዘገበ የክፍያ ደረሰኝ ከሲስተሙ ለመሰረዝ እርግጠኛ ነዎት? ይህ ተግባር አይመለስም።'
                : 'Are you sure you want to delete this registered payment receipt? This action cannot be undone.'}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold transition-all cursor-pointer"
              >
                {isAmharic ? 'ተመለስ' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirmed}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-all cursor-pointer shadow-xs"
              >
                {isAmharic ? 'አዎ ሰርዝ' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
