import React, { useState } from 'react';
import {
  Language,
  UserRole,
  UnregisteredVehicleReport,
  BAHIR_DAR_SUBCITIES,
} from '../types';
import { uploadDocumentPhoto } from '../services/storageService';

interface UnregisteredVehicleFormProps {
  lang: Language;
  userRole: UserRole;
  userBadgeId?: string;
  officerName?: string;
  onSubmitReport: (report: UnregisteredVehicleReport) => Promise<void>;
  onCancel?: () => void;
}

export const UnregisteredVehicleForm: React.FC<UnregisteredVehicleFormProps> = ({
  lang,
  userBadgeId = 'BADGE-OFFICER-1',
  officerName = 'Traffic Patrol Officer',
  onSubmitReport,
  onCancel,
}) => {
  const isAmharic = lang === 'am';

  const [plateNumber, setPlateNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [locationName, setLocationName] = useState('');
  const [notes, setNotes] = useState('');
  const [evidencePhoto, setEvidencePhoto] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsPhotoUploading(true);
      const safetyTimer = setTimeout(() => setIsPhotoUploading(false), 3000);
      try {
        // Fast local preview first
        const reader = new FileReader();
        reader.onload = () => {
          if (reader.result && typeof reader.result === 'string') {
            setEvidencePhoto(reader.result);
          }
        };
        reader.readAsDataURL(file);

        const uploadedUrl = await uploadDocumentPhoto(file, 'unregistered_evidence');
        if (uploadedUrl) {
          setEvidencePhoto(uploadedUrl);
        }
      } catch (err) {
        console.error('Failed to upload evidence photo:', err);
      } finally {
        clearTimeout(safetyTimer);
        setIsPhotoUploading(false);
        e.target.value = '';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage('');

    try {
      const newReport: UnregisteredVehicleReport = {
        id: `UNREG-${Date.now().toString().slice(-6)}`,
        reportedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        plateNumber: plateNumber.trim() || undefined,
        driverName: driverName.trim() || undefined,
        driverPhone: driverPhone.trim() || undefined,
        vehicleCategory: 'gas_under_110cc',
        subCity: BAHIR_DAR_SUBCITIES[0].en,
        locationName: locationName.trim() || 'Field Patrol Checkpoint',
        officerBadgeId: userBadgeId,
        officerName: officerName,
        notes: notes.trim() || (isAmharic ? 'ባልተመዘገበ ተሽከርካሪ ላይ የቀረበ ሪፖርት' : 'Unregistered vehicle incident logged'),
        evidencePhoto: evidencePhoto || 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=500&auto=format&fit=crop',
        status: 'pending',
      };

      await onSubmitReport(newReport);
      setSuccessMessage(
        isAmharic
          ? 'ባልተመዘገበ ተሽከርካሪ ላይ የተዘጋጀው ሪፖርት በተሳካ ሁኔታ ተመዝግቧል!'
          : 'Unregistered vehicle report logged successfully!'
      );

      // Reset form fields
      setPlateNumber('');
      setDriverName('');
      setDriverPhone('');
      setLocationName('');
      setNotes('');
      setEvidencePhoto('');
    } catch (err) {
      console.error('Failed to log unregistered report:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner - Icon and Title text only */}
      <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-4 sm:p-5 shadow-2xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[24px]">report_problem</span>
          </div>
          <h1 className="text-base sm:text-lg font-black text-on-surface uppercase tracking-wide">
            {isAmharic ? 'ባልተመዘገበ ተሽከርካሪ ላይ ሪፖርት ማዘጋጃ' : 'Unregistered Vehicle Incident Form'}
          </h1>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-1.5 rounded-md bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold transition-all border border-outline-variant cursor-pointer"
          >
            {isAmharic ? 'ሰርዝ' : 'Cancel'}
          </button>
        )}
      </div>

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-3 animate-in fade-in duration-200">
          <span className="material-symbols-outlined text-emerald-600 text-[22px]">check_circle</span>
          <span>{successMessage}</span>
        </div>
      )}

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 sm:p-7 shadow-xs space-y-6">
        <div className="border-b border-outline-variant pb-3 flex items-center justify-between">
          <h2 className="text-sm font-black text-on-surface uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-600 text-[20px]">policy</span>
            {isAmharic ? 'የሪፖርት ዝርዝሮች (አማራጭ)' : 'Incident Report Details (All Optional)'}
          </h2>
          <span className="text-[11px] font-semibold text-secondary">
            {isAmharic ? 'ሁሉም መስኮች አማራጭ ናቸው' : 'All fields are optional'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Plate Number */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-on-surface">
              {isAmharic ? 'የሰሌዳ ቁጥር' : 'Plate Number'}
            </label>
            <input
              type="text"
              value={plateNumber}
              onChange={(e) => setPlateNumber(e.target.value)}
              placeholder={isAmharic ? 'ምሳሌ፡ 3-12345 ወይም የታርጋ የሌለው' : 'e.g. AA 3 99812 or Unplated'}
              className="w-full px-3.5 py-2.5 bg-surface-container/60 border border-outline-variant rounded-lg text-xs font-semibold text-on-surface focus:outline-none focus:border-[#1D61E7]"
            />
          </div>

          {/* Driver License / Name */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-on-surface">
              {isAmharic ? 'የአሽከርካሪው ስም / የፈቃድ ቁጥር' : 'Driver License / Full Name'}
            </label>
            <input
              type="text"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              placeholder={isAmharic ? 'ምሳሌ፡ አበበ ከበደ / DL-90812' : 'e.g. Abebe Kebede / DL-90812'}
              className="w-full px-3.5 py-2.5 bg-surface-container/60 border border-outline-variant rounded-lg text-xs font-semibold text-on-surface focus:outline-none focus:border-[#1D61E7]"
            />
          </div>

          {/* Phone Number */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-on-surface">
              {isAmharic ? 'የስልክ ቁጥር' : 'Phone Number'}
            </label>
            <input
              type="text"
              value={driverPhone}
              onChange={(e) => setDriverPhone(e.target.value)}
              placeholder="+251 9..."
              className="w-full px-3.5 py-2.5 bg-surface-container/60 border border-outline-variant rounded-lg text-xs font-semibold text-on-surface focus:outline-none focus:border-[#1D61E7]"
            />
          </div>

          {/* Location */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-on-surface">
              {isAmharic ? 'የተያዘበት ቦታ / ኬላ' : 'Incident Location / Checkpoint'}
            </label>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder={isAmharic ? 'ምሳሌ፡ ፋሲሎ ቀበሌ 04' : 'e.g. Fasilo Kebele 04 Checkpoint'}
              className="w-full px-3.5 py-2.5 bg-surface-container/60 border border-outline-variant rounded-lg text-xs font-semibold text-on-surface focus:outline-none focus:border-[#1D61E7]"
            />
          </div>
        </div>

        {/* Evidence Photo Upload */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-on-surface uppercase tracking-wider">
            {isAmharic ? 'የተሽከርካሪው ፎቶ / ማስረጃ' : 'Evidence Photo'}
          </label>

          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border border-dashed border-outline-variant rounded-xl bg-surface-container-low/40">
            {evidencePhoto ? (
              <div className="relative w-32 h-24 rounded-lg overflow-hidden border border-outline-variant shrink-0">
                <img src={evidencePhoto} alt="Evidence" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setEvidencePhoto('')}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs shadow-md cursor-pointer"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="w-32 h-24 rounded-lg border border-outline-variant bg-surface-container flex flex-col items-center justify-center text-secondary shrink-0">
                <span className="material-symbols-outlined text-[28px]">photo_camera</span>
                <span className="text-[10px] font-bold mt-1">{isAmharic ? 'ፎቶ አልተመረጠም' : 'No Photo'}</span>
              </div>
            )}

            <div className="space-y-2 text-center sm:text-left">
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                id="unreg-photo-upload"
                className="hidden"
              />
              <label
                htmlFor={isPhotoUploading ? undefined : 'unreg-photo-upload'}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-xs font-bold transition-all shadow-xs ${
                  isPhotoUploading ? 'bg-amber-400 cursor-wait' : 'bg-amber-600 hover:bg-amber-700 cursor-pointer'
                }`}
              >
                <span className={`material-symbols-outlined text-[18px] ${isPhotoUploading ? 'animate-spin' : ''}`}>
                  {isPhotoUploading ? 'progress_activity' : 'add_a_photo'}
                </span>
                <span>
                  {isPhotoUploading
                    ? isAmharic ? 'ፎቶ እየተጫነ ነው...' : 'Uploading photo...'
                    : isAmharic ? 'የተሽከርካሪ ፎቶ ስቀል' : 'Upload Evidence Photo'}
                </span>
              </label>
              <p className="text-[11px] text-secondary">
                {isAmharic
                  ? 'የተሽከርካሪውን ወይም ቦታውን ፎቶ ቢያያይዙ ይመረጣል።'
                  : 'Attach an optional snapshot photo of the vehicle or scene.'}
              </p>
            </div>
          </div>
        </div>

        {/* Field Notes & Incident Details */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-on-surface uppercase tracking-wider">
            {isAmharic ? 'ማብራሪያና ተጨማሪ አስተያየት' : 'Notes & Remarks'}
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              isAmharic
                ? 'ተጨማሪ ማብራሪያ ወይም አስተያየት እዚህ ይጻፉ...'
                : 'Enter optional incident details or officer notes...'
            }
            className="w-full px-3.5 py-2.5 rounded-lg border border-outline-variant bg-surface text-on-surface text-xs focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none transition-all"
          />
        </div>

        {/* Reporting Officer Information Card */}
        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-amber-600 text-[20px]">badge</span>
            <div>
              <p className="font-black text-on-surface">{officerName}</p>
              <p className="text-[11px] text-secondary font-mono">{userBadgeId}</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 font-bold text-[11px]">
            {isAmharic ? 'የተቆጣጣሪ መታወቂያ' : 'Reporting Officer'}
          </span>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 rounded-lg border border-outline-variant hover:bg-surface-container text-xs font-bold transition-all cursor-pointer"
            >
              {isAmharic ? 'ሰርዝ' : 'Cancel'}
            </button>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{isAmharic ? 'በመላክ ላይ...' : 'Submitting...'}</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">send</span>
                <span>{isAmharic ? 'ሪፖርቱን መዝግብ' : 'Submit Unregistered Report'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

