import type { User } from 'firebase/auth';
import { Lock, LogOut, RefreshCw, ShieldAlert } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { googleSignIn, initAuth, logout } from '../lib/googleAuth';
import type {
  AdminAccessEntry,
  AdminCreateApplicationPayload,
  AdminPermissionLevel,
  BackendConfig,
  BrandAssets,
  EmailNotificationRecord,
  RecruitmentApplication,
  UpdateApplicationPayload,
} from '../types/recruitment';
import { ApplicationsDashboard } from './ApplicationsDashboard';
import { BackendSetupPanel } from './BackendSetupPanel';
import { BrandAssetsPanel } from './BrandAssetsPanel';
import { GoogleFormConnector } from './GoogleFormConnector';
import { GoogleSignInButton } from './GoogleSignInButton';
import { ZoZoLogo } from './ZoZoLogo';

type AdminTab = 'applications' | 'google-form' | 'backend' | 'brand';

interface AdminSessionInfo {
  email: string;
  name: string;
  role: AdminPermissionLevel;
  canDelete: boolean;
  isOwner: boolean;
  ownerEmail: string;
}

interface AdminPortalProps {
  brandAssets: BrandAssets;
  onBrandAssetsChange: (next: BrandAssets) => void;
  initialSelectedId?: string | null;
}

