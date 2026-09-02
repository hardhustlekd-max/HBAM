import React, { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { MotorcycleRegistration, Language, APP_LOGO } from '../types';

interface VehicleQRStickerProps {
  registration: Partial<MotorcycleRegistration>;
  lang: Language;
  onClose?: () => void;
  autoPrint?: boolean;
}

export const VehicleQRSticker: React.FC<VehicleQRStickerProps> = ({
  registration,
  lang,
  onClose,
  autoPrint = false,
}) => {
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
        const available = Math.min(parentWidth - 16, 400);
        if (available > 0 && available < 400) {
          setStandaloneFitScale(Number((available / 400).toFixed(3)));
        } else {
          setStandaloneFitScale(1);
        }
      }
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const regId = registration.id || '';
  const userRegNo = registration.plateNumber && registration.plateNumber.toUpperCase() !== 'ELECTRIC'
    ? registration.plateNumber
    : (registration.id || registration.plateNumber || '—');
  const qrVal = registration.qrCodeData || `https://enforcement.gov.et/verify/${regId || registration.plateNumber || ''}`;

  // Format valid until date derived from registration
  const computeExpiryDateFormatted = () => {
    try {
      const issue = registration.registrationDate || new Date().toISOString().split('T')[0];
      const regD = new Date(issue);
      if (!isNaN(regD.getTime())) {
        regD.setFullYear(regD.getFullYear() + 1);
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        return `${regD.getDate()} ${months[regD.getMonth()]} ${regD.getFullYear()}`;
      }
    } catch {}
    return '17 AUG 2027';
  };
  const expiryDateFormatted = computeExpiryDateFormatted();

  const handlePrint = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    document.body.setAttribute('data-print-target', 'sticker');
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

  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        handlePrint();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  return (
    <div
      ref={containerRef}
      id="vehicle-qr-sticker-container"
      className={isInZoomable ? "shrink-0 flex flex-col items-center font-sans select-none py-1" : "w-full flex flex-col items-center font-sans select-none py-1 max-w-full overflow-hidden"}
    >
      <div
        style={{
          width: standaloneFitScale < 1 ? `${400 * standaloneFitScale}px` : '400px',
          height: standaloneFitScale < 1 ? `${(460 + 48) * standaloneFitScale}px` : 'auto',
        }}
        className="flex flex-col items-center gap-3 shrink-0 mx-auto relative origin-top"
      >
        <div
          style={{
            transform: standaloneFitScale < 1 ? `scale(${standaloneFitScale})` : 'none',
            transformOrigin: 'top center',
          }}
          className="flex flex-col items-center gap-3 w-[400px] shrink-0"
        >

        {/* PRINTABLE STICKER CARD FRAME */}
        <div className="flex justify-center py-1">
          <div id="sticker-container" className="printable-sticker w-[380px] h-[380px] bg-[#e5e7eb] rounded-[32px] p-3.5 shadow-2xl relative overflow-hidden font-sans flex flex-col items-center justify-center ring-1 ring-black/10">
            
            {/* Outer Silver Security Pattern Border Background */}
            <div className="absolute inset-0 bg-[radial-gradient(#d1d5db_1px,transparent_1px)] [background-size:6px_6px] rounded-[32px] opacity-70 pointer-events-none" />

            {/* Main Navy Inner Frame Container */}
            <div className="relative z-10 w-full h-full bg-white rounded-[24px] border-[5px] border-[#133072] flex flex-col justify-between overflow-hidden shadow-inner">
              
              {/* Top Yellow Header Section */}
              <div className="bg-[#ffdd00] border-b-[3px] border-[#133072] px-3 py-2 flex items-center gap-2.5 text-black shrink-0">
                
                {/* System Seal Emblem */}
                <div className="w-13 h-13 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm relative overflow-hidden">
                  <img src={APP_LOGO} alt="Logo" className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                </div>

                {/* Header System Title Text Block */}
                <div className="flex-1 text-center font-sans leading-none text-[#000000]">
                  <div className="text-[12px] font-black tracking-tight mb-1 font-sans">
                    ሕይወት ባህርዳር የሞተረኞች ማህበር
                  </div>
                  <div className="text-[10px] font-extrabold tracking-tight text-black uppercase">
                    HIWOT BAHIRDAR MOTORBIKE RIDERS ASSOC. PLC
                  </div>
                </div>
              </div>

              {/* Middle Area: Centered QR Code */}
              <div className="flex-1 bg-white flex flex-col items-center justify-center p-2 relative">
                <div className="bg-white p-2 rounded-lg">
                  <QRCodeSVG 
                    value={qrVal} 
                    size={175} 
                    level="H" 
                    includeMargin={false}
                  />
                </div>
              </div>

              {/* Bottom Area: Validity & Serial Number */}
              <div className="bg-white text-center pb-3 pt-1 relative shrink-0">
                
                {/* Validity Label */}
                <div className="text-[13px] font-extrabold tracking-wider text-slate-900 uppercase font-sans">
                  VALID UNTIL: {expiryDateFormatted}
                </div>

                {/* Registration Number Display */}
                <div className="text-[26px] font-black tracking-wider text-slate-950 font-mono leading-none mt-1">
                  {userRegNo}
                </div>

                {/* Bottom Corner Red Security Triangles */}
                {/* Left Bottom Corner Triangle */}
                <div 
                  className="absolute bottom-0 left-0 w-12 h-12 bg-[#dc2626] pointer-events-none z-10"
                  style={{ clipPath: 'polygon(0 100%, 0 0, 100% 100%)' }}
                />

                {/* Right Bottom Corner Triangle */}
                <div 
                  className="absolute bottom-0 right-0 w-12 h-12 bg-[#dc2626] pointer-events-none z-10"
                  style={{ clipPath: 'polygon(100% 100%, 100% 0, 0 100%)' }}
                />
              </div>

            </div>
          </div>
        </div>

        {/* Modal Action Footer Bar (No-Print) */}
        <div className="no-print flex items-center justify-between gap-3 pt-2 border-t border-outline-variant/60">
          <div className="text-[11px] font-semibold text-secondary flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{isAmharic ? 'የተረጋገጠ ኦፊሴላዊ ተለጣፊ' : 'Official Validated Sticker'}</span>
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
                id="print-sticker-btn"
                type="button"
                onClick={handlePrint}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-md text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">print</span>
                <span>{isAmharic ? 'ስቲከሩን አትም' : 'Print Sticker'}</span>
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

