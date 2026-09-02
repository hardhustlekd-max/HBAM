import React, { useState, useEffect } from 'react';
import { Language } from '../types';

export interface StorageCalculationResult {
  totalBytes: number;
  dbBytes: number;
  filesBytes: number;
  totalKb: string;
  totalMb: string;
  dbKb: string;
  dbMb: string;
  filesKb: string;
  filesMb: string;
  fileCount: number;
  recordCount: number;
  quotaPercent: number;
  estimatedQuotaMb: number;
  keyBreakdown: Array<{
    key: string;
    totalBytes: number;
    dbBytes: number;
    filesBytes: number;
    totalFormatted: string;
    type: 'database' | 'file' | 'mixed' | 'system';
  }>;
}

export function calculateLocalStorageSize(): StorageCalculationResult {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {
      totalBytes: 0,
      dbBytes: 0,
      filesBytes: 0,
      totalKb: '0 KB',
      totalMb: '0.00 MB',
      dbKb: '0 KB',
      dbMb: '0.00 MB',
      filesKb: '0 KB',
      filesMb: '0.00 MB',
      fileCount: 0,
      recordCount: 0,
      quotaPercent: 0,
      estimatedQuotaMb: 5,
      keyBreakdown: [],
    };
  }

  let totalBytes = 0;
  let dbBytes = 0;
  let filesBytes = 0;
  let fileCount = 0;
  let recordCount = 0;

  const keyBreakdown: StorageCalculationResult['keyBreakdown'] = [];

  const formatKB = (b: number) => (b / 1024).toFixed(1) + ' KB';
  const formatMB = (b: number) => (b / (1024 * 1024)).toFixed(2) + ' MB';
  const formatDynamic = (b: number) => {
    if (b >= 1024 * 1024) return (b / (1024 * 1024)).toFixed(2) + ' MB';
    return (b / 1024).toFixed(1) + ' KB';
  };

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;

    const val = localStorage.getItem(key) || '';
    // JavaScript strings in browser memory / UTF-16 representation
    const keySize = key.length * 2;
    const valSize = val.length * 2;
    const itemTotalSize = keySize + valSize;

    totalBytes += itemTotalSize;

    let itemFilesBytes = 0;
    let itemDbBytes = 0;
    let itemType: 'database' | 'file' | 'mixed' | 'system' = 'database';

    // Direct image/file base64 string detection
    if (
      val.startsWith('data:image/') ||
      val.startsWith('data:application/pdf') ||
      val.startsWith('data:video/') ||
      key.toLowerCase().includes('file') ||
      key.toLowerCase().includes('photo') ||
      key.toLowerCase().includes('image')
    ) {
      itemFilesBytes = itemTotalSize;
      filesBytes += itemFilesBytes;
      fileCount += 1;
      itemType = 'file';
    } else {
      let parsed: any = null;
      try {
        parsed = JSON.parse(val);
      } catch (e) {
        parsed = null;
      }

      if (parsed && typeof parsed === 'object') {
        const scanObjForFiles = (obj: any): number => {
          let foundMediaBytes = 0;
          if (!obj) return 0;

          if (typeof obj === 'string') {
            if (
              obj.startsWith('data:image/') ||
              obj.startsWith('data:application/') ||
              (obj.length > 500 && /^[A-Za-z0-9+/=]{100,}/.test(obj))
            ) {
              fileCount += 1;
              return obj.length * 2;
            }
            return 0;
          }

          if (Array.isArray(obj)) {
            recordCount += obj.length;
            for (const item of obj) {
              foundMediaBytes += scanObjForFiles(item);
            }
            return foundMediaBytes;
          }

          for (const propKey of Object.keys(obj)) {
            const propVal = obj[propKey];
            if (
              typeof propVal === 'string' &&
              (propVal.startsWith('data:') ||
                propKey.toLowerCase().includes('photo') ||
                propKey.toLowerCase().includes('image') ||
                propKey.toLowerCase().includes('doc') ||
                propKey.toLowerCase().includes('license') ||
                propKey.toLowerCase().includes('file'))
            ) {
              if (propVal.startsWith('data:') || propVal.length > 300) {
                fileCount += 1;
                foundMediaBytes += (propKey.length + propVal.length) * 2;
              }
            } else if (typeof propVal === 'object' && propVal !== null) {
              foundMediaBytes += scanObjForFiles(propVal);
            }
          }
          return foundMediaBytes;
        };

        const extractedMediaBytes = scanObjForFiles(parsed);
        itemFilesBytes = Math.min(itemTotalSize, extractedMediaBytes);
        itemDbBytes = Math.max(0, itemTotalSize - itemFilesBytes);

        filesBytes += itemFilesBytes;
        dbBytes += itemDbBytes;

        if (itemFilesBytes > 0 && itemDbBytes > 0) {
          itemType = 'mixed';
        } else if (itemFilesBytes > 0) {
          itemType = 'file';
        } else {
          itemType = 'database';
        }
      } else {
        itemDbBytes = itemTotalSize;
        dbBytes += itemDbBytes;
        itemType = key.startsWith('bd_motor') ? 'database' : 'system';
      }
    }

    keyBreakdown.push({
      key,
      totalBytes: itemTotalSize,
      dbBytes: itemDbBytes,
      filesBytes: itemFilesBytes,
      totalFormatted: formatDynamic(itemTotalSize),
      type: itemType,
    });
  }

  // Estimated browser localStorage quota standard (5MB = 5 * 1024 * 1024 bytes)
  const ESTIMATED_LIMIT_BYTES = 5 * 1024 * 1024;
  const quotaPercent = Math.min(100, Number(((totalBytes / ESTIMATED_LIMIT_BYTES) * 100).toFixed(1)));

  return {
    totalBytes,
    dbBytes,
    filesBytes,
    totalKb: formatKB(totalBytes),
    totalMb: formatMB(totalBytes),
    dbKb: formatKB(dbBytes),
    dbMb: formatMB(dbBytes),
    filesKb: formatKB(filesBytes),
    filesMb: formatMB(filesBytes),
    fileCount,
    recordCount,
    quotaPercent,
    estimatedQuotaMb: 5,
    keyBreakdown: keyBreakdown.sort((a, b) => b.totalBytes - a.totalBytes),
  };
}

