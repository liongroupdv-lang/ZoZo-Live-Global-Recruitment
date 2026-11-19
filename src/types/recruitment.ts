export type RolePosition = 'Super Admin' | 'Admin' | 'Coin Seller';

export type ApplicationStatus = 'Pending' | 'Under Review' | 'Approved' | 'Rejected';

export type CoinPackageOption = '$500' | '$800' | '$1,000';

export type AdminPermissionLevel = 'Owner' | 'Editor' | 'Viewer';

export interface RecruitmentApplication {
  id: string; // Internal management ID, e.g. ZOZO-2026-XXXXXX
  name: string;
  country: string; // Flag + Country Name (no dialing code)
  countryFlag: string;
  countryName: string;
  whatsapp: string;
  position: RolePosition;
  currentApp: string;
  adminsCount?: number; // Super Admin only
  agenciesCount?: number; // Super Admin & Admin
  coinPackage?: CoinPackageOption; // Coin Seller only
  workExperience: string; // Work Experience or Coin Selling Experience
  cvFileName: string;
  cvMimeType: string;
  cvFileSize: number;
  cvLink: string;
  driveCvUrl?: string;
  status: ApplicationStatus;
  submittedAt: string;
  language: 'en' | 'bn';
  appsScriptSynced?: boolean;
}

export interface CvFilePayload {
  name: string;
  mimeType: string;
  size: number;
  base64: string;
}

export interface CreateApplicationPayload {
  name: string;
  country: string;
  countryFlag: string;
  countryName: string;
  whatsapp: string;
  position: RolePosition;
  currentApp: string;
  adminsCount?: number;
  agenciesCount?: number;
  coinPackage?: CoinPackageOption;
  workExperience: string;
  cvFile: CvFilePayload;
  language: 'en' | 'bn';
  submissionToken: string;
}

export interface UpdateApplicationPayload {
  name?: string;
  country?: string;
  countryFlag?: string;
  countryName?: string;
  whatsapp?: string;
  position?: RolePosition;
  currentApp?: string;
  adminsCount?: number;
  agenciesCount?: number;
  coinPackage?: CoinPackageOption;
  workExperience?: string;
  status?: ApplicationStatus;
}

export interface AdminAccessEntry {
  email: string;
  role: AdminPermissionLevel;
  canDelete?: boolean;
  grantedAt: string;
  grantedBy: string;
}

export interface EmailNotificationRecord {
  id: string;
  applicationId: string;
  recipient: string;
  subject: string;
  applicantName: string;
  country: string;
  whatsapp: string;
  position: RolePosition;
  currentApp: string;
  adminsCount?: number;
  agenciesCount?: number;
  coinPackage?: CoinPackageOption;
  workExperience: string;
  cvLink: string;
  viewUrl: string;
  language: 'en' | 'bn';
  deliveryStatus:
    | 'Sent via Resend'
    | 'Sent via Apps Script MailApp'
    | 'Logged (Deploy Apps Script for Gmail Delivery)';
  sentAt: string;
}

export interface BackendConfig {
  appsScriptWebAppUrl: string;
  spreadsheetUrl: string;
  driveCvFolderUrl: string;
  googleFormId?: string;
  googleFormUrl?: string;
  ownerEmail: string;
  updatedAt?: string;
}

export interface BrandAssets {
  logoUrl: string | null;
  mascotUrl: string | null;
  updatedAt?: string;
}
