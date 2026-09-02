import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { motion, AnimatePresence } from 'motion/react';
import { MotorcycleRegistration, VerificationLog, Language } from '../types';
import { QRCodeCard } from './QRCodeCard';
import { ZoomableDocumentContainer } from './ZoomableDocumentContainer';
import { SmartImage } from './SmartImage';
import { lookupRegistrationInDb } from '../services/dbService';
import {
  FullscreenDocumentCarouselModal,
  buildRegistrationDocumentList,
  DocumentViewerItem,
} from './FullscreenDocumentCarouselModal';

const getStoredLastScanResult = (): MotorcycleRegistration | null => {
  // LocalStorage data loading disabled
  return null;
};

const saveLastScanResult = (_val: MotorcycleRegistration | 'not_found' | null): void => {
  // LocalStorage save disabled
};

const DataField: React.FC<{
  label: string;
  value: React.ReactNode;
  isMono?: boolean;
  isPrimary?: boolean;
  className?: string;
}> = ({ label, value, isMono = false, isPrimary = false, className = "" }) => {
  return (
    <div className={`p-2.5 rounded-md bg-surface-container border border-outline-variant/30 flex flex-col justify-center min-h-[54px] shadow-2xs ${className}`}>
      <span className="text-[10px] uppercase tracking-wider text-secondary font-bold block mb-0.5">
        {label}
      </span>
      <div className={`text-xs font-black truncate text-on-surface leading-tight ${isMono ? 'font-mono' : ''} ${isPrimary ? 'text-primary' : ''}`}>
        {value || '-'}
      </div>
    </div>
  );
};

interface SharedScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  registrations: MotorcycleRegistration[];
  userBadgeId: string;
  onAddVerificationLog: (log: VerificationLog, isNoteUpdate?: boolean) => void;
  isPage?: boolean;
  autoStart?: boolean;
}

export const SharedScannerModal: React.FC<SharedScannerModalProps> = ({
  isOpen,
  onClose,
  lang,
  registrations,
  userBadgeId,
  onAddVerificationLog,
  isPage = false,
  autoStart = true,
}) => {
  const isAmharic = lang === 'am';
  const [searchMode, setSearchMode] = useState<'camera' | 'manual'>('camera');
  const [searchPlate, setSearchPlate] = useState('');
  const [scannedRegResult, setScannedRegResult] = useState<MotorcycleRegistration | 'not_found' | null>(null);
  const [isScanning, setIsScanning] = useState(autoStart);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scanFlash, setScanFlash] = useState<'success' | 'not_found' | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [currentLog, setCurrentLog] = useState<VerificationLog | null>(null);
  const [uploadedImageSrc, setUploadedImageSrc] = useState<string | null>(null);
  const [capturedFrameSrc, setCapturedFrameSrc] = useState<string | null>(null);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [expandedVehicleSpecs, setExpandedVehicleSpecs] = useState(false);
  const [expandedDocs, setExpandedDocs] = useState(false);
  const [expandedDigitalId, setExpandedDigitalId] = useState(false);
  const [showNotesSection, setShowNotesSection] = useState(false);
  const [showDigitalIdModal, setShowDigitalIdModal] = useState(false);
  const [showTopMenu, setShowTopMenu] = useState(false);
  const [carouselModal, setCarouselModal] = useState<{
    items: DocumentViewerItem[];
    initialIndex: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isProcessingRef = useRef(false);

  const openDocumentCarousel = (targetUrl: string, fallbackTitle?: string) => {
    if (!targetUrl) return;
    const docs = buildRegistrationDocumentList(scannedRegResult, lang);
    const foundIdx = docs.findIndex((d) => d.url === targetUrl);
    if (foundIdx >= 0) {
      setCarouselModal({
        items: docs,
        initialIndex: foundIdx,
      });
    } else {
      setCarouselModal({
        items: [{ url: targetUrl, title: fallbackTitle || (isAmharic ? 'ሰነድ' : 'Document') }, ...docs],
        initialIndex: 0,
      });
    }
  };



  // Audio indicator synthesizer using Web Audio API
  const playScanFeedback = (isSuccess: boolean) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (isSuccess) {
        // High-pitched pleasant dual-tone success beep (880Hz -> 1760Hz)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(880, ctx.currentTime);
        osc2.frequency.setValueAtTime(1760, ctx.currentTime + 0.08);

        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.08);
        osc2.start(ctx.currentTime + 0.08);
        osc2.stop(ctx.currentTime + 0.25);

        if (navigator.vibrate) {
          navigator.vibrate([80, 40, 80]);
        }
      } else {
        // Low-tone warning sound for unverified QR
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.3);

        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);

        if (navigator.vibrate) {
          navigator.vibrate([150]);
        }
      }
    } catch (e) {
      console.warn('Audio feedback failed:', e);
    }
  };

