import React, { useState } from 'react';
import {
  MotorcycleRegistration,
  Language,
  VehicleCategory,
  BAHIR_DAR_SUBCITIES,
  PaymentReceipt,
} from '../types';
import { DocumentUploadInput } from './DocumentUploadInput';
import { uploadDocumentPhoto } from '../services/storageService';
import { savePaymentReceiptToDb } from '../services/dbService';
import { calculateOneMonthExpiration } from '../utils/paymentUtils';
import { SectionCard, DataField } from './ui/StreamlinedUI';
import { Icon } from './ui/Icon';

import {
  validateFullName,
  validateSingleName,
  validatePhone,
  validatePlateNumber,
  validateEngineOrSerial,
  validateRequiredText,
  checkDuplicateRegistration,
} from '../utils/validation';

export interface BrandOption {
  brand: string;
  am: string;
  category: 'electric' | 'gasoline' | 'both';
  models: string[];
}

export const ETHIOPIAN_MOTOR_BRANDS: BrandOption[] = [
  // === Electric (EV) Motorcycle Brands ===
  {
    brand: 'Dodai',
    am: 'ዶዳይ',
    category: 'electric',
    models: ['Model One', 'Delivery Pro']
  },
  {
    brand: 'Yadea',
    am: 'ያዴአ',
    category: 'electric',
    models: [
      'Yadea E8S',
      'Yadea Cooljoy',
      'Yadea GT60',
      'Yadea T5',
      'Yadea G150P',
      'C1S Pro',
      'G5',
      'VoltGuard',
      'Kemper'
    ]
  },
  {
    brand: 'Komaki',
    am: 'ኮማኪ',
    category: 'electric',
    models: ['Komaki TN-95', 'Komaki SE', 'Komaki Ranger']
  },
  {
    brand: 'Revoo',
    am: 'ሪቮ / ሬቮ',
    category: 'electric',
    models: [
      'REVOO A10',
      'REVOO A12 / A12S',
      'REVOO C32 / C32Y',
      'REVOO C35 / C35-Y',
      'REVOO E52',
      'REVOO B12 / Y06'
    ]
  },
  {
    brand: 'Super Soco',
    am: 'ሱፐር ሶኮ',
    category: 'electric',
    models: ['TS Street Hunter', 'TC Max', 'CPx', 'TC', 'CUX', 'VS1']
  },
  {
    brand: 'Niu',
    am: 'ኒዩ',
    category: 'electric',
    models: ['NQi GT', 'MQi+ Sport', 'UQi GT', 'RQi', 'KQi3']
  },

  // === Gasoline Engine Motorcycle Brands (Strictly <= 110cc models) ===
  {
    brand: 'Bajaj / Boxer',
    am: 'ባጃጅ / ቦክሰር',
    category: 'gasoline',
    models: [
      'Boxer 100 HD ES (99.27cc)',
      'Platina 100 (102cc)',
      'Boxer BM 100',
      'CT 100',
      'Platina 110'
    ]
  },
  {
    brand: 'TVS',
    am: 'ቲቪኤስ',
    category: 'gasoline',
    models: [
      'TVS XL 100 (99.7cc)',
      'TVS Star HLX 100 (99cc utility commuter)',
      'TVS Sport / Radeon (109.7cc)',
      'Neo NX 110',
      'Star City Plus 110',
      'Metro Plus 110'
    ]
  },
  {
    brand: 'Hero',
    am: 'ሂሮ',
    category: 'gasoline',
    models: [
      'Hero Splendor+ (97.2cc)',
      'Hero HF Deluxe (97.2cc)',
      'Splendor iSmart 110',
      'Passion Pro 110'
    ]
  },
  {
    brand: 'Honda',
    am: 'ሆንዳ',
    category: 'gasoline',
    models: [
      'Honda Super Cub 50 / 90 / 110',
      'Honda Wave 110 (109.1cc)',
      'Ace 110',
      'CD 110 Dream',
      'Livo 110',
      'Dream Yuga 110'
    ]
  },
  {
    brand: 'Suzuki',
    am: 'ሱዙኪ',
    category: 'gasoline',
    models: [
      'Suzuki Eco 110',
      'Suzuki Birdie 50 / 90 (Vintage/Used)',
      'GD 110',
      'AX 100',
      'Hayate 110',
      'Smash 110'
    ]
  },
  {
    brand: 'Yamaha',
    am: 'ያማሃ',
    category: 'gasoline',
    models: ['Crux 110', 'Saluto RX 110', 'YB 100', 'RayZR 110']
  },
  {
    brand: 'Lifan',
    am: 'ሊፋን',
    category: 'gasoline',
    models: ['LF100', 'LF110', 'LF110-26', 'LF100-2B']
  },
  {
    brand: 'Haojue',
    am: 'ሃኦጁ',
    category: 'gasoline',
    models: ['HJ110-2', 'Lucky 110', 'HJ100', 'HJ110-3', 'Express 100']
  },
  {
    brand: 'Dayun',
    am: 'ዳዩን',
    category: 'gasoline',
    models: ['DY100', 'DY110', 'DY110-2']
  },
  {
    brand: 'Sonlink',
    am: 'ሶንሊንክ',
    category: 'gasoline',
    models: ['SL100', 'SL110', 'SL110-2']
  },
  {
    brand: 'Senke',
    am: 'ሴንኬ',
    category: 'gasoline',
    models: ['SK100', 'SK110', 'SK110-2']
  },
  {
    brand: 'Sinoray',
    am: 'ሲኖሬይ',
    category: 'gasoline',
    models: ['SR100', 'SR110']
  },
  {
    brand: 'Loncin',
    am: 'ሎንሲን',
    category: 'gasoline',
    models: ['LX100', 'LX110', 'LX110-2']
  },
  {
    brand: 'Zongshen',
    am: 'ዞንግሼን',
    category: 'gasoline',
    models: ['ZS100', 'ZS110', 'ZS110-2']
  },
  {
    brand: 'Skygo',
    am: 'ስካይጎ',
    category: 'gasoline',
    models: ['SG100', 'SG110', 'SG110-2']
  },

  // === Other for both categories ===
  {
    brand: 'Other',
    am: 'ሌላ',
    category: 'both',
    models: []
  }
];

export const getAvailableBrandsForCategory = (cat: VehicleCategory): BrandOption[] => {
  const isEv = cat === 'electric';
  return ETHIOPIAN_MOTOR_BRANDS.filter(
    (b) => (isEv ? b.category === 'electric' : b.category === 'gasoline') || b.category === 'both'
  );
};

export const ETHIOPIAN_PLATE_REGIONS = [
  { code: 'አማ', label: 'አማ' },
  { code: 'አ.አ', label: 'አ.አ' },
  { code: 'ኦሮ', label: 'ኦሮ' },
  { code: 'ሲዳ', label: 'ሲዳ' },
  { code: 'ደቡ', label: 'ደቡ' },
  { code: 'ትግ', label: 'ትግ' },
  { code: 'ድሬ', label: 'ድሬ' },
  { code: 'ሶማ', label: 'ሶማ' },
  { code: 'ቤን', label: 'ቤን' },
  { code: 'አፋ', label: 'አፋ' },
  { code: 'ጋም', label: 'ጋም' },
  { code: 'ፌዴ', label: 'ፌዴ' },
];

export const ETHIOPIAN_PLATE_CODES = [
  { code: '2', label: 'ኮድ 2 (የግል)' },
  { code: '3', label: 'ኮድ 3 (የንግድ / ታክሲ)' },
  { code: '4', label: 'ኮድ 4 (መንግስት)' },
  { code: '5', label: 'ኮድ 5 (ድርጅት)' },
  { code: '1', label: 'ኮድ 1 (ልዩ)' },
];

interface MultiStepRegistrationFormProps {
  lang: Language;
  registrations?: MotorcycleRegistration[];
  onAddRegistration: (
    newReg: MotorcycleRegistration,
    options?: { forceLocalOnly?: boolean }
  ) => Promise<{ success: boolean; isOfflineFallback?: boolean; error?: string }> | any;
  onViewRegistered?: () => void;
  userBadgeId: string;
}

