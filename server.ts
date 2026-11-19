import express, { type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type {
  AdminAccessEntry,
  AdminPermissionLevel,
  ApplicationStatus,
  BackendConfig,
  BrandAssets,
  CoinPackageOption,
  CreateApplicationPayload,
  EmailNotificationRecord,
  RecruitmentApplication,
  RolePosition,
  UpdateApplicationPayload,
} from './src/types/recruitment.ts';

const PORT = Number(process.env.PORT || 3000);
const OWNER_EMAIL = (process.env.OWNER_EMAIL || 'liongroupdv@gmail.com').trim().toLowerCase();
const APP_BASE_URL = (
  process.env.APP_URL || 'https://ais-dev-menrapitnclw3tdj2oqpih-957770790639.asia-east1.run.app'
).replace(/\/$/, '');

const DATA_DIR = path.resolve(process.cwd(), 'data');
const PRIVATE_CV_DIR = path.join(DATA_DIR, 'private-cvs');
const BRAND_DIR = path.join(DATA_DIR, 'brand');
const DATA_FILE = path.join(DATA_DIR, 'applications.json');
const ACCESS_FILE = path.join(DATA_DIR, 'admin-access.json');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'email-notifications.json');
const BACKEND_CONFIG_FILE = path.join(DATA_DIR, 'backend-config.json');
const BRAND_CONFIG_FILE = path.join(DATA_DIR, 'brand-assets.json');

const VALID_ROLES: RolePosition[] = ['Super Admin', 'Admin', 'Coin Seller'];
const VALID_STATUSES: ApplicationStatus[] = ['Pending', 'Under Review', 'Approved', 'Rejected'];
const VALID_COIN_PACKAGES: CoinPackageOption[] = ['$500', '$800', '$1,000'];
const WHATSAPP_REGEX = /^[+]?[0-9][0-9\s\-()]{5,22}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_CV_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_BRAND_BYTES = 2 * 1024 * 1024; // 2 MB

// Short-lived in-memory cache of verified Google OAuth access tokens -> user info
const tokenVerificationCache = new Map<
  string,
  { email: string; name: string; expiresAt: number }
>();

// Duplicate submission guard (token -> timestamp)
const recentSubmissionTokens = new Map<string, number>();

function ensureStorage(): void {
  for (const dir of [DATA_DIR, PRIVATE_CV_DIR, BRAND_DIR]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '[]', 'utf8');
  }
  if (!fs.existsSync(ACCESS_FILE)) {
    const initialAccess: AdminAccessEntry[] = [
      {
        email: OWNER_EMAIL,
        role: 'Owner',
        canDelete: true,
        grantedAt: new Date().toISOString(),
        grantedBy: OWNER_EMAIL,
      },
    ];
    fs.writeFileSync(ACCESS_FILE, JSON.stringify(initialAccess, null, 2), 'utf8');
  }
  if (!fs.existsSync(NOTIFICATIONS_FILE)) {
    fs.writeFileSync(NOTIFICATIONS_FILE, '[]', 'utf8');
  }
  if (!fs.existsSync(BACKEND_CONFIG_FILE)) {
    const initialConfig: BackendConfig = {
      appsScriptWebAppUrl: process.env.APPS_SCRIPT_WEB_APP_URL || '',
      spreadsheetUrl: process.env.GOOGLE_SHEETS_URL || '',
      driveCvFolderUrl: '',
      ownerEmail: OWNER_EMAIL,
    };
    fs.writeFileSync(BACKEND_CONFIG_FILE, JSON.stringify(initialConfig, null, 2), 'utf8');
  }
  if (!fs.existsSync(BRAND_CONFIG_FILE)) {
    const initialBrand: BrandAssets = {
      logoUrl: null,
      mascotUrl: null,
    };
    fs.writeFileSync(BRAND_CONFIG_FILE, JSON.stringify(initialBrand, null, 2), 'utf8');
  }
}

