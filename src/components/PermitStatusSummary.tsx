import React from 'react';
import { Language, MotorcycleRegistration } from '../types';

interface PermitStatusSummaryProps {
  registrations: MotorcycleRegistration[];
  lang: Language;
  onSelectStatusFilter?: (status: string) => void;
  borderless?: boolean;
}

export const PermitStatusSummary: React.FC<PermitStatusSummaryProps> = ({
  registrations,
  lang,
  onSelectStatusFilter,
  borderless = false,
}) => {
  const isAmharic = lang === 'am';

  // Calculate counts for each permit status
  const pendingCount = registrations.filter((r) => r.status === 'pending_approval').length;
  const approvedCount = registrations.filter((r) => r.status === 'approved' || r.status === 'printed' || r.status === 'ordered_print').length;
  const rejectedCount = registrations.filter((r) => r.status === 'rejected').length;
  const totalCount = registrations.length || 1; // avoid division by zero

  // Status Cards Data Config
  const statusCards = [
    {
      key: 'pending_approval',
      label: isAmharic ? 'በመጠባበቅ' : 'Pending',
      count: pendingCount,
      percentage: Math.round((pendingCount / totalCount) * 100),
      icon: 'pending_actions',
      badgeBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300/50',
      iconGradient: 'from-amber-500 to-orange-500',
      cardBg: 'bg-gradient-to-br from-amber-500/5 via-surface-container/30 to-surface-container/10',
      border: 'border-amber-500/30 hover:border-amber-500/80',
      progressBg: 'bg-gradient-to-r from-amber-500 to-orange-500',
      description: isAmharic ? 'ማፅደቂያ የሚጠበቁ' : 'Awaiting review',
    },
    {
      key: 'approved',
      label: isAmharic ? 'የጸደቁ' : 'Approved',
      count: approvedCount,
      percentage: Math.round((approvedCount / totalCount) * 100),
      icon: 'verified',
      badgeBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300/50',
      iconGradient: 'from-emerald-500 to-teal-600',
      cardBg: 'bg-gradient-to-br from-emerald-500/5 via-surface-container/30 to-surface-container/10',
      border: 'border-emerald-500/30 hover:border-emerald-500/80',
      progressBg: 'bg-gradient-to-r from-emerald-500 to-teal-600',
      description: isAmharic ? 'የተረጋገጡ' : 'Verified & active',
    },
    {
      key: 'rejected',
      label: isAmharic ? 'ውድቅ' : 'Rejected',
      count: rejectedCount,
      percentage: Math.round((rejectedCount / totalCount) * 100),
      icon: 'cancel',
      badgeBg: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-300/50',
      iconGradient: 'from-red-500 to-rose-600',
      cardBg: 'bg-gradient-to-br from-red-500/5 via-surface-container/30 to-surface-container/10',
      border: 'border-red-500/30 hover:border-red-500/80',
      progressBg: 'bg-gradient-to-r from-red-500 to-rose-600',
      description: isAmharic ? 'ውድቅ የተደረጉ' : 'Failed eligibility',
    },
    {
      key: 'all',
      label: isAmharic ? 'ጠቅላላ' : 'Total',
      count: registrations.length,
      percentage: 100,
      icon: 'assessment',
      badgeBg: 'bg-primary/15 text-primary border-primary/30',
      iconGradient: 'from-blue-600 to-indigo-600',
      cardBg: 'bg-gradient-to-br from-blue-500/5 via-surface-container/30 to-surface-container/10',
      border: 'border-primary/30 hover:border-primary',
      progressBg: 'bg-gradient-to-r from-blue-600 to-indigo-600',
      description: isAmharic ? 'ሁሉም ምዝገባዎች' : 'All registrations',
    },
  ];

  return (
    <div
      id="permit-status-summary"
      className={
        borderless
          ? 'space-y-4'
          : 'bg-surface-container-lowest border border-outline-variant/70 rounded-lg p-4 sm:p-5 shadow-sm space-y-4'
      }
    >
      {/* Header Bar with Live Pulse */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/60 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center text-primary shrink-0 shadow-xs">
            <span className="material-symbols-outlined text-[22px]">analytics</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-xs sm:text-sm text-on-surface uppercase tracking-wider">
                {isAmharic ? 'የፈቃዶች አጠቃላይ ሁኔታ' : 'Permit Status Breakdown'}
              </h3>
            </div>
            <p className="text-[11px] text-secondary font-medium mt-0.5">
              {isAmharic ? 'የሁሉም ፈቃዶች ሁኔታና ብዛት ማጠቃለያ' : 'Real-time state overview of all permit applications'}
            </p>
          </div>
        </div>
      </div>

      {/* Breakdown Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statusCards.map((card) => {
          // Define card specific colors matching Clerk's color scheme style but matching status
          const borderClass = 
            card.key === 'pending_approval' ? 'border-amber-200/80 dark:border-amber-800/50' :
            card.key === 'approved' ? 'border-emerald-200/80 dark:border-emerald-800/50' :
            card.key === 'rejected' ? 'border-red-200/80 dark:border-red-800/50' :
            'border-blue-200/80 dark:border-blue-800/50';

          const bgClass = 
            card.key === 'pending_approval' ? 'from-amber-500/5 via-surface-container/30 to-transparent' :
            card.key === 'approved' ? 'from-emerald-500/5 via-surface-container/30 to-transparent' :
            card.key === 'rejected' ? 'from-red-500/5 via-surface-container/30 to-transparent' :
            'from-blue-500/5 via-surface-container/30 to-transparent';

          const textClass = 
            card.key === 'pending_approval' ? 'text-amber-600 dark:text-amber-400' :
            card.key === 'approved' ? 'text-emerald-600 dark:text-emerald-400' :
            card.key === 'rejected' ? 'text-red-600 dark:text-red-400' :
            'text-blue-600 dark:text-blue-400';

          return (
            <div
              key={card.key}
              onClick={() => onSelectStatusFilter && onSelectStatusFilter(card.key)}
              className={`p-3.5 rounded-lg border ${borderClass} bg-gradient-to-br ${bgClass} space-y-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer group`}
            >
              <div className={`flex justify-between items-center ${textClass}`}>
                <span className="text-[10px] font-black uppercase tracking-wider text-on-surface">
                  {card.label}
                </span>
                <span className="material-symbols-outlined text-[18px] group-hover:scale-110 transition-transform duration-200">{card.icon}</span>
              </div>
              <p className="text-2xl font-black text-on-surface">{card.count}</p>
              <p className="text-[10px] text-secondary font-medium">
                {card.description} • {card.percentage}%
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};


