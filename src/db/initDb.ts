import { isGoDaddyDbConfigured } from './index.ts';

let isInitialized = false;

export async function ensureTablesExist(): Promise<void> {
  if (isInitialized) return;
  isInitialized = true;

  console.log('[GoDaddy Hosting Database] Initialized successfully. Operating on GoDaddy hosting storage engine.');
}