function readJsonArray<T>(filePath: string): T[] {
  ensureStorage();
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJsonArray<T>(filePath: string, data: T[]): void {
  ensureStorage();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function readBackendConfig(): BackendConfig {
  ensureStorage();
  try {
    const raw = JSON.parse(fs.readFileSync(BACKEND_CONFIG_FILE, 'utf8'));
    return {
      appsScriptWebAppUrl: String(raw.appsScriptWebAppUrl || ''),
      spreadsheetUrl: String(raw.spreadsheetUrl || ''),
      driveCvFolderUrl: String(raw.driveCvFolderUrl || ''),
      googleFormId: raw.googleFormId ? String(raw.googleFormId) : '',
      googleFormUrl: raw.googleFormUrl ? String(raw.googleFormUrl) : '',
      ownerEmail: OWNER_EMAIL,
      updatedAt: raw.updatedAt,
    };
  } catch {
    return {
      appsScriptWebAppUrl: '',
      spreadsheetUrl: '',
      driveCvFolderUrl: '',
      googleFormId: '',
      googleFormUrl: '',
      ownerEmail: OWNER_EMAIL,
    };
  }
}

function writeBackendConfig(config: BackendConfig): void {
  ensureStorage();
  fs.writeFileSync(BACKEND_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

function readBrandAssets(): BrandAssets {
  ensureStorage();
  try {
    const raw = JSON.parse(fs.readFileSync(BRAND_CONFIG_FILE, 'utf8'));
    return {
      logoUrl: raw.logoUrl || null,
      mascotUrl: raw.mascotUrl || null,
      updatedAt: raw.updatedAt,
    };
  } catch {
    return { logoUrl: null, mascotUrl: null };
  }
}

function writeBrandAssets(assets: BrandAssets): void {
  ensureStorage();
  fs.writeFileSync(BRAND_CONFIG_FILE, JSON.stringify(assets, null, 2), 'utf8');
}

function readAdminAccess(): AdminAccessEntry[] {
  const entries = readJsonArray<AdminAccessEntry>(ACCESS_FILE);
  if (!entries.some((e) => e.email.toLowerCase() === OWNER_EMAIL)) {
    entries.unshift({
      email: OWNER_EMAIL,
      role: 'Owner',
      canDelete: true,
      grantedAt: new Date().toISOString(),
      grantedBy: OWNER_EMAIL,
    });
    writeJsonArray(ACCESS_FILE, entries);
  }
  return entries;
}

function getPermissionForEmail(
  email: string
): { role: AdminPermissionLevel; canDelete: boolean } | null {
  const normalized = email.trim().toLowerCase();
  if (normalized === OWNER_EMAIL) {
    return { role: 'Owner', canDelete: true };
  }
  const entry = readAdminAccess().find((e) => e.email.toLowerCase() === normalized);
  if (!entry) return null;
  return {
    role: entry.role,
    canDelete: entry.role === 'Owner' ? true : Boolean(entry.canDelete),
  };
}

async function verifyGoogleBearerToken(
  authHeader: string | undefined
): Promise<{ email: string; name: string; accessToken: string } | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;

  const cacheKey = crypto.createHash('sha256').update(token).digest('hex');
  const cached = tokenVerificationCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { email: cached.email, name: cached.name, accessToken: token };
  }

  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const info = (await res.json()) as {
      email?: string;
      email_verified?: boolean;
      name?: string;
    };
    if (!info.email || info.email_verified === false) return null;
    const email = info.email.trim().toLowerCase();
    const name = info.name?.trim() || email;
    tokenVerificationCache.set(cacheKey, {
      email,
      name,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });
    return { email, name, accessToken: token };
  } catch {
    return null;
  }
}

interface AuthenticatedAdmin {
  email: string;
  name: string;
  accessToken: string;
  role: AdminPermissionLevel;
  canDelete: boolean;
}

async function requireAdmin(
  req: Request,
  res: Response
): Promise<AuthenticatedAdmin | null> {
  const verified = await verifyGoogleBearerToken(req.header('Authorization'));
  if (!verified) {
    res.status(401).json({
      error: 'Authentication required. Sign in with an authorized Google administrator account.',
    });
    return null;
  }
  const perm = getPermissionForEmail(verified.email);
  if (!perm) {
    res.status(403).json({
      error: `Access denied. ${verified.email} is not authorized to access the ZoZo Live Admin Dashboard.`,
    });
    return null;
  }
  return {
    ...verified,
    role: perm.role,
    canDelete: perm.canDelete,
  };
}

function validateAndDecodeCv(cvFile: CreateApplicationPayload['cvFile']): {
  ext: '.pdf' | '.doc' | '.docx';
  mimeType: string;
  buffer: Buffer;
  safeName: string;
} {
  if (!cvFile || typeof cvFile.name !== 'string' || typeof cvFile.base64 !== 'string') {
    throw new Error('CV file upload is required (PDF, DOC, or DOCX).');
  }

  const cleanName = path.basename(cvFile.name.trim()).replace(/[^a-zA-Z0-9._-]/g, '_');
  const lower = cleanName.toLowerCase();
  let ext: '.pdf' | '.doc' | '.docx';
  let mimeType: string;

  if (lower.endsWith('.pdf')) {
    ext = '.pdf';
    mimeType = 'application/pdf';
  } else if (lower.endsWith('.docx')) {
    ext = '.docx';
    mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  } else if (lower.endsWith('.doc')) {
    ext = '.doc';
    mimeType = 'application/msword';
  } else {
    throw new Error('Invalid CV file type. Only PDF, DOC, and DOCX files are allowed.');
  }

  const base64Clean = cvFile.base64.includes(',')
    ? cvFile.base64.split(',').pop() || ''
    : cvFile.base64;
  const buffer = Buffer.from(base64Clean, 'base64');

  if (buffer.length === 0) {
    throw new Error('Uploaded CV file appears to be empty.');
  }
  if (buffer.length > MAX_CV_BYTES) {
    throw new Error('CV file exceeds the maximum allowed size of 5 MB.');
  }

  // Magic-byte signature verification against disguised executables/scripts
  const head = buffer.subarray(0, 8);
  const isPdf = head.subarray(0, 5).toString('ascii') === '%PDF-';
  const isZip = head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04;
  const isOle2 =
    head[0] === 0xd0 && head[1] === 0xcf && head[2] === 0x11 && head[3] === 0xe0;
  const isRtf = head.subarray(0, 5).toString('ascii') === '{\\rtf';

  if (ext === '.pdf' && !isPdf) {
    throw new Error('The uploaded .pdf file failed PDF signature verification.');
  }
  if (ext === '.docx' && !isZip) {
    throw new Error('The uploaded .docx file failed DOCX signature verification.');
  }
  if (ext === '.doc' && !isOle2 && !isRtf) {
    throw new Error('The uploaded .doc file failed DOC signature verification.');
  }

  return { ext, mimeType, buffer, safeName: cleanName };
}

function generateApplicationId(): string {
  const year = new Date().getFullYear();
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `ZOZO-${year}-${suffix}`;
}

async function callAppsScriptBackend(
  url: string,
  payload: Record<string, unknown>
): Promise<any | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return { ok: res.ok, raw: text };
    }
  } catch {
    return null;
  }
}