export function AdminPortal({
  brandAssets,
  onBrandAssetsChange,
  initialSelectedId = null,
}: AdminPortalProps) {
  const [authState, setAuthState] = useState<'loading' | 'unauthenticated' | 'denied' | 'ready'>(
    'unauthenticated'
  );
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string>('');
  const [workspaceToken, setWorkspaceToken] = useState<string>('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState('');

  const [session, setSession] = useState<AdminSessionInfo | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('applications');

  const [applications, setApplications] = useState<RecruitmentApplication[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [appsError, setAppsError] = useState('');

  const [adminEntries, setAdminEntries] = useState<AdminAccessEntry[]>([]);
  const [notifications, setNotifications] = useState<EmailNotificationRecord[]>([]);
  const [backendConfig, setBackendConfig] = useState<BackendConfig>({
    appsScriptWebAppUrl: '',
    spreadsheetUrl: '',
    driveCvFolderUrl: '',
    googleFormId: '',
    googleFormUrl: '',
    gmailSmtpEmail: 'liongroupdv@gmail.com',
    gmailAppPasswordConfigured: false,
    ownerEmail: 'liongroupdv@gmail.com',
  });

  const publicOrigin =
    typeof window !== 'undefined' ? window.location.origin : '';

  const buildAdminHeaders = useCallback(
    (token: string, wsToken?: string, json = false): Record<string, string> => {
      const h: Record<string, string> = {
        Authorization: `Bearer ${token}`,
      };
      const effectiveWs = wsToken ?? workspaceToken;
      if (effectiveWs) {
        h['X-Google-Access-Token'] = effectiveWs;
      }
      if (json) {
        h['Content-Type'] = 'application/json';
      }
      return h;
    },
    [workspaceToken]
  );

  const loadAdminWorkspace = useCallback(
    async (token: string, wsToken?: string) => {
      setAuthState('loading');
      setAuthError('');
      setAppsError('');

      try {
        const headers = buildAdminHeaders(token, wsToken);
        const sessionRes = await fetch('/api/admin/session', { headers });
        const sessionData = await sessionRes.json();

        if (sessionRes.status === 401) {
          setAuthState('unauthenticated');
          return;
        }
        if (sessionRes.status === 403) {
          setAuthError(sessionData.error || 'Your Google account is not authorized.');
          setAuthState('denied');
          return;
        }
        if (!sessionRes.ok) {
          throw new Error(sessionData.error || 'Failed to verify administrator session.');
        }

        setSession(sessionData);
        setLoadingApps(true);

        const [appsRes, accessRes, notifRes, configRes] = await Promise.all([
          fetch('/api/admin/applications', { headers }),
          fetch('/api/admin/access', { headers }),
          fetch('/api/admin/notifications', { headers }),
          fetch('/api/admin/backend-config', { headers }),
        ]);

        const [appsJson, accessJson, notifJson, configJson] = await Promise.all([
          appsRes.json(),
          accessRes.json(),
          notifRes.json(),
          configRes.json(),
        ]);

        if (appsRes.ok && Array.isArray(appsJson.applications)) {
          setApplications(appsJson.applications);
        } else if (!appsRes.ok) {
          setAppsError(appsJson.error || 'Unable to load applications.');
        }

        if (accessRes.ok && Array.isArray(accessJson.entries)) {
          setAdminEntries(accessJson.entries);
        }
        if (notifRes.ok && Array.isArray(notifJson.notifications)) {
          setNotifications(notifJson.notifications);
        }
        if (configRes.ok && configJson) {
          setBackendConfig(configJson);
        }

        setAuthState('ready');
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : 'Unable to connect to Admin backend.');
        setAuthState('unauthenticated');
      } finally {
        setLoadingApps(false);
      }
    },
    [buildAdminHeaders]
  );

  useEffect(() => {
    setAuthState('loading');
    const unsubscribe = initAuth(
      (authedUser, sessionToken, wsToken) => {
        setUser(authedUser);
        setAccessToken(sessionToken);
        if (wsToken) setWorkspaceToken(wsToken);
        loadAdminWorkspace(sessionToken, wsToken);
      },
      () => {
        setUser(null);
        setAccessToken('');
        setWorkspaceToken('');
        setSession(null);
        setAuthState('unauthenticated');
      }
    );
    return () => unsubscribe();
  }, [loadAdminWorkspace]);

  const handleLogin = async (forceConsent = false) => {
    setIsLoggingIn(true);
    setAuthError('');
    try {
      const result = await googleSignIn({ forceConsent });
      if (result) {
        setUser(result.user);
        setAccessToken(result.sessionToken);
        if (result.accessToken) setWorkspaceToken(result.accessToken);
        await loadAdminWorkspace(result.sessionToken, result.accessToken);
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Google sign-in was cancelled or failed.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAccessToken('');
    setWorkspaceToken('');
    setSession(null);
    setApplications([]);
    setAdminEntries([]);
    setNotifications([]);
    setAuthState('unauthenticated');
  };

  const handleCreateApplication = async (
    payload: AdminCreateApplicationPayload
  ): Promise<RecruitmentApplication> => {
    const res = await fetch('/api/admin/applications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Unable to add application.');
    }
    setApplications((prev) => [data.application, ...prev]);
    return data.application;
  };

  const handleUpdateApplication = async (
    id: string,
    payload: UpdateApplicationPayload
  ) => {
    const res = await fetch(`/api/admin/applications/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Unable to update application.');
    }
    setApplications((prev) =>
      prev.map((item) => (item.id === id ? data.application : item))
    );
  };

  const handleDeleteApplication = async (id: string) => {
    const res = await fetch(`/api/admin/applications/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Unable to delete application.');
    }
    setApplications((prev) => prev.filter((item) => item.id !== id));
  };

  const handleGrantAccess = async (
    email: string,
    role: 'Viewer' | 'Editor',
    canDelete: boolean
  ) => {
    const res = await fetch('/api/admin/access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ email, role, canDelete }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Unable to grant access.');
    }
    if (Array.isArray(data.entries)) {
      setAdminEntries(data.entries);
    }
  };

  const handleRevokeAccess = async (email: string) => {
    const res = await fetch(`/api/admin/access/${encodeURIComponent(email)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Unable to revoke access.');
    }
    if (Array.isArray(data.entries)) {
      setAdminEntries(data.entries);
    }
  };

  const handleSendTestNotification = async (
    lang: 'en' | 'bn'
  ): Promise<EmailNotificationRecord | undefined> => {
    const res = await fetch('/api/admin/notifications/test', {
      method: 'POST',
      headers: buildAdminHeaders(accessToken, undefined, true),
      body: JSON.stringify({ language: lang }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Unable to send test notification.');
    }
    if (data.notification) {
      setNotifications((prev) => [data.notification, ...prev]);
    }
    return data.notification;
  };

  const handleSaveGmailSettings = async (email: string, appPassword: string) => {
    const res = await fetch('/api/admin/gmail-settings', {
      method: 'PUT',
      headers: buildAdminHeaders(accessToken, undefined, true),
      body: JSON.stringify({ email, appPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Unable to verify Gmail App Password.');
    }
    if (data.config) {
      setBackendConfig(data.config);
    }
  };

  const handleClearGmailSettings = async () => {
    const res = await fetch('/api/admin/gmail-settings', {
      method: 'DELETE',
      headers: buildAdminHeaders(accessToken),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Unable to remove Gmail SMTP settings.');
    }
    if (data.config) {
      setBackendConfig(data.config);
    }
  };

  const handleSaveBackendConfig = async (next: Partial<BackendConfig>) => {
    const res = await fetch('/api/admin/backend-config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(next),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Unable to save configuration.');
    }
    setBackendConfig(data);
  };

  const handleTestBackendConnection = async (webAppUrl: string) => {
    const res = await fetch('/api/admin/backend-config/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ appsScriptWebAppUrl: webAppUrl }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Verification failed.');
    }
    if (data.config) {
      setBackendConfig(data.config);
    }
  };

  const handleUploadBrandAsset = async (
    kind: 'logo' | 'mascot',
    name: string,
    base64: string
  ) => {
    const res = await fetch('/api/admin/brand-assets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ kind, name, base64 }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Upload failed.');
    }
    onBrandAssetsChange(data);
  };

  const handleResetBrandAsset = async (kind: 'logo' | 'mascot') => {
    const res = await fetch(`/api/admin/brand-assets/${kind}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Reset failed.');
    }
    onBrandAssetsChange(data);
  };

  if (authState === 'unauthenticated' || authState === 'loading') {
    return (
      <div className="min-h-screen bg-[#0F0521] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-xl">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-violet-100 text-[#4C1D95] mb-5">
            <Lock className="w-5 h-5" aria-hidden="true" />
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
            ZoZo Live Admin Dashboard
          </h1>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Restricted to the Owner and authorized ZoZo Live administrators. Sign in with your
            authorized Google account to review applications and private CVs.
          </p>

          {authError && (
            <div role="alert" className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {authError}
            </div>
          )}

          <div className="mt-6">
            <GoogleSignInButton
              onClick={() => handleLogin(false)}
              loading={isLoggingIn || authState === 'loading'}
            />
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500">
            Looking to apply?{' '}
            <a href="/" className="text-[#4C1D95] font-medium hover:underline">
              Open Public Recruitment Form
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (authState === 'denied') {
    return (
      <div className="min-h-screen bg-[#0F0521] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-xl">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-red-100 text-red-700 mb-5">
            <ShieldAlert className="w-5 h-5" aria-hidden="true" />
          </div>
          <h1 className="font-display text-xl font-bold text-slate-900">
            Access Denied
          </h1>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            {authError ||
              `${user?.email || 'This account'} does not have permission to view the ZoZo Live Admin Dashboard.`}
          </p>
          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={handleLogout}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#4C1D95] hover:bg-[#5B21B6] rounded-lg cursor-pointer"
            >
              Sign Out &amp; Switch Account
            </button>
            <a
              href="/"
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Public Portal
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFC] text-slate-900">
      {/* 3-Zone Admin Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand */}
          <span className="inline-flex items-center gap-2.5 font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
            <ZoZoLogo logoUrl={brandAssets.logoUrl} size="sm" />
            <span>ZoZo Live Admin</span>
          </span>

          {/* Zone 2: Admin Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setActiveTab('applications')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 tabular-nums ${
                activeTab === 'applications'
                  ? 'text-[#4C1D95] border-[#4C1D95]'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              Applications ({applications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('google-form')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                activeTab === 'google-form'
                  ? 'text-[#4C1D95] border-[#4C1D95]'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              Google Form
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('backend')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                activeTab === 'backend'
                  ? 'text-[#4C1D95] border-[#4C1D95]'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              Apps Script &amp; Sheets
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('brand')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                activeTab === 'brand'
                  ? 'text-[#4C1D95] border-[#4C1D95]'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              Logo &amp; Mascot
            </button>
          </nav>

          {/* Zone 3: Single Primary Action (Sign Out) */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => loadAdminWorkspace(accessToken)}
              aria-label="Refresh Admin Data"
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loadingApps ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Mobile Admin Subnav */}
        <div className="md:hidden border-t border-slate-100 px-4 py-2 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('applications')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap ${
              activeTab === 'applications' ? 'bg-violet-50 text-[#4C1D95]' : 'text-slate-600'
            }`}
          >
            Applications ({applications.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('google-form')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap ${
              activeTab === 'google-form' ? 'bg-violet-50 text-[#4C1D95]' : 'text-slate-600'
            }`}
          >
            Google Form
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('backend')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap ${
              activeTab === 'backend' ? 'bg-violet-50 text-[#4C1D95]' : 'text-slate-600'
            }`}
          >
            Apps Script &amp; Sheets
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('brand')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap ${
              activeTab === 'brand' ? 'bg-violet-50 text-[#4C1D95]' : 'text-slate-600'
            }`}
          >
            Logo &amp; Mascot
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'applications' && session && (
          <ApplicationsDashboard
            applications={applications}
            loading={loadingApps}
            error={appsError}
            initialSelectedId={initialSelectedId}
            accessToken={accessToken}
            onCreateApplication={handleCreateApplication}
            onUpdateApplication={handleUpdateApplication}
            onDelete={handleDeleteApplication}
            ownerEmail={session.ownerEmail}
            actorEmail={session.email}
            actorRole={session.role}
            canDelete={session.canDelete}
            adminEntries={adminEntries}
            onGrantAccess={handleGrantAccess}
            onRevokeAccess={handleRevokeAccess}
            notifications={notifications}
            backendConfig={backendConfig}
            onSendTestNotification={handleSendTestNotification}
            onSaveGmailSettings={handleSaveGmailSettings}
            onClearGmailSettings={handleClearGmailSettings}
          />
        )}

        {activeTab === 'google-form' && session && (
          <GoogleFormConnector
            config={backendConfig}
            actorRole={session.role}
            accessToken={workspaceToken}
            publicOrigin={publicOrigin}
            onSaveConfig={handleSaveBackendConfig}
            onReconnectGoogle={async () => {
              await handleLogin(true);
            }}
          />
        )}

        {activeTab === 'backend' && session && (
          <BackendSetupPanel
            config={backendConfig}
            actorRole={session.role}
            publicOrigin={publicOrigin}
            onSaveConfig={handleSaveBackendConfig}
            onTestConnection={handleTestBackendConnection}
          />
        )}

        {activeTab === 'brand' && session && (
          <BrandAssetsPanel
            assets={brandAssets}
            actorRole={session.role}
            onUploadAsset={handleUploadBrandAsset}
            onResetAsset={handleResetBrandAsset}
          />
        )}
      </main>
    </div>
  );
}
