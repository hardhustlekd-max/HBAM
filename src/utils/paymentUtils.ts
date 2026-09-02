export interface PaymentReceipt {
  id: string;
  receiptNumber: string;
  ownerRegistrationId?: string;
  ownerName: string;
  plateNumber?: string;
  phone?: string;
  paymentDate: string; // YYYY-MM-DD or YYYY-MM-DD HH:mm
  expirationDate: string; // YYYY-MM-DD (1 month from paymentDate)
  amount?: number | string;
  receiptScreenshot?: string;
  notes?: string;
  enteredBy: string; // clerk badgeId or name
  createdAt: string;
}

export type PaymentStatusType = 'active' | 'expiring_soon' | 'expired';

export interface PaymentStatusInfo {
  status: PaymentStatusType;
  daysRemaining: number;
}

/**
 * Calculates expiration date 1 month from payment date.
 */
export function calculateOneMonthExpiration(paymentDateStr: string): string {
  if (!paymentDateStr) return '';
  const dateObj = new Date(paymentDateStr);
  if (isNaN(dateObj.getTime())) return paymentDateStr;

  // Add 1 month safely
  const targetMonth = dateObj.getMonth() + 1;
  dateObj.setMonth(targetMonth);

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Derives payment status and days remaining relative to today.
 */
export function getPaymentReceiptStatus(expirationDateStr: string): PaymentStatusInfo {
  if (!expirationDateStr) {
    return { status: 'expired', daysRemaining: 0 };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expDate = new Date(expirationDateStr);
  expDate.setHours(23, 59, 59, 999);

  if (isNaN(expDate.getTime())) {
    return { status: 'expired', daysRemaining: 0 };
  }

  const diffTime = expDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { status: 'expired', daysRemaining: diffDays };
  } else if (diffDays <= 5) {
    return { status: 'expiring_soon', daysRemaining: diffDays };
  } else {
    return { status: 'active', daysRemaining: diffDays };
  }
}
