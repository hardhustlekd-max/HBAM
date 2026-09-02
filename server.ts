import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ override: true });

const DEFAULT_SETTINGS = {
  officerName: 'አበበ ደስታ (Abebe Desta)',
  department: 'የትራፊክ ማኔጅመንትና ህግ ማስከበሪያ (Traffic Mgmt & Enforcement)',
  subCityOffice: 'በላይ ዘለቀ ክፍለ ከተማ (Belay Zeleke)',
  defaultPrinter: 'Zebra ZD621 Industrial PVC Card Printer',
  cardStockType: 'CR80 Standard PVC Card (85.6 x 54 mm)',
  calendarSystem: 'ethiopian',
  autoPrintQR: true,
  emailAlerts: true,
  security2FA: true,
  highRiskAlerts: true,
  systemResetEpoch: 0,
  lastSystemResetAt: '',
};

const SYSTEM_ROLE_CREDENTIALS = {
  clerk: {
    role: 'clerk',
    badgeId: 'CLERK-209',
    email: 'clerk@addisababa.gov.et',
    fullName: 'ሳራ ተሾመ (Sara Teshome)',
  },
  admin: {
    role: 'admin',
    badgeId: 'ADMIN-001',
    email: 'admin@addisababa.gov.et',
    fullName: 'ዳዊት ኃይሌ (Dawit Haile)',
  },
  officer: {
    role: 'officer',
    badgeId: 'OFFICER-442',
    email: 'officer@addisababa.gov.et',
    fullName: 'አበበ ደስታ (Abebe Desta)',
  },
  superadmin: {
    role: 'superadmin',
    badgeId: 'SUPER-ADMIN-01',
    email: 'superadmin@permit.gov.et',
    fullName: 'ካሌብ ታደሰ (Kaleb Tadesse - Chief Super Admin)',
  },
};

// --- GODADDY LOCAL DISK DATABASE & FILE STORAGE ENGINE ---
const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const DB_FILE_PATH = path.join(DATA_DIR, 'db.json');

// Ensure data and uploads directories exist on GoDaddy host
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

interface GoDaddyStore {
  motorcycle_registrations: Record<string, any>;
  officer_assignments: Record<string, any>;
  verification_logs: Record<string, any>;
  system_settings: Record<string, any>;
  system_users: Record<string, any>;
  system_audit_logs: Record<string, any>;
  unregistered_reports: Record<string, any>;
  payment_receipts: Record<string, any>;
}

function loadGoDaddyStore(): GoDaddyStore {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const content = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.warn('[GoDaddy DB Engine] Warning reading local disk store, initializing fresh store:', err);
  }

  return {
    motorcycle_registrations: {},
    officer_assignments: {},
    verification_logs: {},
    system_settings: { global_config: { id: 'global_config', ...DEFAULT_SETTINGS } },
    system_users: {},
    system_audit_logs: {},
    unregistered_reports: {},
    payment_receipts: {},
  };
}

function saveGoDaddyStore(store: GoDaddyStore): void {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('[GoDaddy DB Engine] Failed to write database to disk:', err);
  }
}

let storeMemory: GoDaddyStore = loadGoDaddyStore();

// Seed initial system users if store is empty
if (Object.keys(storeMemory.system_users).length === 0) {
  const defaultUsers = Object.values(SYSTEM_ROLE_CREDENTIALS).map((cred) => ({
    id: `user-${cred.role}-${cred.badgeId}`,
    uid: `user-${cred.role}-${cred.badgeId}`,
    badgeId: cred.badgeId,
    email: cred.email,
    fullName: cred.fullName,
    role: cred.role,
    createdAt: new Date().toISOString(),
  }));
  for (const u of defaultUsers) {
    storeMemory.system_users[u.id] = u;
  }
  saveGoDaddyStore(storeMemory);
}

export const app = express();
const PORT = process.env.PORT || 3000;