export const MultiStepRegistrationForm: React.FC<MultiStepRegistrationFormProps> = ({
  lang,
  registrations = [],
  onAddRegistration,
  onViewRegistered,
  userBadgeId,
}) => {
  const isAmharic = lang === 'am';

  // 5-Step state matching the verification workflow:
  // 1 = Owner, 2 = Motor (Specs), 3 = Documents (Scans), 4 = Payment (Receipt), 5 = Confirm (Review & Submit)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Form State
  const [firstName, setFirstName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [grandFatherName, setGrandFatherName] = useState('');
  const [fullName, setFullName] = useState('');

  const capitalizeWords = (str: string) => {
    return str.replace(/\b\w/g, (l) => l.toUpperCase());
  };
  const [phone, setPhone] = useState('');
  const [phoneSuffix, setPhoneSuffix] = useState('');
  const [vehicleCategory, setVehicleCategory] = useState<VehicleCategory>('electric');
  
  // Brand & Model with dropdown + custom input (Initialized to the first EV brand for electric category)
  const initialEvBrand = getAvailableBrandsForCategory('electric')[0] || { brand: 'Super Soco', models: ['TS Street Hunter'] };
  const [selectedBrand, setSelectedBrand] = useState(initialEvBrand.brand);
  const [customBrand, setCustomBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState(initialEvBrand.models[0] || 'Other');
  const [customModel, setCustomModel] = useState('');
  const [motorBrand, setMotorBrand] = useState(initialEvBrand.brand);
  const [motorModel, setMotorModel] = useState(initialEvBrand.models[0] || '');

  const [engineOrSerialNo, setEngineOrSerialNo] = useState('N/A');

  // Split Plate State: ክልል, ኮድ, ቁጥር
  const [plateRegion, setPlateRegion] = useState('አማ');
  const [plateCode, setPlateCode] = useState('2');
  const [plateDigits, setPlateDigits] = useState('');
  const [plateNumber, setPlateNumber] = useState('Electric');

  const [chassisNumber, setChassisNumber] = useState('');
  const [subCity, setSubCity] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');

  // Photos (Step 3: Identity)
  const [userPortraitPhoto, setUserPortraitPhoto] = useState('');
  const [nationalIdPhoto, setNationalIdPhoto] = useState('');
  const [nationalIdBackPhoto, setNationalIdBackPhoto] = useState('');
  const [drivingLicensePhoto, setDrivingLicensePhoto] = useState('');
  const [drivingPermitPhoto, setDrivingPermitPhoto] = useState(''); // Libre Photo

  // Step 4: Payment State (Receipt Number, Amount Paid, Screenshot)
  const [receiptNumber, setReceiptNumber] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('500');
  const [receiptScreenshot, setReceiptScreenshot] = useState('');
  const [receiptNumberError, setReceiptNumberError] = useState('');
  const [paymentAmountError, setPaymentAmountError] = useState('');
  const [receiptScreenshotError, setReceiptScreenshotError] = useState(false);

  // Document Upload Validation Errors for red visual warnings
  const [docErrors, setDocErrors] = useState<{
    portrait?: boolean;
    natIdFront?: boolean;
    natIdBack?: boolean;
    license?: boolean;
    libre?: boolean;
  }>({});

  // Submission & Offline Modal States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOfflineConfirmModal, setShowOfflineConfirmModal] = useState(false);
  const [offlineErrorMsg, setOfflineErrorMsg] = useState('');
  const [pendingReg, setPendingReg] = useState<MotorcycleRegistration | null>(null);

  // Success alert state inside the form
  const [isSubmittedSuccessfully, setIsSubmittedSuccessfully] = useState(false);
  const [lastSubmittedReg, setLastSubmittedReg] = useState<MotorcycleRegistration | null>(null);
  const [isStoredLocally, setIsStoredLocally] = useState(false);

  // Handle Category Change (Electric vs Gasoline) with dynamic brand/model synchronization
  const handleVehicleCategoryChange = (newCat: VehicleCategory) => {
    setVehicleCategory(newCat);
    const availableBrands = getAvailableBrandsForCategory(newCat);
    if (availableBrands.length > 0) {
      const firstBrand = availableBrands[0];
      setSelectedBrand(firstBrand.brand);
      setCustomBrand('');
      setMotorBrand(firstBrand.brand);
      if (firstBrand.models.length > 0) {
        setSelectedModel(firstBrand.models[0]);
        setCustomModel('');
        setMotorModel(firstBrand.models[0]);
      } else {
        setSelectedModel('Other');
        setCustomModel('');
        setMotorModel('');
      }
    }
    if (motorBrandError) setMotorBrandError('');
    if (motorModelError) setMotorModelError('');
  };

  // Synchronize effective Brand and Model
  const handleBrandSelect = (brandVal: string) => {
    setSelectedBrand(brandVal);
    if (brandVal === 'Other') {
      const activeBrand = customBrand.trim();
      setMotorBrand(activeBrand);
      setSelectedModel('Other');
      setMotorModel(customModel.trim());
    } else {
      setMotorBrand(brandVal);
      const availableBrands = getAvailableBrandsForCategory(vehicleCategory);
      const found = availableBrands.find((b) => b.brand === brandVal);
      if (found && found.models.length > 0) {
        setSelectedModel(found.models[0]);
        setMotorModel(found.models[0]);
      } else {
        setSelectedModel('Other');
        setMotorModel(customModel.trim());
      }
    }
    if (motorBrandError) setMotorBrandError('');
  };

  const handleCustomBrandChange = (text: string) => {
    setCustomBrand(text);
    setMotorBrand(text);
    if (text.trim()) setMotorBrandError('');
  };

  const handleModelSelect = (modelVal: string) => {
    setSelectedModel(modelVal);
    if (modelVal === 'Other') {
      setMotorModel(customModel.trim());
    } else {
      setMotorModel(modelVal);
    }
    if (motorModelError) setMotorModelError('');
  };

  const handleCustomModelChange = (text: string) => {
    setCustomModel(text);
    setMotorModel(text);
    if (text.trim()) setMotorModelError('');
  };

  // Synchronize 3-part plate number
  const updateCombinedPlate = (r = plateRegion, c = plateCode, d = plateDigits, cat = vehicleCategory) => {
    if (cat === 'electric') {
      setPlateNumber('Electric');
    } else {
      const trimmedDigits = d.trim();
      const combined = trimmedDigits ? `${r} ${c} ${trimmedDigits}` : '';
      setPlateNumber(combined);
    }
  };

  // Automatically autofill plate number for electric vehicles and make it read-only
  React.useEffect(() => {
    if (vehicleCategory === 'electric') {
      setPlateNumber('Electric');
    } else {
      updateCombinedPlate(plateRegion, plateCode, plateDigits, vehicleCategory);
    }
  }, [vehicleCategory, plateRegion, plateCode, plateDigits]);

  // Step 4 Confirmation Agreement State
  const [isDataConfirmed, setIsDataConfirmed] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Form Field Validation Errors
  const [firstNameError, setFirstNameError] = useState('');
  const [fatherNameError, setFatherNameError] = useState('');
  const [grandFatherNameError, setGrandFatherNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [motorBrandError, setMotorBrandError] = useState('');
  const [motorModelError, setMotorModelError] = useState('');
  const [plateNumberError, setPlateNumberError] = useState('');
  const [engineOrSerialNoError, setEngineOrSerialNoError] = useState('');

  const handleFirstNameChange = (val: string) => {
    // Strictly allow Amharic characters only and no space
    const amharicOnly = val.replace(/[^\u1200-\u137F]/g, '');
    setFirstName(amharicOnly);
    const updatedFullName = [amharicOnly, fatherName, grandFatherName].filter(Boolean).join(' ');
    setFullName(updatedFullName);
    if (amharicOnly) {
      const res = validateSingleName(amharicOnly, isAmharic ? 'የመጀመሪያ ስም' : 'First Name', isAmharic);
      setFirstNameError(res.isValid ? '' : res.message);
    } else {
      setFirstNameError(isAmharic ? 'እባክዎ የመጀመሪያ ስም በአማርኛ ያስገቡ!' : 'Please enter First Name in Amharic!');
    }
    if (validationError) setValidationError('');
  };

  const handleFatherNameChange = (val: string) => {
    // Strictly allow Amharic characters only and no space
    const amharicOnly = val.replace(/[^\u1200-\u137F]/g, '');
    setFatherName(amharicOnly);
    const updatedFullName = [firstName, amharicOnly, grandFatherName].filter(Boolean).join(' ');
    setFullName(updatedFullName);
    if (amharicOnly) {
      const res = validateSingleName(amharicOnly, isAmharic ? 'የአባት ስም' : "Father's Name", isAmharic);
      setFatherNameError(res.isValid ? '' : res.message);
    } else {
      setFatherNameError(isAmharic ? 'እባክዎ የአባት ስም በአማርኛ ያስገቡ!' : "Please enter Father's Name in Amharic!");
    }
    if (validationError) setValidationError('');
  };

  const handleGrandFatherNameChange = (val: string) => {
    // Strictly allow Amharic characters only and no space
    const amharicOnly = val.replace(/[^\u1200-\u137F]/g, '');
    setGrandFatherName(amharicOnly);
    const updatedFullName = [firstName, fatherName, amharicOnly].filter(Boolean).join(' ');
    setFullName(updatedFullName);
    if (amharicOnly) {
      const res = validateSingleName(amharicOnly, isAmharic ? 'የአያት ስም' : "Grandfather's Name", isAmharic);
      setGrandFatherNameError(res.isValid ? '' : res.message);
    } else {
      setGrandFatherNameError(isAmharic ? 'እባክዎ የአያት ስም በአማርኛ ያስገቡ!' : "Please enter Grandfather's Name in Amharic!");
    }
    if (validationError) setValidationError('');
  };

  // Phone Validation: Validation message is displayed AFTER all 9 required digits are typed, or on blur/submit
  const handlePhoneSuffixChange = (val: string) => {
    let cleaned = val.replace(/\D/g, '');
    if (cleaned.startsWith('251') && cleaned.length > 3) {
      cleaned = cleaned.slice(3);
    } else if (cleaned.startsWith('0') && cleaned.length > 1) {
      cleaned = cleaned.slice(1);
    }

    if (cleaned.length <= 9) {
      setPhoneSuffix(cleaned);
      const fullPhone = cleaned ? `+251${cleaned}` : '';
      setPhone(fullPhone);

      // Only evaluate error when full 9 digits are reached
      if (cleaned.length === 9) {
        const phoneVal = validatePhone(fullPhone, isAmharic);
        if (!phoneVal.isValid) {
          setPhoneError(phoneVal.message);
        } else {
          setPhoneError('');
        }
      } else {
        // While typing incomplete digits, do not display error
        if (phoneError) setPhoneError('');
      }
      if (validationError) setValidationError('');
    }
  };

  const handlePhoneBlur = () => {
    if (phoneSuffix.length > 0 && phoneSuffix.length < 9) {
      setPhoneError(isAmharic ? 'ስልክ ቁጥር 9 አሃዞች መሆን አለበት!' : 'Phone number must be 9 digits!');
    } else if (phoneSuffix.length === 9) {
      const phoneVal = validatePhone(phone, isAmharic);
      if (!phoneVal.isValid) setPhoneError(phoneVal.message);
      else setPhoneError('');
    }
  };

  // Validate Step 1 (Owner Details)
  const validateStep1 = (): boolean => {
    setFirstNameError('');
    setFatherNameError('');
    setGrandFatherNameError('');
    setPhoneError('');
    setValidationError('');

    let hasErrors = false;

    const fnVal = validateSingleName(firstName, isAmharic ? 'የመጀመሪያ ስም' : 'First Name', isAmharic);
    if (!fnVal.isValid) {
      setFirstNameError(fnVal.message);
      hasErrors = true;
    }

    const fatVal = validateSingleName(fatherName, isAmharic ? 'የአባት ስም' : "Father's Name", isAmharic);
    if (!fatVal.isValid) {
      setFatherNameError(fatVal.message);
      hasErrors = true;
    }

    const gfVal = validateSingleName(grandFatherName, isAmharic ? 'የአያት ስም' : "Grandfather's Name", isAmharic);
    if (!gfVal.isValid) {
      setGrandFatherNameError(gfVal.message);
      hasErrors = true;
    }

    const phoneVal = validatePhone(phone, isAmharic);
    if (!phoneVal.isValid) {
      setPhoneError(phoneVal.message);
      hasErrors = true;
    }

    // Duplicate check: Full Name and Phone Number must not be registered more than once
    if (!hasErrors) {
      const constructedFullName = [firstName.trim(), fatherName.trim(), grandFatherName.trim()].filter(Boolean).join(' ');
      const dupCheck = checkDuplicateRegistration(constructedFullName, phone, registrations, undefined, isAmharic);
      if (dupCheck.hasDuplicate) {
        if (dupCheck.nameDuplicate) {
          setFirstNameError(isAmharic ? 'ይህ ባለቤት (ሙሉ ስም) ቀድሞ ተመዝግቧል!' : 'This owner (full name) is already registered!');
        }
        if (dupCheck.phoneDuplicate) {
          setPhoneError(isAmharic ? 'ይህ ስልክ ቁጥር ቀድሞ ተመዝግቧል!' : 'This phone number is already registered!');
        }
        setValidationError(dupCheck.message);
        hasErrors = true;
      }
    }

    if (hasErrors && !validationError) {
      setValidationError(
        isAmharic
          ? 'እባክዎ የመጀመሪያ ስም፣ የአባት ስም፣ የአያት ስም እና ስልክ ቁጥር በትክክል ያስገቡ!'
          : 'Please enter valid First Name, Father Name, Grandfather Name and Phone Number!'
      );
    }

    return !hasErrors;
  };

  // Validate Step 2 (Vehicle Details)
  const validateStep2 = (): boolean => {
    setMotorBrandError('');
    setMotorModelError('');
    setPlateNumberError('');
    setEngineOrSerialNoError('');
    setValidationError('');

    let hasErrors = false;

    const brandVal = validateRequiredText(motorBrand, isAmharic ? 'የሞተር ምርት' : 'Motor Brand', isAmharic, 2);
    if (!brandVal.isValid) {
      setMotorBrandError(brandVal.message);
      hasErrors = true;
    }

    const modelVal = validateRequiredText(motorModel, isAmharic ? 'የሞተር ሞዴል' : 'Motor Model', isAmharic, 1);
    if (!modelVal.isValid) {
      setMotorModelError(modelVal.message);
      hasErrors = true;
    }

    if (vehicleCategory !== 'electric') {
      const plateVal = validatePlateNumber(plateNumber, isAmharic);
      if (!plateVal.isValid) {
        setPlateNumberError(plateVal.message);
        hasErrors = true;
      }
    }

    if (hasErrors) {
      setValidationError(isAmharic ? 'እባክዎ የተሽከርካሪ መረጃዎችን በትክክል ያስገቡ!' : 'Please fill in valid Vehicle specifications!');
    }

    return !hasErrors;
  };

  // Validate Step 3 (Identity / Document Scans) with red visual warnings
  const validateStep3 = (): boolean => {
    setValidationError('');
    const errors: {
      portrait?: boolean;
      natIdFront?: boolean;
      natIdBack?: boolean;
      license?: boolean;
      libre?: boolean;
    } = {};

    if (!nationalIdPhoto) errors.natIdFront = true;
    if (!nationalIdBackPhoto) errors.natIdBack = true;
    if (!drivingPermitPhoto) errors.libre = true;

    setDocErrors(errors);

    if (errors.natIdFront || errors.natIdBack || errors.libre) {
      setValidationError(
        isAmharic
          ? 'እባክዎ የቀይ ማስጠንቀቂያ የተሰጣቸውን ያልተጫኑ ሰነዶች ያያይዙ!'
          : 'Please upload the missing required documents highlighted in red!'
      );
      return false;
    }
    return true;
  };

  // Validate Step 4 (Payment Details: Receipt Number, Amount Paid)
  const validateStep4 = (): boolean => {
    setReceiptNumberError('');
    setPaymentAmountError('');
    setReceiptScreenshotError(false);
    setValidationError('');

    let hasErrors = false;

    if (!receiptNumber.trim()) {
      setReceiptNumberError(isAmharic ? 'እባክዎ የደረሰኝ ቁጥር ያስገቡ!' : 'Please enter a valid receipt number!');
      hasErrors = true;
    }

    if (!paymentAmount.trim()) {
      setPaymentAmountError(isAmharic ? 'እባክዎ የተከፈለውን ገንዘብ መጠን ያስገቡ!' : 'Please enter the amount paid!');
      hasErrors = true;
    }

    if (hasErrors) {
      setValidationError(isAmharic ? 'እባክዎ የክፍያ መረጃውን በትክክል ያስገቡ!' : 'Please enter valid Payment details!');
    }

    return !hasErrors;
  };

  // Step transitions
  const handleGoToStep2 = () => {
    if (validateStep1()) {
      setValidationError('');
      setCurrentStep(2);
    }
  };

  const handleGoToStep3 = () => {
    if (validateStep2()) {
      setValidationError('');
      setCurrentStep(3);
    }
  };

  const handleGoToStep4 = () => {
    if (validateStep3()) {
      setValidationError('');
      setCurrentStep(4);
    }
  };

  const handleGoToStep5 = () => {
    if (validateStep4()) {
      setValidationError('');
      setCurrentStep(5);
    }
  };

  // Stepper Header Node Click Navigation
  const handleStepClick = (targetStep: 1 | 2 | 3 | 4 | 5) => {
    if (targetStep === currentStep) return;
    
    // Always permit going backwards to previous steps
    if (targetStep < currentStep) {
      setValidationError('');
      setCurrentStep(targetStep);
      return;
    }

    // When advancing forward, validate all preceding steps
    if (targetStep === 2) {
      if (validateStep1()) {
        setValidationError('');
        setCurrentStep(2);
      }
    } else if (targetStep === 3) {
      if (validateStep1() && validateStep2()) {
        setValidationError('');
        setCurrentStep(3);
      }
    } else if (targetStep === 4) {
      if (validateStep1() && validateStep2() && validateStep3()) {
        setValidationError('');
        setCurrentStep(4);
      }
    } else if (targetStep === 5) {
      if (validateStep1() && validateStep2() && validateStep3() && validateStep4()) {
        setValidationError('');
        setCurrentStep(5);
      }
    }
  };

  // Final Submission on Step 5 (Review & Confirm)
  const handleSubmitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep1()) {
      setCurrentStep(1);
      return;
    }
    if (!validateStep2()) {
      setCurrentStep(2);
      return;
    }
    if (!validateStep3()) {
      setCurrentStep(3);
      return;
    }
    if (!validateStep4()) {
      setCurrentStep(4);
      return;
    }
    if (!isDataConfirmed) {
      setValidationError(
        isAmharic
          ? 'እባክዎ የመረጃውን ትክክለኛነት ማረጋገጫ ሳጥን ይምረጡ!'
          : 'Please check the data correctness agreement before submitting!'
      );
      return;
    }

    const newId = `REG-2026-${Math.floor(100 + Math.random() * 900)}`;

    let newRegistration: MotorcycleRegistration = {
      id: newId,
      fullName: fullName.trim(),
      phone: phone.trim(),
      userPortraitPhoto,
      nationalIdPhoto,
      nationalIdBackPhoto,
      drivingLicensePhoto,
      drivingPermitPhoto,
      vehicleCategory,
      motorBrand: motorBrand.trim(),
      motorModel: motorModel.trim(),
      chassisNumber: chassisNumber.trim().toUpperCase(),
      engineOrSerialNo: engineOrSerialNo.trim(),
      plateNumber: plateNumber.trim().toUpperCase(),
      registrationDate: new Date().toISOString().split('T')[0],
      status: 'pending_approval',
      qrCodeData: `https://enforcement.gov.et/verify/${newId}`,
      registeredBy: userBadgeId || 'CLERK-001',
      subCity,
      bloodGroup,
      receiptNumber: receiptNumber.trim(),
      paymentAmount: paymentAmount.trim(),
      receiptScreenshot,
    };

    setIsSubmitting(true);
    setValidationError('');

    try {
      // Ensure all document photos (including receipt screenshot) are uploaded to Cloud Storage
      const [
        upPortrait,
        upNatIdFront,
        upNatIdBack,
        upLicense,
        upPermit,
        upReceipt,
      ] = await Promise.all([
        userPortraitPhoto ? uploadDocumentPhoto(userPortraitPhoto, 'permits/portraits') : Promise.resolve(''),
        nationalIdPhoto ? uploadDocumentPhoto(nationalIdPhoto, 'permits/national_ids') : Promise.resolve(''),
        nationalIdBackPhoto ? uploadDocumentPhoto(nationalIdBackPhoto, 'permits/national_ids') : Promise.resolve(''),
        drivingLicensePhoto ? uploadDocumentPhoto(drivingLicensePhoto, 'permits/licenses') : Promise.resolve(''),
        drivingPermitPhoto ? uploadDocumentPhoto(drivingPermitPhoto, 'permits/police_permits') : Promise.resolve(''),
        receiptScreenshot ? uploadDocumentPhoto(receiptScreenshot, 'permits/receipts') : Promise.resolve(''),
      ]);

      newRegistration = {
        ...newRegistration,
        userPortraitPhoto: upPortrait || userPortraitPhoto,
        nationalIdPhoto: upNatIdFront || nationalIdPhoto,
        nationalIdBackPhoto: upNatIdBack || nationalIdBackPhoto,
        drivingLicensePhoto: upLicense || drivingLicensePhoto,
        drivingPermitPhoto: upPermit || drivingPermitPhoto,
        receiptScreenshot: upReceipt || receiptScreenshot,
      };

      // Save payment receipt to DB
      const todayStr = new Date().toISOString().split('T')[0];
      const expDateStr = calculateOneMonthExpiration(todayStr);
      const newPaymentReceipt: PaymentReceipt = {
        id: `PAY-${Date.now().toString().slice(-6)}`,
        receiptNumber: receiptNumber.trim(),
        ownerRegistrationId: newId,
        ownerName: fullName.trim(),
        plateNumber: plateNumber.trim().toUpperCase() || undefined,
        phone: phone.trim() || undefined,
        paymentDate: todayStr,
        expirationDate: expDateStr,
        amount: paymentAmount.trim() ? `${paymentAmount.trim()} ETB` : undefined,
        receiptScreenshot: upReceipt || receiptScreenshot || undefined,
        enteredBy: userBadgeId || 'CLERK-001',
        createdAt: new Date().toISOString(),
      };
      try {
        await savePaymentReceiptToDb(newPaymentReceipt);
      } catch (pErr) {
        console.warn('Notice saving payment receipt record:', pErr);
      }

      const res = await onAddRegistration(newRegistration);
      setIsSubmitting(false);

      const isQuotaWarning = res?.isOfflineFallback && (res.error?.includes('Quota') || res.warning?.includes('Quota'));

      if ((res && res.success === false) || isQuotaWarning) {
        // Online database save was unsuccessful (or hit quota)! Show confirmation modal to store locally.
        setPendingReg(newRegistration);
        setOfflineErrorMsg(
          res?.error || res?.warning ||
            (isAmharic
              ? 'የኦንላይን ዳታቤዝ ግንኙነት ወይም የኮታ ገደብ አጋጥሟል።'
              : 'Online database save failed (Quota Exceeded).')
        );
        setShowOfflineConfirmModal(true);
      } else {
        // Successful save
        setLastSubmittedReg(newRegistration);
        setIsStoredLocally(!!(res && res.isOfflineFallback));
        setIsSubmittedSuccessfully(true);
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setPendingReg(newRegistration);
      setOfflineErrorMsg(
        err?.message ||
          (isAmharic
            ? 'የኦንላይን ዳታቤዝ ግንኙነት አልተሳካም።'
            : 'Online database connection error.')
      );
      setShowOfflineConfirmModal(true);
    }
  };

  // User confirmed "Store Locally" in the offline confirmation modal
  const handleConfirmLocalSave = async () => {
    if (!pendingReg) return;
    setIsSubmitting(true);
    try {
      await onAddRegistration(pendingReg, { forceLocalOnly: true });
      setShowOfflineConfirmModal(false);
      setLastSubmittedReg(pendingReg);
      setIsStoredLocally(true);
      setIsSubmittedSuccessfully(true);
    } catch (err) {
      console.error('Error storing locally:', err);
    } finally {
      setIsSubmitting(false);
      setPendingReg(null);
    }
  };

  // Reset form to register another vehicle ("Register New" button)
  const handleRegisterNew = () => {
    setIsSubmittedSuccessfully(false);
    setLastSubmittedReg(null);
    setIsStoredLocally(false);
    setCurrentStep(1);
    setFirstName('');
    setFatherName('');
    setGrandFatherName('');
    setFullName('');
    setFirstNameError('');
    setFatherNameError('');
    setGrandFatherNameError('');
    setPhone('');
    setPhoneSuffix('');

    // Reset vehicle to default electric state
    setVehicleCategory('electric');
    const evBrands = getAvailableBrandsForCategory('electric');
    const defaultEvBrand = evBrands[0] || { brand: 'Super Soco', models: ['TS Street Hunter'] };
    setSelectedBrand(defaultEvBrand.brand);
    setCustomBrand('');
    setSelectedModel(defaultEvBrand.models[0] || 'Other');
    setCustomModel('');
    setMotorBrand(defaultEvBrand.brand);
    setMotorModel(defaultEvBrand.models[0] || '');
    setMotorBrandError('');
    setMotorModelError('');

    setEngineOrSerialNo('N/A');
    setChassisNumber('');
    setPlateNumber('Electric');
    setPlateRegion('አማ');
    setPlateCode('2');
    setPlateDigits('');
    setPlateNumberError('');
    setSubCity('');
    setBloodGroup('');
    setUserPortraitPhoto('');
    setNationalIdPhoto('');
    setNationalIdBackPhoto('');
    setDrivingLicensePhoto('');
    setDrivingPermitPhoto('');
    setReceiptNumber('');
    setPaymentAmount('500');
    setReceiptScreenshot('');
    setReceiptNumberError('');
    setPaymentAmountError('');
    setReceiptScreenshotError(false);
    setDocErrors({});
    setIsDataConfirmed(false);
    setValidationError('');
  };

  // Stepper Items: 1st ባለቤት (Owner), 2nd ሞተር (Motor), 3rd ዶክመንት (Documents), 4th ክፍያ (Payment), 5th አረጋግጥ (Confirm)
  const STEP_ITEMS: { id: 1 | 2 | 3 | 4 | 5; label: string; subLabel: string }[] = [
    {
      id: 1,
      label: isAmharic ? 'ባለቤት' : 'Owner',
      subLabel: isAmharic ? 'የባለቤት መረጃ' : 'Owner Info'
    },
    {
      id: 2,
      label: isAmharic ? 'ሞተር' : 'Motor',
      subLabel: isAmharic ? 'የተሽከርካሪ መረጃ' : 'Vehicle Details'
    },
    {
      id: 3,
      label: isAmharic ? 'ዶክመንት' : 'Documents',
      subLabel: isAmharic ? 'የሰነድ ማያያዣ' : 'Attachment Scans'
    },
    {
      id: 4,
      label: isAmharic ? 'ክፍያ' : 'Payment',
      subLabel: isAmharic ? 'የክፍያ መረጃ' : 'Payment Details'
    },
    {
      id: 5,
      label: isAmharic ? 'አረጋግጥ' : 'Confirm',
      subLabel: isAmharic ? 'ማረጋገጫና ማጠቃለያ' : 'Review & Submit'
    },
  ];

  return (
    <div className="space-y-4">
      {/* OFFLINE / UNSUCCESSFUL ONLINE SAVE CONFIRMATION MODAL */}
      {showOfflineConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-surface border border-outline-variant rounded-lg max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 border-b border-outline-variant pb-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">cloud_off</span>
              </div>
              <div>
                <h4 className="font-bold text-sm text-on-surface">
                  {isAmharic ? 'የኦንላይን ዳታቤዝ ማስቀመጥ አልተሳካም' : 'Online Storage Unsuccessful'}
                </h4>
                <p className="hidden sm:block text-[11px] text-secondary">
                  {isAmharic ? 'የኮታ ወይም የመረብ ግንኙነት ችግር አጋጥሟል' : 'Cloud connection or quota limit encountered'}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs leading-relaxed text-secondary">
              <p>
                {isAmharic
                  ? 'ተሽከርካሪውን በኦንላይን ፋየርቤዝ ዳታቤዝ ላይ ማስቀመጥ አልተሳካም።'
                  : 'Saving the vehicle registration to the online cloud database was unsuccessful.'}
              </p>
              {offlineErrorMsg && (
                <div className="p-2.5 rounded-lg bg-surface-container border border-outline-variant text-[11px] font-mono text-amber-800 dark:text-amber-300">
                  {offlineErrorMsg}
                </div>
              )}
              <p className="font-bold text-on-surface pt-1">
                {isAmharic
                  ? 'መረጃው እንዳይጠፋ በብራውዘርዎ ሎካል ካሽ ውስጥ ማስቀመጥ ይፈልጋሉ?'
                  : 'Would you like to store this registration locally in browser cache so no data is lost?'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-outline-variant">
              <button
                type="button"
                onClick={() => setShowOfflineConfirmModal(false)}
                className="px-4 py-2 rounded-md text-xs font-bold text-secondary bg-surface-container hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                {isAmharic ? 'ሰርዝ / ድጋሚ ሞክር' : 'Cancel / Retry'}
              </button>
              <button
                type="button"
                onClick={handleConfirmLocalSave}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-md text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-sm transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">save</span>
                <span>
                  {isSubmitting
                    ? isAmharic
                      ? 'በማስቀመጥ ላይ...'
                      : 'Storing...'
                    : isAmharic
                    ? 'በሎካል ሴቭ አድርግ'
                    : 'Store Locally'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          REDESIGNED STEPPER HEADER (CLEAN / NO CARD CONTAINER BEHIND)
          ========================================================================= */}
      {!isSubmittedSuccessfully && (
        <div className="w-full py-1">
          <div className="relative flex items-center justify-between max-w-2xl mx-auto px-2 sm:px-10">
            
            {/* Horizontal Connecting Gray Line running across the step circles */}
            <div className="absolute left-6 right-6 sm:left-16 sm:right-16 top-3.5 sm:top-6 -translate-y-1/2 h-[2px] bg-slate-200 dark:bg-slate-700 z-0">
              {/* Active filled line portion */}
              <div 
                className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300 ease-in-out"
                style={{ width: `${((currentStep - 1) / (STEP_ITEMS.length - 1)) * 100}%` }}
              />
            </div>

            {/* 4 Step Nodes: 1 Verify, 2 Company, 3 Identity, 4 Portal */}
            {STEP_ITEMS.map((item) => {
              const isActive = currentStep === item.id;
              const isCompleted = currentStep > item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => handleStepClick(item.id)}
                  className="flex flex-col items-center relative z-10 cursor-pointer group select-none"
                  title={`${item.label} - ${item.subLabel}`}
                >
                  {/* Step Circle - Small & sleek on mobile, full size on desktop */}
                  <div
                    className={`w-7 h-7 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xs sm:text-base font-black transition-all duration-200 ${
                      isActive
                        ? 'bg-white dark:bg-slate-900 border-2 border-[#1E40AF] dark:border-blue-500 ring-2 sm:ring-[6px] ring-blue-100 dark:ring-blue-900/40 text-[#1E3A8A] dark:text-blue-400 shadow-xs sm:shadow-sm scale-105'
                        : isCompleted
                        ? 'bg-blue-600 border-2 border-blue-600 text-white shadow-2xs sm:shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 group-hover:border-slate-300 dark:group-hover:border-slate-600'
                    }`}
                  >
                    {isCompleted ? (
                      <span className="material-symbols-outlined text-[14px] sm:text-[20px] font-black">check</span>
                    ) : (
                      <span>{item.id}</span>
                    )}
                  </div>

                  {/* Step Label Underneath */}
                  <div className="mt-1 sm:mt-2.5 text-center flex flex-col items-center">
                    <span
                      className={`text-[10px] sm:text-sm tracking-tight transition-colors ${
                        isActive
                          ? 'font-black text-slate-900 dark:text-white'
                          : isCompleted
                          ? 'font-bold text-slate-800 dark:text-slate-200'
                          : 'font-semibold text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {item.label}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium hidden sm:block">
                      {item.subLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FORM BODY CONTAINER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 sm:p-6 shadow-xs space-y-4">
        
        {/* Smaller Form Header: የአዲስ ማመልከቻ ምዝገባ */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#0B1E48] dark:text-blue-400">
              app_registration
            </span>
            <h3 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200 tracking-tight">
              {isAmharic ? 'የአዲስ ማመልከቻ ምዝገባ' : 'New Application Registration'}
            </h3>
          </div>
        </div>

        {/* SUCCESS NOTIFICATION BANNER INSIDE FORM (Matching warning alert style) */}
        {isSubmittedSuccessfully && lastSubmittedReg && (
          <div className="bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-500 dark:border-emerald-600 rounded-md p-4 text-emerald-950 dark:text-emerald-100 shadow-sm space-y-3 animate-fadeIn">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <span className="material-symbols-outlined text-[24px]">check_circle</span>
                </div>
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base text-emerald-950 dark:text-emerald-100">
                    {isAmharic ? 'የሞተርሳይክል ምዝገባ በስኬት ተጠናቋል!' : 'Registration Successful!'}
                  </h4>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                    {isAmharic
                      ? `መለያ ቁጥር: ${lastSubmittedReg.id} | ባለቤት: ${lastSubmittedReg.fullName}`
                      : `ID: ${lastSubmittedReg.id} | Owner: ${lastSubmittedReg.fullName}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSubmittedSuccessfully(false)}
                className="text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 p-1 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 cursor-pointer"
                title={isAmharic ? 'ዝጋ' : 'Dismiss'}
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs pt-2 border-t border-emerald-200 dark:border-emerald-800/80">
              <span className="font-mono font-black bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-700 text-slate-900 dark:text-slate-100">
                {lastSubmittedReg.plateNumber}
              </span>
              <span className="bg-emerald-100 dark:bg-emerald-900/80 text-emerald-900 dark:text-emerald-200 px-2.5 py-1 rounded-lg text-[11px] font-bold">
                {lastSubmittedReg.vehicleCategory === 'electric' ? ' Electric (EV)' : ' Gasoline'}
              </span>
              {isStoredLocally ? (
                <span className="bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">cloud_off</span>
                  <span>{isAmharic ? 'በሎካል ካሽ ተቀምጧል' : 'Local Cache'}</span>
                </span>
              ) : (
                <span className="bg-emerald-200 dark:bg-emerald-800/90 text-emerald-950 dark:text-emerald-100 px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">cloud_done</span>
                  <span>{isAmharic ? 'በፋየርቤዝ ተቀምጧል' : 'Cloud Saved'}</span>
                </span>
              )}

              <div className="w-full sm:w-auto sm:ml-auto flex items-center gap-2 pt-1 sm:pt-0">
                <button
                  type="button"
                  onClick={handleRegisterNew}
                  className="w-full sm:w-auto bg-[#0B1E48] hover:bg-[#071330] text-white text-xs font-bold px-3.5 py-1.5 rounded-md flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">add_circle</span>
                  <span>{isAmharic ? 'አዲስ መዝግብ' : 'Register New'}</span>
                </button>
                {onViewRegistered && (
                  <button
                    type="button"
                    onClick={onViewRegistered}
                    className="w-full sm:w-auto bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-200 text-xs font-bold px-3 py-1.5 rounded-md flex items-center justify-center gap-1 cursor-pointer hover:bg-emerald-50 dark:hover:bg-slate-800 transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">table_view</span>
                    <span>{isAmharic ? 'የተመዘገበውን እይ' : 'View Registered'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Validation Warning Banner */}
        {validationError && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-2xs animate-fadeIn">
            <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-[20px]">warning</span>
            <span>{validationError}</span>
          </div>
        )}

        {/* FORM CONTENT 4-STEP WIZARD - Hidden when registration completed until "Register New" is clicked */}
        {!isSubmittedSuccessfully && (
          <form onSubmit={handleSubmitRegistration} className="space-y-5">
              
              {/* ================= STEP 1: VERIFY (OWNER DETAILS) ================= */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-[#0B1E48] text-white flex items-center justify-center text-xs font-bold">1</span>
                      <span>{isAmharic ? '1. ባለቤት' : 'Step 1: Owner Information'}</span>
                    </h4>
                    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">1 of 4</span>
                  </div>

                  {/* 3 Name Fields in Row with text on top - side by side on mobile & desktop */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
                    {/* First Name / የመጀመሪያ ስም */}
                    <div>
                      <label className="block text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 leading-tight">
                        {isAmharic ? 'የመጀመሪያ ስም' : 'First Name'} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={firstName}
                        placeholder={isAmharic ? 'ምሳሌ፡ ደረጀ' : 'e.g. ደረጀ'}
                        onKeyDown={(e) => {
                          if (e.key === ' ' || e.code === 'Space') e.preventDefault();
                        }}
                        onChange={(e) => handleFirstNameChange(e.target.value)}
                        className={`w-full bg-surface-container/70 dark:bg-slate-800 border rounded-lg p-2 sm:p-2.5 text-xs text-on-surface dark:text-white focus:outline-hidden focus:border-blue-500 ${
                          firstNameError ? 'border-red-500 ring-1 ring-red-500' : 'border-outline-variant dark:border-slate-700'
                        }`}
                      />
                      {firstNameError && (
                        <p className="text-[10px] text-red-600 dark:text-red-400 font-bold mt-1 flex items-start gap-1 leading-tight break-words">
                          <span className="material-symbols-outlined text-[12px] shrink-0 mt-0.5">error</span>
                          <span className="break-words leading-tight">{firstNameError}</span>
                        </p>
                      )}
                    </div>

                    {/* Father's Name / የአባት ስም */}
                    <div>
                      <label className="block text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 leading-tight">
                        {isAmharic ? 'የአባት ስም' : "Father's Name"} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={fatherName}
                        placeholder={isAmharic ? 'ምሳሌ፡ ከበደ' : 'e.g. ከበደ'}
                        onKeyDown={(e) => {
                          if (e.key === ' ' || e.code === 'Space') e.preventDefault();
                        }}
                        onChange={(e) => handleFatherNameChange(e.target.value)}
                        className={`w-full bg-surface-container/70 dark:bg-slate-800 border rounded-lg p-2 sm:p-2.5 text-xs text-on-surface dark:text-white focus:outline-hidden focus:border-blue-500 ${
                          fatherNameError ? 'border-red-500 ring-1 ring-red-500' : 'border-outline-variant dark:border-slate-700'
                        }`}
                      />
                      {fatherNameError && (
                        <p className="text-[10px] text-red-600 dark:text-red-400 font-bold mt-1 flex items-start gap-1 leading-tight break-words">
                          <span className="material-symbols-outlined text-[12px] shrink-0 mt-0.5">error</span>
                          <span className="break-words leading-tight">{fatherNameError}</span>
                        </p>
                      )}
                    </div>

                    {/* Grandfather's Name / የአያት ስም */}
                    <div>
                      <label className="block text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 leading-tight">
                        {isAmharic ? 'የአያት ስም' : "Grandfather's Name"} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={grandFatherName}
                        placeholder={isAmharic ? 'ምሳሌ፡ አለሙ' : 'e.g. አለሙ'}
                        onKeyDown={(e) => {
                          if (e.key === ' ' || e.code === 'Space') e.preventDefault();
                        }}
                        onChange={(e) => handleGrandFatherNameChange(e.target.value)}
                        className={`w-full bg-surface-container/70 dark:bg-slate-800 border rounded-lg p-2 sm:p-2.5 text-xs text-on-surface dark:text-white focus:outline-hidden focus:border-blue-500 ${
                          grandFatherNameError ? 'border-red-500 ring-1 ring-red-500' : 'border-outline-variant dark:border-slate-700'
                        }`}
                      />
                      {grandFatherNameError && (
                        <p className="text-[10px] text-red-600 dark:text-red-400 font-bold mt-1 flex items-start gap-1 leading-tight break-words">
                          <span className="material-symbols-outlined text-[12px] shrink-0 mt-0.5">error</span>
                          <span className="break-words leading-tight">{grandFatherNameError}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Phone, Sub-City, Blood Group in 3-column row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {/* Phone Number */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {isAmharic ? 'የስልክ ቁጥር' : 'Phone Number'} <span className="text-red-500">*</span>
                      </label>
                      <div
                        className={`flex items-center w-full bg-surface-container/70 dark:bg-slate-800 border rounded-md overflow-hidden focus-within:border-blue-500 transition-all ${
                          phoneError ? 'border-red-500 ring-1 ring-red-500' : 'border-outline-variant dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center px-3 py-2.5 bg-surface-container dark:bg-slate-700/50 border-r border-outline-variant dark:border-slate-700 select-none shrink-0">
                          <span className="text-xs font-bold font-mono text-on-surface dark:text-slate-300">
                            +251
                          </span>
                        </div>
                        <input
                          type="tel"
                          required
                          value={phoneSuffix}
                          onChange={(e) => handlePhoneSuffixChange(e.target.value)}
                          onBlur={handlePhoneBlur}
                          maxLength={9}
                          placeholder="9XXXXXXXX"
                          className="w-full bg-transparent px-3 py-2.5 text-xs font-mono font-bold text-on-surface dark:text-white border-0 border-none outline-none ring-0 focus:ring-0 focus:outline-none focus:border-none shadow-none"
                        />
                      </div>
                      {phoneError && (
                        <p className="text-[10px] text-red-600 font-bold mt-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">error</span>
                          <span>{phoneError}</span>
                        </p>
                      )}
                    </div>

                    {/* Sub-City */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {isAmharic ? 'ክፍለ ከተማ' : 'Sub-City (Bahir Dar)'} <span className="text-red-500">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <select
                          value={subCity}
                          onChange={(e) => setSubCity(e.target.value)}
                          className="w-full bg-surface-container/70 dark:bg-slate-800 border border-outline-variant dark:border-slate-700 rounded-lg p-2.5 pr-9 text-xs text-on-surface dark:text-white focus:outline-hidden focus:border-blue-500 cursor-pointer appearance-none"
                        >
                          <option value="">-- ምረጥ --</option>
                          {BAHIR_DAR_SUBCITIES.map((sc) => (
                            <option key={sc.en} value={sc.en}>
                              {isAmharic ? sc.am : sc.en}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-2.5 inset-y-0 flex items-center justify-center pointer-events-none text-slate-400 dark:text-slate-500">
                          <Icon name="keyboard_arrow_down" size={18} />
                        </div>
                      </div>
                    </div>

                    {/* Blood Group */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {isAmharic ? 'የደም ዓይነት' : 'Blood Group'} <span className="text-red-500">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <select
                          value={bloodGroup}
                          onChange={(e) => setBloodGroup(e.target.value)}
                          className="w-full bg-surface-container/70 dark:bg-slate-800 border border-outline-variant dark:border-slate-700 rounded-lg p-2.5 pr-9 text-xs text-on-surface dark:text-white focus:outline-hidden focus:border-blue-500 cursor-pointer font-bold text-red-600 dark:text-red-400 appearance-none"
                        >
                          <option value="">-- ምረጥ --</option>
                          {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((bg) => (
                            <option key={bg} value={bg}>
                              {bg}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-2.5 inset-y-0 flex items-center justify-center pointer-events-none text-slate-400 dark:text-slate-500">
                          <Icon name="keyboard_arrow_down" size={18} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 1 Action Button */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button
                      type="button"
                      onClick={handleGoToStep2}
                      className="bg-[#0B1E48] hover:bg-[#071330] active:scale-[0.99] text-white font-bold py-2.5 px-6 rounded-md text-xs flex items-center gap-2 shadow-md cursor-pointer transition-all"
                    >
                      <span>{isAmharic ? 'ቀጣይ፡ ሞተር' : 'Next: Motor Specifications'}</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ================= STEP 2: MOTOR / VEHICLE SPECIFICATIONS ================= */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-[#0B1E48] text-white flex items-center justify-center text-xs font-bold">2</span>
                      <span>{isAmharic ? '2. ሞተር' : 'Step 2: Motor Details'}</span>
                    </h4>
                    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">2 of 4</span>
                  </div>

                  {/* Motor Vehicle Category Selection */}
                  <div className="bg-surface-container/70 dark:bg-slate-800 p-3 rounded-lg border border-outline-variant dark:border-slate-700">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                      {isAmharic ? 'የሞተር ዓይነት እና ምድብ' : 'Motor Vehicle Category'} <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-wrap items-center gap-6">
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="radio"
                          name="vehicleCategoryStep2"
                          value="electric"
                          checked={vehicleCategory === 'electric'}
                          onChange={() => handleVehicleCategoryChange('electric')}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                        />
                        <span className={`text-xs ${vehicleCategory === 'electric' ? 'font-black text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`}>
                          {isAmharic ? ' ኢቪ ኤሌክትሪክ' : ' Electric (EV)'}
                        </span>
                      </label>

                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="radio"
                          name="vehicleCategoryStep2"
                          value="gas_under_110cc"
                          checked={vehicleCategory === 'gas_under_110cc'}
                          onChange={() => handleVehicleCategoryChange('gas_under_110cc')}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                        />
                        <span className={`text-xs ${vehicleCategory === 'gas_under_110cc' ? 'font-black text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                          {isAmharic ? ' ቤንዚን' : ' Gasoline (<110cc)'}
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Brand, Model, and Chassis Number */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Motor Brand Dropdown (Category-Filtered) + Custom input */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {isAmharic ? 'የሞተር ምርት' : 'Motor Brand'} <span className="text-red-500">*</span>
                      </label>
                      <div className="space-y-2">
                        <div className="relative flex items-center">
                          <select
                            value={selectedBrand}
                            onChange={(e) => handleBrandSelect(e.target.value)}
                            className="w-full bg-surface-container/70 dark:bg-slate-800 border border-outline-variant dark:border-slate-700 rounded-lg p-2.5 pr-9 text-xs text-on-surface dark:text-white focus:outline-hidden focus:border-blue-500 cursor-pointer appearance-none"
                          >
                            <option value="">ምረጥ</option>
                            {getAvailableBrandsForCategory(vehicleCategory).map((item) => (
                              <option key={item.brand} value={item.brand}>
                                {isAmharic ? item.am : item.brand}
                              </option>
                            ))}
                          </select>
                          <div className="absolute right-2.5 inset-y-0 flex items-center justify-center pointer-events-none text-slate-400 dark:text-slate-500">
                            <Icon name="keyboard_arrow_down" size={18} />
                          </div>
                        </div>

                        {selectedBrand === 'Other' && (
                          <input
                            type="text"
                            placeholder={isAmharic ? 'የሞተር ምርት እዚህ ይጻፉ...' : 'Enter custom brand...'}
                            value={customBrand}
                            onChange={(e) => handleCustomBrandChange(e.target.value)}
                            className={`w-full bg-surface-container/70 dark:bg-slate-800 border rounded-lg p-2 text-xs text-on-surface dark:text-white focus:outline-hidden focus:border-blue-500 ${
                              motorBrandError ? 'border-red-500 ring-1 ring-red-500' : 'border-outline-variant dark:border-slate-700'
                            }`}
                          />
                        )}
                      </div>
                      {motorBrandError && (
                        <p className="text-[10px] text-red-600 font-bold mt-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">error</span>
                          <span>{motorBrandError}</span>
                        </p>
                      )}
                    </div>

                    {/* Motor Model Dropdown (Filtered by Category & Brand) + Custom input */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {isAmharic ? 'የሞተር ሞዴል' : 'Motor Model'} <span className="text-red-500">*</span>
                      </label>
                      <div className="space-y-2">
                        {(() => {
                          const availableBrands = getAvailableBrandsForCategory(vehicleCategory);
                          const currentBrandObj = availableBrands.find((b) => b.brand === selectedBrand);
                          const availableModels = currentBrandObj ? currentBrandObj.models : [];

                          return (
                            <>
                              <div className="relative flex items-center">
                                <select
                                  value={selectedModel}
                                  onChange={(e) => handleModelSelect(e.target.value)}
                                  className="w-full bg-surface-container/70 dark:bg-slate-800 border border-outline-variant dark:border-slate-700 rounded-lg p-2.5 pr-9 text-xs text-on-surface dark:text-white focus:outline-hidden focus:border-blue-500 cursor-pointer appearance-none"
                                >
                                  <option value="">ምረጥ</option>
                                  {availableModels.map((m) => (
                                    <option key={m} value={m}>
                                      {m}
                                    </option>
                                  ))}
                                  <option value="Other">{isAmharic ? 'ሌላ' : 'Other'}</option>
                                </select>
                                <div className="absolute right-2.5 inset-y-0 flex items-center justify-center pointer-events-none text-slate-400 dark:text-slate-500">
                                  <Icon name="keyboard_arrow_down" size={18} />
                                </div>
                              </div>

                              {selectedModel === 'Other' && (
                                <input
                                  type="text"
                                  placeholder={isAmharic ? 'ሞዴል እዚህ ይጻፉ...' : 'Enter custom model...'}
                                  value={customModel}
                                  onChange={(e) => handleCustomModelChange(e.target.value)}
                                  className={`w-full bg-surface-container/70 dark:bg-slate-800 border rounded-lg p-2 text-xs text-on-surface dark:text-white focus:outline-hidden focus:border-blue-500 ${
                                    motorModelError ? 'border-red-500 ring-1 ring-red-500' : 'border-outline-variant dark:border-slate-700'
                                  }`}
                                />
                              )}
                            </>
                          );
                        })()}
                      </div>
                      {motorModelError && (
                        <p className="text-[10px] text-red-600 font-bold mt-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">error</span>
                          <span>{motorModelError}</span>
                        </p>
                      )}
                    </div>

                    {/* Chassis Number / የሻንሺ ቁጥር */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {isAmharic ? 'የሻንሺ ቁጥር' : 'Chassis Number'}
                      </label>
                      <input
                        type="text"
                        placeholder={isAmharic ? 'የሻንሺ ቁጥር ያስገቡ...' : 'CHS-123456789'}
                        value={chassisNumber}
                        onChange={(e) => setChassisNumber(e.target.value.toUpperCase())}
                        className="w-full bg-surface-container/70 dark:bg-slate-800 border border-outline-variant dark:border-slate-700 rounded-lg p-2.5 text-xs font-mono font-bold text-on-surface dark:text-white uppercase focus:outline-hidden focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Split Plate Number into 3 Fields: ክልል, ኮድ, ቁጥር (Using Full Name design style) */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      {isAmharic ? 'የሰሌዳ ቁጥር' : 'Plate Number'} <span className="text-red-500">*</span>
                    </label>

                    {vehicleCategory === 'electric' ? (
                      <div className="p-3 bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-md flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[20px]">bolt</span>
                          <span className="text-xs font-bold font-mono text-blue-900 dark:text-blue-200">
                            {plateNumber || 'Electric'}
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/60 px-2.5 py-0.5 rounded-full">
                          {isAmharic ? 'ኢቪ በራስ-ሰር ተሞልቷል' : 'EV Auto-assigned'}
                        </span>
                      </div>
                    ) : (
                      <div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
                          {/* 1st Field: ክልል (Region) */}
                          <div>
                            <label className="block text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 leading-tight">
                              {isAmharic ? 'ክልል' : 'Region'} <span className="text-red-500">*</span>
                            </label>
                            <div className="relative flex items-center">
                              <select
                                value={plateRegion}
                                onChange={(e) => {
                                  setPlateRegion(e.target.value);
                                  updateCombinedPlate(e.target.value, plateCode, plateDigits);
                                }}
                                className="w-full bg-surface-container/70 dark:bg-slate-800 border border-outline-variant dark:border-slate-700 rounded-lg p-2 sm:p-2.5 pr-8 text-xs font-bold text-on-surface dark:text-white focus:outline-hidden focus:border-blue-500 cursor-pointer appearance-none"
                              >
                                <option value="">ምረጥ</option>
                                {ETHIOPIAN_PLATE_REGIONS.map((r) => (
                                  <option key={r.code} value={r.code}>
                                    {r.label}
                                  </option>
                                ))}
                              </select>
                              <div className="absolute right-2 inset-y-0 flex items-center justify-center pointer-events-none text-slate-400 dark:text-slate-500">
                                <Icon name="keyboard_arrow_down" size={16} />
                              </div>
                            </div>
                          </div>

                          {/* 2nd Field: ኮድ (Code - Motorcycle Categories in Ethiopia) */}
                          <div>
                            <label className="block text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 leading-tight">
                              {isAmharic ? 'ኮድ' : 'Code'} <span className="text-red-500">*</span>
                            </label>
                            <div className="relative flex items-center">
                              <select
                                value={plateCode}
                                onChange={(e) => {
                                  setPlateCode(e.target.value);
                                  updateCombinedPlate(plateRegion, e.target.value, plateDigits);
                                }}
                                className="w-full bg-surface-container/70 dark:bg-slate-800 border border-outline-variant dark:border-slate-700 rounded-lg p-2 sm:p-2.5 pr-8 text-xs font-bold text-on-surface dark:text-white focus:outline-hidden focus:border-blue-500 cursor-pointer appearance-none"
                              >
                                <option value="">ምረጥ</option>
                                {ETHIOPIAN_PLATE_CODES.map((c) => (
                                  <option key={c.code} value={c.code}>
                                    {c.label}
                                  </option>
                                ))}
                              </select>
                              <div className="absolute right-2 inset-y-0 flex items-center justify-center pointer-events-none text-slate-400 dark:text-slate-500">
                                <Icon name="keyboard_arrow_down" size={16} />
                              </div>
                            </div>
                          </div>

                          {/* 3rd Field: ቁጥር (Serial Number Digits) */}
                          <div>
                            <label className="block text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 leading-tight">
                              {isAmharic ? 'ቁጥር' : 'Number'} <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="12345"
                              value={plateDigits}
                              onChange={(e) => {
                                const val = e.target.value.toUpperCase();
                                setPlateDigits(val);
                                updateCombinedPlate(plateRegion, plateCode, val);
                                if (plateNumberError) setPlateNumberError('');
                              }}
                              className={`w-full bg-surface-container/70 dark:bg-slate-800 border rounded-md p-2 sm:p-2.5 text-xs font-mono font-bold text-on-surface dark:text-white uppercase focus:outline-hidden focus:border-blue-500 ${
                                plateNumberError ? 'border-red-500 ring-1 ring-red-500' : 'border-outline-variant dark:border-slate-700'
                              }`}
                            />
                          </div>
                        </div>

                        {/* Combined Preview Badge */}
                        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                          <span>
                            {isAmharic ? 'የሰሌዳ ማጠቃለያ፡' : 'Combined Plate:'}{' '}
                            <strong className="font-mono text-slate-900 dark:text-slate-100">
                              {plateNumber || `${plateRegion} ${plateCode} ...`}
                            </strong>
                          </span>
                        </div>

                        {plateNumberError && (
                          <p className="text-[10px] text-red-600 font-bold mt-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">error</span>
                            <span>{plateNumberError}</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Step 2 Action Buttons */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-2.5 px-4 rounded-md text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                      <span>{isAmharic ? 'ተመለስ፡ ባለቤት' : 'Back: Owner'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleGoToStep3}
                      className="bg-[#0B1E48] hover:bg-[#071330] active:scale-[0.99] text-white font-bold py-2.5 px-6 rounded-md text-xs flex items-center gap-2 shadow-md cursor-pointer transition-all"
                    >
                      <span>{isAmharic ? 'ቀጣይ፡ ዶክመንት' : 'Next: Documents'}</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ================= STEP 3: DOCUMENTS & ATTACHMENTS ================= */}
              {currentStep === 3 && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-[#0B1E48] text-white flex items-center justify-center text-xs font-bold">3</span>
                      <span>{isAmharic ? '3. ዶክመንት' : 'Step 3: Document Uploads'}</span>
                    </h4>
                    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">3 of 5</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* User Passport Photo */}
                    <DocumentUploadInput
                      label={isAmharic ? '1. ጉርድ ፎቶ' : '1. Passport Photo'}
                      photoUrl={userPortraitPhoto}
                      onPhotoChange={(val) => {
                        setUserPortraitPhoto(val);
                        if (docErrors.portrait) setDocErrors((prev) => ({ ...prev, portrait: false }));
                      }}
                      hasError={docErrors.portrait}
                      isAmharic={isAmharic}
                      id="multistep-portrait"
                    />

                    {/* National ID Front & Back side-by-side */}
                    <div className="sm:col-span-2 grid grid-cols-2 gap-3 border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-slate-50/50 dark:bg-slate-800/40">
                      <DocumentUploadInput
                        label={isAmharic ? '2. ብሔራዊ መታወቂያ (ፊት)' : '2. National ID (Front)'}
                        photoUrl={nationalIdPhoto}
                        onPhotoChange={(val) => {
                          setNationalIdPhoto(val);
                          if (docErrors.natIdFront) setDocErrors((prev) => ({ ...prev, natIdFront: false }));
                        }}
                        hasError={docErrors.natIdFront}
                        isAmharic={isAmharic}
                        id="multistep-natid-front"
                      />
                      <DocumentUploadInput
                        label={isAmharic ? '3. ብሔራዊ መታወቂያ (ጀርባ)' : '3. National ID (Back)'}
                        photoUrl={nationalIdBackPhoto}
                        onPhotoChange={(val) => {
                          setNationalIdBackPhoto(val);
                          if (docErrors.natIdBack) setDocErrors((prev) => ({ ...prev, natIdBack: false }));
                        }}
                        hasError={docErrors.natIdBack}
                        isAmharic={isAmharic}
                        id="multistep-natid-back"
                      />
                    </div>

                    {/* Driving License Scan */}
                    <DocumentUploadInput
                      label={isAmharic ? '4. መንጃ ፈቃድ' : '4. Driving License'}
                      photoUrl={drivingLicensePhoto}
                      onPhotoChange={(val) => {
                        setDrivingLicensePhoto(val);
                        if (docErrors.license) setDocErrors((prev) => ({ ...prev, license: false }));
                      }}
                      hasError={docErrors.license}
                      isAmharic={isAmharic}
                      id="multistep-license"
                    />

                    {/* Police Permit Scan (Libre) */}
                    <DocumentUploadInput
                      label={isAmharic ? '5. የፖሊስ ፈቃድ' : '5. Police Permit'}
                      photoUrl={drivingPermitPhoto}
                      onPhotoChange={(val) => {
                        setDrivingPermitPhoto(val);
                        if (docErrors.libre) setDocErrors((prev) => ({ ...prev, libre: false }));
                      }}
                      hasError={docErrors.libre}
                      isAmharic={isAmharic}
                      id="multistep-libre"
                    />
                  </div>

                  {/* Step 3 Action Buttons */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-2.5 px-4 rounded-md text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                      <span>{isAmharic ? 'ተመለስ፡ ሞተር' : 'Back: Motor'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleGoToStep4}
                      className="bg-[#0B1E48] hover:bg-[#071330] active:scale-[0.99] text-white font-bold py-2.5 px-6 rounded-md text-xs flex items-center gap-2 shadow-md cursor-pointer transition-all"
                    >
                      <span>{isAmharic ? 'ቀጣይ፡ ክፍያ' : 'Next: Payment'}</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ================= STEP 4: PAYMENT DETAILS ================= */}
              {currentStep === 4 && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-[#0B1E48] text-white flex items-center justify-center text-xs font-bold">4</span>
                      <span>{isAmharic ? '4. የክፍያ መረጃ (Payment)' : 'Step 4: Payment Details'}</span>
                    </h4>
                    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">4 of 5</span>
                  </div>

                  <SectionCard className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[20px]">payments</span>
                      <span className="text-xs font-black text-slate-900 dark:text-white">
                        {isAmharic ? 'የክፍያ ደረሰኝ መረጃ:' : 'Payment Receipt Information:'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Receipt Number */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {isAmharic ? 'የደረሰኝ ቁጥር *' : 'Receipt Number *'}
                        </label>
                        <input
                          type="text"
                          value={receiptNumber}
                          onChange={(e) => {
                            setReceiptNumber(e.target.value);
                            if (e.target.value.trim()) setReceiptNumberError('');
                            if (validationError) setValidationError('');
                          }}
                          placeholder={isAmharic ? 'ምሳሌ፡ RC-948201' : 'e.g. RC-948201'}
                          className={`w-full bg-slate-50 dark:bg-slate-900/50 border rounded-md px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${
                            receiptNumberError
                              ? 'border-red-500 focus:ring-red-200'
                              : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500'
                          }`}
                        />
                        {receiptNumberError && (
                          <p className="text-[11px] text-red-500 mt-1 font-bold">{receiptNumberError}</p>
                        )}
                      </div>

                      {/* Amount Paid */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {isAmharic ? 'የተከፈለ ገንዘብ (ETB) *' : 'Amount Paid (ETB) *'}
                        </label>
                        <input
                          type="number"
                          value={paymentAmount}
                          onChange={(e) => {
                            setPaymentAmount(e.target.value);
                            if (e.target.value.trim()) setPaymentAmountError('');
                            if (validationError) setValidationError('');
                          }}
                          placeholder="500"
                          className={`w-full bg-slate-50 dark:bg-slate-900/50 border rounded-md px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${
                            paymentAmountError
                              ? 'border-red-500 focus:ring-red-200'
                              : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500'
                          }`}
                        />
                        {paymentAmountError && (
                          <p className="text-[11px] text-red-500 mt-1 font-bold">{paymentAmountError}</p>
                        )}
                      </div>
                    </div>

                    {/* Payment Receipt Screenshot */}
                    <div className="pt-2">
                      <DocumentUploadInput
                        label={isAmharic ? 'የክፍያ ደረሰኝ ስክሪንሾት' : 'Payment Receipt Screenshot'}
                        photoUrl={receiptScreenshot}
                        onPhotoChange={(val) => {
                          setReceiptScreenshot(val);
                          if (receiptScreenshotError) setReceiptScreenshotError(false);
                        }}
                        hasError={receiptScreenshotError}
                        isAmharic={isAmharic}
                        id="multistep-receipt-ss"
                      />
                    </div>
                  </SectionCard>

                  {/* Step 4 Action Buttons */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-2.5 px-4 rounded-md text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                      <span>{isAmharic ? 'ተመለስ፡ ዶክመንት' : 'Back: Documents'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleGoToStep5}
                      className="bg-[#0B1E48] hover:bg-[#071330] active:scale-[0.99] text-white font-bold py-2.5 px-6 rounded-md text-xs flex items-center gap-2 shadow-md cursor-pointer transition-all"
                    >
                      <span>{isAmharic ? 'ቀጣይ፡ አረጋግጥ' : 'Next: Review & Confirm'}</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ================= STEP 5: CONFIRM & SUBMIT ================= */}
              {currentStep === 5 && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-[#0B1E48] text-white flex items-center justify-center text-xs font-bold">5</span>
                      <span>{isAmharic ? '5. አረጋግጥ' : 'Step 5: Review & Confirmation'}</span>
                    </h4>
                    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">5 of 5</span>
                  </div>

                  {/* Summary Review Card */}
                  <SectionCard className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="text-xs font-black text-slate-900 dark:text-white">
                        {isAmharic ? 'የተሞላው መረጃ ማጠቃለያ:' : 'Summary of Registration Details:'}
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setCurrentStep(1)}
                          className="text-blue-600 dark:text-blue-400 hover:underline text-[11px] font-bold"
                        >
                          {isAmharic ? 'ባለቤት አርትዕ' : 'Edit Owner'}
                        </button>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <button
                          type="button"
                          onClick={() => setCurrentStep(2)}
                          className="text-blue-600 dark:text-blue-400 hover:underline text-[11px] font-bold"
                        >
                          {isAmharic ? 'ሞተር አርትዕ' : 'Edit Motor'}
                        </button>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <button
                          type="button"
                          onClick={() => setCurrentStep(3)}
                          className="text-blue-600 dark:text-blue-400 hover:underline text-[11px] font-bold"
                        >
                          {isAmharic ? 'ዶክመንት አርትዕ' : 'Edit Documents'}
                        </button>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <button
                          type="button"
                          onClick={() => setCurrentStep(4)}
                          className="text-blue-600 dark:text-blue-400 hover:underline text-[11px] font-bold"
                        >
                          {isAmharic ? 'ክፍያ አርትዕ' : 'Edit Payment'}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      <DataField label={isAmharic ? 'የባለቤት ስም:' : 'Owner Name:'} value={fullName || '-'} />
                      <DataField label={isAmharic ? 'ስልክ ቁጥር:' : 'Phone:'} value={phone || '-'} isMono />
                      <DataField label={isAmharic ? 'ክፍለ ከተማ:' : 'Sub-City:'} value={subCity} isPrimary />
                      <DataField label={isAmharic ? 'የደም ዓይነት:' : 'Blood Group:'} value={bloodGroup} />
                      <DataField label={isAmharic ? 'የሞተር ዓይነት:' : 'Category:'} value={vehicleCategory === 'electric' ? (isAmharic ? 'ኤሌክትሪክ' : 'Electric (EV)') : (isAmharic ? 'ቤንዚን' : 'Gasoline')} isPrimary />
                      <DataField label={isAmharic ? 'የሞተር ምርት/ሞዴል:' : 'Brand/Model:'} value={`${motorBrand || '-'} ${motorModel}`} />
                      <DataField label={isAmharic ? 'የሰሌዳ ቁጥር:' : 'Plate No:'} value={plateNumber || 'Electric'} isMono isPrimary />
                      <DataField label={isAmharic ? 'የደረሰኝ ቁጥር:' : 'Receipt No:'} value={receiptNumber || '-'} isMono isPrimary />
                      <DataField label={isAmharic ? 'የተከፈለ ገንዘብ:' : 'Amount Paid:'} value={paymentAmount ? `${paymentAmount} ETB` : '-'} />
                    </div>

                    {/* Uploaded Documents Thumbnails */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] block mb-2 font-bold">
                        {isAmharic ? 'የተያያዙ ሰነዶች:' : 'Attached Documents:'}
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-[11px]">
                        <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-md border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                          {userPortraitPhoto ? (
                            <img src={userPortraitPhoto} alt="Portrait" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                          ) : (
                            <span className="material-symbols-outlined text-slate-400 text-[20px] shrink-0">person</span>
                          )}
                          <span className="font-bold text-slate-700 dark:text-slate-300 leading-tight break-words">{isAmharic ? 'ጉርድ ፎቶ' : 'Passport Photo'}</span>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-md border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                          {nationalIdPhoto ? (
                            <img src={nationalIdPhoto} alt="ID Front" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                          ) : (
                            <span className="material-symbols-outlined text-slate-400 text-[20px] shrink-0">badge</span>
                          )}
                          <span className="font-bold text-slate-700 dark:text-slate-300 leading-tight break-words">{isAmharic ? 'መታወቂያ (ፊት)' : 'ID Front'}</span>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-md border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                          {nationalIdBackPhoto ? (
                            <img src={nationalIdBackPhoto} alt="ID Back" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                          ) : (
                            <span className="material-symbols-outlined text-slate-400 text-[20px] shrink-0">badge</span>
                          )}
                          <span className="font-bold text-slate-700 dark:text-slate-300 leading-tight break-words">{isAmharic ? 'መታወቂያ (ጀርባ)' : 'ID Back'}</span>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-md border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                          {drivingLicensePhoto ? (
                            <img src={drivingLicensePhoto} alt="License" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                          ) : (
                            <span className="material-symbols-outlined text-slate-400 text-[20px] shrink-0">card_membership</span>
                          )}
                          <span className="font-bold text-slate-700 dark:text-slate-300 leading-tight break-words">{isAmharic ? 'መንጃ ፈቃድ' : 'License'}</span>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-md border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                          {drivingPermitPhoto ? (
                            <img src={drivingPermitPhoto} alt="Police Permit" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                          ) : (
                            <span className="material-symbols-outlined text-slate-400 text-[20px] shrink-0">menu_book</span>
                          )}
                          <span className="font-bold text-blue-600 dark:text-blue-400 leading-tight break-words">{isAmharic ? 'የፖሊስ ፈቃድ' : 'Permit'}</span>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-md border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                          {receiptScreenshot ? (
                            <img src={receiptScreenshot} alt="Receipt Screenshot" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                          ) : (
                            <span className="material-symbols-outlined text-slate-400 text-[20px] shrink-0">payments</span>
                          )}
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 leading-tight break-words">{isAmharic ? 'የክፍያ ደረሰኝ' : 'Receipt'}</span>
                        </div>
                      </div>
                    </div>
                  </SectionCard>

                  {/* MANDATORY CONFIRMATION AGREEMENT CHECKBOX */}
                  <div className="bg-amber-50/70 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 p-3.5 rounded-lg space-y-2">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isDataConfirmed}
                        onChange={(e) => {
                          setIsDataConfirmed(e.target.checked);
                          if (e.target.checked && validationError) setValidationError('');
                        }}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 accent-blue-600 mt-0.5 cursor-pointer"
                      />
                      <div className="space-y-1">
                        <span className="text-xs font-extrabold text-amber-950 dark:text-amber-200 block">
                          {isAmharic
                            ? 'የመረጃ እና የሰነድ ትክክለኛነት ማረጋገጫ ውል *'
                            : 'Data Correctness & Legal Validity Agreement *'}
                        </span>
                        <p className="text-[11px] text-amber-900 dark:text-amber-300 leading-relaxed">
                          {isAmharic
                            ? 'እኔ ከላይ ስሜ የተጠቀሰው መዝጋቢ/ባለቤት፣ ያስገባሁት መረጃ እና ያያያዝኩት የፖሊስ ፈቃድና የክፍያ ደረሰኝ ሰነድ ሙሉ በሙሉ እውነተኛና ህጋዊ መሆኑን አረጋግጣለሁ። ሐሰተኛ መረጃ ወይም የተጭበረበረ ሰነድ ማቅረብ በህግ ያስጠይቃል።'
                            : 'I hereby confirm that all entered details and attached Police Permit & Payment Receipt documents are accurate, genuine, and legally valid. Providing false information or forged documentation is strictly punishable by law.'}
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Step 5 Action buttons */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(4)}
                      className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-2.5 px-4 rounded-md text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                      <span>{isAmharic ? 'ተመለስ፡ ክፍያ' : 'Back: Payment'}</span>
                    </button>

                    <button
                      type="submit"
                      disabled={!isDataConfirmed || isSubmitting}
                      className={`py-3 px-7 rounded-md font-black text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer ${
                        isDataConfirmed && !isSubmitting
                          ? 'bg-[#0B1E48] hover:bg-[#071330] text-white active:scale-[0.99] cursor-pointer'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {isSubmitting ? 'hourglass_top' : 'check_circle'}
                      </span>
                      <span>
                        {isSubmitting
                          ? (isAmharic ? 'በመመዝገብ ላይ...' : 'Submitting...')
                          : (isAmharic ? 'አረጋግጥ እና መዝግብ' : 'Confirm & Submit')}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </form>
        )}
      </div>
    </div>
  );
};
