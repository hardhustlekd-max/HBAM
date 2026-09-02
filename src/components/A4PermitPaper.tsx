import React, { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { formatEthiopianDate } from '../utils/ethiopianCalendar';
import { MotorcycleRegistration, Language, APP_LOGO } from '../types';
import { SmartImage } from './SmartImage';

interface A4PermitPaperProps {
  registration: Partial<MotorcycleRegistration>;
  lang: Language;
  onClose?: () => void;
  autoPrint?: boolean;
}

export const A4PermitPaper: React.FC<A4PermitPaperProps> = ({ registration, lang, onClose, autoPrint = false }) => {
  const isAmharic = lang === 'am';
  const containerRef = useRef<HTMLDivElement>(null);
  const [standaloneFitScale, setStandaloneFitScale] = useState<number>(1);
  const [isInZoomable, setIsInZoomable] = useState<boolean>(false);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        if (containerRef.current.closest('[data-zoomable-container="true"]')) {
          setStandaloneFitScale(1);
          setIsInZoomable(true);
          return;
        }
        setIsInZoomable(false);
        const parentWidth = containerRef.current.parentElement?.clientWidth || window.innerWidth;
        const available = Math.min(parentWidth - 16, 794);
        if (available > 0 && available < 794) {
          setStandaloneFitScale(Number((available / 794).toFixed(3)));
        } else {
          setStandaloneFitScale(1);
        }
      }
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        document.body.setAttribute('data-print-target', 'a4');
        window.focus();
        window.print();
        document.body.removeAttribute('data-print-target');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  const regId = registration.id || '';
  const name = registration.fullName || '—';
  const phone = registration.phone || '—';
  const plate = registration.plateNumber || '—';
  const chassis = registration.engineOrSerialNo || (registration as any).chassisNo || 'N/A';
  const motorBrand = registration.motorBrand || '—';
  const motorModel = registration.motorModel || '—';
  const category = registration.vehicleCategory === 'electric' ? (isAmharic ? 'ኢቪ' : 'Electric (EV)') : (isAmharic ? 'ቤንዚን' : 'Gasoline (<110cc)');
  const issueDate = registration.registrationDate || new Date().toISOString().split('T')[0];
  
  // Calculate dynamic 1-year expiry date from registration date
  const computeExpiryDate = () => {
    try {
      const regD = new Date(issueDate);
      if (!isNaN(regD.getTime())) {
        regD.setFullYear(regD.getFullYear() + 1);
        return regD.toISOString().split('T')[0];
      }
    } catch {}
    return '2027-08-17';
  };
  const expiryDate = computeExpiryDate();
  const registeredBy = registration.registeredBy || '—';

  const qrVal = registration.qrCodeData || `https://enforcement.gov.et/verify/${regId || plate}`;

  const handlePrint = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    document.body.setAttribute('data-print-target', 'a4');
    window.focus();

    const cleanup = () => {
      document.body.removeAttribute('data-print-target');
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup);

    setTimeout(() => {
      window.print();
      setTimeout(cleanup, 1200);
    }, 100);
  };

  return (
    <div
      ref={containerRef}
      className={isInZoomable ? "shrink-0 flex flex-col items-center font-sans select-none py-1" : "w-full flex flex-col items-center font-sans select-none py-1 max-w-full overflow-hidden"}
    >
      <div
        style={{
          width: standaloneFitScale < 1 ? `${794 * standaloneFitScale}px` : '794px',
          height: standaloneFitScale < 1 ? `${(1050 + 64) * standaloneFitScale}px` : 'auto',
        }}
        className="flex flex-col items-center gap-3 shrink-0 mx-auto relative origin-top"
      >
        <div
          style={{
            transform: standaloneFitScale < 1 ? `scale(${standaloneFitScale})` : 'none',
            transformOrigin: 'top center',
          }}
          className="flex flex-col items-center gap-3 w-[794px] shrink-0"
        >
        <div id="a4-permit-document" className="printable-a4-document shrink-0 w-[794px] min-h-[1050px] bg-white text-black p-8 shadow-2xl rounded-sm border-4 border-double border-black relative font-sans text-xs leading-normal select-text overflow-hidden">
            
            {/* Large Background Watermark Emblem */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.05] pointer-events-none select-none z-0">
              <div className="w-[500px] h-[500px] rounded-full border-[16px] border-black flex items-center justify-center p-8">
                <div className="w-full h-full rounded-full border-4 border-dashed border-black flex flex-col items-center justify-center text-center p-4 relative overflow-hidden">
                  <span className="text-4xl font-black uppercase tracking-widest text-black">BAHIRDAR TRANSPORT</span>
                  <span className="text-2xl font-bold mt-2 text-black">OFFICIAL PERMIT CERTIFICATE</span>
                </div>
              </div>
            </div>

            {/* Content Wrap */}
            <div className="relative z-20 space-y-3">
              
              {/* Top Banner with Permit Type Tag and QR Code on Top Right */}
              <div className="flex justify-between items-center border-b border-black pb-2">
                <div className="flex items-center gap-2">
                  <span className="border border-black px-2 py-0.5 text-[10px] font-bold uppercase bg-slate-100">
                    [ኦፊሴላዊ ፈቃድ]
                  </span>
                  <span className="font-bold text-xs uppercase tracking-wide">
                    የሞተር ሳይክል መንቀሳቀሻ ፈቃድ (ክፍል-ሀ)
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono border border-black px-2 py-0.5 bg-slate-50 font-bold">
                    አዲስ / እድሳት
                  </span>
                  <div className="w-16 h-16 bg-white p-0.5 border border-black">
                    <QRCodeSVG value={qrVal} size={60} level="M" />
                  </div>
                </div>
              </div>

              {/* Department Header */}
              <div className="text-center space-y-0.5 border-b-2 border-black pb-2">
                <div className="flex justify-center items-center gap-2 mb-1">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white shadow-xs overflow-hidden">
                    <img src={APP_LOGO} alt="Logo" className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                  </div>
                </div>
                <h1 className="text-xs font-black text-black uppercase tracking-wider">
                  ሕይወት ባህርዳር የሞተረኞች ማህበር አገልግሎት ኃ.የተ.የግ.ማ
                </h1>
                <h2 className="text-[11px] font-bold text-black tracking-wide">
                  HIWOT BAHIRDAR MOTORBIKE RIDERS ASSOCIATION SERVICE PLC
                </h2>
                <div className="text-[11px] font-bold text-black pt-0.5">
                  የተሽከርካሪ ምዝገባ እና ፈቃድ ክፍል (BAHIRDAR MOTOR ASSOCIATION)
                </div>
              </div>

              {/* Permit Title Banner */}
              <div className="text-center py-1.5 border border-black bg-slate-100 uppercase tracking-widest font-black text-xs">
                PERMIT IN RESPECT OF MOTORCYCLE MOVEMENT PERMIT
              </div>

              <div className="text-center font-bold text-xs uppercase tracking-widest border-b border-black pb-1.5">
                PART-A (ክፍል - ሀ)
              </div>

              {/* Section 1: Two-Column Form Details */}
              <div className="space-y-1.5 text-[11px] pt-1">
                
                <div className="grid grid-cols-12 border-b border-dotted border-black/60 pb-1">
                  <div className="col-span-5 font-extrabold text-black">1. ፈቃድ ቁጥር (Permit No)</div>
                  <div className="col-span-7 font-mono font-black text-black">{regId}</div>
                </div>

                <div className="grid grid-cols-12 border-b border-dotted border-black/60 pb-1">
                  <div className="col-span-5 font-black text-black text-[12px]">2. የባለቤቱ ሙሉ ስም (Name Of Holder)</div>
                  <div className="col-span-7 font-black text-black text-[12px] uppercase tracking-wide">{name}</div>
                </div>

                <div className="grid grid-cols-12 border-b border-dotted border-black/60 pb-1">
                  <div className="col-span-5 font-extrabold text-black">3. ስልክ ቁጥር (Phone Number)</div>
                  <div className="col-span-7 font-mono font-bold text-black">{phone}</div>
                </div>

                <div className="grid grid-cols-12 border-b border-dotted border-black/60 pb-1">
                  <div className="col-span-5 font-extrabold text-black">4. አድራሻ (Permanent Address)</div>
                  <div className="col-span-7 font-bold text-black">ባህር ዳር, ቀበሌ 14 • ሞተረኞች ማህበር</div>
                </div>

                {/* 5. Registration Details block */}
                <div className="border-b border-dotted border-black/60 pb-1 space-y-1">
                  <div className="font-extrabold text-black">5. የተሽከርካሪ ምዝገባ ዝርዝር (Registration Details)</div>
                  
                  <div className="pl-4 space-y-1">
                    <div className="grid grid-cols-12">
                      <div className="col-span-5 text-slate-700">(ሀ) የሰሌዳ ቁጥር (Registration Mark)</div>
                      <div className="col-span-7 font-mono font-black text-black">{plate}</div>
                    </div>

                    <div className="grid grid-cols-12">
                      <div className="col-span-5 text-slate-700">(ለ) የተመዘገበበት ቀን (Date of Registration)</div>
                      <div className="col-span-7 font-mono font-bold text-black">{issueDate}</div>
                    </div>

                    <div className="grid grid-cols-12">
                      <div className="col-span-5 text-slate-700">(ሐ) የሞተር ምርት እና ሞዴል (Make / Model)</div>
                      <div className="col-span-7 font-bold text-black">{motorBrand} {motorModel}</div>
                    </div>

                    <div className="grid grid-cols-12">
                      <div className="col-span-5 text-slate-700">(መ) የቻሲስ / የሞተር ቁጥር (Chassis Number)</div>
                      <div className="col-span-7 font-mono font-bold text-black">{chassis}</div>
                    </div>

                    <div className="grid grid-cols-12">
                      <div className="col-span-5 text-slate-700">(ሠ) የተሽከርካሪ ዓይነት (Class of Vehicle)</div>
                      <div className="col-span-7 font-bold text-black">{category}</div>
                    </div>

                    <div className="grid grid-cols-12">
                      <div className="col-span-5 text-slate-700">(ረ) የሚጫነው ሰው ብዛት (Seating Capacity)</div>
                      <div className="col-span-7 font-bold text-black">1 (ሹፌር ብቻ)</div>
                    </div>

                    <div className="grid grid-cols-12">
                      <div className="col-span-5 text-slate-700">(ሰ) የተመረተበት ዓመተ ምህረት (Manufacturing Year)</div>
                      <div className="col-span-7 font-bold text-black">2026</div>
                    </div>

                    <div className="grid grid-cols-12">
                      <div className="col-span-5 text-slate-700">(ሸ) የአገልግሎት ዓይነት (Service Type)</div>
                      <div className="col-span-7 font-bold text-black">የንግድ መንቀሳቀሻ ፈቃድ</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-12 border-b border-dotted border-black/60 pb-1">
                  <div className="col-span-5 font-extrabold text-black">6. ፈቃዱ የሚጸናበት አካባቢ/መስመር (Valid Route)</div>
                  <div className="col-span-7 font-bold text-black">ባህር ዳር እና አካባቢው ብቻ</div>
                </div>

                <div className="grid grid-cols-12 border-b border-dotted border-black/60 pb-1">
                  <div className="col-span-5 font-extrabold text-black">7. የፈቃዱ ሁኔታዎች እና ደንቦች (Conditions)</div>
                  <div className="col-span-7 font-bold text-black">የተረጋገጠ እና ህጋዊ</div>
                </div>

              </div>

              {/* Holder Portrait Photo Inline Box */}
              <div className="flex justify-between items-center bg-slate-50 border border-black p-2 my-2">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-18 bg-slate-200 border border-black overflow-hidden flex items-center justify-center shrink-0">
                    <SmartImage
                      src={registration.userPortraitPhoto}
                      alt="Holder"
                      fallbackIcon="person"
                      isGrayscale={true}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-black text-xs text-black">የባለቤቱ ፓስፖርት ፎቶ (Holder Passport Photo)</p>
                    <p className="text-[10px] text-slate-600 font-mono">{name} • {plate}</p>
                  </div>
                </div>
                <div className="text-right font-mono text-[10px] font-bold border border-black px-2 py-1 bg-white">
                  VERIFIED ID
                </div>
              </div>

              {/* Conditions / Notice text as seen in reference image */}
              <div className="text-[9px] text-black italic border-t border-black pt-1 leading-tight">
                Conditions other than specified in item(1) to (7) above and those under section 84 and sub-section (10) of section 88 of the Motor Vehicle Act 1988. Note.—See the conditions overleaf.
              </div>

              {/* Bottom Footer Signatures & Date */}
              <div className="pt-3 border-t-2 border-black flex justify-between items-end">
                <div className="text-[10px] font-mono text-black font-bold">
                  <div>Date: {formatEthiopianDate(issueDate, isAmharic ? 'am' : 'en')}</div>
                  <div className="text-[9px] text-slate-600 mt-0.5">Bahir Dar Transport Authority</div>
                </div>

                <div className="flex items-end gap-6">
                  {/* Official Stamp Seal */}
                  <div className="w-20 h-20 rounded-full border-4 border-double border-black p-0.5 flex items-center justify-center relative rotate-[-10deg] opacity-95 bg-white shadow-xs">
                    <div className="w-full h-full rounded-full border border-black flex flex-col items-center justify-center text-center text-[7px] font-black text-black leading-tight p-0.5 bg-white">
                      <span> ባህር ዳር ትራፊክ </span>
                      <span className="my-0.5 text-[8px] font-black border-y border-black py-0.5 bg-black text-white">APPROVED</span>
                      <span>ማኔጅመንት</span>
                    </div>
                  </div>

                  {/* Officer Signature */}
                  <div className="space-y-1 text-center">
                    <div className="h-8 flex items-center justify-center">
                      <svg className="w-28 h-8 text-black" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10 15 Q30 2 50 20 T80 8 T90 25" />
                        <path d="M5 20 Q40 30 95 15" strokeWidth="1.5" />
                      </svg>
                    </div>
                    <div className="border-t border-black pt-0.5 text-[10px] font-bold text-black">
                      Secretary / Authorized Officer
                    </div>
                    <div className="text-[9px] text-slate-700">
                      State/Regional Transport Authority
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        {/* Modal Action Footer Bar (No-Print) */}
        <div className="no-print flex items-center justify-between gap-3 pt-2 border-t border-outline-variant/60">
          <div className="text-[11px] font-semibold text-secondary flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{isAmharic ? 'የተረጋገጠ ኦፊሴላዊ ሰነድ' : 'Official Validated Document'}</span>
          </div>

          <div className="flex items-center gap-2">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-md text-xs font-bold bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors cursor-pointer"
              >
                {isAmharic ? 'ዝጋ' : 'Close'}
              </button>
            )}

            {(registration.status === 'approved' || registration.status === 'printed' || registration.status === 'ordered_print') ? (
              <button
                id="print-permit-btn"
                type="button"
                onClick={handlePrint}
                className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-md text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">print</span>
                <span>{isAmharic ? 'ሰነዱን አትም' : 'Print Document'}</span>
              </button>
            ) : (
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-300 px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-amber-500 text-[18px]">lock</span>
                <span>{isAmharic ? 'የሥራ አስኪያጅ ማፅደቅ ይጠበቃል' : 'Print Disabled — Awaiting Manager Approval'}</span>
              </div>
            )}
          </div>
        </div>

        </div>
      </div>
    </div>
  );
};
