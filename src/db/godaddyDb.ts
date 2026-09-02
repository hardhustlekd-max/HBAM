export const GODADDY_COLLECTIONS = {
  REGISTRATIONS: 'motorcycle_registrations',
  OFFICERS: 'officer_assignments',
  VERIFICATIONS: 'verification_logs',
  SETTINGS: 'system_settings',
  USERS: 'system_users',
  AUDIT_LOGS: 'system_audit_logs',
  UNREGISTERED_REPORTS: 'unregistered_reports',
  PAYMENT_RECEIPTS: 'payment_receipts',
} as const;

export type CollectionName = typeof GODADDY_COLLECTIONS[keyof typeof GODADDY_COLLECTIONS];

export interface GoDaddyDbConfig {
  host?: string;
  user?: string;
  password?: string;
  database?: string;
  port?: number;
  useLocalStorageFallback: boolean;
}

export function loadGoDaddyDbConfig(): GoDaddyDbConfig {
  const env: Record<string, string | undefined> =
    typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env as Record<string, string | undefined>)
      : typeof process !== 'undefined' && process.env
      ? (process.env as Record<string, string | undefined>)
      : {};

  return {
    host: env.VITE_DB_HOST || env.DB_HOST || env.MYSQL_HOST,
    user: env.VITE_DB_USER || env.DB_USER || env.MYSQL_USER,
    password: env.VITE_DB_PASSWORD || env.DB_PASSWORD || env.MYSQL_PASSWORD,
    database: env.VITE_DB_NAME || env.DB_NAME || env.MYSQL_DATABASE || 'hbams_db',
    port: env.VITE_DB_PORT ? parseInt(env.VITE_DB_PORT, 10) : env.DB_PORT ? parseInt(env.DB_PORT, 10) : 3306,
    useLocalStorageFallback: true,
  };
}

export const godaddyDbConfig = loadGoDaddyDbConfig();

export function isGoDaddyDbConfigured(): boolean {
  return true; // Always active (GoDaddy MySQL or GoDaddy Local Server Disk Database)
}

/**
 * Client-side API fetchers that send CRUD operations to the Express server routes (/api/db/*).
 * If running on the server itself, functions interact directly with storage or API.
 */
export async function fetchAllDocuments<T = any>(collection: string): Promise<T[]> {
  try {
    const response = await fetch(`/api/db/${collection}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn(`[GoDaddy DB Client] fetchAllDocuments failed for ${collection}, using offline fallback`, err);
    return [];
  }
}

export async function getDocument<T = any>(collection: string, id: string): Promise<T | null> {
  try {
    const response = await fetch(`/api/db/${collection}/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Server returned HTTP ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    console.warn(`[GoDaddy DB Client] getDocument failed for ${collection}/${id}`, err);
    return null;
  }
}

export async function upsertDocument<T extends { id: string }>(collection: string, id: string, docData: T): Promise<void> {
  try {
    const response = await fetch(`/api/db/${collection}/${encodeURIComponent(id)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(docData),
    });
    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }
  } catch (err) {
    console.error(`[GoDaddy DB Client] upsertDocument error for ${collection}/${id}:`, err);
    throw err;
  }
}

export async function updateDocumentFields(collection: string, id: string, fields: Record<string, any>): Promise<void> {
  try {
    const response = await fetch(`/api/db/${collection}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }
  } catch (err) {
    console.error(`[GoDaddy DB Client] updateDocumentFields error for ${collection}/${id}:`, err);
    throw err;
  }
}

export async function deleteDocument(collection: string, id: string): Promise<void> {
  try {
    const response = await fetch(`/api/db/${collection}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }
  } catch (err) {
    console.error(`[GoDaddy DB Client] deleteDocument error for ${collection}/${id}:`, err);
    throw err;
  }
}

export async function clearCollection(collection: string): Promise<void> {
  try {
    const response = await fetch(`/api/db/clear/${collection}`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }
  } catch (err) {
    console.error(`[GoDaddy DB Client] clearCollection error for ${collection}:`, err);
    throw err;
  }
}

/**
 * Helper to subscribe to collection documents via polling
 */
export function subscribeCollectionDocs<T = any>(
  collection: string,
  onData: (docs: T[]) => void,
  onError?: (err: any) => void
): () => void {
  let active = true;

  const fetchDocs = async () => {
    if (!active) return;
    try {
      const docs = await fetchAllDocuments<T>(collection);
      if (active) onData(docs);
    } catch (err) {
      if (active && onError) onError(err);
    }
  };

  fetchDocs();
  const intervalId = setInterval(fetchDocs, 10000); // 10s poll

  return () => {
    active = false;
    clearInterval(intervalId);
  };
}