async function dispatchApplicationEmailNotification(
  record: RecruitmentApplication,
  appsScriptEmailSent: boolean
): Promise<EmailNotificationRecord> {
  const subject = 'New Application Received – ZoZo Live Recruitment';
  const viewUrl = `${APP_BASE_URL}/admin?id=${encodeURIComponent(record.id)}`;
  let deliveryStatus: EmailNotificationRecord['deliveryStatus'] = appsScriptEmailSent
    ? 'Sent via Apps Script MailApp'
    : 'Logged (Deploy Apps Script for Gmail Delivery)';

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!appsScriptEmailSent && resendApiKey) {
    try {
      const lines = [
        'New Application Received – ZoZo Live Recruitment',
        '',
        `Internal Application ID: ${record.id}`,
        `Applicant Name: ${record.name}`,
        `Country: ${record.country}`,
        `WhatsApp Number: ${record.whatsapp}`,
        `Applied Position: ${record.position}`,
        `Currently Working Live App: ${record.currentApp}`,
      ];
      if (record.position === 'Super Admin') {
        lines.push(`Number of Admins: ${record.adminsCount ?? 0}`);
        lines.push(`Number of Agencies: ${record.agenciesCount ?? 0}`);
      } else if (record.position === 'Admin') {
        lines.push(`Number of Agencies: ${record.agenciesCount ?? 0}`);
      } else if (record.position === 'Coin Seller') {
        lines.push(`Preferred Coin Package: ${record.coinPackage ?? '—'}`);
      }
      lines.push(`Work / Coin Experience: ${record.workExperience}`);
      lines.push(`CV Link: ${record.driveCvUrl || `${APP_BASE_URL}${record.cvLink}`}`);
      lines.push(`View Application: ${viewUrl}`);

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || 'ZoZo Live Recruitment <onboarding@resend.dev>',
          to: [OWNER_EMAIL],
          subject,
          text: lines.join('\n'),
        }),
      });
      if (res.ok) {
        deliveryStatus = 'Sent via Resend';
      }
    } catch {
      // Keep safe logged status
    }
  }

  const notification: EmailNotificationRecord = {
    id: crypto.randomUUID(),
    applicationId: record.id,
    recipient: OWNER_EMAIL,
    subject,
    applicantName: record.name,
    country: record.country,
    whatsapp: record.whatsapp,
    position: record.position,
    currentApp: record.currentApp,
    adminsCount: record.adminsCount,
    agenciesCount: record.agenciesCount,
    coinPackage: record.coinPackage,
    workExperience: record.workExperience,
    cvLink: record.driveCvUrl || `${APP_BASE_URL}${record.cvLink}`,
    viewUrl,
    language: record.language === 'bn' ? 'bn' : 'en',
    deliveryStatus,
    sentAt: new Date().toISOString(),
  };

  const existing = readJsonArray<EmailNotificationRecord>(NOTIFICATIONS_FILE);
  existing.unshift(notification);
  writeJsonArray(NOTIFICATIONS_FILE, existing);

  return notification;
}

