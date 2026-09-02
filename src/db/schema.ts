import {
  MotorcycleRegistration,
  OfficerAssignment,
  VerificationLog,
  SystemSettings,
} from '../types';

export const TABLES = {
  REGISTRATIONS: 'motorcycle_registrations',
  OFFICERS: 'officer_assignments',
  VERIFICATIONS: 'verification_logs',
  SETTINGS: 'system_settings',
} as const;

export function mapRegistrationToFirebase(reg: MotorcycleRegistration) {
  return {
    id: reg.id,
    fullName: reg.fullName,
    phone: reg.phone,
    userPortraitPhoto: reg.userPortraitPhoto || null,
    nationalIdPhoto: reg.nationalIdPhoto,
    nationalIdBackPhoto: reg.nationalIdBackPhoto || null,
    drivingLicensePhoto: reg.drivingLicensePhoto,
    drivingPermitPhoto: reg.drivingPermitPhoto,
    vehicleCategory: reg.vehicleCategory,
    motorBrand: reg.motorBrand || null,
    motorModel: reg.motorModel || null,
    engineOrSerialNo: reg.engineOrSerialNo,
    plateNumber: reg.plateNumber,
    registrationDate: reg.registrationDate,
    status: reg.status || 'pending_approval',
    qrCodeData: reg.qrCodeData,
    registeredBy: reg.registeredBy,
    rejectionReason: reg.rejectionReason || null,
    subCity: reg.subCity || null,
  };
}

export function mapRegistrationFromFirebase(row: any): MotorcycleRegistration {
  return {
    id: row.id,
    fullName: row.fullName || row.full_name || '',
    phone: row.phone || '',
    userPortraitPhoto: row.userPortraitPhoto || row.user_portrait_photo,
    nationalIdPhoto: row.nationalIdPhoto || row.national_id_photo || '',
    nationalIdBackPhoto: row.nationalIdBackPhoto || row.national_id_back_photo,
    drivingLicensePhoto: row.drivingLicensePhoto || row.driving_license_photo || '',
    drivingPermitPhoto: row.drivingPermitPhoto || row.driving_permit_photo || '',
    vehicleCategory: row.vehicleCategory || row.vehicle_category || 'electric',
    motorBrand: row.motorBrand || row.motor_brand,
    motorModel: row.motorModel || row.motor_model,
    engineOrSerialNo: row.engineOrSerialNo || row.engine_or_serial_no || '',
    plateNumber: row.plateNumber || row.plate_number || '',
    registrationDate: row.registrationDate || row.registration_date || '',
    status: row.status || 'pending_approval',
    qrCodeData: row.qrCodeData || row.qr_code_data || '',
    registeredBy: row.registeredBy || row.registered_by || '',
    rejectionReason: row.rejectionReason || row.rejection_reason,
    subCity: row.subCity || row.sub_city,
  };
}

export function mapOfficerToFirebase(officer: OfficerAssignment) {
  return {
    id: officer.id,
    officerName: officer.officerName,
    badgeId: officer.badgeId,
    subCity: officer.subCity,
    locationName: officer.locationName,
    shift: officer.shift,
    status: officer.status || 'active',
    assignedLocation: officer.assignedLocation || null,
    phone: officer.phone || null,
    shiftHours: officer.shiftHours || null,
    assignedDate: officer.assignedDate || null,
  };
}

export function mapOfficerFromFirebase(row: any): OfficerAssignment {
  return {
    id: row.id,
    officerName: row.officerName || row.officer_name || '',
    badgeId: row.badgeId || row.badge_id || '',
    subCity: row.subCity || row.sub_city || '',
    locationName: row.locationName || row.location_name || '',
    shift: row.shift || 'morning',
    status: row.status || 'active',
    assignedLocation: row.assignedLocation || row.assigned_location,
    phone: row.phone,
    shiftHours: row.shiftHours || row.shift_hours,
    assignedDate: row.assignedDate || row.assigned_date,
  };
}

export function mapVerificationToFirebase(log: VerificationLog) {
  return {
    id: log.id,
    scannedAt: log.scannedAt,
    plateNumber: log.plateNumber,
    fullName: log.fullName,
    phone: log.phone,
    vehicleCategory: log.vehicleCategory,
    engineOrSerialNo: log.engineOrSerialNo,
    permitStatus: log.permitStatus,
    verificationStatus: log.verificationStatus,
    officerNotes: log.officerNotes || null,
    officerBadgeId: log.officerBadgeId || null,
    locationName: log.locationName || null,
    userPortraitPhoto: log.userPortraitPhoto || null,
    nationalIdPhoto: log.nationalIdPhoto || null,
    drivingLicensePhoto: log.drivingLicensePhoto || null,
    drivingPermitPhoto: log.drivingPermitPhoto || null,
  };
}

