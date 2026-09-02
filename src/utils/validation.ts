/**
 * Input validation utilities for Motorcycle Permit Registration System
 */

export interface ValidationResult {
  isValid: boolean;
  message: string;
}

/**
 * Validates full name. It should have at least 3 characters and contain only Amharic letters and spaces.
 */
export const validateFullName = (name: string, isAmharic: boolean): ValidationResult => {
  const trimmed = name.trim();
  if (!trimmed) {
    return {
      isValid: false,
      message: isAmharic ? 'እባክዎ የባለቤት ሙሉ ስም ያስገቡ!' : 'Please enter Owner Full Name!',
    };
  }
  if (trimmed.length < 3) {
    return {
      isValid: false,
      message: isAmharic ? 'የባለቤት ስም ቢያንስ 3 ቁምፊዎች መሆን አለበት!' : 'Owner Name must be at least 3 characters!',
    };
  }
  // Allow Amharic Unicode block (0x1200 - 0x137F) and spaces
  const nameRegex = /^[\u1200-\u137F\s]+$/;
  if (!nameRegex.test(trimmed)) {
    return {
      isValid: false,
      message: isAmharic
        ? 'የባለቤት ስም በአማርኛ ፊደላት ብቻ መሆን አለበት!'
        : 'Owner Name must contain Amharic characters only!',
    };
  }
  return { isValid: true, message: '' };
};

/**
 * Validates individual name part (First name, Father's name, Grandfather's name).
 * Must accept Amharic characters ONLY and strictly NO space.
 */
export const validateSingleName = (name: string, fieldLabel: string, isAmharic: boolean): ValidationResult => {
  if (!name || !name.trim()) {
    return {
      isValid: false,
      message: isAmharic ? `እባክዎ ${fieldLabel} ያስገቡ!` : `Please enter ${fieldLabel}!`,
    };
  }
  if (/\s/.test(name)) {
    return {
      isValid: false,
      message: isAmharic ? `${fieldLabel} ውስጥ ክፍተት (space) አይፈቀድም!` : `${fieldLabel} must not contain any spaces!`,
    };
  }
  if (name.length < 2) {
    return {
      isValid: false,
      message: isAmharic ? `${fieldLabel} ቢያንስ 2 ፊደላት መሆን አለበት!` : `${fieldLabel} must be at least 2 characters!`,
    };
  }
  // Amharic characters only without spaces or symbols or digits
  const amharicOnlyRegex = /^[\u1200-\u137F]+$/;
  if (!amharicOnlyRegex.test(name)) {
    return {
      isValid: false,
      message: isAmharic
        ? `${fieldLabel} በአማርኛ ፊደላት ብቻ መሆን አለበት!`
        : `${fieldLabel} must contain Amharic characters only!`,
    };
  }
  return { isValid: true, message: '' };
};

/**
 * Validates phone number formats (standard Ethiopian formats like +251 9... or 09... / 07...).
 */
export const validatePhone = (phone: string, isAmharic: boolean): ValidationResult => {
  const trimmed = phone.trim().replace(/\s+/g, '');
  if (!trimmed) {
    return {
      isValid: false,
      message: isAmharic ? 'እባክዎ ስልክ ቁጥር ያስገቡ!' : 'Please enter Phone Number!',
    };
  }

  // Regexes for Ethiopian numbers:
  // - Starts with +2517... or +2519... followed by 8 digits (12 total digits)
  // - Starts with 09... or 07... followed by 8 digits (10 total digits)
  const ethioRegex = /^(?:\+251[79]\d{8}|0[79]\d{8})$/;
  if (!ethioRegex.test(trimmed)) {
    return {
      isValid: false,
      message: isAmharic
        ? 'ትክክለኛ ያልሆነ የስልክ ቅርጸት! እባክዎ ምሳሌ፡ +251911000000 ወይም 0911000000 ይጠቀሙ።'
        : 'Invalid phone format! Use e.g. +251911000000 or 0911000000.',
    };
  }
  return { isValid: true, message: '' };
};

/**
 * Validates Ethiopian vehicle/motorcycle plate format.
 * Format examples: አማ 2 12345, AM-2-12345, AA-2-A0000, 3-2-12345
 */
export const validatePlateNumber = (plate: string, isAmharic: boolean): ValidationResult => {
  const trimmed = plate.trim().toUpperCase();
  if (!trimmed) {
    return {
      isValid: false,
      message: isAmharic ? 'እባክዎ የሰሌዳ ቁጥር ያስገቡ!' : 'Please enter Plate Number!',
    };
  }

  if (trimmed === 'ELECTRIC' || trimmed === 'ኢቪ' || trimmed === 'ኤሌክትሪክ') {
    return { isValid: true, message: '' };
  }

  // Regex for Ethiopian plate numbers (accepts space or dash separator, Amharic or Latin region code):
  // Region (e.g. አማ, አ.አ, ኦሮ, ደቡ, ሲዳ, ትግ, ድሬ, ሶማ, ቤን, አፋ, ጋም, ፌዴ, AA, AM, OR, DR, TI, SNNP, SP, AF, BG, SO, HA, DD, SW, SD, CP, SE, NE, FE, BE, HR, WE, 1-9)
  // Code digit (1 to 5)
  // 2 to 6 character alphanumeric/numeric sequence (e.g. 12345, A1234, M54321, 5432)
  const plateRegex = /^(?:[\u1200-\u137F\w.\-\s]{1,10})[\s\-]+[1-5][\s\-]+[A-Z0-9]{2,7}$/i;
  const standardRegex = /^(AA|AM|OR|DR|TI|SNNP|SP|AF|BG|SO|HA|DD|SW|SD|CP|SE|NE|FE|BE|HR|WE|[0-9]{1,2})-[1-5]-[A-Z0-9]{2,6}$/i;
  
  if (!plateRegex.test(trimmed) && !standardRegex.test(trimmed)) {
    return {
      isValid: false,
      message: isAmharic
        ? 'እባክዎ ትክክለኛ የሰሌዳ ቁጥር ያስገቡ! ምሳሌ፡ አማ 2 12345'
        : 'Invalid plate format! Example: AM 2 12345',
    };
  }
  return { isValid: true, message: '' };
};