// Serve GoDaddy local host uploads folder statically
app.use('/uploads', express.static(UPLOADS_DIR));

// JSON body parser with increased limits for handling document and portrait photos
app.use(express.json({ limit: '25mb' }));

// Vercel / proxy path normalization middleware
app.use((req, res, next) => {
  if (req.url.startsWith('/api/index.ts')) {
    req.url = req.url.replace('/api/index.ts', '/api');
  } else if (req.url.startsWith('/api/index')) {
    req.url = req.url.replace('/api/index', '/api');
  }

  const isViteAsset =
    req.url.startsWith('/src') ||
    req.url.startsWith('/node_modules') ||
    req.url.startsWith('/@id') ||
    req.url.startsWith('/@vite') ||
    req.url.startsWith('/@react-refresh') ||
    req.url.startsWith('/favicon.ico') ||
    /\.(tsx|ts|js|jsx|css|mjs|json|png|jpg|jpeg|gif|svg|webp|woff2?|ttf|otf|eot|map)$/.test(req.url.split('?')[0]);

  if (
    !isViteAsset &&
    !req.url.startsWith('/api') &&
    !req.url.startsWith('/uploads') &&
    !req.url.startsWith('/static') &&
    !req.url.startsWith('/assets') &&
    !req.url.startsWith('/@') &&
    req.url !== '/' &&
    !req.url.startsWith('/index.html')
  ) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }

  if (req.url === '/api' || req.url === '/api/') {
    req.url = '/api/health';
  }
  next();
});

console.log('[GoDaddy Server] Initialized with GoDaddy Hosting Database & File Storage Engine');

// --- FILE STORAGE UPLOAD ENDPOINT ---
app.post('/api/upload', (req, res) => {
  try {
    const { imageBase64, folder = 'permits' } = req.body;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid imageBase64 string' });
    }

    const folderPath = path.join(UPLOADS_DIR, folder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    // Extract base64 data
    const matches = imageBase64.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    let buffer: Buffer;
    let ext = 'jpg';

    if (matches && matches.length === 3) {
      ext = matches[1].split('/')[1] || 'jpg';
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    }

    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
    const filePath = path.join(folderPath, fileName);

    fs.writeFileSync(filePath, buffer);

    const relativeUrl = `/uploads/${folder}/${fileName}`;
    return res.json({ success: true, url: relativeUrl });
  } catch (err: any) {
    console.error('[GoDaddy Storage] Upload error:', err);
    return res.status(500).json({ error: 'Failed to upload image to GoDaddy hosting disk', message: err.message });
  }
});

// --- GODADDY GENERIC DATABASE CRUD ROUTE ENDPOINTS ---
app.get('/api/db/:collection', (req, res) => {
  const { collection } = req.params;
  const colKey = collection as keyof GoDaddyStore;
  if (!storeMemory[colKey]) {
    storeMemory[colKey] = {};
  }
  const items = Object.values(storeMemory[colKey]);
  return res.json(items);
});

app.get('/api/db/:collection/:id', (req, res) => {
  const { collection, id } = req.params;
  const colKey = collection as keyof GoDaddyStore;
  if (!storeMemory[colKey] || !storeMemory[colKey][id]) {
    return res.status(404).json({ error: 'Document not found' });
  }
  return res.json(storeMemory[colKey][id]);
});

app.post('/api/db/:collection/:id', (req, res) => {
  const { collection, id } = req.params;
  const docData = req.body;
  const colKey = collection as keyof GoDaddyStore;

  if (!storeMemory[colKey]) {
    storeMemory[colKey] = {};
  }
  storeMemory[colKey][id] = { ...docData, id, updatedAt: new Date().toISOString() };
  saveGoDaddyStore(storeMemory);
  return res.json({ success: true, data: storeMemory[colKey][id] });
});

