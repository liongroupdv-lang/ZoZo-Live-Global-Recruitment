import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  collection,
  deleteField,
  doc,
  getDocFromServer,
  getDocs,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type {
  AdminAccessEntry,
  RecruitmentApplication,
  UpdateApplicationPayload,
} from '../types/recruitment';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const CV_CHUNK_CHAR_SIZE = 600_000;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

if (typeof window !== 'undefined') {
  void testConnection();
}

export function emailToAccessKey(email: string): string {
  return email
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_');
}

function clampString(val: string | undefined | null, maxLen: number, fallback = ''): string {
  const cleaned = String(val ?? '').trim();
  const effective = cleaned || fallback;
  return effective.length > maxLen ? effective.slice(0, maxLen) : effective;
}

function splitBase64Chunks(rawBase64: string): string[] {
  const clean = rawBase64.includes(',') ? rawBase64.split(',').pop() || '' : rawBase64;
  if (!clean) return [];
  const chunks: string[] = [];
  for (let i = 0; i < clean.length; i += CV_CHUNK_CHAR_SIZE) {
    chunks.push(clean.slice(i, i + CV_CHUNK_CHAR_SIZE));
  }
  return chunks;
}

export async function saveApplicationToFirestore(
  record: RecruitmentApplication,
  cvBase64?: string
): Promise<number> {
  const path = `applications/${record.id}`;
  const chunks = cvBase64 ? splitBase64Chunks(cvBase64) : [];

  const docPayload: Record<string, unknown> = {
    id: clampString(record.id, 64),
    name: clampString(record.name, 200, 'Applicant'),
    country: clampString(record.country, 200, 'Global'),
    countryFlag: clampString(record.countryFlag, 32, ''),
    countryName: clampString(record.countryName || record.country, 160, 'Global'),
    whatsapp: clampString(record.whatsapp, 40),
    position: record.position,
    currentApp: clampString(record.currentApp, 200, 'Live App'),
    workExperience: clampString(record.workExperience, 5000, '—'),
    cvFileName: clampString(record.cvFileName, 260, 'cv.pdf'),
    cvMimeType: clampString(record.cvMimeType, 160, ''),
    cvFileSize: Math.max(0, Math.min(5242880, Math.trunc(Number(record.cvFileSize) || 0))),
    cvLink: clampString(record.cvLink, 500, ''),
    status: record.status || 'Pending',
    submittedAt: clampString(record.submittedAt, 64, new Date().toISOString()),
    language: record.language === 'bn' ? 'bn' : 'en',
    appsScriptSynced: Boolean(record.appsScriptSynced),
    cvChunkCount: chunks.length,
    createdAt: serverTimestamp(),
  };

  if (record.sourceOrigin) {
    docPayload.sourceOrigin = clampString(record.sourceOrigin, 300);
  }
  if (record.driveCvUrl) {
    docPayload.driveCvUrl = clampString(record.driveCvUrl, 500);
  }

  if (record.position === 'Super Admin') {
    docPayload.adminsCount = Math.max(0, Math.min(100000, Math.trunc(Number(record.adminsCount) || 0)));
    docPayload.agenciesCount = Math.max(0, Math.min(100000, Math.trunc(Number(record.agenciesCount) || 0)));
  } else if (record.position === 'Admin') {
    docPayload.agenciesCount = Math.max(0, Math.min(100000, Math.trunc(Number(record.agenciesCount) || 0)));
  } else if (record.position === 'Coin Seller') {
    docPayload.coinPackage = record.coinPackage || '$500';
  }

  try {
    const batch = writeBatch(db);
    const appRef = doc(db, 'applications', record.id);
    batch.set(appRef, docPayload);

    chunks.forEach((chunkData, idx) => {
      const chunkRef = doc(db, 'applications', record.id, 'cvChunks', `chunk_${idx}`);
      batch.set(chunkRef, {
        applicationId: record.id,
        index: idx,
        data: chunkData,
        createdAt: serverTimestamp(),
      });
    });

    await batch.commit();
    return chunks.length;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeToApplicationsFromFirestore(
  onData: (apps: RecruitmentApplication[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'applications';
  const q = query(collection(db, path), orderBy('submittedAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: RecruitmentApplication[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        items.push({
          id: String(d.id || docSnap.id),
          name: String(d.name || ''),
          country: String(d.country || ''),
          countryFlag: String(d.countryFlag || ''),
          countryName: String(d.countryName || d.country || ''),
          whatsapp: String(d.whatsapp || ''),
          position: d.position,
          currentApp: String(d.currentApp || ''),
          adminsCount: typeof d.adminsCount === 'number' ? d.adminsCount : undefined,
          agenciesCount: typeof d.agenciesCount === 'number' ? d.agenciesCount : undefined,
          coinPackage: d.coinPackage,
          workExperience: String(d.workExperience || ''),
          cvFileName: String(d.cvFileName || ''),
          cvMimeType: String(d.cvMimeType || ''),
          cvFileSize: typeof d.cvFileSize === 'number' ? d.cvFileSize : 0,
          cvLink: String(d.cvLink || ''),
          driveCvUrl: d.driveCvUrl ? String(d.driveCvUrl) : undefined,
          sourceOrigin: d.sourceOrigin ? String(d.sourceOrigin) : undefined,
          cvChunkCount: typeof d.cvChunkCount === 'number' ? d.cvChunkCount : undefined,
          status: d.status || 'Pending',
          submittedAt: String(d.submittedAt || ''),
          language: d.language === 'bn' ? 'bn' : 'en',
          appsScriptSynced: Boolean(d.appsScriptSynced),
        });
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError?.(wrapped instanceof Error ? wrapped : new Error(String(error)));
      }
    }
  );
}

export async function downloadCvFromFirestore(
  applicationId: string
): Promise<{ base64: string; chunkCount: number } | null> {
  const path = `applications/${applicationId}/cvChunks`;
  try {
    const q = query(collection(db, 'applications', applicationId, 'cvChunks'), orderBy('index', 'asc'));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const parts: string[] = [];
    snap.forEach((d) => {
      const data = d.data();
      if (typeof data.data === 'string') {
        parts.push(data.data);
      }
    });
    const combined = parts.join('');
    if (!combined) return null;
    return { base64: combined, chunkCount: snap.size };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function updateApplicationInFirestore(
  id: string,
  existingApp: RecruitmentApplication | undefined,
  payload: UpdateApplicationPayload & { driveCvUrl?: string; appsScriptSynced?: boolean }
): Promise<void> {
  const path = `applications/${id}`;
  const updates: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (payload.name !== undefined) updates.name = clampString(payload.name, 200);
  if (payload.country !== undefined) updates.country = clampString(payload.country, 200);
  if (payload.countryFlag !== undefined) updates.countryFlag = clampString(payload.countryFlag, 32);
  if (payload.countryName !== undefined) updates.countryName = clampString(payload.countryName, 160);
  if (payload.whatsapp !== undefined) updates.whatsapp = clampString(payload.whatsapp, 40);
  if (payload.currentApp !== undefined) updates.currentApp = clampString(payload.currentApp, 200);
  if (payload.workExperience !== undefined) updates.workExperience = clampString(payload.workExperience, 5000);
  if (payload.status !== undefined) updates.status = payload.status;
  if (payload.driveCvUrl !== undefined) updates.driveCvUrl = clampString(payload.driveCvUrl, 500);
  if (payload.appsScriptSynced !== undefined) updates.appsScriptSynced = Boolean(payload.appsScriptSynced);

  const nextPosition = payload.position ?? existingApp?.position;
  if (payload.position !== undefined) {
    updates.position = payload.position;
  }

  if (nextPosition === 'Super Admin') {
    if (payload.adminsCount !== undefined || payload.position !== undefined) {
      updates.adminsCount = Math.max(
        0,
        Math.trunc(Number(payload.adminsCount ?? existingApp?.adminsCount ?? 0))
      );
    }
    if (payload.agenciesCount !== undefined || payload.position !== undefined) {
      updates.agenciesCount = Math.max(
        0,
        Math.trunc(Number(payload.agenciesCount ?? existingApp?.agenciesCount ?? 0))
      );
    }
    updates.coinPackage = deleteField();
  } else if (nextPosition === 'Admin') {
    if (payload.agenciesCount !== undefined || payload.position !== undefined) {
      updates.agenciesCount = Math.max(
        0,
        Math.trunc(Number(payload.agenciesCount ?? existingApp?.agenciesCount ?? 0))
      );
    }
    updates.adminsCount = deleteField();
    updates.coinPackage = deleteField();
  } else if (nextPosition === 'Coin Seller') {
    if (payload.coinPackage !== undefined || payload.position !== undefined) {
      updates.coinPackage = payload.coinPackage ?? existingApp?.coinPackage ?? '$500';
    }
    updates.adminsCount = deleteField();
    updates.agenciesCount = deleteField();
  }

  try {
    await updateDoc(doc(db, 'applications', id), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteApplicationFromFirestore(id: string): Promise<void> {
  const path = `applications/${id}`;
  try {
    const chunkSnap = await getDocs(collection(db, 'applications', id, 'cvChunks'));
    const batch = writeBatch(db);
    chunkSnap.forEach((d) => {
      batch.delete(d.ref);
    });
    batch.delete(doc(db, 'applications', id));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncAdminAccessToFirestore(entry: AdminAccessEntry): Promise<void> {
  const key = emailToAccessKey(entry.email);
  const path = `adminAccess/${key}`;
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'adminAccess', key), {
      email: clampString(entry.email.toLowerCase(), 200),
      role: entry.role,
      canDelete: Boolean(entry.canDelete),
      grantedAt: clampString(entry.grantedAt, 64, new Date().toISOString()),
      grantedBy: clampString(entry.grantedBy.toLowerCase(), 200),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function revokeAdminAccessFromFirestore(email: string): Promise<void> {
  const key = emailToAccessKey(email);
  const path = `adminAccess/${key}`;
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'adminAccess', key));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