async function startServer() {
  ensureStorage();
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Public Brand Assets (returns only uploaded logo/mascot URLs, never private data)
  app.get('/api/public/brand-assets', (_req, res) => {
    res.json(readBrandAssets());
  });

  app.get('/api/public/brand-file/:filename', (req, res) => {
    const safeName = path.basename(req.params.filename);
    const targetPath = path.join(BRAND_DIR, safeName);
    if (!fs.existsSync(targetPath)) {
      return res.status(404).end();
    }
    return res.sendFile(targetPath);
  });

  // ============================================================================
  // PUBLIC APPLICATION SUBMISSION (NO GOOGLE SIGN-IN REQUIRED)
  // ============================================================================
  app.post('/api/applications', async (req, res) => {
    try {
      const body = req.body as Partial<CreateApplicationPayload>;
      const submissionToken = String(body.submissionToken ?? '').trim();

      // Prune expired duplicate guard tokens (> 5 minutes)
      const now = Date.now();
      for (const [key, ts] of recentSubmissionTokens.entries()) {
        if (now - ts > 5 * 60 * 1000) recentSubmissionTokens.delete(key);
      }
      if (submissionToken && recentSubmissionTokens.has(submissionToken)) {
        return res.status(409).json({
          error: 'This application has already been submitted. Please wait before submitting again.',
        });
      }

      const name = String(body.name ?? '').trim();
      const country = String(body.country ?? '').trim();
      const countryFlag = String(body.countryFlag ?? '').trim();
      const countryName = String(body.countryName ?? '').trim();
      const whatsapp = String(body.whatsapp ?? '').trim();
      const position = body.position as RolePosition;
      const currentApp = String(body.currentApp ?? '').trim();
      const workExperience = String(body.workExperience ?? '').trim();
      const language = body.language === 'bn' ? 'bn' : 'en';

      if (!name) return res.status(400).json({ error: 'Full Name is required.' });
      if (!country) return res.status(400).json({ error: 'Country selection is required.' });
      if (!WHATSAPP_REGEX.test(whatsapp)) {
        return res.status(400).json({
          error: 'Enter a valid WhatsApp number (at least 6 digits).',
        });
      }
      if (!VALID_ROLES.includes(position)) {
        return res.status(400).json({ error: 'Select a valid recruitment position.' });
      }
      if (!currentApp) {
        return res.status(400).json({ error: 'Currently Working Live App is required.' });
      }
      if (!workExperience) {
        return res.status(400).json({ error: 'Experience description is required.' });
      }

      let adminsCount: number | undefined;
      let agenciesCount: number | undefined;
      let coinPackage: CoinPackageOption | undefined;

      if (position === 'Super Admin') {
        const parsedAdmins = Number(body.adminsCount);
        const parsedAgencies = Number(body.agenciesCount);
        if (!Number.isInteger(parsedAdmins) || parsedAdmins < 0) {
          return res.status(400).json({
            error: 'Number of Admins must be a whole number (0 or higher).',
          });
        }
        if (!Number.isInteger(parsedAgencies) || parsedAgencies < 0) {
          return res.status(400).json({
            error: 'Number of Agencies must be a whole number (0 or higher).',
          });
        }
        adminsCount = parsedAdmins;
        agenciesCount = parsedAgencies;
      } else if (position === 'Admin') {
        const parsedAgencies = Number(body.agenciesCount);
        if (!Number.isInteger(parsedAgencies) || parsedAgencies < 0) {
          return res.status(400).json({
            error: 'Number of Agencies must be a whole number (0 or higher).',
          });
        }
        agenciesCount = parsedAgencies;
      } else if (position === 'Coin Seller') {
        const pkg = String(body.coinPackage ?? '').trim() as CoinPackageOption;
        if (!VALID_COIN_PACKAGES.includes(pkg)) {
          return res.status(400).json({
            error: 'Select a valid coin-selling package ($500, $800, or $1,000).',
          });
        }
        coinPackage = pkg;
      }

      // Validate and decode CV upload (PDF, DOC, DOCX)
      const decodedCv = validateAndDecodeCv(body.cvFile as CreateApplicationPayload['cvFile']);

      const appId = generateApplicationId();
      const submittedAt = new Date().toISOString();
      const cvStorageName = `${appId}${decodedCv.ext}`;
      const cvDiskPath = path.join(PRIVATE_CV_DIR, cvStorageName);
      fs.writeFileSync(cvDiskPath, decodedCv.buffer);

      if (submissionToken) {
        recentSubmissionTokens.set(submissionToken, now);
      }

      // Forward to Google Apps Script Web App backend if configured
      const config = readBackendConfig();
      let driveCvUrl = '';
      let appsScriptSynced = false;
      let appsScriptEmailSent = false;

      if (config.appsScriptWebAppUrl) {
        const gsRes = await callAppsScriptBackend(config.appsScriptWebAppUrl, {
          action: 'submitApplication',
          id: appId,
          submittedAt,
          name,
          country,
          whatsapp,
          position,
          currentApp,
          adminsCount,
          agenciesCount,
          coinPackage,
          workExperience,
          language,
          submissionToken,
          cvFile: body.cvFile,
        });

        if (gsRes && gsRes.ok) {
          appsScriptSynced = true;
          driveCvUrl = String(gsRes.cvFileUrl || '');
          appsScriptEmailSent = Boolean(gsRes.emailSent);
          if (gsRes.spreadsheetUrl || gsRes.cvFolderUrl) {
            writeBackendConfig({
              ...config,
              spreadsheetUrl: gsRes.spreadsheetUrl || config.spreadsheetUrl,
              driveCvFolderUrl: gsRes.cvFolderUrl || config.driveCvFolderUrl,
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }

      const record: RecruitmentApplication = {
        id: appId,
        name,
        country,
        countryFlag,
        countryName: countryName || country,
        whatsapp,
        position,
        currentApp,
        adminsCount,
        agenciesCount,
        coinPackage,
        workExperience,
        cvFileName: decodedCv.safeName,
        cvMimeType: decodedCv.mimeType,
        cvFileSize: decodedCv.buffer.length,
        cvLink: `/api/admin/cv/${encodeURIComponent(appId)}`,
        driveCvUrl: driveCvUrl || undefined,
        status: 'Pending',
        submittedAt,
        language,
        appsScriptSynced,
      };

      const existing = readJsonArray<RecruitmentApplication>(DATA_FILE);
      existing.unshift(record);
      writeJsonArray(DATA_FILE, existing);

      try {
        await dispatchApplicationEmailNotification(record, appsScriptEmailSent);
      } catch {
        // Safe notification handling: never lose application if email fails
      }

      return res.status(201).json({
        receipt: {
          id: record.id,
          name: record.name,
          country: record.country,
          whatsapp: record.whatsapp,
          position: record.position,
          cvFileName: record.cvFileName,
          submittedAt: record.submittedAt,
        },
        appsScriptSynced,
      });
    } catch (err) {
      return res.status(400).json({
        error: err instanceof Error ? err.message : 'Invalid application submission.',
      });
    }
  });

  // ============================================================================
  // PRIVATE ADMIN DASHBOARD ENDPOINTS (GOOGLE OAUTH BEARER TOKEN REQUIRED)
  // ============================================================================
  app.get('/api/admin/session', async (req, res) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    res.json({
      email: admin.email,
      name: admin.name,
      role: admin.role,
      canDelete: admin.canDelete,
      isOwner: admin.role === 'Owner',
      ownerEmail: OWNER_EMAIL,
    });
  });

  app.get('/api/admin/applications', async (req, res) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const apps = readJsonArray<RecruitmentApplication>(DATA_FILE).sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
    return res.json({ applications: apps });
  });

  app.patch('/api/admin/applications/:id', async (req, res) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    if (admin.role === 'Viewer') {
      return res.status(403).json({
        error: 'Viewer access is read-only. You cannot edit applications or change status.',
      });
    }

    const { id } = req.params;
    const body = (req.body || {}) as UpdateApplicationPayload;
    const apps = readJsonArray<RecruitmentApplication>(DATA_FILE);
    const index = apps.findIndex((item) => item.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    const current = apps[index];
    const next: RecruitmentApplication = { ...current };

    if (body.name !== undefined) {
      const cleaned = String(body.name).trim();
      if (!cleaned) return res.status(400).json({ error: 'Full Name cannot be empty.' });
      next.name = cleaned;
    }
    if (body.country !== undefined) {
      next.country = String(body.country).trim() || current.country;
      if (body.countryFlag !== undefined) next.countryFlag = String(body.countryFlag);
      if (body.countryName !== undefined) next.countryName = String(body.countryName);
    }
    if (body.whatsapp !== undefined) {
      const cleanedWa = String(body.whatsapp).trim();
      if (!WHATSAPP_REGEX.test(cleanedWa)) {
        return res.status(400).json({ error: 'Invalid WhatsApp number format.' });
      }
      next.whatsapp = cleanedWa;
    }
    if (body.position !== undefined) {
      if (!VALID_ROLES.includes(body.position)) {
        return res.status(400).json({ error: 'Invalid position.' });
      }
      next.position = body.position;
    }
    if (body.currentApp !== undefined) {
      const cleanedApp = String(body.currentApp).trim();
      if (!cleanedApp) return res.status(400).json({ error: 'Current Live App cannot be empty.' });
      next.currentApp = cleanedApp;
    }
    if (body.adminsCount !== undefined) {
      const n = Number(body.adminsCount);
      if (!Number.isInteger(n) || n < 0) {
        return res.status(400).json({ error: 'Admins count must be a whole number (0 or higher).' });
      }
      next.adminsCount = n;
    }
    if (body.agenciesCount !== undefined) {
      const n = Number(body.agenciesCount);
      if (!Number.isInteger(n) || n < 0) {
        return res.status(400).json({ error: 'Agencies count must be a whole number (0 or higher).' });
      }
      next.agenciesCount = n;
    }
    if (body.coinPackage !== undefined) {
      if (!VALID_COIN_PACKAGES.includes(body.coinPackage)) {
        return res.status(400).json({ error: 'Invalid coin package option.' });
      }
      next.coinPackage = body.coinPackage;
    }
    if (body.workExperience !== undefined) {
      const cleanedExp = String(body.workExperience).trim();
      if (!cleanedExp) return res.status(400).json({ error: 'Experience cannot be empty.' });
      next.workExperience = cleanedExp;
    }
    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return res.status(400).json({ error: 'Invalid application status.' });
      }
      next.status = body.status;
    }

    apps[index] = next;
    writeJsonArray(DATA_FILE, apps);

    // Sync update to Apps Script if configured
    const config = readBackendConfig();
    if (config.appsScriptWebAppUrl) {
      await callAppsScriptBackend(config.appsScriptWebAppUrl, {
        action: 'adminUpdate',
        accessToken: admin.accessToken,
        applicationId: id,
        name: next.name,
        country: next.country,
        whatsapp: next.whatsapp,
        position: next.position,
        currentApp: next.currentApp,
        adminsCount: next.adminsCount ?? null,
        agenciesCount: next.agenciesCount ?? null,
        coinPackage: next.coinPackage ?? null,
        workExperience: next.workExperience,
        status: next.status,
      });
    }

    return res.json({ application: next });
  });

  app.delete('/api/admin/applications/:id', async (req, res) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const allowedToDelete =
      admin.role === 'Owner' || (admin.role === 'Editor' && admin.canDelete);
    if (!allowedToDelete) {
      return res.status(403).json({
        error:
          admin.role === 'Viewer'
            ? 'Viewer access is read-only. Viewers cannot delete applications.'
            : 'Editor delete access has not been authorized by the Owner.',
      });
    }

    const { id } = req.params;
    const apps = readJsonArray<RecruitmentApplication>(DATA_FILE);
    const target = apps.find((item) => item.id === id);
    if (!target) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    const filtered = apps.filter((item) => item.id !== id);
    writeJsonArray(DATA_FILE, filtered);

    // Clean up local private CV file
    for (const ext of ['.pdf', '.doc', '.docx']) {
      const cvPath = path.join(PRIVATE_CV_DIR, `${path.basename(id)}${ext}`);
      if (fs.existsSync(cvPath)) {
        try {
          fs.unlinkSync(cvPath);
        } catch {
          // ignore unlink error
        }
      }
    }

    const config = readBackendConfig();
    if (config.appsScriptWebAppUrl) {
      await callAppsScriptBackend(config.appsScriptWebAppUrl, {
        action: 'adminDelete',
        accessToken: admin.accessToken,
        applicationId: id,
      });
    }

    return res.json({ ok: true });
  });

  // Private CV File Streaming (Authorized Admin Only)
  app.get('/api/admin/cv/:id', async (req, res) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const id = path.basename(req.params.id);
    const apps = readJsonArray<RecruitmentApplication>(DATA_FILE);
    const record = apps.find((a) => a.id === id);

    for (const ext of ['.pdf', '.doc', '.docx']) {
      const filePath = path.join(PRIVATE_CV_DIR, `${id}${ext}`);
      if (fs.existsSync(filePath)) {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader(
          'Content-Type',
          record?.cvMimeType || 'application/octet-stream'
        );
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${record?.cvFileName || id + ext}"`
        );
        return res.sendFile(filePath);
      }
    }

    return res.status(404).json({ error: 'CV file not found on server.' });
  });

  // Admin Access Management (Owner-only mutations)
  app.get('/api/admin/access', async (req, res) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    res.json({
      ownerEmail: OWNER_EMAIL,
      entries: readAdminAccess(),
    });
  });

  app.post('/api/admin/access', async (req, res) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    if (admin.role !== 'Owner') {
      return res.status(403).json({
        error: 'Only the primary Owner can grant or modify administrator permissions.',
      });
    }

    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const role = req.body?.role as AdminPermissionLevel;
    const canDelete = role === 'Editor' ? Boolean(req.body?.canDelete) : false;

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'Enter a valid Gmail or email address.' });
    }
    if (email === OWNER_EMAIL) {
      return res.status(400).json({ error: 'The primary Owner already has full Owner access.' });
    }
    if (role !== 'Viewer' && role !== 'Editor') {
      return res.status(400).json({ error: 'Permission level must be Viewer or Editor.' });
    }

    const entries = readAdminAccess();
    const existingIdx = entries.findIndex((e) => e.email.toLowerCase() === email);
    const nextEntry: AdminAccessEntry = {
      email,
      role,
      canDelete,
      grantedAt: new Date().toISOString(),
      grantedBy: OWNER_EMAIL,
    };

    if (existingIdx !== -1) {
      entries[existingIdx] = nextEntry;
    } else {
      entries.push(nextEntry);
    }

    writeJsonArray(ACCESS_FILE, entries);

    const config = readBackendConfig();
    if (config.appsScriptWebAppUrl) {
      await callAppsScriptBackend(config.appsScriptWebAppUrl, {
        action: 'adminManageAccess',
        accessToken: admin.accessToken,
        entries,
      });
    }

    return res.status(201).json({ entry: nextEntry, entries });
  });

  app.delete('/api/admin/access/:email', async (req, res) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    if (admin.role !== 'Owner') {
      return res.status(403).json({
        error: 'Only the primary Owner can revoke administrator permissions.',
      });
    }

    const targetEmail = decodeURIComponent(req.params.email).trim().toLowerCase();
    if (targetEmail === OWNER_EMAIL) {
      return res.status(400).json({ error: 'Primary Owner access cannot be revoked.' });
    }

    const entries = readAdminAccess();
    const filtered = entries.filter((e) => e.email.toLowerCase() !== targetEmail);
    if (filtered.length === entries.length) {
      return res.status(404).json({ error: 'Authorized administrator not found.' });
    }

    writeJsonArray(ACCESS_FILE, filtered);

    const config = readBackendConfig();
    if (config.appsScriptWebAppUrl) {
      await callAppsScriptBackend(config.appsScriptWebAppUrl, {
        action: 'adminManageAccess',
        accessToken: admin.accessToken,
        entries: filtered,
      });
    }

    return res.json({ ok: true, entries: filtered });
  });

  // Email Notifications Log & Test
  app.get('/api/admin/notifications', async (req, res) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const notifications = readJsonArray<EmailNotificationRecord>(NOTIFICATIONS_FILE);
    res.json({ ownerEmail: OWNER_EMAIL, notifications });
  });

  app.post('/api/admin/notifications/test', async (req, res) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    if (admin.role === 'Viewer') {
      return res.status(403).json({ error: 'Viewer access cannot dispatch test alerts.' });
    }

    const lang = req.body?.language === 'bn' ? 'bn' : 'en';
    const sampleApp: RecruitmentApplication = {
      id: `ZOZO-TEST-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
      name: lang === 'bn' ? 'Test Applicant (তারেক রহমান)' : 'Test Applicant (Tariq Rahman)',
      country: '🇧🇩 Bangladesh',
      countryFlag: '🇧🇩',
      countryName: 'Bangladesh',
      whatsapp: '+880 1712 345678',
      position: 'Super Admin',
      currentApp: 'ZoZo Live',
      adminsCount: 12,
      agenciesCount: 8,
      workExperience:
        lang === 'bn'
          ? 'লাইভ স্ট্রিমিং ইন্ডাস্ট্রিতে ৪ বছরের অভিজ্ঞতা এবং ৮টি সক্রিয় এজেন্সি পরিচালনা।'
          : '4 years in live streaming operations managing 8 active host agencies.',
      cvFileName: 'sample-cv.pdf',
      cvMimeType: 'application/pdf',
      cvFileSize: 102400,
      cvLink: '/api/admin/cv/sample',
      status: 'Pending',
      submittedAt: new Date().toISOString(),
      language: lang,
    };

    const notification = await dispatchApplicationEmailNotification(sampleApp, false);
    return res.status(201).json({ notification });
  });

  // Google Apps Script & Sheets Backend Config (Owner-only write)
  app.get('/api/admin/backend-config', async (req, res) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    res.json(readBackendConfig());
  });

  app.put('/api/admin/backend-config', async (req, res) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    if (admin.role !== 'Owner') {
      return res.status(403).json({ error: 'Only the primary Owner can update backend configuration.' });
    }

    const current = readBackendConfig();
    const next: BackendConfig = {
      appsScriptWebAppUrl: String(req.body?.appsScriptWebAppUrl ?? current.appsScriptWebAppUrl).trim(),
      spreadsheetUrl: String(req.body?.spreadsheetUrl ?? current.spreadsheetUrl).trim(),
      driveCvFolderUrl: String(req.body?.driveCvFolderUrl ?? current.driveCvFolderUrl).trim(),
      googleFormId: String(req.body?.googleFormId ?? current.googleFormId ?? '').trim(),
      googleFormUrl: String(req.body?.googleFormUrl ?? current.googleFormUrl ?? '').trim(),
      ownerEmail: OWNER_EMAIL,
      updatedAt: new Date().toISOString(),
    };
    writeBackendConfig(next);
    return res.json(next);
  });

  app.post('/api/admin/backend-config/test', async (req, res) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    if (admin.role !== 'Owner') {
      return res.status(403).json({ error: 'Only the primary Owner can test backend connectivity.' });
    }

    const targetUrl = String(req.body?.appsScriptWebAppUrl || readBackendConfig().appsScriptWebAppUrl).trim();
    if (!targetUrl) {
      return res.status(400).json({ error: 'Enter your deployed Google Apps Script Web App URL first.' });
    }

    const result = await callAppsScriptBackend(targetUrl, {
      action: 'adminPing',
      accessToken: admin.accessToken,
    });
    if (!result || !result.ok) {
      return res.status(400).json({
        error:
          result?.error ||
          'Could not verify Google Apps Script Web App URL. Check that it is deployed as "Execute as: Me" and "Who has access: Anyone".',
      });
    }

    const current = readBackendConfig();
    const updated: BackendConfig = {
      ...current,
      appsScriptWebAppUrl: targetUrl,
      spreadsheetUrl: result.spreadsheetUrl || current.spreadsheetUrl,
      driveCvFolderUrl: result.cvFolderUrl || current.driveCvFolderUrl,
      updatedAt: new Date().toISOString(),
    };
    writeBackendConfig(updated);

    return res.json({ ok: true, config: updated, ping: result });
  });

  // Official Logo & Mascot Brand Upload (Owner-only)
  app.post('/api/admin/brand-assets', async (req, res) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    if (admin.role !== 'Owner') {
      return res.status(403).json({ error: 'Only the primary Owner can update brand assets.' });
    }

    const kind = req.body?.kind === 'mascot' ? 'mascot' : 'logo';
    const fileName = String(req.body?.name || '').toLowerCase();
    const base64 = String(req.body?.base64 || '');
    const cleanBase64 = base64.includes(',') ? base64.split(',').pop() || '' : base64;
    const buffer = Buffer.from(cleanBase64, 'base64');

    if (!buffer.length || buffer.length > MAX_BRAND_BYTES) {
      return res.status(400).json({ error: 'Image must be non-empty and under 2 MB.' });
    }

    let ext = '.png';
    if (fileName.endsWith('.svg')) ext = '.svg';
    else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) ext = '.jpg';
    else if (fileName.endsWith('.webp')) ext = '.webp';

    const diskName = `zozo-${kind}-${Date.now()}${ext}`;
    fs.writeFileSync(path.join(BRAND_DIR, diskName), buffer);

    const current = readBrandAssets();
    const next: BrandAssets = {
      ...current,
      [kind === 'mascot' ? 'mascotUrl' : 'logoUrl']: `/api/public/brand-file/${diskName}`,
      updatedAt: new Date().toISOString(),
    };
    writeBrandAssets(next);
    return res.json(next);
  });

  app.delete('/api/admin/brand-assets/:kind', async (req, res) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    if (admin.role !== 'Owner') {
      return res.status(403).json({ error: 'Only the primary Owner can reset brand assets.' });
    }
    const kind = req.params.kind === 'mascot' ? 'mascot' : 'logo';
    const current = readBrandAssets();
    const next: BrandAssets = {
      ...current,
      [kind === 'mascot' ? 'mascotUrl' : 'logoUrl']: null,
      updatedAt: new Date().toISOString(),
    };
    writeBrandAssets(next);
    return res.json(next);
  });

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ZoZo Live Recruitment server listening on http://localhost:${PORT}`);
  });
}

startServer();