/**
 * Validates chassis or engine serial number (alphanumeric, at least 5 chars).
 * Note: Since chassis number is removed from input, this now defaults to always valid.
 */
export const validateEngineOrSerial = (serial: string, isAmharic: boolean): ValidationResult => {
  return { isValid: true, message: '' };
};

/**
 * Validates badge IDs (must be alphanumeric and not empty, e.g., OFFICER-1234, CLERK-01).
 */
export const validateBadgeId = (badge: string, isAmharic: boolean): ValidationResult => {
  const trimmed = badge.trim();
  if (!trimmed) {
    return {
      isValid: false,
      message: isAmharic ? 'እባክዎ የመለያ ቁጥር ያስገቡ!' : 'Please enter Badge ID!',
    };
  }
  if (trimmed.length < 3) {
    return {
      isValid: false,
      message: isAmharic ? 'መለያ ቁጥር ቢያንስ 3 ቁምፊዎች መሆን አለበት!' : 'Badge ID must be at least 3 characters!',
    };
  }
  const badgeRegex = /^[A-Z0-9\-_]+$/i;
  if (!badgeRegex.test(trimmed)) {
    return {
      isValid: false,
      message: isAmharic
        ? 'መለያ ቁጥር ውስጥ ፊደላት፣ ቁጥሮች እና ዳሽ (-) ብቻ ይፈቀዳሉ!'
        : 'Only alphanumeric characters, dashes, and underscores are allowed in Badge ID!',
    };
  }
  return { isValid: true, message: '' };
};

/**
 * General validator for alphanumeric words (e.g. brand, model, location).
 */
export const validateRequiredText = (text: string, label: string, isAmharic: boolean, minLength = 2): ValidationResult => {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      isValid: false,
      message: isAmharic ? `እባክዎ ${label} ያስገቡ!` : `Please enter ${label}!`,
    };
  }
  if (trimmed.length < minLength) {
    return {
      isValid: false,
      message: isAmharic
        ? `${label} ቢያንስ ${minLength} ቁምፊዎች መሆን አለበት!`
        : `${label} must be at least ${minLength} characters!`,
    };
  }
  return { isValid: true, message: '' };
};

/**
 * Normalizes full name for comparison (lowercased, collapsed whitespace).
 */
export const normalizeFullName = (name: string): string => {
  return (name || '').toLowerCase().replace(/\s+/g, ' ').trim();
};

/**
 * Normalizes phone number to last 9 digits (handles +251 9... and 09...).
 */
export const normalizePhoneDigits = (phone: string): string => {
  const digits = (phone || '').replace(/\D/g, '');
  return digits.length >= 9 ? digits.slice(-9) : digits;
};

/**
 * Checks if a registration has duplicate full name or telephone number across existing records.
 */
export const checkDuplicateRegistration = (
  fullName: string,
  phone: string,
  existingRegistrations: { id: string; fullName?: string; phone?: string }[],
  excludeId?: string,
  isAmharic: boolean = true
): { hasDuplicate: boolean; nameDuplicate: boolean; phoneDuplicate: boolean; message: string } => {
  const normName = normalizeFullName(fullName);
  const normPhone = normalizePhoneDigits(phone);

  let nameDuplicate = false;
  let phoneDuplicate = false;

  for (const reg of existingRegistrations || []) {
    if (excludeId && reg.id === excludeId) continue;

    if (normName && normalizeFullName(reg.fullName || '') === normName) {
      nameDuplicate = true;
    }
    if (normPhone && normPhone.length === 9 && normalizePhoneDigits(reg.phone || '') === normPhone) {
      phoneDuplicate = true;
    }
    if (nameDuplicate || phoneDuplicate) break;
  }

  let message = '';
  if (nameDuplicate && phoneDuplicate) {
    message = isAmharic
      ? 'ይህ ሙሉ ስም እና ስልክ ቁጥር ቀድሞ ተመዝግቧል!'
      : 'This full name and phone number are already registered!';
  } else if (nameDuplicate) {
    message = isAmharic
      ? 'ይህ ባለቤት (ሙሉ ስም) ቀድሞ ተመዝግቧል!'
      : 'This owner (full name) is already registered!';
  } else if (phoneDuplicate) {
    message = isAmharic
      ? 'ይህ ስልክ ቁጥር ቀድሞ ተመዝግቧል!'
      : 'This phone number is already registered!';
  }

  return {
    hasDuplicate: nameDuplicate || phoneDuplicate,
    nameDuplicate,
    phoneDuplicate,
    message,
  };
};