// Fullscreen forced request removed per user preference.

  // Reset and start camera scanner whenever modal/page is opened
  useEffect(() => {
    if (isOpen) {
      setIsScanning(autoStart);
      setScannedRegResult(null);
      setCameraError('');
      setCurrentLog(null);
      setVerificationNotes('');
      setShowNotesSection(false);
      setUploadedImageSrc(null);
      setCapturedFrameSrc(null);
      setIsProcessingScan(false);
      setExpandedVehicleSpecs(false);
      setExpandedDocs(false);
      setExpandedDigitalId(false);
    }
  }, [isOpen, autoStart]);

  // Prepare local log state upon QR match/search without auto-saving to DB/Firestore
  const initLocalLog = (foundReg: MotorcycleRegistration, initialNotes?: string) => {
    const isPass = foundReg.status === 'printed' || foundReg.status === 'approved';
    const logId = `LOG-${Math.floor(100000 + Math.random() * 900000)}`;
    const noteText =
      initialNotes !== undefined
        ? initialNotes
        : isPass
        ? 'QR permit scan verified.'
        : 'Unapproved vehicle permit scanned.';

    const newLog: VerificationLog = {
      id: logId,
      scannedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      plateNumber: foundReg.plateNumber,
      fullName: foundReg.fullName,
      phone: foundReg.phone,
      vehicleCategory: foundReg.vehicleCategory,
      engineOrSerialNo: foundReg.engineOrSerialNo,
      permitStatus: foundReg.status,
      verificationStatus: isPass ? 'verified' : 'warning',
      officerNotes: noteText,
      officerBadgeId: userBadgeId || 'OFF-8842',
      locationName: 'Field Checkpoint Scan',
      userPortraitPhoto: foundReg.userPortraitPhoto || foundReg.nationalIdPhoto,
      nationalIdPhoto: foundReg.nationalIdPhoto,
      drivingLicensePhoto: foundReg.drivingLicensePhoto,
      drivingPermitPhoto: foundReg.drivingPermitPhoto,
    };

    setCurrentLog(newLog);
    setVerificationNotes(noteText);
    return newLog;
  };

  // Update local notes without dispatching network/database writes
  const handleNoteChange = (newNotes: string) => {
    setVerificationNotes(newNotes);
    if (currentLog) {
      setCurrentLog({
        ...currentLog,
        officerNotes: newNotes,
      });
    }
  };

  // Flip camera between front and rear facing mode
  const handleFlipCamera = () => {
    setIsTorchOn(false);
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Toggle flash/torch on active video track
  const handleToggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track) {
      try {
        const nextState = !isTorchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }]
        });
        setIsTorchOn(nextState);
      } catch (e) {
        console.warn('Torch constraint not supported on this device/browser:', e);
      }
    }
  };

  // Live Camera QR Scan Loop via jsQR
  useEffect(() => {
    let active = true;

    if (isOpen && isScanning && searchMode === 'camera' && !scannedRegResult) {
      setCameraError('');

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(isAmharic ? 'ካሜራ በዚህ አሳሽ አይደገፍም' : 'Camera is not supported on this browser or device.');
        return;
      }

      navigator.mediaDevices
        .getUserMedia({
          video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } }
        })
        .then((stream) => {
          if (!active) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }

          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d', { willReadFrequently: true });

          const scanFrame = () => {
            if (!active) return;
            const video = videoRef.current;
            if (video && video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert'
              });
              if (code && code.data) {
                processQRData(code.data);
                return;
              }
            }
            animFrameRef.current = requestAnimationFrame(scanFrame);
          };

          animFrameRef.current = requestAnimationFrame(scanFrame);
        })
        .catch((err) => {
          if (!active) return;
          let msg = err?.message || 'Camera error';
          if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError' || msg.toLowerCase().includes('permission')) {
            msg = isAmharic ? 'የካሜራ ፍቃድ ተከልክሏል' : 'Camera permission denied.';
          } else {
            msg = isAmharic ? 'ካሜራ ማግኘት አልተቻለም' : 'Camera unavailable or disconnected.';
          }
          setCameraError(msg);
        });
    }

    return () => {
      active = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen, isScanning, searchMode, scannedRegResult, isAmharic, facingMode]);

  if (!isOpen) return null;

  // Capture snapshot from video element
  const captureCameraFrame = (): string | null => {
    if (!videoRef.current || videoRef.current.readyState < 2) return null;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.85);
      }
    } catch (e) {
      console.warn('Failed to capture video frame snapshot:', e);
    }
    return null;
  };

  const processQRData = async (qrData: string, imageOverride?: string) => {
    const cleanData = qrData.trim();
    if (!cleanData) return;
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    // Show active scanning processing animation
    setIsProcessingScan(true);

    if (imageOverride) {
      setUploadedImageSrc(imageOverride);
    } else {
      const frame = captureCameraFrame();
      if (frame) {
        setCapturedFrameSrc(frame);
      }
    }

    // Perform deep query against both local cache and live Firestore permit database
    const match = await lookupRegistrationInDb(cleanData, registrations);

    // Scanning delay (850ms) so scanning laser beam animation plays over captured camera/image frame
    setTimeout(() => {
      setIsProcessingScan(false);
      if (match) {
        playScanFeedback(true);
        setScanFlash('success');
        initLocalLog(match);
        setTimeout(() => {
          setScannedRegResult(match);
          setIsScanning(false);
          setScanFlash(null);
          isProcessingRef.current = false;
        }, 450);
      } else {
        playScanFeedback(false);
        setScanFlash('not_found');
        setTimeout(() => {
          setScannedRegResult('not_found');
          setIsScanning(false);
          setScanFlash(null);
          isProcessingRef.current = false;
        }, 450);
      }
    }, 850);
  };

  const handleScanResult = (result: any) => {
    if (result && result.length > 0 && result[0].rawValue) {
      processQRData(result[0].rawValue);
    }
  };

  const handleSearchLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchPlate.trim()) return;

    setIsProcessingScan(true);
    const found = await lookupRegistrationInDb(searchPlate.trim(), registrations);
    setIsProcessingScan(false);

    if (found) {
      setScannedRegResult(found);
      initLocalLog(found);
      setIsScanning(false);
    } else {
      setScannedRegResult('not_found');
      setCurrentLog(null);
      setIsScanning(false);
    }
  };

  // Helper to scan HTMLImageElement for QR or Barcodes using native API + multi-scale jsQR
  const decodeQRFromImage = async (img: HTMLImageElement): Promise<string | null> => {
    // 1. Try Native BarcodeDetector API if available
    if ('BarcodeDetector' in window) {
      try {
        const detector = new (window as any).BarcodeDetector({
          formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'data_matrix', 'pdf417']
        });
        const detected = await detector.detect(img);
        if (detected && detected.length > 0 && detected[0].rawValue) {
          return detected[0].rawValue;
        }
      } catch (err) {
        console.warn('Native BarcodeDetector failed, trying jsQR scales:', err);
      }
    }

    // 2. Try jsQR across multiple scaled canvas resolutions
    const targetSizes = [800, 1200, 500, Math.max(img.width, img.height)];
    for (const maxDim of targetSizes) {
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) continue;

      ctx.drawImage(img, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth'
      });
      if (code && code.data && code.data.trim()) {
        return code.data.trim();
      }
    }

    return null;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Synchronously set object URL for instant 0ms preview & immediate scanning animation
    const instantPreviewUrl = URL.createObjectURL(file);
    setUploadedImageSrc(instantPreviewUrl);
    setCapturedFrameSrc(null);
    setIsScanning(true);
    setScannedRegResult(null);
    setIsProcessingScan(true);
    isProcessingRef.current = true;

    const img = new Image();
    img.onload = async () => {
      const foundData = await decodeQRFromImage(img);
      
      // Delay so the user sees the active scanning animation over uploaded image in camera view
      setTimeout(() => {
        isProcessingRef.current = false;
        if (foundData) {
          processQRData(foundData, instantPreviewUrl);
        } else {
          setIsProcessingScan(false);
          playScanFeedback(false);
          setScanFlash('not_found');
          setTimeout(() => {
            setScannedRegResult('not_found');
            setIsScanning(false);
            setScanFlash(null);
            isProcessingRef.current = false;
          }, 450);
        }
      }, 700);
    };
    img.src = instantPreviewUrl;

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleStartCameraScan = () => {
    setCameraError('');
    setIsScanning(true);
    setUploadedImageSrc(null);
    setCapturedFrameSrc(null);
    setIsProcessingScan(false);
    setScannedRegResult(null);
  };

  const handleRescan = () => {
    setScannedRegResult(null);
    setCurrentLog(null);
    setSearchPlate('');
    setVerificationNotes('');
    setExpandedVehicleSpecs(false);
    setExpandedDocs(false);
    setExpandedDigitalId(false);
    setShowNotesSection(false);
    setCarouselModal(null);
    setUploadedImageSrc(null);
    setCapturedFrameSrc(null);
    setIsProcessingScan(false);
    if (searchMode === 'camera') {
      handleStartCameraScan();
    }
  };

  const mainCardContent = (
    <>
      {/* Hidden File Input for Image Scanning */}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
      />

      {!scannedRegResult ? (
        <div className="flex-1 flex flex-col min-h-0 justify-between gap-0 overflow-hidden h-full max-h-full w-full relative">
          {/* Camera View Box - Full viewpoint height & width */}
          <div className="relative bg-slate-950 rounded-none w-full flex-1 min-h-0 overflow-hidden flex flex-col items-center justify-center border-0">
            {isScanning ? (
              <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-black overflow-hidden">
                {uploadedImageSrc ? (
                  <img
                    src={uploadedImageSrc}
                    alt="Uploaded QR Image"
                    className="w-full h-full object-cover bg-slate-950"
                  />
                ) : capturedFrameSrc ? (
                  <img
                    src={capturedFrameSrc}
                    alt="Captured Camera Frame"
                    className="w-full h-full object-cover bg-slate-950"
                  />
                ) : (
                  <video 
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}

                {/* Dark Vignette Overlay for Camera Feed */}
                <div className="absolute inset-0 bg-black/25 pointer-events-none z-0" />

                {/* Top Active Scanning Status Badge (Shown only for live camera processing, disabled for image upload scanning) */}
                {isProcessingScan && !uploadedImageSrc && (
                  <div className="absolute top-16 z-30 flex items-center gap-2 bg-primary/90 px-4 py-1.5 rounded-full text-white font-extrabold text-xs sm:text-sm shadow-xl border border-primary/40 backdrop-blur-md">
                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    <span>
                      {isAmharic ? 'QR ኮድ በመተንተን እና በመቃኘት ላይ...' : 'Capturing & Processing QR Code...'}
                    </span>
                  </div>
                )}

                {/* Custom Live Scanner Overlay UI - Full screen viewfinder & bottom controls */}
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between z-10">
                  {/* 1. TOP HEADER with Opaque Dark Background & Blur */}
                  <div className="w-full flex flex-col pt-3 px-4 sm:px-6 z-30 shrink-0">
                    <div className="pointer-events-auto bg-black/70 backdrop-blur-md border border-white/15 rounded-lg px-4 py-3 flex items-center justify-between shadow-2xl">
                      {/* Back Button with Title */}
                      <button
                        type="button"
                        onClick={onClose}
                        className="flex items-center gap-1.5 sm:gap-2 text-white hover:text-white/80 active:scale-95 transition-all cursor-pointer drop-shadow-md select-none group"
                        title={isAmharic ? 'ተመለስ' : 'Back'}
                      >
                        <span className="material-symbols-outlined text-[28px] sm:text-[32px] leading-none text-white transition-transform group-hover:-translate-x-0.5">
                          chevron_left
                        </span>
                        <span className="text-base sm:text-lg font-bold tracking-tight text-white drop-shadow-xs">
                          {isAmharic ? 'የQR ኮድ ስካነር' : 'Scan QR code'}
                        </span>
                      </button>
                    </div>

                    {/* Search Dropdown Card if active */}
                    {showTopMenu && (
                      <div className="pointer-events-auto w-full max-w-md mx-auto mt-3 bg-slate-900/95 border border-slate-700 rounded-lg shadow-2xl p-3 text-white backdrop-blur-xl animate-in slide-in-from-top-3 duration-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[18px] text-primary">search</span>
                            <span>{isAmharic ? 'በሰሌዳ ቁጥር ወይም በስም ፈልግ' : 'Search by Plate No or Owner Name'}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowTopMenu(false)}
                            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[18px]">close</span>
                          </button>
                        </div>
                        <form
                          onSubmit={(e) => {
                            handleSearchLookup(e);
                            setShowTopMenu(false);
                          }}
                          className="flex gap-2 items-center"
                        >
                          <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-3 flex items-center justify-center pointer-events-none text-slate-400">
                              <span className="material-symbols-outlined text-[18px]">search</span>
                            </div>
                            <input
                              type="text"
                              value={searchPlate}
                              onChange={(e) => setSearchPlate(e.target.value)}
                              placeholder={isAmharic ? 'የሰሌዳ ቁጥር ወይም ስም ያስገቡ...' : 'Enter Plate No or Name...'}
                              className="w-full bg-slate-800 border border-slate-700 rounded-md pl-10 pr-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
                              autoFocus
                            />
                          </div>
                          <button
                            type="submit"
                            className="bg-primary hover:bg-primary-hover text-white font-bold text-xs sm:text-sm px-3.5 py-2 rounded-md transition-colors cursor-pointer flex items-center gap-1 shrink-0 shadow-xs"
                          >
                            <span className="material-symbols-outlined text-[18px]">search</span>
                            <span>{isAmharic ? 'ፈልግ' : 'Search'}</span>
                          </button>
                        </form>
                      </div>
                    )}
                  </div>

                  {/* 2. CENTER VIEWFINDER (Bigger Reticle Size) */}
                  <div className="flex flex-col items-center justify-center my-auto pointer-events-none">
                    <div
                      className="relative w-72 h-72 sm:w-92 sm:h-92 max-w-[85vw] max-h-[75vh] border border-white/20 rounded-lg flex-shrink-0"
                      style={{ boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)' }}
                    >
                      {/* 4 Vibrant Blue Corner Brackets */}
                      <div className="absolute -top-1 -left-1 w-7 h-7 border-t-[4px] border-l-[4px] border-[#3b82f6] rounded-tl-sm z-20" />
                      <div className="absolute -top-1 -right-1 w-7 h-7 border-t-[4px] border-r-[4px] border-[#3b82f6] rounded-tr-sm z-20" />
                      <div className="absolute -bottom-1 -left-1 w-7 h-7 border-b-[4px] border-l-[4px] border-[#3b82f6] rounded-bl-sm z-20" />
                      <div className="absolute -bottom-1 -right-1 w-7 h-7 border-b-[4px] border-r-[4px] border-[#3b82f6] rounded-br-sm z-20" />

                      {/* Animated Red Laser Scanning Line */}
                      {!uploadedImageSrc && (
                        <div className="absolute left-2 right-2 h-[2.5px] bg-red-500 shadow-[0_0_14px_#ef4444] rounded-full z-20 animate-red-laser" />
                      )}
                    </div>
                  </div>

                  {/* 3. BOTTOM SECTION: Guide Text (No background, placed above bottom buttons) & ACTION BUTTONS */}
                  <div className="pointer-events-auto flex flex-col items-center w-full max-w-md mx-auto px-4 pb-6 z-30 shrink-0 gap-2 sm:gap-2.5">
                    {/* Guide Text without background, positioned just above action buttons */}
                    <div className="text-center pointer-events-none select-none">
                      <span className="text-xs sm:text-sm font-semibold text-white/90 drop-shadow-md">
                        {isAmharic ? 'የQR ኮዱን ሳጥኑ ውስጥ ያስገቡ' : 'Point camera at the QR permit code'}
                      </span>
                    </div>

                    {/* Bottom Action Buttons Row with Opaque Dark Background & Blur */}
                    <div className="w-full bg-black/70 backdrop-blur-md border border-white/15 rounded-lg p-3 sm:p-4 flex items-center justify-evenly shadow-2xl">
                      {/* 1. Search Button */}
                      <button
                        type="button"
                        onClick={() => setShowTopMenu(!showTopMenu)}
                        className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full transition-all active:scale-95 flex items-center justify-center shadow-lg cursor-pointer backdrop-blur-md ${
                          showTopMenu
                            ? 'bg-primary text-white shadow-primary/40 ring-2 ring-primary/50'
                            : 'bg-white/20 hover:bg-white/30 active:bg-white/40 text-white'
                        }`}
                        title={isAmharic ? 'ፈልግ' : 'Search'}
                      >
                        <span className="material-symbols-outlined text-[24px]">search</span>
                      </button>

                      {/* 2. Photo Gallery Upload */}
                      <button
                        type="button"
                        onClick={() => {
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                            fileInputRef.current.click();
                          }
                        }}
                        className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/20 hover:bg-white/30 active:bg-white/40 text-white backdrop-blur-md transition-all active:scale-95 flex items-center justify-center shadow-lg cursor-pointer"
                        title={isAmharic ? 'ምስል ስካን' : 'Select Photo'}
                      >
                        <span className="material-symbols-outlined text-[24px]">image</span>
                      </button>

                      {/* 3. Flashlight / Torch Toggle */}
                      <button
                        type="button"
                        onClick={handleToggleTorch}
                        className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full transition-all active:scale-95 flex items-center justify-center shadow-lg cursor-pointer backdrop-blur-md ${
                          isTorchOn
                            ? 'bg-amber-400 text-amber-950 shadow-amber-400/40 ring-2 ring-amber-300/60'
                            : 'bg-white/20 hover:bg-white/30 active:bg-white/40 text-white'
                        }`}
                        title={isAmharic ? 'ፍላሽ' : 'Flashlight'}
                      >
                        <span className="material-symbols-outlined text-[24px]">
                          {isTorchOn ? 'flashlight_on' : 'flashlight_off'}
                        </span>
                      </button>

                      {/* 4. Switch Camera (Front/Rear) */}
                      <button
                        type="button"
                        onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
                        className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/20 hover:bg-white/30 active:bg-white/40 text-white backdrop-blur-md transition-all active:scale-95 flex items-center justify-center shadow-lg cursor-pointer"
                        title={isAmharic ? 'ካሜራ ቀይር' : 'Switch Camera'}
                      >
                        <span className="material-symbols-outlined text-[24px]">cameraswitch</span>
                      </button>
                    </div>
                  </div>
                </div>


                {cameraError && (
                  <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-4 text-center z-20 space-y-2">
                    <span className="material-symbols-outlined text-rose-400 text-[32px]">videocam_off</span>
                    <p className="text-rose-300 text-xs font-bold max-w-xs">{cameraError}</p>
                    <button
                      type="button"
                      onClick={handleStartCameraScan}
                      className="bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer"
                    >
                      {isAmharic ? 'እንደገና ሞክር' : 'Retry Camera'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2 p-3 w-full max-w-md mx-auto flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[28px] animate-pulse">
                    qr_code_scanner
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-100">
                  {isAmharic ? 'የQR ኮድ ፍተሻ' : 'QR Verification'}
                </h4>
                <div className="grid grid-cols-2 gap-2 w-full pt-0.5">
                  <button
                    type="button"
                    onClick={handleStartCameraScan}
                    className="bg-primary hover:bg-primary-hover text-white px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                    <span>{isAmharic ? 'ካሜራ' : 'Camera'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                        fileInputRef.current.click();
                      }
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5 border border-slate-700"
                  >
                    <span className="material-symbols-outlined text-[18px]">image</span>
                    <span>{isAmharic ? 'ምስል ስካን' : 'Image Scan'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : scannedRegResult === 'not_found' ? (
        <div className="bg-transparent p-4 sm:p-6 m-0 rounded-none border-0 text-xs sm:text-sm shadow-none space-y-3 animate-in fade-in duration-150 flex flex-col h-full max-h-full overflow-hidden justify-center">
          {/* Top Status Header Bar inside the container */}
          <div className="flex items-center justify-between gap-2 w-full">
            <div className="flex-1 flex items-center justify-between bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/80 text-red-950 dark:text-red-300 rounded-md px-3.5 py-1.5 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[24px] select-none text-red-600 dark:text-red-400">
                  cancel
                </span>
                <span className="font-black text-sm sm:text-base">
                  {isAmharic ? 'ያልተፈቀደለት የሞተር ፈቃድ' : 'Motor Permit Status'}
                </span>
              </div>
              <div className="bg-red-200/60 dark:bg-red-900/60 text-red-900 dark:text-red-200 border border-red-300 dark:border-red-700 text-xs px-2.5 py-0.5 rounded-lg uppercase tracking-wider font-extrabold shadow-2xs">
                {isAmharic ? 'ያልተመዘገበ' : 'UNREGISTERED'}
              </div>
            </div>
          </div>

          <div className="space-y-2 flex flex-col items-center justify-center py-4">
            <div className="w-12 h-12 rounded-full bg-error-container/30 border border-error/30 flex items-center justify-center text-error mb-1">
              <span className="material-symbols-outlined text-[28px]">
                error_outline
              </span>
            </div>
            <h4 className="text-xs sm:text-sm font-bold text-on-surface">
              {isAmharic ? 'መረጃው አልተገኘም' : 'Record Not Found'}
            </h4>
            <p className="text-[11px] text-secondary text-center max-w-sm">
              {isAmharic 
                ? 'የቃኙት QR ኮድ ወይም ያስገቡት መረጃ አልተገኘም። እባክዎ በድጋሚ ይሞክሩ።' 
                : 'Scanned record not found in system registry.'}
            </p>
            <button
               type="button"
               onClick={handleRescan}
               className="bg-primary hover:bg-primary-hover text-white px-4 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs"
             >
               <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
               <span>{isAmharic ? 'ድጋሚ ቃኝ' : 'Rescan'}</span>
             </button>
          </div>
        </div>
      ) : (
        <div className="bg-blue-100 dark:bg-slate-950 p-0 m-0 text-xs sm:text-sm flex flex-col h-full max-h-full overflow-hidden shadow-none animate-in fade-in duration-150">
          {(() => {
            const statusLower = (scannedRegResult.status || '').toLowerCase();
            const isApproved = statusLower === 'approved' || statusLower === 'printed' || statusLower === 'ordered_print';
            const isExpired = statusLower === 'expired';
            const isRejected = statusLower === 'rejected';
            const isPending = !isApproved && !isRejected && !isExpired;

            const portraitUrl =
              scannedRegResult.userPortraitPhoto ||
              scannedRegResult.nationalIdPhoto ||
              scannedRegResult.drivingLicensePhoto ||
              scannedRegResult.drivingPermitPhoto ||
              (scannedRegResult as any).photoUrl ||
              (scannedRegResult as any).avatar ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(scannedRegResult.fullName || 'User')}&size=256&background=0284c7&color=fff&bold=true`;

            return (
              <>
                {/* 1. TOP HEADER STATUS BAR WITH VERIFICATION BADGE */}
                <div className={`flex items-center justify-between py-3.5 px-4 shrink-0 border-b-2 backdrop-blur-md z-10 shadow-sm transition-all ${
                  isApproved 
                    ? 'bg-emerald-100/90 dark:bg-emerald-950/90 border-emerald-500' 
                    : isExpired || isPending 
                    ? 'bg-amber-100/90 dark:bg-amber-950/90 border-amber-500' 
                    : 'bg-rose-100/90 dark:bg-rose-950/90 border-rose-500'
                }`}>
                  {/* Rescan Button on Left */}
                  <button
                    type="button"
                    onClick={handleRescan}
                    className="w-9 h-9 rounded-md bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 transition-colors cursor-pointer flex items-center justify-center shrink-0 shadow-sm border-2 border-slate-300 dark:border-slate-700"
                    title={isAmharic ? 'ድጋሚ ቃኝ' : 'Rescan'}
                  >
                    <span className="material-symbols-outlined text-[22px] font-bold">chevron_left</span>
                  </button>

                  {/* Center Verification Status Pill matching the uploaded screenshot */}
                  <div className="flex items-center gap-2">
                    <span className={`material-symbols-outlined text-[26px] ${
                      isApproved ? 'text-emerald-700 dark:text-emerald-300' : isPending ? 'text-amber-700 dark:text-amber-300' : 'text-rose-700 dark:text-rose-300'
                    }`}>
                      {isApproved ? 'check_circle' : isPending ? 'warning' : 'cancel'}
                    </span>
                    <span className={`font-black text-base sm:text-lg tracking-tight ${
                      isApproved ? 'text-emerald-950 dark:text-emerald-100' : isExpired ? 'text-amber-950 dark:text-amber-100' : isPending ? 'text-amber-950 dark:text-amber-100' : 'text-rose-950 dark:text-rose-100'
                    }`}>
                      {isApproved
                        ? (isAmharic ? 'ለመንቀሳቀስ የተፈቀደለት ነው' : 'Permitted to Move')
                        : isExpired
                        ? (isAmharic ? 'ፈቃድ ያልታደሰ ነው' : 'Permit Expired')
                        : isPending
                        ? (isAmharic ? 'መንቀሳቀሻ ፈቃድ በመጠበቅ ላይ ነው' : 'Pending Permit')
                        : (isAmharic ? 'ፈቃድ ያልተሰጠው ነው' : 'Permit Not Granted')}
                    </span>
                  </div>

                  {/* Add Note Button on Right */}
                  <button
                    type="button"
                    onClick={() => setShowNotesSection(!showNotesSection)}
                    className={`w-9 h-9 rounded-md transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-sm ${
                      showNotesSection
                        ? 'bg-[#0B1E48] text-amber-400 border-2 border-amber-500'
                        : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 border-2 border-slate-300 dark:border-slate-700'
                    }`}
                    title={isAmharic ? 'ማስታወሻ ጨምር' : 'Add Inspection Note'}
                  >
                    <span className="material-symbols-outlined text-[20px] font-bold">
                      {showNotesSection ? 'edit_note' : 'note_add'}
                    </span>
                  </button>
                </div>

                {/* 2. MIDDLE SCROLLABLE BODY CONTENT */}
                <div className="flex-1 overflow-y-auto min-h-0 p-1 sm:p-1.5 md:p-2 space-y-1.5 max-w-2xl mx-auto w-full bg-blue-100 dark:bg-blue-950/80">
                  
                  {/* Warning Alert for Pending Status */}
                  {isPending && (
                    <div className="bg-amber-100/90 dark:bg-amber-950/90 border-2 border-amber-500 dark:border-amber-600 p-2 rounded-md text-xs flex items-start gap-2 shadow-xs">
                      <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 font-black">
                        <span className="material-symbols-outlined text-[20px]">warning</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-amber-950 dark:text-amber-100 text-xs">
                          {isAmharic ? 'ማስጠንቀቂያ፡ ማረጋገጫ በመጠባበቅ ላይ ያለ' : 'WARNING: PENDING APPROVAL'}
                        </p>
                        <p className="mt-0.5 text-[10px] text-amber-900 dark:text-amber-200 font-extrabold leading-tight">
                          {isAmharic
                            ? 'ይህ ተሽከርካሪ በስርዓቱ ከተመዘገቡት መረጃዎች መካከል ቢገኝም በከተማው አስተዳደር ገና አልጸደቀም።'
                            : 'This vehicle record exists in the system but is PENDING ADMIN APPROVAL.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* =========================================================
                      CARD 1: OWNER & PRIMARY MOTORCYCLE INFO
                      ========================================================= */}
                  <div className="bg-blue-200 dark:bg-blue-900/80 border-2 border-blue-300 dark:border-blue-700 rounded-md p-2 sm:p-2.5 shadow-xs space-y-2">
                    
                    {/* Top Row: Portrait Image on Left & Info Details on Right */}
                    <div className="flex items-start gap-2.5">
                      
                      {/* Left: Portrait Photo */}
                      <div 
                        onClick={() => openDocumentCarousel(portraitUrl, `${scannedRegResult.fullName} — ${isAmharic ? 'የባለቤት ፎቶ' : 'Owner Portrait'}`)}
                        className="w-28 h-36 sm:w-32 sm:h-40 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 shrink-0 shadow-xs cursor-pointer relative group"
                      >
                        <SmartImage
                          src={portraitUrl}
                          alt={scannedRegResult.fullName || 'Owner Portrait'}
                          fallbackIcon="person"
                          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <span className="material-symbols-outlined text-[24px] font-black">zoom_in</span>
                        </div>
                      </div>

                      {/* Right: Owner & Vehicle Specs List */}
                      <div className="flex-1 min-w-0 space-y-1.5 text-xs">
                        {/* Owner Full Name */}
                        <div>
                          <span className="text-[10px] text-slate-700 dark:text-slate-300 font-extrabold block">
                            {isAmharic ? 'የባለቤት መረጃ' : 'Owner Info'}
                          </span>
                          <h3 className="text-sm sm:text-base font-black text-slate-950 dark:text-white leading-tight mt-0.5 truncate">
                            {scannedRegResult.fullName}
                          </h3>
                        </div>

                        {/* ID Number */}
                        <div>
                          <span className="text-[10px] text-slate-700 dark:text-slate-300 font-extrabold block">
                            {isAmharic ? 'መለያ ቁጥር' : 'ID Number'}
                          </span>
                          <span className="text-xs font-black font-mono text-slate-950 dark:text-slate-100 block mt-0.5">
                            {scannedRegResult.id}
                          </span>
                        </div>

                        {/* Plate Number */}
                        <div>
                          <span className="text-[10px] text-slate-700 dark:text-slate-300 font-extrabold block">
                            {isAmharic ? 'ሰሌዳ ቁጥር' : 'Plate Number'}
                          </span>
                          <span className="text-xs font-black font-mono text-[#0B1E48] dark:text-blue-300 block mt-0.5 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-300 dark:border-blue-700 inline-block">
                            {scannedRegResult.plateNumber}
                          </span>
                        </div>

                        {/* Registered Model */}
                        <div>
                          <span className="text-[10px] text-slate-700 dark:text-slate-300 font-extrabold block">
                            {isAmharic ? 'የተመዘገበበት ሞዴል' : 'Registered Model'}
                          </span>
                          <span className="text-xs font-black text-slate-950 dark:text-slate-100 block mt-0.5 truncate">
                            {[scannedRegResult.motorBrand, scannedRegResult.motorModel].filter(Boolean).join(' ') || 'ቦክሰር 2015'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row of 4 Metric Cards (Old location in Card 1, with modern new design) */}
                    <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-blue-300/70 dark:border-blue-700/70">
                      {/* Box 1: Motor Brand (የሞተር ምርት) */}
                      <div className="bg-blue-100/80 dark:bg-blue-950/60 p-1.5 rounded-lg border border-blue-300/60 dark:border-blue-700/60 flex flex-col items-center justify-center text-center shadow-xs">
                        <span className="text-[9px] sm:text-[10px] text-slate-700 dark:text-slate-300 font-extrabold block mb-0.5 truncate w-full">
                          {isAmharic ? 'የሞተር ምርት' : 'Motor Brand'}
                        </span>
                        <span className="text-[11px] sm:text-xs font-black text-slate-950 dark:text-white truncate w-full">
                          {scannedRegResult.motorBrand || '—'}
                        </span>
                      </div>

                      {/* Box 2: Model Year (ሞዴል ዓመት) */}
                      <div className="bg-blue-100/80 dark:bg-blue-950/60 p-1.5 rounded-lg border border-blue-300/60 dark:border-blue-700/60 flex flex-col items-center justify-center text-center shadow-xs">
                        <span className="text-[9px] sm:text-[10px] text-slate-700 dark:text-slate-300 font-extrabold block mb-0.5 truncate w-full">
                          {isAmharic ? 'ሞዴል ዓመት' : 'Model Year'}
                        </span>
                        <span className="text-[11px] sm:text-xs font-black text-slate-950 dark:text-white truncate w-full">
                          {scannedRegResult.motorModel || '—'}
                        </span>
                      </div>

                      {/* Box 3: Reg Date (የተመዘገበበት) */}
                      <div className="bg-blue-100/80 dark:bg-blue-950/60 p-1.5 rounded-lg border border-blue-300/60 dark:border-blue-700/60 flex flex-col items-center justify-center text-center shadow-xs">
                        <span className="text-[9px] sm:text-[10px] text-slate-700 dark:text-slate-300 font-extrabold block mb-0.5 truncate w-full">
                          {isAmharic ? 'የተመዘገበበት' : 'Reg. Date'}
                        </span>
                        <span className="text-[11px] sm:text-xs font-black font-mono text-slate-950 dark:text-white truncate w-full">
                          {scannedRegResult.registrationDate || '—'}
                        </span>
                      </div>

                      {/* Box 4: Status (ሁኔታ) */}
                      <div className="bg-blue-100/80 dark:bg-blue-950/60 p-1.5 rounded-lg border border-blue-300/60 dark:border-blue-700/60 flex flex-col items-center justify-center text-center shadow-xs">
                        <span className="text-[9px] sm:text-[10px] text-slate-700 dark:text-slate-300 font-extrabold block mb-0.5 truncate w-full">
                          {isAmharic ? 'ሁኔታ' : 'Status'}
                        </span>
                        <span className={`text-[10px] sm:text-[11px] font-black flex items-center justify-center gap-0.5 truncate w-full ${
                          isApproved ? 'text-emerald-700 dark:text-emerald-300' : isExpired || isPending ? 'text-amber-700 dark:text-amber-300' : 'text-rose-700 dark:text-rose-300'
                        }`}>
                          <span className="material-symbols-outlined text-[13px]">
                            {isApproved ? 'check_circle' : isExpired || isPending ? 'warning' : 'cancel'}
                          </span>
                          <span className="truncate">
                            {isApproved
                              ? (isAmharic ? 'የተፈቀደ' : 'Approved')
                              : isExpired
                              ? (isAmharic ? 'ያልታደሰ' : 'Expired')
                              : isPending
                              ? (isAmharic ? 'በመጠበቅ ላይ' : 'Pending')
                              : (isAmharic ? 'ያልተሰጠ' : 'Not Granted')}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* =========================================================
                      CARD 2: MERGED VEHICLE & CONTACT DETAILS (2-COLUMN ICON LIST)
                      ========================================================= */}
                  <div className="bg-blue-200 dark:bg-blue-900/80 border-2 border-blue-300 dark:border-blue-700 rounded-md p-2 sm:p-2.5 shadow-xs space-y-2">
                    <h3 className="text-xs sm:text-sm font-black text-slate-950 dark:text-white flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[#0B1E48] dark:text-blue-400 text-[18px]">two_wheeler</span>
                      <span>{isAmharic ? 'ተጨማሪ የተሽከርካሪ ዝርዝሮች' : 'Additional Vehicle Details'}</span>
                    </h3>

                    {/* 2-Column List Items with Icon Style Badges */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      
                      {/* 1. Engine / Fuel Category */}
                      <div className="flex items-center gap-2 p-1.5 bg-blue-100/60 dark:bg-blue-950/40 rounded-lg border border-blue-300/60 dark:border-blue-700/60">
                        <div className="w-8 h-8 rounded-full bg-[#0B1E48] text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-xs">
                          <span className="material-symbols-outlined text-[16px]">
                            {scannedRegResult.vehicleCategory === 'electric' ? 'electric_bolt' : 'local_gas_station'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] text-slate-700 dark:text-slate-300 font-extrabold block">
                            {isAmharic ? 'የሞተር አይነት' : 'Engine Type'}
                          </span>
                          <span className="text-xs font-black text-slate-950 dark:text-white block truncate">
                            {scannedRegResult.vehicleCategory === 'electric' 
                              ? (isAmharic ? 'ኤሌክትሪክ' : 'Electric (EV)') 
                              : (isAmharic ? 'ቤንዚን' : 'Gasoline')}
                          </span>
                        </div>
                      </div>

                      {/* 2. Sub-City */}
                      <div className="flex items-center gap-2 p-1.5 bg-blue-100/60 dark:bg-blue-950/40 rounded-lg border border-blue-300/60 dark:border-blue-700/60">
                        <div className="w-8 h-8 rounded-full bg-[#0B1E48] text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-xs">
                          <span className="material-symbols-outlined text-[16px]">location_city</span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] text-slate-700 dark:text-slate-300 font-extrabold block">
                            {isAmharic ? 'ክፍለ ከተማ' : 'Sub-City'}
                          </span>
                          <span className="text-xs font-black text-slate-950 dark:text-white block truncate">
                            {scannedRegResult.subCity || '—'}
                          </span>
                        </div>
                      </div>

                      {/* 3. Emergency Phone Number */}
                      <div className="flex items-center gap-2 p-1.5 bg-blue-100/60 dark:bg-blue-950/40 rounded-lg border border-blue-300/60 dark:border-blue-700/60">
                        <div className="w-8 h-8 rounded-full bg-[#0B1E48] text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-xs">
                          <span className="material-symbols-outlined text-[16px]">call</span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] text-slate-700 dark:text-slate-300 font-extrabold block">
                            {isAmharic ? 'አስቸኳይ ስልክ' : 'Phone Number'}
                          </span>
                          <a href={`tel:${scannedRegResult.phone}`} className="text-xs font-black font-mono text-blue-900 dark:text-blue-300 hover:underline block truncate">
                            {scannedRegResult.phone || '—'}
                          </a>
                        </div>
                      </div>

                      {/* 4. Registered By / Officer ID */}
                      <div className="flex items-center gap-2 p-1.5 bg-blue-100/60 dark:bg-blue-950/40 rounded-lg border border-blue-300/60 dark:border-blue-700/60">
                        <div className="w-8 h-8 rounded-full bg-[#0B1E48] text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-xs">
                          <span className="material-symbols-outlined text-[16px]">badge</span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] text-slate-700 dark:text-slate-300 font-extrabold block">
                            {isAmharic ? 'ፈቃጅ ቁጥር' : 'Authorized Officer'}
                          </span>
                          <span className="text-xs font-black font-mono text-slate-950 dark:text-white block truncate">
                            {scannedRegResult.registeredBy || '—'}
                          </span>
                        </div>
                      </div>

                      {/* 5. Chassis Number */}
                      <div className="flex items-center gap-2 p-1.5 bg-blue-100/60 dark:bg-blue-950/40 rounded-lg border border-blue-300/60 dark:border-blue-700/60">
                        <div className="w-8 h-8 rounded-full bg-[#0B1E48] text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-xs">
                          <span className="material-symbols-outlined text-[16px]">fingerprint</span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] text-slate-700 dark:text-slate-300 font-extrabold block">
                            {isAmharic ? 'የሻንሺ ቁጥር' : 'Chassis Number'}
                          </span>
                          <span className="text-xs font-black font-mono text-slate-950 dark:text-white block truncate">
                            {scannedRegResult.chassisNumber || '—'}
                          </span>
                        </div>
                      </div>

                      {/* 6. Blood Group */}
                      <div className="flex items-center gap-2 p-1.5 bg-blue-100/60 dark:bg-blue-950/40 rounded-lg border border-blue-300/60 dark:border-blue-700/60">
                        <div className="w-8 h-8 rounded-full bg-[#0B1E48] text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-xs">
                          <span className="material-symbols-outlined text-[16px]">bloodtype</span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] text-slate-700 dark:text-slate-300 font-extrabold block">
                            {isAmharic ? 'የደም ዓይነት' : 'Blood Group'}
                          </span>
                          <span className="text-xs font-black text-red-700 dark:text-red-400 block truncate">
                            {scannedRegResult.bloodGroup || '—'}
                          </span>
                        </div>
                      </div>

                    </div>

                    {/* Action Button at bottom: 'ዝርዝር መረጃ' */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setExpandedVehicleSpecs((prev) => !prev)}
                        className="w-full bg-[#0B1E48] hover:bg-[#071330] active:scale-[0.99] text-amber-300 border border-amber-500/40 font-black py-2.5 px-3 rounded-md text-center shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {expandedVehicleSpecs ? 'expand_less' : 'description'}
                        </span>
                        <span>{isAmharic ? (expandedVehicleSpecs ? 'መረጃዎችን ደብቅ' : 'ዝርዝር መረጃ') : (expandedVehicleSpecs ? 'Hide Details' : 'Detailed Documents & Info')}</span>
                      </button>
                    </div>
                  </div>

                  {/* =========================================================
                      EXPANDABLE DETAILS & DOCUMENT ATTACHMENTS (When expanded)
                      ========================================================= */}
                  <AnimatePresence>
                    {expandedVehicleSpecs && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="overflow-hidden space-y-4"
                      >
                        {/* Document Credentials */}
                        <div className="bg-blue-200 dark:bg-blue-900/80 border-2 border-blue-300 dark:border-blue-700 rounded-lg p-4 sm:p-5 shadow-sm space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                              <span className="material-symbols-outlined text-[#0B1E48] dark:text-blue-400 text-[20px]">folder_shared</span>
                              <span>{isAmharic ? 'የባለቤት ማስረጃዎችና ሰነዶች' : 'Document Credentials'}</span>
                            </h4>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">{isAmharic ? 'ለማጉላት ይጫኑ' : 'Click to zoom'}</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Police Permit */}
                            {scannedRegResult.drivingPermitPhoto && (
                              <div
                                onClick={() => openDocumentCarousel(
                                  scannedRegResult.drivingPermitPhoto || '',
                                  `${scannedRegResult.fullName} — ${isAmharic ? 'የፖሊስ የመንቀሳቀሻ ፈቃድ' : 'Police Permit'}`
                                )}
                                className="group cursor-pointer bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 p-2.5 rounded-md text-center space-y-1.5 transition-all"
                              >
                                <div className="relative h-36 rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center">
                                  <SmartImage
                                    src={scannedRegResult.drivingPermitPhoto}
                                    alt="Police Permit"
                                    fallbackIcon="menu_book"
                                    className="w-full h-full object-cover group-hover:scale-103 transition-transform"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                    <span className="material-symbols-outlined text-[24px]">zoom_in</span>
                                  </div>
                                </div>
                                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block truncate">
                                  {isAmharic ? 'የፖሊስ ፈቃድ' : 'Police Permit'}
                                </span>
                              </div>
                            )}

                            {/* Driver License */}
                            {scannedRegResult.drivingLicensePhoto && (
                              <div
                                onClick={() => openDocumentCarousel(
                                  scannedRegResult.drivingLicensePhoto || '',
                                  `${scannedRegResult.fullName} — ${isAmharic ? 'የመንጃ ፍቃድ' : 'Driver License'}`
                                )}
                                className="group cursor-pointer bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 p-2.5 rounded-md text-center space-y-1.5 transition-all"
                              >
                                <div className="relative h-36 rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center">
                                  <SmartImage
                                    src={scannedRegResult.drivingLicensePhoto}
                                    alt="Driver License"
                                    fallbackIcon="card_membership"
                                    className="w-full h-full object-cover group-hover:scale-103 transition-transform"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                    <span className="material-symbols-outlined text-[24px]">zoom_in</span>
                                  </div>
                                </div>
                                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block truncate">
                                  {isAmharic ? 'የመንጃ ፍቃድ' : 'Driver License'}
                                </span>
                              </div>
                            )}

                            {/* Digital ID Card Preview */}
                            <div
                              onClick={() => setShowDigitalIdModal(true)}
                              className="group cursor-pointer bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 p-2.5 rounded-md text-center space-y-1.5 transition-all sm:col-span-2"
                            >
                              <div className="relative rounded-md overflow-hidden bg-slate-950 flex items-center justify-center p-2 border border-slate-800">
                                <QRCodeCard registration={scannedRegResult} lang={lang} />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <span className="material-symbols-outlined text-[28px]">zoom_in</span>
                                </div>
                              </div>
                              <span className="text-xs font-black text-slate-900 dark:text-slate-100 block">
                                {isAmharic ? 'ዲጂታል መታወቂያ ካርድ' : 'Digital ID Card (Full View)'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Action Buttons: Scan Again / Back */}
                  <div className="pt-2 pb-6 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleRescan}
                      className="flex-1 bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-bold py-3 px-4 rounded-md text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer border border-outline-variant/60 shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
                      <span>{isAmharic ? 'ሌላ QR ኮድ ቃኝ' : 'Scan Next QR'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowNotesSection(!showNotesSection)}
                      className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 font-bold py-3 px-4 rounded-md text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit_note</span>
                      <span>{isAmharic ? 'ማስታወሻ' : 'Notes'}</span>
                    </button>
                  </div>
                </div>

                {/* 3. FIXED BOTTOM SECTION WITH SLIDEOUT INSPECTION NOTES */}
                <div className="shrink-0 bg-surface-container-lowest border-t border-outline-variant/60 z-20 shadow-lg relative flex flex-col">
                  {/* Slideout Inspection Notes Form */}
                  <AnimatePresence>
                    {showNotesSection && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="overflow-hidden bg-surface-container-low/70 border-b border-outline-variant/40"
                      >
                        <div className="p-3.5 sm:p-4 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[18px] text-primary">edit_note</span>
                              <span>{isAmharic ? 'የተቆጣጣሪ ማስታወሻ' : 'Inspection Notes'}</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => setShowNotesSection(false)}
                              className="text-secondary hover:text-on-surface p-1 rounded-lg hover:bg-surface-container text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <span className="material-symbols-outlined text-[18px]">keyboard_arrow_down</span>
                              <span>{isAmharic ? 'ደብቅ' : 'Hide'}</span>
                            </button>
                          </div>
                          <textarea
                            rows={2}
                            value={verificationNotes}
                            onChange={(e) => handleNoteChange(e.target.value)}
                            placeholder={isAmharic ? 'ማስታወሻ ይጻፉ...' : 'Type inspection notes...'}
                            className="w-full bg-surface border border-outline-variant rounded-md px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
                            autoFocus
                          />
                          
                          {/* Record Button ('መዝግብ' / 'Record') inside inspection notes container */}
                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (currentLog && onAddVerificationLog) {
                                  const finalLog: VerificationLog = {
                                    ...currentLog,
                                    officerNotes: verificationNotes || currentLog.officerNotes,
                                    scannedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
                                  };
                                  onAddVerificationLog(finalLog, true);
                                }
                                onClose();
                                handleRescan();
                              }}
                              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                            >
                              <span className="material-symbols-outlined text-[18px] shrink-0">check_circle</span>
                              <span>{isAmharic ? 'መዝግብ' : 'Record'}</span>
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>


                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* DIGITAL ID LIGHTBOX MODAL */}
      {showDigitalIdModal && (
        <div
          className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150 overflow-y-auto"
          onClick={() => setShowDigitalIdModal(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl">
            <ZoomableDocumentContainer
              lang={lang}
              title={isAmharic ? 'የዲጂታል መታወቂያ ካርድ' : 'Digital ID Card'}
              onClose={() => setShowDigitalIdModal(false)}
              requireClerkRequest={false}
            >
              <div className="p-4 bg-white dark:bg-slate-900 flex items-center justify-center">
                <QRCodeCard registration={scannedRegResult} lang={lang} />
              </div>
            </ZoomableDocumentContainer>
          </div>
        </div>
      )}

      {/* 100% VIEWPORT FILLING CAROUSEL DOCUMENT ZOOM VIEWER */}
      {carouselModal && (
        <FullscreenDocumentCarouselModal
          items={carouselModal.items}
          initialIndex={carouselModal.initialIndex}
          lang={lang}
          onClose={() => setCarouselModal(null)}
        />
      )}
    </>
  );

  // Render as a standalone page component or full screen modal overlay
  if (isPage) {
    return (
      <div className="w-full h-full flex flex-col flex-1 min-h-0 overflow-hidden bg-surface p-0 m-0 rounded-none">
        {mainCardContent}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-0 overflow-hidden transition-all duration-200">
      <div className="bg-surface rounded-none p-0 m-0 w-full max-w-full sm:max-w-6xl h-[100dvh] sm:h-[98vh] max-h-[100dvh] shadow-2xl flex flex-col overflow-hidden">
        {mainCardContent}
      </div>
    </div>
  );
};
