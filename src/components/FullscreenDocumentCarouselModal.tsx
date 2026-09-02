import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Language } from '../types';

export interface DocumentViewerItem {
  url: string;
  title: string;
  subtitle?: string;
  type?: string;
  icon?: string;
}

export const buildRegistrationDocumentList = (
  reg: any,
  lang: Language = 'en'
): DocumentViewerItem[] => {
  if (!reg) return [];
  const isAmharic = lang === 'am';
  const list: DocumentViewerItem[] = [];

  // 1. Police Permit
  if (reg.drivingPermitPhoto && typeof reg.drivingPermitPhoto === 'string' && reg.drivingPermitPhoto.trim() !== '') {
    list.push({
      url: reg.drivingPermitPhoto,
      title: isAmharic ? 'የፖሊስ የመንቀሳቀሻ ፈቃድ' : 'Police Permit',
      subtitle: `${reg.fullName || ''} • ${reg.plateNumber || reg.engineOrSerialNo || ''}`,
      icon: 'menu_book',
      type: 'police-permit',
    });
  }

  // 2. Driver License
  if (reg.drivingLicensePhoto && typeof reg.drivingLicensePhoto === 'string' && reg.drivingLicensePhoto.trim() !== '') {
    list.push({
      url: reg.drivingLicensePhoto,
      title: isAmharic ? 'የመንጃ ፍቃድ' : 'Driver License',
      subtitle: `${reg.fullName || ''} • ${reg.plateNumber || ''}`,
      icon: 'card_membership',
      type: 'driving-license',
    });
  }

  // 3. National ID (Front)
  if (reg.nationalIdPhoto && typeof reg.nationalIdPhoto === 'string' && reg.nationalIdPhoto.trim() !== '') {
    list.push({
      url: reg.nationalIdPhoto,
      title: isAmharic ? 'ብሔራዊ መታወቂያ (ፊት)' : 'National ID (Front)',
      subtitle: `${reg.fullName || ''}`,
      icon: 'badge',
      type: 'national-id-front',
    });
  }

  // 4. National ID (Back)
  if (reg.nationalIdBackPhoto && typeof reg.nationalIdBackPhoto === 'string' && reg.nationalIdBackPhoto.trim() !== '') {
    list.push({
      url: reg.nationalIdBackPhoto,
      title: isAmharic ? 'ብሔራዊ መታወቂያ (ጀርባ)' : 'National ID (Back)',
      subtitle: `${reg.fullName || ''}`,
      icon: 'badge',
      type: 'national-id-back',
    });
  }

  // 5. Owner Portrait Photo
  const portrait = reg.userPortraitPhoto || reg.ownerPhoto;
  if (portrait && typeof portrait === 'string' && portrait.trim() !== '') {
    list.push({
      url: portrait,
      title: isAmharic ? 'የባለቤት ፎቶ' : 'Owner Portrait',
      subtitle: reg.fullName || '',
      icon: 'account_circle',
      type: 'owner-photo',
    });
  }

  return list;
};

interface FullscreenDocumentCarouselModalProps {
  items: DocumentViewerItem[];
  initialIndex?: number;
  lang?: Language;
  onClose: () => void;
}