app.put('/api/db/:collection/:id', (req, res) => {
  const { collection, id } = req.params;
  const updates = req.body;
  const colKey = collection as keyof GoDaddyStore;

  if (!storeMemory[colKey]) {
    storeMemory[colKey] = {};
  }
  const existing = storeMemory[colKey][id] || { id };
  storeMemory[colKey][id] = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  saveGoDaddyStore(storeMemory);
  return res.json({ success: true, data: storeMemory[colKey][id] });
});

app.delete('/api/db/:collection/:id', (req, res) => {
  const { collection, id } = req.params;
  const colKey = collection as keyof GoDaddyStore;

  if (storeMemory[colKey] && storeMemory[colKey][id]) {
    delete storeMemory[colKey][id];
    saveGoDaddyStore(storeMemory);
  }
  return res.json({ success: true });
});

app.post('/api/db/clear/:collection', (req, res) => {
  const { collection } = req.params;
  const colKey = collection as keyof GoDaddyStore;

  storeMemory[colKey] = {};
  saveGoDaddyStore(storeMemory);
  return res.json({ success: true });
});

// --- API HEALTH & APPLICATION SPECIFIC ENDPOINTS ---
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: 'godaddy-hosting',
    storage: 'godaddy-local-disk',
    configured: true,
  });
});