export function mapVerificationFromFirebase(row: any): VerificationLog {
  return {
    id: row.id,
    scannedAt: row.scannedAt || row.scanned_at || '',
    plateNumber: row.plateNumber || row.plate_number || '',
    fullName: row.fullName || row.full_name || '',
    phone: row.phone || '',
    vehicleCategory: row.vehicleCategory || row.vehicle_category || 'electric',
    engineOrSerialNo: row.engineOrSerialNo || row.engine_or_serial_no || '',
    permitStatus: row.permitStatus || row.permit_status || 'pending_approval',
    verificationStatus: row.verificationStatus || row.verification_status || 'verified',
    officerNotes: row.officerNotes || row.officer_notes,
    officerBadgeId: row.officerBadgeId || row.officer_badge_id,
    locationName: row.locationName || row.location_name,
    userPortraitPhoto: row.userPortraitPhoto || row.user_portrait_photo,
    nationalIdPhoto: row.nationalIdPhoto || row.national_id_photo,
    drivingLicensePhoto: row.drivingLicensePhoto || row.driving_license_photo,
    drivingPermitPhoto: row.drivingPermitPhoto || row.driving_permit_photo,
  };
}

export function mapSettingsToFirebase(settings: SystemSettings) {
  return {
    id: 'global_config',
    officerName: settings.officerName || null,
    department: settings.department || null,
    subCityOffice: settings.subCityOffice || null,
    defaultPrinter: settings.defaultPrinter || null,
    cardStockType: settings.cardStockType || null,
    calendarSystem: settings.calendarSystem || null,
    autoPrintQR: Boolean(settings.autoPrintQR),
    emailAlerts: Boolean(settings.emailAlerts),
    security2FA: Boolean(settings.security2FA),
    highRiskAlerts: Boolean(settings.highRiskAlerts),
  };
}

export function mapSettingsFromFirebase(row: any, defaultSettings: SystemSettings): SystemSettings {
  if (!row) return defaultSettings;
  return {
    officerName: row.officerName ?? row.officer_name ?? defaultSettings.officerName,
    department: row.department ?? defaultSettings.department,
    subCityOffice: row.subCityOffice ?? row.sub_city_office ?? defaultSettings.subCityOffice,
    defaultPrinter: row.defaultPrinter ?? row.default_printer ?? defaultSettings.defaultPrinter,
    cardStockType: row.cardStockType ?? row.card_stock_type ?? defaultSettings.cardStockType,
    calendarSystem: row.calendarSystem ?? row.calendar_system ?? defaultSettings.calendarSystem,
    autoPrintQR: row.autoPrintQR ?? row.auto_print_qr ?? defaultSettings.autoPrintQR,
    emailAlerts: row.emailAlerts ?? row.email_alerts ?? defaultSettings.emailAlerts,
    security2FA: row.security2FA ?? row.security_2fa ?? defaultSettings.security2FA,
    highRiskAlerts: row.highRiskAlerts ?? row.high_risk_alerts ?? defaultSettings.highRiskAlerts,
  };
}

// Aliases for backwards compatibility and GoDaddy hosting
export const mapRegistrationToGoDaddy = mapRegistrationToFirebase;
export const mapRegistrationFromGoDaddy = mapRegistrationFromFirebase;
export const mapOfficerToGoDaddy = mapOfficerToFirebase;
export const mapOfficerFromGoDaddy = mapOfficerFromFirebase;
export const mapVerificationToGoDaddy = mapVerificationToFirebase;
export const mapVerificationFromGoDaddy = mapVerificationFromFirebase;
export const mapSettingsToGoDaddy = mapSettingsToFirebase;
export const mapSettingsFromGoDaddy = mapSettingsFromFirebase;

export const mapRegistrationToSupabase = mapRegistrationToFirebase;
export const mapRegistrationFromSupabase = mapRegistrationFromFirebase;
export const mapOfficerToSupabase = mapOfficerToFirebase;
export const mapOfficerFromSupabase = mapOfficerFromFirebase;
export const mapVerificationToSupabase = mapVerificationToFirebase;
export const mapVerificationFromSupabase = mapVerificationFromFirebase;
export const mapSettingsToSupabase = mapSettingsToFirebase;
export const mapSettingsFromSupabase = mapSettingsFromFirebase;
