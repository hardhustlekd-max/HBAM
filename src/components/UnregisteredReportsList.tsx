import React, { useState } from 'react';
import { formatEthiopianDateTime } from '../utils/ethiopianCalendar';
import {
  Language,
  UserRole,
  UnregisteredVehicleReport,
  BAHIR_DAR_SUBCITIES,
} from '../types';
import { SmartImage } from './SmartImage';
import { ZoomableDocumentContainer } from './ZoomableDocumentContainer';
import { DataField } from './ui/StreamlinedUI';

interface UnregisteredReportsListProps {
  lang: Language;
  userRole: UserRole;
  userBadgeId?: string;
  unregisteredReports: UnregisteredVehicleReport[];
  onUpdateStatus?: (id: string, status: UnregisteredVehicleReport['status'], resolutionNotes?: string) => Promise<void>;
  onNewReportClick?: () => void;
  onOpenRegisterForm?: (report: UnregisteredVehicleReport) => void;
}

export const UnregisteredReportsList: React.FC<UnregisteredReportsListProps> = ({
  lang,
  userRole,
  userBadgeId,
  unregisteredReports,
  onUpdateStatus,
  onNewReportClick,
  onOpenRegisterForm,
}) => {
  const isAmharic = lang === 'am';

  const [searchTerm, setSearchTerm] = useState('');
  const [subCityFilter, setSubCityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'under_investigation' | 'resolved' | 'registered'>('all');
  const [selectedReport, setSelectedReport] = useState<UnregisteredVehicleReport | null>(null);
  const [zoomedImage, setZoomedImage] = useState<{ url: string; title: string } | null>(null);
  const [resolutionInput, setResolutionInput] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Collapsible state for mobile
  const [expandedReportIds, setExpandedReportIds] = useState<Record<string, boolean>>({});

  const toggleReportExpand = (id: string) => {
    setExpandedReportIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Status Counts
  const pendingCount = unregisteredReports.filter((r) => r.status === 'pending').length;
  const investigationCount = unregisteredReports.filter((r) => r.status === 'under_investigation').length;
  const resolvedCount = unregisteredReports.filter((r) => r.status === 'resolved').length;
  const registeredCount = unregisteredReports.filter((r) => r.status === 'registered').length;

  // Filtered list computation
  const filteredReports = unregisteredReports.filter((rep) => {
    const matchesSearch =
      (rep.plateNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rep.engineOrSerialNo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rep.driverName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rep.driverPhone || '').includes(searchTerm) ||
      (rep.officerBadgeId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rep.officerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rep.locationName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rep.notes || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rep.id || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSubCity = subCityFilter === 'all' || rep.subCity === subCityFilter;
    const matchesStatus = statusFilter === 'all' || rep.status === statusFilter;

    return matchesSearch && matchesSubCity && matchesStatus;
  });

  // Calculate pagination slices
  const totalItems = filteredReports.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const activePage = Math.min(currentPage, totalPages);
  const startIndex = (activePage - 1) * pageSize;
  const paginatedReports = filteredReports.slice(startIndex, startIndex + pageSize);

  const handleStatusChange = async (newStatus: UnregisteredVehicleReport['status']) => {
    if (!selectedReport || !onUpdateStatus) return;
    setIsUpdating(true);
    try {
      await onUpdateStatus(selectedReport.id, newStatus, resolutionInput);
      setSelectedReport((prev) => prev ? { ...prev, status: newStatus, resolutionNotes: resolutionInput } : null);
      setResolutionInput('');
    } catch (err) {
      console.error('Failed to update report status:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: UnregisteredVehicleReport['status']) => {
    switch (status) {
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-2xs whitespace-nowrap">
            <span className="material-symbols-outlined text-[13px]">check_circle</span>
            <span>{isAmharic ? 'ተፈቷል' : 'Resolved'}</span>
          </span>
        );
      case 'registered':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-800 shadow-2xs whitespace-nowrap">
            <span className="material-symbols-outlined text-[13px]">how_to_reg</span>
            <span>{isAmharic ? 'ተመዝግቧል' : 'Registered'}</span>
          </span>
        );
      case 'under_investigation':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 shadow-2xs whitespace-nowrap">
            <span className="material-symbols-outlined text-[13px]">search</span>
            <span>{isAmharic ? 'በምርመራ' : 'Investigating'}</span>
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shadow-2xs whitespace-nowrap">
            <span className="material-symbols-outlined text-[13px]">report_problem</span>
            <span>{isAmharic ? 'አዲስ' : 'Pending'}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Container - Icon and Title text only */}
      <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-500/10 text-red-600 dark:bg-red-900/30 dark:text-red-400 border border-red-500/20 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[24px]">no_drinks</span>
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-on-surface uppercase tracking-wide">
              {isAmharic ? 'የባልተመዘገቡ ተሽከርካሪዎች ሪፖርት' : 'Unregistered Vehicles report'}
            </h1>
            <p className="text-xs text-secondary font-medium">
              {isAmharic
                ? `ጠቅላላ ${unregisteredReports.length} ያልተመዘገቡ ተሽከርካሪ ሪፖርቶች ተመዝግበዋል`
                : `Total ${unregisteredReports.length} unregistered vehicle incident logs recorded`}
            </p>
          </div>
        </div>

        {onNewReportClick && (
          <button
            type="button"
            onClick={onNewReportClick}
            className="px-3.5 py-2 rounded-lg bg-[#1D61E7] hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add_alert</span>
            <span>{isAmharic ? 'አዲስ ሪፖርት ጨምር' : 'New Incident Report'}</span>
          </button>
        )}
      </div>

      {/* Single Unified Container connecting Tabbar & Tabcontainer */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xs overflow-hidden divide-y divide-outline-variant/60">
        {/* Sub-Filter Toolbar Container */}
        <div className="p-3 bg-surface-container-lowest flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 w-full max-w-full">
          {/* Live Search Input */}
          <div className="relative w-full lg:w-auto lg:flex-1 min-w-0 max-w-full lg:max-w-md">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-secondary">
              <span className="material-symbols-outlined text-[18px]">search</span>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={
                isAmharic
                  ? 'በሰሌዳ፣ አሽከርካሪ፣ ቦታ፣ ኦፊሰር ወይም መታወቂያ ፈልግ...'
                  : 'Search plate, driver, location, officer, ID...'
              }
              className="w-full pl-9 pr-8 py-2 bg-surface border border-outline-variant rounded-lg text-xs font-semibold text-on-surface placeholder-secondary focus:outline-none focus:ring-2 focus:ring-[#1D61E7]/20"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className="absolute inset-y-0 right-2.5 flex items-center text-secondary hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {/* Status Filter Tabs in End-Closed With Icons Style & Sub-City Dropdown */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full lg:w-auto overflow-x-auto max-w-full no-scrollbar shrink-0">
            <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar pt-1 shrink-0">
              {[
                {
                  id: 'all' as const,
                  icon: 'report_problem',
                  label: isAmharic ? 'ሁሉም' : 'All',
                  count: unregisteredReports.length,
                  activeIconColor: 'text-primary',
                  badgeColor: 'bg-surface-container-highest text-secondary',
                },
                {
                  id: 'pending' as const,
                  icon: 'fiber_new',
                  label: isAmharic ? 'አዲስ' : 'Pending',
                  count: pendingCount,
                  activeIconColor: 'text-amber-600 dark:text-amber-400',
                  badgeColor:
                    pendingCount > 0
                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                      : 'bg-surface-container-highest text-secondary',
                },
                {
                  id: 'under_investigation' as const,
                  icon: 'search_insights',
                  label: isAmharic ? 'በምርመራ' : 'Investigation',
                  count: investigationCount,
                  activeIconColor: 'text-blue-600 dark:text-blue-400',
                  badgeColor:
                    investigationCount > 0
                      ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300'
                      : 'bg-surface-container-highest text-secondary',
                },
                {
                  id: 'resolved' as const,
                  icon: 'check_circle',
                  label: isAmharic ? 'የተፈታ' : 'Resolved',
                  count: resolvedCount,
                  activeIconColor: 'text-emerald-600 dark:text-emerald-400',
                  badgeColor: 'bg-surface-container-highest text-secondary',
                },
                {
                  id: 'registered' as const,
                  icon: 'verified',
                  label: isAmharic ? 'የተመዘገበ' : 'Registered',
                  count: registeredCount,
                  activeIconColor: 'text-purple-600 dark:text-purple-400',
                  badgeColor: 'bg-surface-container-highest text-secondary',
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

            {/* Sub-City Filter Dropdown */}
            <select
              value={subCityFilter}
              onChange={(e) => {
                setSubCityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-xs font-bold outline-none cursor-pointer"
            >
              <option value="all">{isAmharic ? 'ሁሉም ክፍለ ከተሞች' : 'All Sub-Cities'}</option>
              {BAHIR_DAR_SUBCITIES.map((sc) => (
                <option key={sc.en} value={sc.en}>
                  {isAmharic ? sc.am : sc.en}
                </option>
              ))}
            </select>

            {/* Reset filter button if filtered */}
            {(searchTerm || statusFilter !== 'all' || subCityFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setSubCityFilter('all');
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                <span>{isAmharic ? 'አጽዳ' : 'Reset'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Reports Data Table & Card Container (Connected View) */}
        <div className="bg-surface-container-lowest overflow-hidden">
        {filteredReports.length === 0 ? (
          <div className="p-12 text-center text-secondary space-y-3">
            <span className="material-symbols-outlined text-[48px] text-outline">report_off</span>
            <p className="font-black text-sm text-on-surface">
              {isAmharic ? 'ምንም ያልተመዘገቡ ተሽከርካሪ ሪፖርቶች አልተገኙም' : 'No unregistered vehicle reports found.'}
            </p>
            <p className="text-xs text-secondary max-w-sm mx-auto">
              {isAmharic
                ? 'በቀረቡት ማጣሪያዎች መሠረት ምንም ሪፖርት አልተገኘም። እባክዎን ማጣሪያዎቹን ይቀይሩ።'
                : 'No incident reports match your current search criteria or status filters.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Data Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant text-secondary font-black uppercase tracking-wider text-[10px]">
                    <th className="px-4 py-3.5 text-center w-12">#</th>
                    <th className="px-4 py-3.5">{isAmharic ? 'ፎቶ' : 'Photo'}</th>
                    <th className="px-4 py-3.5">{isAmharic ? 'መታወቂያ / ቀን' : 'Report ID / Date'}</th>
                    <th className="px-4 py-3.5">{isAmharic ? 'የሰሌዳ / አሽከርካሪ' : 'Plate & Driver'}</th>
                    <th className="px-4 py-3.5">{isAmharic ? 'ቦታ & ክፍለ ከተማ' : 'Location & Sub-City'}</th>
                    <th className="px-4 py-3.5">{isAmharic ? 'ኦፊሰር' : 'Reporting Officer'}</th>
                    <th className="px-4 py-3.5 text-center">{isAmharic ? 'ሁኔታ' : 'Status'}</th>
                    <th className="px-4 py-3.5 text-right">{isAmharic ? 'ተግባር' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {paginatedReports.map((rep, idx) => (
                    <tr key={rep.id} className="hover:bg-surface-container-low/60 transition-colors">
                      <td className="px-4 py-3.5 text-center font-mono font-bold text-secondary text-[11px]">
                        {startIndex + idx + 1}
                      </td>

                      {/* Evidence Photo */}
                      <td className="px-4 py-3.5">
                        <div
                          onClick={() => rep.evidencePhoto && setZoomedImage({ url: rep.evidencePhoto, title: rep.id })}
                          className="w-10 h-10 rounded-lg overflow-hidden border border-outline-variant bg-surface-container shrink-0 cursor-pointer group relative shadow-2xs"
                        >
                          <SmartImage
                            src={rep.evidencePhoto}
                            alt="Evidence"
                            fallbackIcon="two_wheeler"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                          />
                        </div>
                      </td>

                      {/* Report ID & Date */}
                      <td className="px-4 py-3.5 font-mono">
                        <p className="font-bold text-amber-700 dark:text-amber-400">{rep.id}</p>
                        <p className="text-[10px] text-secondary">{rep.reportedAt ? formatEthiopianDateTime(rep.reportedAt, isAmharic ? 'am' : 'en') : '—'}</p>
                      </td>

                      {/* Plate & Driver Info */}
                      <td className="px-4 py-3.5">
                        <p className="font-mono font-black text-on-surface">{rep.plateNumber || '[ሰሌዳ የለውም]'}</p>
                        <p className="text-[11px] text-secondary font-medium">
                          {rep.driverName ? `${rep.driverName} ${rep.driverPhone ? `(${rep.driverPhone})` : ''}` : '—'}
                        </p>
                      </td>

                      {/* Sub-City & Location */}
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-on-surface">{rep.subCity}</p>
                        <p className="text-[10px] text-secondary truncate max-w-[150px]">{rep.locationName}</p>
                      </td>

                      {/* Officer Badge */}
                      <td className="px-4 py-3.5 font-mono text-secondary">
                        <p className="font-bold text-xs text-on-surface">{rep.officerBadgeId}</p>
                        <p className="text-[10px] truncate max-w-[110px]">{rep.officerName || 'Patrol Officer'}</p>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 text-center">{getStatusBadge(rep.status)}</td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedReport(rep)}
                          className="px-3 py-1.5 rounded-lg bg-[#1D61E7] hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer shadow-2xs inline-flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                          <span>{isAmharic ? 'ዝርዝር' : 'View Details'}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (shown on screens < md) */}
            <div className="block md:hidden divide-y divide-outline-variant">
              {paginatedReports.map((rep) => {
                const isExpanded = !!expandedReportIds[rep.id];
                return (
                  <div key={rep.id} className="p-4 hover:bg-surface-container-low/50 transition-colors space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          onClick={() => rep.evidencePhoto && setZoomedImage({ url: rep.evidencePhoto, title: rep.id })}
                          className="w-12 h-12 rounded-lg overflow-hidden border border-outline-variant bg-surface-container shrink-0 cursor-pointer relative shadow-2xs"
                        >
                          <SmartImage
                            src={rep.evidencePhoto}
                            alt="Evidence"
                            fallbackIcon="two_wheeler"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-mono font-black text-xs text-on-surface">{rep.plateNumber || '[ሰሌዳ የለውም]'}</p>
                          <p className="font-mono text-[10px] font-bold text-amber-700 dark:text-amber-400">{rep.id}</p>
                          <p className="text-[10px] text-secondary">{rep.reportedAt}</p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        {getStatusBadge(rep.status)}
                        <button
                          type="button"
                          onClick={() => toggleReportExpand(rep.id)}
                          className="p-1 rounded-md text-secondary hover:text-on-surface cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            {isExpanded ? 'expand_less' : 'expand_more'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Expanded Mobile Details */}
                    <div className={`${isExpanded ? 'block' : 'hidden'} pt-2 border-t border-outline-variant/50 space-y-2 text-xs`}>
                      <div className="grid grid-cols-2 gap-2">
                        <DataField label={isAmharic ? 'አሽከርካሪ:' : 'Driver:'} value={rep.driverName || '—'} />
                        <DataField label={isAmharic ? 'ስልክ:' : 'Phone:'} value={rep.driverPhone || '—'} isMono />
                        <DataField label={isAmharic ? 'ክፍለ ከተማ:' : 'Sub-City:'} value={rep.subCity} />
                        <DataField label={isAmharic ? 'ቦታ:' : 'Location:'} value={rep.locationName} />
                      </div>

                      {rep.notes && (
                        <div className="p-2.5 bg-surface-container-low rounded-lg">
                          <span className="text-[10px] font-bold text-secondary uppercase block mb-0.5">
                            {isAmharic ? 'ማስታወሻ:' : 'Notes:'}
                          </span>
                          <p className="text-xs text-on-surface leading-relaxed">{rep.notes}</p>
                        </div>
                      )}

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => setSelectedReport(rep)}
                          className="w-full py-2 rounded-lg bg-[#1D61E7] hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                          <span>{isAmharic ? 'ሙሉ ዝርዝር ይመልከቱ' : 'View Full Details'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls Bar */}
            <div className="bg-surface-container-low/50 border-t border-outline-variant px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-secondary font-medium">
              <div className="flex items-center gap-2">
                <span>{isAmharic ? 'በአንድ ገጽ:' : 'Per page:'}</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 bg-surface border border-outline-variant rounded-md text-xs font-bold text-on-surface outline-none cursor-pointer"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
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
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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

      {/* Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-amber-600 text-[24px]">report_problem</span>
                <div>
                  <h3 className="font-black text-sm text-on-surface uppercase tracking-wider">
                    {isAmharic ? 'የባልተመዘገበ ተሽከርካሪ ሪፖርት ዝርዝር' : 'Unregistered Vehicle Report Details'}
                  </h3>
                  <p className="text-[11px] text-secondary font-mono">{selectedReport.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Content Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-surface-container-low/50 rounded-lg space-y-1 border border-outline-variant/60">
                <p className="text-[10px] font-bold text-secondary uppercase">{isAmharic ? 'የሰሌዳ ቁጥር' : 'Plate Number'}</p>
                <p className="font-mono font-black text-sm text-on-surface">{selectedReport.plateNumber || 'Unplated'}</p>
              </div>

              <div className="p-3.5 bg-surface-container-low/50 rounded-lg space-y-1 border border-outline-variant/60">
                <p className="text-[10px] font-bold text-secondary uppercase">{isAmharic ? 'የሞተር / ሴሪያል ቁጥር' : 'Engine / Serial'}</p>
                <p className="font-mono font-black text-sm text-on-surface">{selectedReport.engineOrSerialNo || '—'}</p>
              </div>

              <div className="p-3.5 bg-surface-container-low/50 rounded-lg space-y-1 border border-outline-variant/60">
                <p className="text-[10px] font-bold text-secondary uppercase">{isAmharic ? 'አሽከርካሪ / ስልክ' : 'Driver / Phone'}</p>
                <p className="font-bold text-on-surface">{selectedReport.driverName || '—'}</p>
                <p className="text-secondary">{selectedReport.driverPhone || '—'}</p>
              </div>

              <div className="p-3.5 bg-surface-container-low/50 rounded-lg space-y-1 border border-outline-variant/60">
                <p className="text-[10px] font-bold text-secondary uppercase">{isAmharic ? 'ክፍለ ከተማ / ቦታ' : 'Sub-City & Location'}</p>
                <p className="font-bold text-on-surface">{selectedReport.subCity}</p>
                <p className="text-secondary">{selectedReport.locationName}</p>
              </div>
            </div>

            {/* Notes & Evidence Photo */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-secondary uppercase">{isAmharic ? 'የኦፊሰር ማብራሪያ' : 'Officer Field Notes'}</p>
              <p className="p-3 rounded-lg bg-surface-container-low text-on-surface text-xs leading-relaxed font-medium border border-outline-variant/50">
                {selectedReport.notes}
              </p>
            </div>

            {selectedReport.evidencePhoto && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-secondary uppercase">{isAmharic ? 'የማስረጃ ፎቶ' : 'Evidence Photo'}</p>
                <div
                  onClick={() => setZoomedImage({ url: selectedReport.evidencePhoto!, title: selectedReport.id })}
                  className="h-44 rounded-lg overflow-hidden border border-outline-variant bg-surface-container cursor-pointer group relative shadow-2xs"
                >
                  <img src={selectedReport.evidencePhoto} alt="Evidence" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <span className="material-symbols-outlined text-[24px]">zoom_in</span>
                  </div>
                </div>
              </div>
            )}

            {/* Status Update Actions */}
            {onUpdateStatus && (
              <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-3 pt-3">
                <p className="text-xs font-bold text-amber-900 dark:text-amber-300">
                  {isAmharic ? 'የሪፖርቱን ሁኔታ ይለውጡ' : 'Update Incident Status'}
                </p>

                <input
                  type="text"
                  value={resolutionInput}
                  onChange={(e) => setResolutionInput(e.target.value)}
                  placeholder={
                    isAmharic
                      ? 'የማስተካከያ/የመፍትሔ ማስታወሻ ያስገቡ...'
                      : 'Add resolution notes or permit registration reference...'
                  }
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-xs outline-none"
                />

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleStatusChange('under_investigation')}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer transition-all disabled:opacity-50 shadow-2xs"
                  >
                    {isAmharic ? 'በምርመራ ላይ አድርግ' : 'Mark Under Investigation'}
                  </button>

                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleStatusChange('resolved')}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-all disabled:opacity-50 shadow-2xs"
                  >
                    {isAmharic ? 'ተፈቷል በል' : 'Mark Resolved'}
                  </button>

                  {onOpenRegisterForm && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedReport(null);
                        onOpenRegisterForm(selectedReport);
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer transition-all flex items-center gap-1 shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                      <span>{isAmharic ? 'ወደ ምዝገባ ቀይር' : 'Convert to Registration'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {zoomedImage && (
        <ZoomableDocumentContainer
          isOpen={true}
          onClose={() => setZoomedImage(null)}
          imageUrl={zoomedImage.url}
          title={zoomedImage.title}
        />
      )}
    </div>
  );
};

