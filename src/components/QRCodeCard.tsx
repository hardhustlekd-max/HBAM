import React, { useState, useRef, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { MotorcycleRegistration, Language, APP_LOGO } from '../types';
import { SmartImage } from './SmartImage';

interface QRCodeCardProps {
  registration: Partial<MotorcycleRegistration>;
  lang: Language;
}

export const autoCapitalize = (str?: string): string => {
  if (!str) return '';
  return str
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export const QRCodeCard: React.FC<QRCodeCardProps> = ({ registration, lang }) => {
  const isAmharic = lang === 'am';
  const [printError, setPrintError] = useState<boolean>(false);
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
        const available = Math.min(parentWidth - 16, 580);
        if (available > 0 && available < 580) {
          setStandaloneFitScale(Number((available / 580).toFixed(3)));
        } else {
          setStandaloneFitScale(1);
        }
      }
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const formatNameDisplay = (rawName?: string) => {
    if (!rawName || rawName.trim() === '') return { am: '—', en: '' };
    const match = rawName.match(/^(.*?)\s*\((.*?)\)$/) || rawName.match(/^(.*?)\s*-\s*(.*?)$/);
    if (match) {
      const part1 = match[1].trim();
      const part2 = match[2].trim();
      const isAmh = (s: string) => /[\u1200-\u137F]/.test(s);
      if (isAmh(part2)) {
        return { am: part2, en: autoCapitalize(part1) };
      }
      if (isAmh(part1)) {
        return { am: part1, en: autoCapitalize(part2) };
      }
      return { am: part1, en: autoCapitalize(part2) };
    }
    const isAmhOnly = /[\u1200-\u137F]/.test(rawName);
    if (isAmhOnly) {
      return { am: rawName, en: '' };
    }
    return { am: rawName, en: autoCapitalize(rawName) };
  };

  const nameParts = formatNameDisplay(registration.fullName);

  const formatMemberId = (rawId?: string) => {
    if (!rawId || rawId.trim() === '') return '—';
    if (rawId.startsWith('MB-')) return rawId;
    if (rawId.startsWith('REG-')) return rawId.replace('REG-', 'MB-');
    return `MB-${rawId}`;
  };

  const idNo = formatMemberId(registration.id);
  const plateNo = registration.plateNumber || '—';
  const bloodGroup = registration.bloodGroup || 'O+';
  const phone = registration.phone || '—';

  const issueDate = registration.registrationDate
    ? registration.registrationDate.split(' ')[0]
    : new Date().toISOString().split('T')[0];

  const computeExpiry = () => {
    try {
      const parts = issueDate.split(/[-/]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          const year = parseInt(parts[0], 10) + 1;
          return `${year}-${parts[1]}-${parts[2]}`;
        } else {
          const year = parseInt(parts[2], 10) + 1;
          return `${parts[0]}/${parts[1]}/${year}`;
        }
      }
    } catch {}
    return '2027-08-18';
  };
  const expiryDate = computeExpiry();

  const portraitPhoto = registration.userPortraitPhoto || registration.nationalIdPhoto || '';
  const qrVal = registration.qrCodeData || `https://enforcement.gov.et/verify/${registration.id || plateNo}`;

  return (
    <div
      ref={containerRef}
      className={isInZoomable ? "shrink-0 flex flex-col items-center font-sans py-1" : "w-full flex flex-col items-center font-sans py-1 max-w-full overflow-hidden"}
    >
      <div
        style={{
          width: standaloneFitScale < 1 ? `${580 * standaloneFitScale}px` : '580px',
          height: standaloneFitScale < 1 ? `${(366 + 48) * standaloneFitScale}px` : 'auto',
        }}
        className="flex flex-col items-center gap-3 shrink-0 mx-auto relative origin-top"
      >
        <div
          style={{
            transform: standaloneFitScale < 1 ? `scale(${standaloneFitScale})` : 'none',
            transformOrigin: 'top center',
          }}
          className="flex flex-col items-center gap-3 w-[580px] shrink-0"
        >
        
        {/* Replica of Member ID Card matching user uploaded image */}
        <div id="pvc-card-container" className="printable-id-card w-[580px] h-[366px] bg-white rounded-md shadow-2xl border border-slate-300 overflow-hidden text-slate-900 relative shrink-0 select-none font-sans flex flex-col justify-between">
          
          {/* TOP HEADER BANNER - Deep Navy Blue */}
          <div className="bg-[#0B1E48] text-white px-3.5 py-1.5 flex items-center justify-between relative min-h-[92px] shrink-0 border-b-2 border-yellow-500">
            
            {/* Left Emblem Logo */}
            <div className="flex flex-col items-center shrink-0 z-10 w-[68px]">
              <div className="w-13 h-13 rounded-full bg-white shadow-md flex items-center justify-center relative overflow-hidden">
                <img src={APP_LOGO} alt="Logo" className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
              </div>
              <div className="bg-white text-[#0B1E48] text-[7.5px] font-black px-1.5 py-0.5 rounded-xs mt-0.5 border border-[#EAB308] whitespace-nowrap shadow-2xs">
                ማህበራዊ አገልግሎት
              </div>
            </div>

            {/* Center Association Title */}
            <div className="flex flex-col items-center text-center flex-1 mx-1 z-10">
              <h2 className="text-[11.5px] font-black text-white tracking-tight leading-tight">
                ሕይወት ባህርዳር የሞተረኞች ማህበር አገልግሎት ኃ.የተ.የግ.ማ:
              </h2>
              <h1 className="text-[12px] font-black text-white tracking-wider uppercase leading-tight mt-0.5">
                HIWOT BAHIRDAR MOTORBIKE RIDERS
              </h1>
              <h2 className="text-[11px] font-bold text-white/95 tracking-wider uppercase leading-tight">
                ASSOCIATION SERVICE PLC
              </h2>

              {/* Center Yellow Pill Badge */}
              <div className="mt-1 bg-[#EAB308] text-[#0B1E48] px-5 py-0.5 rounded-full shadow-sm border border-yellow-300 flex flex-col items-center">
                <span className="text-[11px] font-black leading-tight">የአባል መታወቂያ</span>
                <span className="text-[9.5px] font-extrabold tracking-wider uppercase leading-tight">MEMBER ID CARD</span>
              </div>
            </div>

            {/* Right Column: Flag + Moto Slogan */}
            <div className="flex flex-col items-end text-right shrink-0 z-10 w-[115px]">
              <div className="flex items-center gap-1.5">
                <div className="w-8 h-5 rounded-xs overflow-hidden flex flex-col border border-white/60 shadow-2xs shrink-0 relative">
                  <div className="h-1/3 bg-[#009b57] w-full" />
                  <div className="h-1/3 bg-[#fed100] w-full" />
                  <div className="h-1/3 bg-[#da121a] w-full" />
                  {/* Center Emblem: Blue disc with yellow pentagram star */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-3.5 h-3.5 rounded-full bg-[#0a2351] flex items-center justify-center border border-white/30 shadow-2xs">
                      <svg className="w-2.5 h-2.5 text-[#fed100]" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-1 text-right">
                <p className="text-[9.5px] font-black text-white leading-tight">በአንድነት ለአገልግሎት!</p>
                <p className="text-[7.5px] font-bold text-yellow-300 leading-tight">Together for Safe & Better Service!</p>
              </div>

              <div className="mt-0.5 flex justify-end">
                <span className="material-symbols-outlined text-[28px] text-white opacity-95">two_wheeler</span>
              </div>
            </div>
          </div>

          {/* MAIN CARD BODY - White Area with Prominent Photo & Large Text */}
          <div className="px-3.5 py-3 bg-white flex-1 flex items-center justify-between gap-3 relative">
            
            {/* Left Column: ENLARGED Portrait Photo with Navy Border */}
            <div className="w-[125px] shrink-0 flex flex-col items-center">
              <div className="w-[120px] h-[155px] rounded-lg border-2 border-[#0B1E48] shadow-md overflow-hidden bg-slate-100 relative">
                <SmartImage
                  src={portraitPhoto}
                  alt="Member Portrait"
                  fallbackIcon="person"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Center Column: Table Details with Bigger Prominent Font Sizes */}
            <div className="flex-1 min-w-0 pr-1 space-y-2 text-[12.5px] font-sans">
              
              {/* Full Name */}
              <div className="flex items-start gap-1">
                <span className="font-extrabold text-[#0B1E48] min-w-[130px] shrink-0 text-[12px]">ሙሉ ስም / Full Name</span>
                <div className="font-black text-slate-900 text-[14px] leading-tight">
                  <p>: {nameParts.am}</p>
                  {nameParts.en && <p className="ml-2 font-bold text-slate-800 text-[11.5px]">{nameParts.en}</p>}
                </div>
              </div>

              {/* ID No */}
              <div className="flex items-center gap-1">
                <span className="font-extrabold text-[#0B1E48] min-w-[130px] shrink-0 text-[12px]">የአባል መለያ ቁጥር / ID No.</span>
                <span className="font-mono font-black text-slate-900 text-[13px]">: {idNo}</span>
              </div>

              {/* Plate No */}
              <div className="flex items-center gap-1">
                <span className="font-extrabold text-[#0B1E48] min-w-[130px] shrink-0 text-[12px]">የምዝገባ ሰሌዳ / Plate No.</span>
                <span className="font-mono font-black text-[#0B1E48] text-[13.5px]">: {plateNo}</span>
              </div>

              {/* Blood Group */}
              <div className="flex items-center gap-1">
                <span className="font-extrabold text-[#0B1E48] min-w-[130px] shrink-0 text-[12px]">የደም አይነት / Blood Group</span>
                <span className="font-black text-red-600 text-[13px]">: {bloodGroup}</span>
              </div>

              {/* Phone */}
              <div className="flex items-center gap-1">
                <span className="font-extrabold text-[#0B1E48] min-w-[130px] shrink-0 text-[12px]">ስልክ / Phone</span>
                <span className="font-mono font-bold text-slate-900 text-[12.5px]">: {phone}</span>
              </div>

              {/* Issue Date */}
              <div className="flex items-center gap-1">
                <span className="font-extrabold text-[#0B1E48] min-w-[130px] shrink-0 text-[12px]">የተሰጠበት ቀን / Issue Date</span>
                <span className="font-mono font-bold text-slate-900 text-[12.5px]">: {issueDate}</span>
              </div>

              {/* Expiry Date */}
              <div className="flex items-center gap-1">
                <span className="font-extrabold text-[#0B1E48] min-w-[130px] shrink-0 text-[12px]">የሚያበቃበት ቀን / Expiry Date</span>
                <span className="font-mono font-bold text-slate-900 text-[12.5px]">: {expiryDate}</span>
              </div>
            </div>

            {/* Right Column: QR Code & Stamp */}
            <div className="w-[120px] shrink-0 flex flex-col items-center justify-between h-[160px]">
              
              {/* QR Code */}
              <div className="bg-white p-1 rounded-md border border-slate-300 shadow-2xs">
                <QRCodeSVG value={qrVal} size={78} level="M" />
              </div>

              {/* Official Stamp & Signature */}
              <div className="relative flex flex-col items-center mt-0.5">
                <div className="w-16 h-16 rounded-full border-2 border-double border-[#0B1E48] p-0.5 flex items-center justify-center relative bg-white">
                  <div className="w-full h-full rounded-full border border-dashed border-[#0B1E48] flex flex-col items-center justify-center p-0.5 text-[5.5px] font-black text-[#0B1E48] text-center">
                    <span>ሕይወት ባህርዳር</span>
                    <span className="material-symbols-outlined text-[16px] text-[#0B1E48] my-0.5">two_wheeler</span>
                    <span>ኃ.የተ.የግ.ማ</span>
                  </div>

                  {/* Blue Cursive Signature */}
                  <svg className="absolute w-14 h-8 text-blue-800 top-2 left-1" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M5 20 Q20 5 35 18 T55 12 T75 22 T95 10" />
                  </svg>
                </div>
                <span className="text-[7.5px] font-bold text-[#0B1E48] mt-0.5 text-center leading-tight">
                  የስራ ኃላፊ ፊርማ<br />Authorized Signature
                </span>
              </div>
            </div>
          </div>

          {/* BOTTOM FOOTER BANNER - Deep Navy Blue */}
          <div className="bg-[#0B1E48] text-white py-1 px-3 text-center text-[10.5px] font-black tracking-wide shrink-0">
            ይህ መታወቂያ የሕይወት ባህርዳር የሞተረኞች ማህበር ንብረት ነው።
          </div>
        </div>

        </div>
      </div>
    </div>
  );
};
