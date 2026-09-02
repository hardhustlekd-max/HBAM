import React, { useState, useEffect } from 'react';
import {
  subscribeFirestoreError,
  subscribeSyncStatus,
  syncAllCollectionsWithDb,
} from '../services/dbService';
import { Icon } from './ui/Icon';
import { formatEthiopianTime } from '../utils/ethiopianCalendar';

interface FirebaseStatusWidgetProps {
  isAmharic: boolean;
}

export const FirebaseQuotaWidget: React.FC<FirebaseStatusWidgetProps> = ({ isAmharic }) => {
  const [dbError, setDbError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<{ lastSyncTime: Date | null; isConnected: boolean; isQuotaExceeded?: boolean }>({
    lastSyncTime: null,
    isConnected: true,
    isQuotaExceeded: false,
  });
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsubError = subscribeFirestoreError(setDbError);
    const unsubSync = subscribeSyncStatus(setSyncStatus);
    return () => {
      unsubError();
      unsubSync();
    };
  }, []);

  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await syncAllCollectionsWithDb();
    } finally {
      setTimeout(() => {
        setIsSyncing(false);
      }, 500);
    }
  };

  const formatLastSync = (date: Date | null) => {
    if (!date) return isAmharic ? 'ገና አልተመሳሰለም' : 'Not synced yet';
    return formatEthiopianTime(date, isAmharic ? 'am' : 'en');
  };

  return (
    <div className="bg-surface-container border border-outline-variant/60 rounded-md p-3 space-y-3 shadow-xs">
      {/* Title & Connection Status Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-primary">
          <Icon name="sd_card" size={16} />
          <span className="tracking-tight uppercase">
            Local Storage DB
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-medium">
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{isAmharic ? 'ሎካል ስቶሬጅ' : 'Local Storage Active'}</span>
          </span>
        </div>
      </div>

      {/* Database Provider Badge */}
      <div className="p-2 border border-emerald-500/20 bg-emerald-500/10 text-emerald-900 dark:text-emerald-300 rounded-lg text-xs font-bold flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-secondary">
          <Icon name="hard_drive" size={15} className="text-emerald-600" />
          <span className="text-[10px] sm:text-[11px]">{isAmharic ? 'የዳታ አቀማመጥ' : 'Storage Engine'}</span>
        </span>
        <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-tight text-emerald-700 dark:text-emerald-400">
          Browser Local Storage
        </span>
      </div>

      {/* Connection Diagnostic Logs / Error Warning Banner */}
      {dbError && (
        <div className="p-2 border border-error/30 bg-error-container/20 text-error rounded-lg text-[9px] font-bold leading-normal space-y-1">
          <div className="flex items-center gap-1">
            <Icon name="warning" size={13} />
            <span>{isAmharic ? 'የግንኙነት ማስታወሻ:' : 'Connection Notice:'}</span>
          </div>
          <p className="font-mono font-normal opacity-90 break-all select-all">
            {dbError}
          </p>
        </div>
      )}

      {/* Last Firebase Cloud Sync timestamp */}
      <div className="flex items-center justify-between text-[10px] text-secondary bg-surface-container-high/60 px-2 py-1 rounded-md">
        <span>{isAmharic ? 'የመጨረሻ ማመሳሰል:' : 'Last Cloud Sync:'}</span>
        <span className="font-mono font-semibold text-on-surface">
          {formatLastSync(syncStatus.lastSyncTime)}
        </span>
      </div>

      {/* Manual Force-Sync Refresh Action */}
      <div className="pt-2 border-t border-outline-variant/40 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleManualSync}
          className="w-full py-1.5 px-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
        >
          <Icon name="sync" size={14} className={isSyncing ? 'animate-spin' : ''} />
          <span>
            {isSyncing
              ? (isAmharic ? 'ከፋየርቤዝ በማመሳሰል ላይ...' : 'Syncing Firebase...')
              : (isAmharic ? 'ዳታ አሁን አመሳስል' : 'Sync Live Firebase Data')}
          </span>
        </button>
      </div>
    </div>
  );
};

// Export aliases for backward compatibility
export const SupabaseStatusWidget = FirebaseQuotaWidget;
export const PostgresStatusWidget = FirebaseQuotaWidget;