// Authentication endpoints
app.post('/api/auth/login', (req, res) => {
  try {
    const { role, badgeId } = req.body;
    const cleanBadge = badgeId ? String(badgeId).trim() : '';

    if (!cleanBadge) {
      return res.status(400).json({ success: false, error: 'Badge ID or Email is required' });
    }

    const users = Object.values(storeMemory.system_users);
    let matchedUser = users.find(
      (u: any) =>
        (u.badgeId && u.badgeId.toLowerCase() === cleanBadge.toLowerCase()) ||
        (u.email && u.email.toLowerCase() === cleanBadge.toLowerCase())
    );

    if (!matchedUser) {
      let userRole = role || 'clerk';
      let fullName = 'System Clerk';
      const upperBadge = cleanBadge.toUpperCase();

      if (upperBadge.includes('SUPER') || upperBadge === 'SUPER-ADMIN-01') {
        userRole = 'superadmin';
        fullName = 'Kaleb Tadesse (Chief Super Admin)';
      } else if (upperBadge.includes('ADMIN') || upperBadge === 'ADMIN-PRO-1') {
        userRole = 'admin';
        fullName = 'Worku Bekele (System Admin)';
      } else if (upperBadge.includes('OFFICER') || upperBadge === 'OFFICER-8842') {
        userRole = 'officer';
        fullName = 'Insp. Solomon Girma';
      } else {
        userRole = role || 'clerk';
        fullName = 'Abebe Bikila (Primary Clerk)';
      }

      const defaultCred =
        SYSTEM_ROLE_CREDENTIALS[userRole as keyof typeof SYSTEM_ROLE_CREDENTIALS] || SYSTEM_ROLE_CREDENTIALS.clerk;

      matchedUser = {
        id: `user-${userRole}-${cleanBadge}`,
        uid: `user-${userRole}-${cleanBadge}`,
        badgeId: cleanBadge,
        email: cleanBadge.includes('@') ? cleanBadge : defaultCred.email,
        fullName: defaultCred.fullName || fullName,
        role: userRole,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      storeMemory.system_users[matchedUser.id] = matchedUser;
      saveGoDaddyStore(storeMemory);
    } else {
      matchedUser.lastLoginAt = new Date().toISOString();
      storeMemory.system_users[matchedUser.id] = matchedUser;
      saveGoDaddyStore(storeMemory);
    }

    res.json({ success: true, user: matchedUser });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

app.get('/api/auth/users', (req, res) => {
  res.json({ success: true, users: Object.values(storeMemory.system_users) });
});

app.post('/api/auth/users', (req, res) => {
  const userData = req.body;
  if (!userData.badgeId && !userData.uid && !userData.id) {
    return res.status(400).json({ success: false, error: 'Missing user ID or badge ID' });
  }
  const userId = userData.id || userData.uid || `user-${userData.role || 'clerk'}-${userData.badgeId}`;
  const formattedUser = {
    id: userId,
    uid: userId,
    badgeId: userData.badgeId || userId,
    email: userData.email || `${userData.badgeId.toLowerCase()}@permit.gov.et`,
    fullName: userData.fullName || 'System User',
    role: userData.role || 'clerk',
    subCity: userData.subCity || 'Central Command',
    status: userData.status || 'active',
    createdAt: userData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  storeMemory.system_users[userId] = formattedUser;
  saveGoDaddyStore(storeMemory);
  res.json({ success: true, user: formattedUser });
});

app.post('/api/auth/users/update', (req, res) => {
  const { id, updates } = req.body;
  if (!id) return res.status(400).json({ success: false, error: 'Missing user ID' });
  if (storeMemory.system_users[id]) {
    storeMemory.system_users[id] = { ...storeMemory.system_users[id], ...updates, updatedAt: new Date().toISOString() };
    saveGoDaddyStore(storeMemory);
  }
  res.json({ success: true });
});

app.post('/api/auth/change-password', (req, res) => {
  const { badgeId, role, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, error: 'New password must be at least 6 characters long' });
  }
  const cleanBadge = (badgeId || '').trim().toLowerCase();
  const users = Object.values(storeMemory.system_users);
  const matched = users.find(
    (u: any) => u.badgeId?.toLowerCase() === cleanBadge || u.role?.toLowerCase() === (role || '').toLowerCase()
  );
  if (matched) {
    matched.password = newPassword;
    matched.passwordUpdatedAt = new Date().toISOString();
    storeMemory.system_users[matched.id] = matched;
    saveGoDaddyStore(storeMemory);
  }
  res.json({ success: true, message: 'Password updated successfully' });
});

app.delete('/api/auth/users/:id', (req, res) => {
  const { id } = req.params;
  if (storeMemory.system_users[id]) {
    delete storeMemory.system_users[id];
    saveGoDaddyStore(storeMemory);
  }
  res.json({ success: true });
});

// Full Sync endpoint
app.get('/api/sync', (req, res) => {
  res.json({
    registrations: Object.values(storeMemory.motorcycle_registrations),
    officers: Object.values(storeMemory.officer_assignments),
    verifications: Object.values(storeMemory.verification_logs),
    settings: storeMemory.system_settings['global_config'] || DEFAULT_SETTINGS,
    configured: true,
  });
});

app.post('/api/registrations', (req, res) => {
  const reg = req.body;
  if (!reg.id) return res.status(400).json({ success: false, error: 'Missing registration ID' });
  storeMemory.motorcycle_registrations[reg.id] = reg;
  saveGoDaddyStore(storeMemory);
  res.json({ success: true });
});

app.post('/api/registrations/status', (req, res) => {
  const { id, status, rejectionReason } = req.body;
  if (!id) return res.status(400).json({ error: 'Missing registration ID' });
  if (storeMemory.motorcycle_registrations[id]) {
    storeMemory.motorcycle_registrations[id].status = status;
    if (rejectionReason !== undefined) {
      storeMemory.motorcycle_registrations[id].rejectionReason = rejectionReason;
    }
    saveGoDaddyStore(storeMemory);
  }
  res.json({ success: true });
});

app.post('/api/officers', (req, res) => {
  const officer = req.body;
  if (!officer.id) return res.status(400).json({ error: 'Missing officer ID' });
  storeMemory.officer_assignments[officer.id] = officer;
  saveGoDaddyStore(storeMemory);
  res.json({ success: true });
});

app.post('/api/officers/update', (req, res) => {
  const { id, updates } = req.body;
  if (!id) return res.status(400).json({ error: 'Missing officer ID' });
  if (storeMemory.officer_assignments[id]) {
    storeMemory.officer_assignments[id] = { ...storeMemory.officer_assignments[id], ...updates };
    saveGoDaddyStore(storeMemory);
  }
  res.json({ success: true });
});

app.post('/api/verification-logs', (req, res) => {
  const log = req.body;
  if (!log.id) return res.status(400).json({ error: 'Missing log ID' });
  storeMemory.verification_logs[log.id] = log;
  saveGoDaddyStore(storeMemory);
  res.json({ success: true });
});

app.post('/api/settings', (req, res) => {
  const settings = req.body;
  storeMemory.system_settings['global_config'] = { id: 'global_config', ...settings };
  saveGoDaddyStore(storeMemory);
  res.json({ success: true });
});

app.post('/api/reset-database', (req, res) => {
  const resetEpoch = Number(req.body?.systemResetEpoch) || Date.now();
  const resetIso = req.body?.lastSystemResetAt || new Date().toISOString();

  storeMemory = {
    motorcycle_registrations: {},
    officer_assignments: {},
    verification_logs: {},
    system_settings: {
      global_config: { id: 'global_config', ...DEFAULT_SETTINGS, systemResetEpoch: resetEpoch, lastSystemResetAt: resetIso },
    },
    system_users: {},
    system_audit_logs: {},
    unregistered_reports: {},
    payment_receipts: {},
  };

  // Re-seed default users
  const defaultUsers = Object.values(SYSTEM_ROLE_CREDENTIALS).map((cred) => ({
    id: `user-${cred.role}-${cred.badgeId}`,
    uid: `user-${cred.role}-${cred.badgeId}`,
    badgeId: cred.badgeId,
    email: cred.email,
    fullName: cred.fullName,
    role: cred.role,
    createdAt: new Date().toISOString(),
  }));
  for (const u of defaultUsers) {
    storeMemory.system_users[u.id] = u;
  }
  saveGoDaddyStore(storeMemory);

  res.json({
    success: true,
    message: 'GoDaddy hosting database reset successfully',
    systemResetEpoch: resetEpoch,
    lastSystemResetAt: resetIso,
  });
});

app.post('/api/reset-data', (req, res) => {
  const resetEpoch = Number(req.body?.systemResetEpoch) || Date.now();
  const resetIso = req.body?.lastSystemResetAt || new Date().toISOString();

  storeMemory.motorcycle_registrations = {};
  storeMemory.verification_logs = {};
  storeMemory.unregistered_reports = {};
  storeMemory.payment_receipts = {};
  storeMemory.system_audit_logs = {};
  storeMemory.system_settings['global_config'] = {
    ...DEFAULT_SETTINGS,
    systemResetEpoch: resetEpoch,
    lastSystemResetAt: resetIso,
  };
  saveGoDaddyStore(storeMemory);

  res.json({ success: true, systemResetEpoch: resetEpoch, lastSystemResetAt: resetIso });
});

// 404 JSON fallback for unmatched /api routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: `API endpoint ${req.originalUrl || req.url} not found` });
});

// Global Express error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[GoDaddy Server Error]', err);
  res.status(500).json({ error: 'Internal Server Error', message: err?.message || String(err) });
});

// --- VITE MIDDLEWARE FOR DEVELOPMENT AND STATIC SERVING FOR PRODUCTION ---
const isServerless = Boolean(
  process.env.VERCEL ||
    process.env.VERCEL_ENV ||
    process.env.NOW_REGION ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT
);

if (!isServerless) {
  async function startStandaloneServer() {
    if (process.env.NODE_ENV !== 'production') {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
        app.get('*', (req, res) => {
          res.sendFile(path.join(distPath, 'index.html'));
        });
      }
    }

    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`[GoDaddy Server] Full-stack application running and listening on ${port}`);
    });
  }
  startStandaloneServer().catch((err) => {
    console.error('[GoDaddy Server] Failed to start standalone server:', err);
  });
}

export default app;
