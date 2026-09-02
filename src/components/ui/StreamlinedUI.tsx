import React, { ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icon } from './Icon';

export const SectionToggle = ({
  icon,
  title,
  isOpen,
  onClick,
  badgeText,
}: {
  icon: string;
  title: string;
  isOpen: boolean;
  onClick: () => void;
  badgeText?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full flex items-center justify-between py-1 cursor-pointer text-left group"
  >
    <div className="flex items-center gap-2">
      <h4 className="font-bold text-xs sm:text-sm text-on-surface flex items-center gap-1.5">
        <Icon name={icon} size={16} className="text-primary" />
        <span>{title}</span>
      </h4>
      {badgeText && isOpen && (
        <span className="text-[10px] font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10">
          {badgeText}
        </span>
      )}
    </div>
    <Icon
      name={isOpen ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
      size={18}
      className="text-secondary group-hover:text-on-surface transition-colors"
    />
  </button>
);

export const SectionContent = ({
  isOpen,
  children,
}: {
  isOpen: boolean;
  children: ReactNode;
}) => (
  <AnimatePresence initial={false}>
    {isOpen && (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.16, ease: 'easeInOut' }}
        className="overflow-hidden pt-1"
      >
        {children}
      </motion.div>
    )}
  </AnimatePresence>
);

export const SectionCard = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`bg-surface-container/20 border border-outline-variant/60 rounded-lg p-3 sm:p-4 space-y-3 ${className}`}>
    {children}
  </div>
);

export const DataField = ({
  label,
  value,
  isMono = false,
  isPrimary = false,
  className = '',
}: {
  label: string;
  value: ReactNode;
  isMono?: boolean;
  isPrimary?: boolean;
  className?: string;
}) => (
  <div className={`bg-surface-container/30 p-2 sm:p-2.5 rounded-lg ${className}`}>
    <span className="text-secondary block text-[10px] font-semibold">{label}</span>
    <span
      className={`block mt-0.5 text-xs sm:text-sm truncate ${
        isMono ? 'font-mono font-black' : 'font-bold'
      } ${isPrimary ? 'text-primary' : 'text-on-surface'}`}
    >
      {value}
    </span>
  </div>
);

export const ActionTriggerPrimary = ({
  icon,
  label,
  onClick,
  className = '',
  id,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  className?: string;
  id?: string;
}) => (
  <button
    id={id}
    type="button"
    onClick={onClick}
    className={`flex-1 min-w-[130px] bg-primary text-on-primary hover:bg-primary/90 font-bold text-xs sm:text-sm py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:scale-95 transition-all duration-200 cursor-pointer ${className}`}
  >
    <Icon name={icon} size={18} />
    <span>{label}</span>
  </button>
);

export const ActionTriggerSecondary = ({
  icon,
  label,
  onClick,
  className = '',
  id,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  className?: string;
  id?: string;
}) => (
  <button
    id={id}
    type="button"
    onClick={onClick}
    className={`flex-1 min-w-[130px] bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-xs sm:text-sm py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 border border-outline-variant/60 shadow-xs hover:shadow-sm active:scale-95 transition-all duration-200 cursor-pointer ${className}`}
  >
    <Icon name={icon} size={18} />
    <span>{label}</span>
  </button>
);

export const SelectField = ({
  value,
  onChange,
  children,
  className = '',
  id,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) => (
  <div className={`relative inline-flex items-center shrink-0 ${className}`}>
    <select
      id={id}
      value={value}
      onChange={onChange}
      style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
      className="bg-surface-container-lowest text-on-surface border border-outline-variant/80 hover:border-outline rounded-lg pl-3 pr-8 py-1.5 font-bold text-xs shadow-2xs focus:outline-none focus:ring-2 focus:ring-primary/20 hover:shadow-xs transition-all cursor-pointer"
    >
      {children}
    </select>
    <div className="absolute right-2 inset-y-0 flex items-center justify-center pointer-events-none select-none text-secondary">
      <Icon
        name="keyboard_arrow_down"
        size={16}
      />
    </div>
  </div>
);

export const Badge = ({
  label,
  variant = 'neutral',
  className = '',
}: {
  label: string;
  variant?: 'neutral' | 'primary' | 'success' | 'warning' | 'error' | 'info';
  className?: string;
}) => {
  const variantClasses = {
    neutral: 'bg-surface-container text-secondary border-outline-variant/60',
    primary: 'bg-primary/10 text-primary border-primary/20',
    success: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25',
    warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25',
    error: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/25',
    info: 'bg-primary/15 text-primary border-primary/25',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border leading-none shrink-0 ${variantClasses[variant]} ${className}`}>
      {label}
    </span>
  );
};