interface LocalStorageSizeWidgetProps {
  lang?: Language;
  className?: string;
}

export const LocalStorageSizeWidget: React.FC<LocalStorageSizeWidgetProps> = ({
  lang = 'en',
  className = '',
}) => {
  const [stats, setStats] = useState<StorageCalculationResult>(calculateLocalStorageSize());
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setStats(calculateLocalStorageSize());
      setIsRefreshing(false);
    }, 250);
  };

  useEffect(() => {
    setStats(calculateLocalStorageSize());
  }, []);

  const handleClearNonEssentialStorage = () => {
    try {
      // Clear non-essential items or app cache if requested
      const keysToKeep = ['bd_motor_auth_session', 'bd_motor_lang', 'bd_motor_theme'];
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && !keysToKeep.includes(k)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      setStats(calculateLocalStorageSize());
      setShowClearConfirm(false);
    } catch (e) {
      console.warn('Failed to clear local storage:', e);
    }
  };

  const dbPercentOfTotal = stats.totalBytes > 0 ? ((stats.dbBytes / stats.totalBytes) * 100).toFixed(0) : '0';
  const filesPercentOfTotal = stats.totalBytes > 0 ? ((stats.filesBytes / stats.totalBytes) * 100).toFixed(0) : '0';

  return (
    <div
      className={`bg-white/90 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg p-4 transition-all text-xs font-sans text-slate-800 dark:text-slate-100 ${className}`}
      id="local-storage-calculator-widget"
    >
      {/* Widget Header */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[16px]">hard_drive</span>
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs tracking-tight">
              {lang === 'am' ? 'የሎካል ስቶሬጅ ዳታ መጠን ስሌት' : 'Local Storage Size Calculator'}
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              {lang === 'am' ? 'ዳታቤዝ እና ሚዲያ ፋይሎችን ተነጣጥለው የቀረቡ' : 'Database records & file attachments separated'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          title={lang === 'am' ? 'እንደገና አስላ' : 'Recalculate Size'}
          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <span className={`material-symbols-outlined text-[16px] ${isRefreshing ? 'animate-spin text-blue-600' : ''}`}>
            refresh
          </span>
        </button>
      </div>

      {/* Main Meter / Usage Progress Bar */}
      <div className="mt-3 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-medium">
          <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1 font-semibold">
            {lang === 'am' ? 'ጠቅላላ የተያዘ ቦታ' : 'Total Storage Used'}:
            <span className="font-mono text-slate-900 dark:text-slate-100 font-bold ml-0.5">
              {stats.totalMb} ({stats.totalKb})
            </span>
          </span>
          <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
            {stats.quotaPercent}% {lang === 'am' ? 'ከ 5MB ኮታ' : 'of 5MB quota'}
          </span>
        </div>

        {/* Multi-segment Progress Bar */}
        <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex p-0.5 border border-slate-200/60 dark:border-slate-700/60 shadow-inner">
          <div
            style={{ width: `${(stats.dbBytes / (5 * 1024 * 1024)) * 100}%` }}
            className="h-full bg-indigo-500 dark:bg-indigo-400 rounded-l-full transition-all duration-500"
            title={`Database Data: ${stats.dbMb} (${dbPercentOfTotal}% of used)`}
          />
          <div
            style={{ width: `${(stats.filesBytes / (5 * 1024 * 1024)) * 100}%` }}
            className="h-full bg-emerald-500 dark:bg-emerald-400 transition-all duration-500"
            title={`File Attachments: ${stats.filesMb} (${filesPercentOfTotal}% of used)`}
          />
        </div>
      </div>

      {/* Dual Category Cards: Database vs Files */}
      <div className="grid grid-cols-2 gap-2 mt-3">
        {/* 1. Database Storage Card */}
        <div className="bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-md p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-[11px] font-bold text-indigo-900 dark:text-indigo-300">
              <span className="material-symbols-outlined text-[14px] text-indigo-600 dark:text-indigo-400">
                database
              </span>
              {lang === 'am' ? 'የዳታቤዝ መጠን' : 'Database Data'}
            </span>
            <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/60 px-1 py-0.2 rounded font-mono">
              {dbPercentOfTotal}%
            </span>
          </div>
          <div className="mt-1.5">
            <div className="text-sm font-extrabold font-mono text-indigo-950 dark:text-indigo-100 tracking-tight">
              {stats.dbMb}
            </div>
            <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
              {stats.dbKb} • {stats.recordCount} {lang === 'am' ? 'መዝገቦች' : 'records'}
            </div>
          </div>
        </div>

        {/* 2. File / Media Storage Card */}
        <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-md p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-900 dark:text-emerald-300">
              <span className="material-symbols-outlined text-[14px] text-emerald-600 dark:text-emerald-400">
                folder_zip
              </span>
              {lang === 'am' ? 'የፋይሎች መጠን' : 'File & Media'}
            </span>
            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-1 py-0.2 rounded font-mono">
              {filesPercentOfTotal}%
            </span>
          </div>
          <div className="mt-1.5">
            <div className="text-sm font-extrabold font-mono text-emerald-950 dark:text-emerald-100 tracking-tight">
              {stats.filesMb}
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              {stats.filesKb} • {stats.fileCount} {lang === 'am' ? 'ፋይሎች/ምስሎች' : 'media files'}
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Detailed Storage Key Breakdown */}
      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">
              {isExpanded ? 'unfold_less' : 'unfold_more'}
            </span>
            {lang === 'am' ? 'ዝርዝር የቁልፎች ስሌት ተመልከት' : 'View Itemized Storage Breakdown'}
          </button>

          <button
            type="button"
            onClick={() => setShowClearConfirm(!showClearConfirm)}
            className="text-[10px] font-bold text-slate-400 hover:text-red-500 flex items-center gap-0.5 cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[13px]">delete_sweep</span>
            {lang === 'am' ? 'ካች አጽዳ' : 'Clear Cache'}
          </button>
        </div>

        {/* Clear Confirmation */}
        {showClearConfirm && (
          <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-md space-y-1.5 animate-fadeIn">
            <p className="text-[10px] text-red-700 dark:text-red-300 font-semibold leading-tight">
              {lang === 'am'
                ? 'የካች ውሂብን ማፅዳት ይፈልጋሉ? (የመለያ መረጃዎ ይቀራል)'
                : 'Clear cached local storage data? (Your login session will be preserved)'}
            </p>
            <div className="flex gap-1.5 justify-end">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-2 py-0.5 rounded text-[10px] text-slate-600 bg-slate-200 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
              >
                {lang === 'am' ? 'ሰርዝ' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleClearNonEssentialStorage}
                className="px-2 py-0.5 rounded text-[10px] text-white bg-red-600 hover:bg-red-700 cursor-pointer font-bold"
              >
                {lang === 'am' ? 'አጽዳ' : 'Confirm Clear'}
              </button>
            </div>
          </div>
        )}

        {/* Breakdown List */}
        {isExpanded && (
          <div className="mt-2.5 max-h-40 overflow-y-auto space-y-1 pr-1 custom-scrollbar animate-fadeIn">
            {stats.keyBreakdown.length === 0 ? (
              <p className="text-[10px] text-slate-400 italic py-1 text-center">
                {lang === 'am' ? 'ምንም የተቀመጠ ቁልፍ የለም' : 'No local storage keys found'}
              </p>
            ) : (
              stats.keyBreakdown.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between text-[10px] py-1 px-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80"
                >
                  <div className="flex items-center gap-1.5 truncate max-w-[65%]">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        item.type === 'file'
                          ? 'bg-emerald-500'
                          : item.type === 'mixed'
                          ? 'bg-amber-500'
                          : item.type === 'database'
                          ? 'bg-indigo-500'
                          : 'bg-slate-400'
                      }`}
                    />
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300 truncate" title={item.key}>
                      {item.key}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 font-mono">
                    {item.filesBytes > 0 && (
                      <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-1 rounded">
                        F: {(item.filesBytes / 1024).toFixed(0)}KB
                      </span>
                    )}
                    {item.dbBytes > 0 && (
                      <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-1 rounded">
                        DB: {(item.dbBytes / 1024).toFixed(0)}KB
                      </span>
                    )}
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {item.totalFormatted}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
