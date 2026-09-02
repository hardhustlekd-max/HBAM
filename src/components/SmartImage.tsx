import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './ui/Icon';

interface SmartImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt: string;
  className?: string;
  fallbackIcon?: string;
  isGrayscale?: boolean;
}

export const SmartImage: React.FC<SmartImageProps> = ({
  src,
  alt,
  className = '',
  fallbackIcon = 'image',
  isGrayscale = false,
  ...props
}) => {
  const isDataUrl = Boolean(src && src.startsWith('data:'));
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(src && src.trim() !== '' && !isDataUrl));
  const [hasError, setHasError] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Reset state if the source URL changes
  useEffect(() => {
    if (src && src.trim() !== '') {
      setHasError(false);
      if (src.startsWith('data:') || (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0)) {
        setIsLoading(false);
      } else {
        setIsLoading(true);
        // Safety timeout so image never gets stuck in loading state
        const timer = setTimeout(() => {
          setIsLoading(false);
        }, 1200);
        return () => clearTimeout(timer);
      }
    } else {
      setIsLoading(false);
      setHasError(true);
    }
  }, [src]);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const hasNoSrc = !src || src.trim() === '';

  if (hasError || hasNoSrc) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-surface-container border border-outline-variant/50 text-secondary p-2 text-center select-none ${className}`}
        id={`fallback-container-${alt.replace(/\s+/g, '-').toLowerCase()}`}
      >
        <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-outline shadow-2xs mb-0.5">
          <Icon name={fallbackIcon} size={20} />
        </div>
        <span className="text-[9px] font-bold tracking-wide uppercase text-secondary/80 max-w-[90%] truncate">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`} id={`smart-image-wrap-${alt.replace(/\s+/g, '-').toLowerCase()}`}>
      {/* Soft gradient shimmer when loading */}
      {isLoading && (
        <div className="absolute inset-0 z-10 bg-slate-100 dark:bg-slate-900 flex items-center justify-center animate-pulse">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-black/20 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
          <Icon name={fallbackIcon} size={24} className="text-outline/40" />
        </div>
      )}

      <img
        ref={imgRef}
        src={src}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        referrerPolicy="no-referrer"
        className={`w-full h-full object-cover transition-all duration-200 ${
          isGrayscale ? 'grayscale' : ''
        } ${isLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
        {...props}
      />
    </div>
  );
};