export const FullscreenDocumentCarouselModal: React.FC<FullscreenDocumentCarouselModalProps> = ({
  items,
  initialIndex = 0,
  lang = 'en',
  onClose,
}) => {
  const isAmharic = lang === 'am';

  // Filter out any empty items
  const validItems = items.filter((item) => item && item.url && item.url.trim() !== '');
  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    if (validItems.length === 0) return 0;
    return Math.min(Math.max(0, initialIndex), validItems.length - 1);
  });

  // Transform states (Zoom, Pan, Rotation)
  const [scale, setScale] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showThumbnails, setShowThumbnails] = useState<boolean>(true);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const initialTouchDistanceRef = useRef<number | null>(null);
  const initialScaleRef = useRef<number>(1);
  const thumbnailScrollRef = useRef<HTMLDivElement>(null);

  const currentItem: DocumentViewerItem | undefined = validItems[currentIndex];

  // Reset transform when changing documents
  const resetTransform = useCallback(() => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setImageLoaded(false);
    setHasError(false);
  }, []);

  const goToIndex = useCallback(
    (index: number) => {
      if (index >= 0 && index < validItems.length && index !== currentIndex) {
        resetTransform();
        setCurrentIndex(index);
      }
    },
    [validItems.length, currentIndex, resetTransform]
  );

  const handlePrev = useCallback(() => {
    if (validItems.length <= 1) return;
    const nextIdx = currentIndex > 0 ? currentIndex - 1 : validItems.length - 1;
    goToIndex(nextIdx);
  }, [currentIndex, validItems.length, goToIndex]);

  const handleNext = useCallback(() => {
    if (validItems.length <= 1) return;
    const nextIdx = currentIndex < validItems.length - 1 ? currentIndex + 1 : 0;
    goToIndex(nextIdx);
  }, [currentIndex, validItems.length, goToIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === '+' || e.key === '=') {
        setScale((s) => Math.min(5, Number((s + 0.25).toFixed(2))));
      } else if (e.key === '-' || e.key === '_') {
        setScale((s) => {
          const next = Math.max(0.5, Number((s - 0.25).toFixed(2)));
          if (next <= 1) setPosition({ x: 0, y: 0 });
          return next;
        });
      } else if (e.key === '0' || e.key.toLowerCase() === 'r') {
        resetTransform();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handlePrev, handleNext, resetTransform]);

  // Scroll active thumbnail into view
  useEffect(() => {
    if (thumbnailScrollRef.current) {
      const activeEl = thumbnailScrollRef.current.children[currentIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [currentIndex]);

  // Mouse wheel zoom listener (non-passive)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY;
      const zoomFactor = delta < 0 ? 1.15 : 0.85;

      setScale((prev) => {
        const next = Math.min(5.0, Math.max(0.5, Number((prev * zoomFactor).toFixed(2))));
        if (next <= 1) {
          setPosition({ x: 0, y: 0 });
        }
        return next;
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // Mouse drag handling for panning when zoomed
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      e.preventDefault();
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch event handlers for swipe & pinch-zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
      if (scale > 1) {
        setIsDragging(true);
        setDragStart({
          x: e.touches[0].clientX - position.x,
          y: e.touches[0].clientY - position.y,
        });
      }
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialTouchDistanceRef.current = dist;
      initialScaleRef.current = scale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging && scale > 1) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    } else if (e.touches.length === 2 && initialTouchDistanceRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const newScale = Math.min(
        5,
        Math.max(0.5, (dist / initialTouchDistanceRef.current) * initialScaleRef.current)
      );
      setScale(Number(newScale.toFixed(2)));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsDragging(false);
    initialTouchDistanceRef.current = null;

    if (scale <= 1 && touchStartRef.current && e.changedTouches.length === 1) {
      const diffX = e.changedTouches[0].clientX - touchStartRef.current.x;
      const diffY = e.changedTouches[0].clientY - touchStartRef.current.y;
      const duration = Date.now() - touchStartRef.current.time;

      // Horizontal swipe threshold: > 50px travel in under 300ms, mostly horizontal
      if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY) * 1.5 && duration < 350) {
        if (diffX > 0) {
          handlePrev();
        } else {
          handleNext();
        }
      }
    }
    touchStartRef.current = null;
  };

  const handleZoomIn = () => {
    setScale((s) => Math.min(5, Number((s + 0.3).toFixed(2))));
  };

  const handleZoomOut = () => {
    setScale((s) => {
      const next = Math.max(0.5, Number((s - 0.3).toFixed(2)));
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleRotate = () => {
    setRotation((r) => (r + 90) % 360);
  };

  const handleDoubleClick = () => {
    if (scale > 1) {
      resetTransform();
    } else {
      setScale(2);
    }
  };

  if (!currentItem || validItems.length === 0) {
    return null;
  }

  return (
    <div
      id="fullscreen-photo-zoom-viewer"
      className="fixed inset-0 z-[10000] w-screen h-screen bg-black/95 backdrop-blur-2xl flex flex-col select-none overflow-hidden animate-in fade-in duration-200"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* 1. TOP FLOATING CONTROL BAR */}
      <header className="shrink-0 h-16 w-full px-3 sm:px-6 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between z-30 pointer-events-auto">
        {/* Document Info / Title */}
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          <div className="w-9 h-9 rounded-md bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shrink-0 shadow-xs">
            <span className="material-symbols-outlined text-[20px]">
              {currentItem.icon || 'description'}
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-white truncate drop-shadow-md">
                {currentItem.title}
              </h3>
              {validItems.length > 1 && (
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/90 text-[10px] font-bold shrink-0 border border-white/10">
                  {currentIndex + 1} / {validItems.length}
                </span>
              )}
            </div>
            {currentItem.subtitle && (
              <p className="text-[11px] text-slate-300 truncate drop-shadow-xs">
                {currentItem.subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Zoom Out */}
          <button
            type="button"
            onClick={handleZoomOut}
            title={isAmharic ? 'አሳንስ (-)' : 'Zoom Out (-)'}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer border border-white/10"
          >
            <span className="material-symbols-outlined text-[18px]">zoom_out</span>
          </button>

          {/* Zoom Level Indicator & Reset */}
          <button
            type="button"
            onClick={resetTransform}
            title={isAmharic ? 'ወደ ነባሪ መጠን መልስ' : 'Reset View (0 / R)'}
            className="h-8 sm:h-9 px-2 sm:px-2.5 rounded-md bg-white/10 hover:bg-white/20 active:scale-95 text-white text-[11px] font-mono font-bold flex items-center justify-center gap-1 transition-all cursor-pointer border border-white/10"
          >
            <span>{Math.round(scale * 100)}%</span>
            {scale !== 1 && <span className="material-symbols-outlined text-[14px]">refresh</span>}
          </button>

          {/* Zoom In */}
          <button
            type="button"
            onClick={handleZoomIn}
            title={isAmharic ? 'አጉላ (+)' : 'Zoom In (+)'}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer border border-white/10"
          >
            <span className="material-symbols-outlined text-[18px]">zoom_in</span>
          </button>

          {/* Rotate */}
          <button
            type="button"
            onClick={handleRotate}
            title={isAmharic ? 'አሽከርክር' : 'Rotate (90°)'}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer border border-white/10"
          >
            <span className="material-symbols-outlined text-[18px]">rotate_right</span>
          </button>

          {/* Toggle Thumbnails */}
          {validItems.length > 1 && (
            <button
              type="button"
              onClick={() => setShowThumbnails(!showThumbnails)}
              title={isAmharic ? 'ማውጫ አሳይ/ደብቅ' : 'Toggle Thumbnails'}
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-md flex items-center justify-center transition-all cursor-pointer border ${
                showThumbnails
                  ? 'bg-primary text-white border-primary/50'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">view_carousel</span>
            </button>
          )}

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            title={isAmharic ? 'ዝጋ (Esc)' : 'Close (Esc)'}
            className="w-8 h-8 sm:w-9 sm:h-9 ml-1 rounded-md bg-red-600/80 hover:bg-red-600 text-white flex items-center justify-center transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
      </header>

      {/* 2. 100% VIEWPORT MAIN STAGE */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
        className={`flex-1 w-full h-full relative overflow-hidden flex items-center justify-center p-2 sm:p-6 ${
          scale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
        }`}
      >
        {/* Loading Spinner */}
        {!imageLoaded && !hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 gap-3 z-10">
            <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-semibold tracking-wide">
              {isAmharic ? 'ሰነዱ እየተጫነ ነው...' : 'Loading Document...'}
            </span>
          </div>
        )}

        {/* Error Fallback */}
        {hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 gap-2 z-10 p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 mb-2">
              <span className="material-symbols-outlined text-[32px]">broken_image</span>
            </div>
            <h4 className="text-base font-bold text-white">
              {isAmharic ? 'ሰነዱን ማሳየት አልተቻለም' : 'Failed to load document'}
            </h4>
            <p className="text-xs text-white/60 max-w-sm">
              {isAmharic ? 'ምስሉ አልተገኘም ወይም ተሰርዟል' : 'The image could not be loaded or is corrupted.'}
            </p>
          </div>
        )}

        {/* Image Display */}
        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            transformOrigin: 'center center',
          }}
          className="w-full h-full flex items-center justify-center will-change-transform"
        >
          <img
            key={currentItem.url}
            src={currentItem.url}
            alt={currentItem.title}
            referrerPolicy="no-referrer"
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageLoaded(false);
              setHasError(true);
            }}
            className={`max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-opacity duration-200 pointer-events-none select-none ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </div>

        {/* 3. FLOATING CAROUSEL PREV / NEXT NAVIGATION BUTTONS */}
        {validItems.length > 1 && (
          <>
            {/* Previous Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              title={isAmharic ? 'ቀዳሚ ሰነድ' : 'Previous Document (←)'}
              className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-14 sm:h-14 rounded-lg bg-black/60 hover:bg-black/90 hover:scale-110 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md border border-white/20 shadow-xl group z-20"
            >
              <span className="material-symbols-outlined text-[28px] sm:text-[36px] group-hover:-translate-x-0.5 transition-transform">
                chevron_left
              </span>
            </button>

            {/* Next Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              title={isAmharic ? 'ቀጣይ ሰነድ' : 'Next Document (→)'}
              className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-14 sm:h-14 rounded-lg bg-black/60 hover:bg-black/90 hover:scale-110 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md border border-white/20 shadow-xl group z-20"
            >
              <span className="material-symbols-outlined text-[28px] sm:text-[36px] group-hover:translate-x-0.5 transition-transform">
                chevron_right
              </span>
            </button>
          </>
        )}
      </div>

      {/* 4. BOTTOM THUMBNAIL CAROUSEL STRIP */}
      {validItems.length > 1 && showThumbnails && (
        <div className="shrink-0 w-full py-2.5 px-3 sm:px-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent z-30 pointer-events-auto">
          <div
            ref={thumbnailScrollRef}
            className="flex items-center justify-center gap-2 sm:gap-3 overflow-x-auto py-1 scrollbar-none max-w-full"
          >
            {validItems.map((item, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={`${item.url}-${idx}`}
                  type="button"
                  onClick={() => goToIndex(idx)}
                  title={item.title}
                  className={`group relative flex items-center gap-2 p-1.5 rounded-md border transition-all cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-primary/20 border-primary ring-2 ring-primary/40 shadow-md scale-105'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center shrink-0 border border-white/10">
                    <img
                      src={item.url}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />
                  </div>
                  <div className="text-left pr-2 hidden md:block max-w-[130px]">
                    <p
                      className={`text-[11px] font-bold truncate ${
                        isActive ? 'text-white' : 'text-slate-300'
                      }`}
                    >
                      {item.title}
                    </p>
                    <span className="text-[9px] text-slate-400 block">
                      {idx + 1} of {validItems.length}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
