import React from 'react';

interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: string;
  className?: string;
  size?: number | string;
  filled?: boolean;
}

/**
 * Universal Google Material Symbols & Icons wrapper
 * Stops raw text fallback flash with strict width/height containment and font-display: block.
 */
export const Icon: React.FC<IconProps> = ({
  name,
  className = '',
  size,
  filled = false,
  style,
  ...props
}) => {
  const cleanName = (name || '')
    .replace(/[{}]/g, '')
    .trim();

  // Normalize common legacy or lucide names to Material Symbols names
  let iconName = cleanName;
  if (iconName === 'manage_search') iconName = 'search';
  if (iconName === 'hard_drive') iconName = 'storage';
  if (iconName === 'sd_card') iconName = 'sd_card';

  const sizeStyle = size
    ? {
        fontSize: typeof size === 'number' ? `${size}px` : size,
      }
    : {
        fontSize: '1.25rem',
      };

  return (
    <span
      className={`material-symbols-outlined select-none notranslate inline-flex items-center justify-center shrink-0 align-middle ${className}`}
      style={{
        lineHeight: 1,
        fontVariationSettings: filled ? "'FILL' 1" : "'FILL' 0",
        ...sizeStyle,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    >
      {iconName}
    </span>
  );
};
