import React, { useState, useRef, useEffect } from 'react';
import { Language, UserRole } from '../types';

interface ZoomableDocumentContainerProps {
  children: React.ReactNode;
  lang?: Language;
  userRole?: UserRole;
  title?: string;
  onClose?: () => void;
  onPrint?: () => void;
  requireClerkRequest?: boolean;
  footerActions?: React.ReactNode;
  hideHeader?: boolean;
}

export const ZoomableDocumentContainer: React.FC<ZoomableDocumentContainerProps> = ({
  children,
  lang = 'en',
  userRole,
  title,
  onClose,
  onPrint,
  requireClerkRequest = true,
  footerActions,
  hideHeader = false,
}) => {
  const isAmharic = lang === 'am';
  const [scale, setScale] = useState<number>(1);
  const [fitScale, setFitScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Clerk Access State
  const isClerk = userRole === 'clerk';
  const [clerkAccessGranted, setClerkAccessGranted] = useState<boolean>(
    requireClerkRequest && isClerk ? false : true
  );

  // Touch Pinch state
  const initialTouchDistanceRef = useRef<number | null>(null);
  const initialScaleRef = useRef<number>(1);

  // Calculate fitScale to ensure 100% visibility on any device screen size without overflowing
  const updateFitScale = () => {
    if (containerRef.current && contentRef.current) {
      const containerW = containerRef.current.clientWidth;
      const containerH = containerRef.current.clientHeight;
      if (containerW <= 0 || containerH <= 0) return;

      const paddingX = containerW < 480 ? 12 : 24;
      const paddingY = containerH < 500 ? 12 : 24;

      const availW = Math.max(100, containerW - paddingX);
      const availH = Math.max(100, containerH - paddingY);

      // Accurately measure unscaled child dimensions by querying for explicit card containers
      const docTarget = contentRef.current.querySelector(
        '#pvc-card-container, #a4-permit-document, #sticker-container, .printable-id-card, .printable-a4-document, .printable-sticker, [data-fit-target="true"], img'
      ) as HTMLElement | null;

      let natW = 580;
      let natH = 380;

      if (docTarget) {
        if (docTarget instanceof HTMLImageElement && docTarget.naturalWidth && docTarget.naturalHeight) {
          natW = docTarget.naturalWidth;
          natH = docTarget.naturalHeight;
        } else if (docTarget.id === 'pvc-card-container' || docTarget.classList.contains('printable-id-card')) {
          natW = 580;
          natH = 366;
        } else if (docTarget.id === 'a4-permit-document' || docTarget.classList.contains('printable-a4-document')) {
          natW = 794;
          natH = 1050;
        } else if (docTarget.id === 'sticker-container' || docTarget.classList.contains('printable-sticker')) {
          natW = 380;
          natH = 380;
        } else {
          natW = Math.max(280, docTarget.scrollWidth || docTarget.offsetWidth || 580);
          natH = Math.max(180, docTarget.scrollHeight || docTarget.offsetHeight || 380);
        }
      } else {
        const firstChild = contentRef.current.firstElementChild as HTMLElement | null;
        const targetEl = firstChild || contentRef.current;
        natW = Math.max(280, targetEl.scrollWidth || targetEl.offsetWidth || 580);
        natH = Math.max(180, targetEl.scrollHeight || targetEl.offsetHeight || 380);
      }

      const scaleX = availW / natW;
      const scaleY = availH / natH;
      const computedFit = Math.min(scaleX, scaleY);

      if (computedFit > 0 && isFinite(computedFit)) {
        setFitScale(Number(computedFit.toFixed(3)));
      }
    }
  };

  useEffect(() => {
    updateFitScale();
    const t1 = setTimeout(updateFitScale, 50);
    const t2 = setTimeout(updateFitScale, 150);
    const t3 = setTimeout(updateFitScale, 300);

    const imgEls = contentRef.current?.querySelectorAll('img');
    const handleImgLoad = () => updateFitScale();
    imgEls?.forEach((img) => img.addEventListener('load', handleImgLoad));

    let resizeObserver: ResizeObserver | null = null;
    if (containerRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        updateFitScale();
      });
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener('resize', updateFitScale);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      imgEls?.forEach((img) => img.removeEventListener('load', handleImgLoad));
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', updateFitScale);
    };
  }, [children]);

  // Non-passive Wheel / Trackpad Pinch zoom listener
  useEffect(() => {
    const containerEl = containerRef.current;
    if (!containerEl) return;

    const handleWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY;
      const zoomFactor = delta < 0 ? 1.15 : 0.85;
      setScale((prev) => {
        const next = Math.min(4.0, Math.max(0.05, Number((prev * zoomFactor).toFixed(2))));
        if (next <= 1 && prev > 1) {
          setPosition({ x: 0, y: 0 });
        }
        return next;
      });
    };

    containerEl.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => {
      containerEl.removeEventListener('wheel', handleWheelNative);
    };
  }, []);

  const effectiveScale = Number((fitScale * scale).toFixed(3));

  const handleZoomIn = () => {
    setScale((prev) => {
      let step = 0.25;
      if (prev < 0.2) step = 0.05;
      else if (prev < 1.0) step = 0.1;
      const next = Math.min(4.0, Number((prev + step).toFixed(2)));
      return next;
    });
  };

  const handleZoomOut = () => {
    setScale((prev) => {
      let step = 0.25;
      if (prev <= 0.2) step = 0.05;
      else if (prev <= 1.0) step = 0.1;
      const next = Math.max(0.05, Number((prev - step).toFixed(2)));
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Touch event handlers for Pinch Zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialTouchDistanceRef.current = dist;
      initialScaleRef.current = scale;
    } else if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialTouchDistanceRef.current !== null && initialTouchDistanceRef.current > 0) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = currentDist / initialTouchDistanceRef.current;
      const newScale = Math.min(4.0, Math.max(0.05, Number((initialScaleRef.current * factor).toFixed(2))));
      setScale(newScale);
      if (newScale <= 1) {
        setPosition({ x: 0, y: 0 });
      }
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    }
  };

  const handleTouchEnd = () => {
    initialTouchDistanceRef.current = null;
    setIsDragging(false);
  };

  // Mouse Drag handlers when zoomed in
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // If clerk needs to request access before viewing
  if (requireClerkRequest && isClerk && !clerkAccessGranted) {
    return (
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 max-w-md w-full mx-auto text-center space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center mx-auto shadow-xs">
          <span className="material-symbols-outlined text-[32px]">lock_person</span>
        </div>
        <div>
          <h4 className="font-extrabold text-base text-on-surface">
            {isAmharic ? 'የመመልከት ጥያቄ ያስፈልጋል' : 'Clerk View Request Required'}
          </h4>
          <p className="text-xs text-secondary mt-1.5 leading-relaxed">
            {isAmharic
              ? 'ክለርኮች የባለቤት መታወቂያ፣ የሞተር ተለጣፊ እና የመንቀሳቀሻ ፍቃድ ሰነዶችን ለማየት በቅድሚያ የዕይታ ጥያቄ ማቅረብ አለባቸው።'
              : 'As a Clerk, official movement permits, owner ID documents, and sticker QR codes require an explicit view request.'}
          </p>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-3 text-[11px] text-amber-900 dark:text-amber-300 font-medium flex items-center gap-2 text-left">
          <span className="material-symbols-outlined text-amber-500 text-[18px] shrink-0">info</span>
          <span>
            {isAmharic
              ? 'የመመልከት ጥያቄዎ በቀጥታ በስርዓቱ ኦዲት ይመዘገባል።'
              : 'Submitting a view request will log your badge ID for security audit.'}
          </span>
        </div>

        <div className="flex justify-center gap-2 pt-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-surface-container border border-outline-variant rounded-md text-xs font-bold text-secondary hover:text-on-surface transition-colors cursor-pointer"
            >
              {isAmharic ? 'ሰርዝ' : 'Cancel'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setClerkAccessGranted(true)}
            className="px-5 py-2.5 bg-primary text-white rounded-md text-xs font-extrabold flex items-center gap-2 shadow-md hover:bg-primary-hover active:scale-95 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">visibility</span>
            <span>{isAmharic ? 'የመመልከት ጥያቄ አቅርብና ተመልከት' : 'Request & View Document'}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-zoomable-container="true" className="flex flex-col w-full max-w-4xl mx-auto bg-surface-container-lowest border border-outline-variant/80 rounded-lg shadow-2xl overflow-hidden space-y-0 my-auto">
      
      {/* STATIONARY HEADER BAR WITH ZOOM CONTROLS */}
      <div className="no-print bg-surface-container/90 border-b border-outline-variant/80 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-xs text-xs shrink-0">
        {!hideHeader ? (
          <div className="flex items-center gap-2 font-bold text-on-surface">
            <span className="material-symbols-outlined text-primary text-[20px]">preview</span>
            <span className="truncate max-w-[200px] sm:max-w-xs">{title || (isAmharic ? 'የሰነድ ማጉያ' : 'Interactive Preview')}</span>
            <span className="hidden md:inline-block text-[10px] text-secondary font-mono bg-surface border border-outline-variant px-2 py-0.5 rounded">
              {isAmharic ? 'በጣት ቀርበህ አጉላ' : 'Pinch or controls to zoom'}
            </span>
          </div>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-1.5 ml-auto">
          {/* Zoom Out */}
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={scale <= 0.05}
            className="h-9 px-3 flex items-center justify-center bg-surface border border-outline-variant rounded-lg font-bold text-on-surface hover:bg-surface-container-high disabled:opacity-30 transition-all cursor-pointer"
            title="Zoom Out (Min 5%)"
          >
            <span className="material-symbols-outlined text-[18px]">zoom_out</span>
          </button>

          {/* Scale Indicator (Shows percentage down to 5%) */}
          <span className="font-mono text-xs font-bold text-primary min-w-[48px] text-center bg-surface border border-outline-variant px-1.5 py-1 rounded-lg">
            {Math.round(scale * 100)}%
          </span>

          {/* Zoom In */}
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={scale >= 4.0}
            className="h-9 px-3 flex items-center justify-center bg-surface border border-outline-variant rounded-lg font-bold text-on-surface hover:bg-surface-container-high disabled:opacity-30 transition-all cursor-pointer"
            title="Zoom In (Max 400%)"
          >
            <span className="material-symbols-outlined text-[18px]">zoom_in</span>
          </button>

          {/* Reset Zoom */}
          <button
            type="button"
            onClick={handleResetZoom}
            className="h-9 px-3 bg-surface border border-outline-variant rounded-lg font-bold text-xs text-secondary hover:text-on-surface hover:bg-surface-container-high transition-all cursor-pointer"
            title="Reset Zoom to 100%"
          >
            {isAmharic ? 'መደበኛ' : 'Reset'}
          </button>

          {/* Print ID / Document Button beside Zoom Controls (Icon Only) */}
          {onPrint && (
            <button
              type="button"
              onClick={onPrint}
              className="h-9 px-3 flex items-center justify-center bg-primary hover:bg-primary-hover text-white rounded-lg font-bold transition-all cursor-pointer shadow-xs ml-0.5"
              title={isAmharic ? 'አትም' : 'Print Document'}
            >
              <span className="material-symbols-outlined text-[18px]">print</span>
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-3 flex items-center justify-center bg-surface-container-high border border-outline-variant rounded-lg text-secondary hover:text-on-surface transition-colors cursor-pointer ml-1"
              title="Close"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* INTERACTIVE DOCUMENT CANVAS VIEWPORT WITH PINCH TO ZOOM & DRAG PAN */}
      <div
        ref={containerRef}
        className="relative w-full h-[58vh] sm:h-[68vh] min-h-[350px] max-h-[720px] bg-slate-900/80 dark:bg-black/90 overflow-hidden flex items-center justify-center select-none touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="w-full h-full flex items-center justify-center overflow-hidden relative">
          <div
            ref={contentRef}
            style={{
              transform: `scale(${effectiveScale}) translate(${position.x / effectiveScale}px, ${position.y / effectiveScale}px)`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            }}
            className={`transition-transform ease-out duration-150 flex flex-col items-center justify-center shrink-0 origin-center ${
              scale > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
            }`}
          >
            {children}
          </div>
        </div>
      </div>

      {/* OPTIONAL STATIONARY FOOTER BAR */}
      {footerActions && (
        <div className="no-print bg-surface-container-lowest border-t border-outline-variant/80 px-4 py-3 flex items-center justify-between gap-3 shrink-0">
          {footerActions}
        </div>
      )}
    </div>
  );
};

