import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  type User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/forms.body',
  'https://www.googleapis.com/auth/forms.body.readonly',
  'https://www.googleapis.com/auth/forms.responses.readonly',
] as const;

const OAUTH_STORAGE_KEY = 'zozo_workspace_oauth_v1';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

// Keep admin signed in across page reloads and browser tabs
setPersistence(auth, browserLocalPersistence).catch(() => {
  // Ignore persistence fallback errors
});

function createGoogleProvider(forceConsent = false): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  for (const scope of SCOPES) {
    provider.addScope(scope);
  }
  provider.setCustomParameters({
    prompt: forceConsent ? 'consent' : 'select_account',
  });
  return provider;
}

function saveWorkspaceAccessToken(token: string) {
  try {
    const payload = {
      token,
      expiresAt: Date.now() + 50 * 60 * 1000, // 50 minutes safety window
    };
    localStorage.setItem(OAUTH_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage errors
  }
}

function readStoredWorkspaceAccessToken(): string {
  try {
    const raw = localStorage.getItem(OAUTH_STORAGE_KEY);
    if (!raw) return '';
    const parsed = JSON.parse(raw) as { token?: string; expiresAt?: number };
    if (!parsed.token || !parsed.expiresAt || parsed.expiresAt <= Date.now()) {
      localStorage.removeItem(OAUTH_STORAGE_KEY);
      return '';
    }
    return parsed.token;
  } catch {
    return '';
  }
}

function clearWorkspaceAccessToken() {
  try {
    localStorage.removeItem(OAUTH_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

let isSigningIn = false;

export function initAuth(
  onAuthSuccess?: (user: User, sessionToken: string, workspaceAccessToken: string) => void,
  onAuthFailure?: () => void
) {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (isSigningIn) return;
      try {
        const idToken = await user.getIdToken();
        const workspaceToken = readStoredWorkspaceAccessToken();
        onAuthSuccess?.(user, idToken, workspaceToken);
      } catch {
        onAuthFailure?.();
      }
    } else {
      clearWorkspaceAccessToken();
      onAuthFailure?.();
    }
  });
}

export async function googleSignIn(options?: {
  forceConsent?: boolean;
}): Promise<{ user: User; sessionToken: string; accessToken: string } | null> {
  try {
    isSigningIn = true;
    const provider = createGoogleProvider(Boolean(options?.forceConsent));
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const oauthToken = credential?.accessToken || '';
    if (oauthToken) {
      saveWorkspaceAccessToken(oauthToken);
    }
    const idToken = await result.user.getIdToken();
    return {
      user: result.user,
      sessionToken: idToken,
      accessToken: oauthToken,
    };
  } finally {
    isSigningIn = false;
  }
}

export async function getAccessToken(): Promise<string | null> {
  const stored = readStoredWorkspaceAccessToken();
  return stored || null;
}

export async function logout(): Promise<void> {
  clearWorkspaceAccessToken();
  await auth.signOut();
}
