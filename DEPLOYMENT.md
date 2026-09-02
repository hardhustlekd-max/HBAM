# HBAM Application Deployment Guide

This guide details step-by-step instructions for deploying the **HBAM Municipal Permit & Vehicle Management System** to production hosting environments outside Google AI Studio, specifically **GoDaddy Node.js Hosting** (cPanel / Phusion Passenger) or standard Node.js VPS/cloud environments.

---

## 1. System Requirements

- **Node.js**: Version **`18.x`** or **`20.x`** (LTS recommended)
- **NPM**: Version **`9.x`** or higher
- **Storage**: Minimum 500 MB disk space for application files, built assets, and local uploads directory.

---

## 2. Environment Variables Setup

Create a file named `.env` in the root directory of your server by copying `.env.example`:

```bash
cp .env.example .env
```

### Server-Only Variables (Keep Private!)
These variables are processed on the server side in `server.ts` / `dist/server.cjs` and **MUST NOT** be exposed to the browser.

| Environment Variable | Description | Default / Example |
|---|---|---|
| `NODE_ENV` | Runtime mode (`production`) | `production` |
| `PORT` | Hosting assigned server port | Dynamically provided by host (e.g. `3000`) |
| `HOST` | Bind host address | `0.0.0.0` |
| `GEMINI_API_KEY` | Secret Google Gemini API Key for server-side AI processing | `AIzaSy...` |
| `DB_HOST` | Optional MySQL Host | `localhost` |
| `DB_USER` | Optional MySQL Username | `hbams_user` |
| `DB_PASSWORD` | Optional MySQL Password | `SecretPass123` |
| `DB_NAME` | Optional MySQL Database Name | `hbams_db` |

### Client-Safe Variables (Exposed in Vite Bundle)
These variables configure Firebase / frontend connections and are safe to expose in the compiled frontend bundle.

| Environment Variable | Description |
|---|---|
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID |
| `VITE_FIREBASE_API_KEY` | Firebase Client Web API Key |
| `VITE_FIREBASE_APP_ID` | Firebase App ID |
| `VITE_FIREBASE_FIRESTORE_DATABASE_ID` | Firestore Database ID (`permit`) |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket URL |

---

## 3. Local Build & Test Verification

Before uploading to GoDaddy or production server, build and test locally:

```bash
# 1. Install production & build dependencies
npm install

# 2. Build Vite static assets and bundle server.ts -> dist/server.cjs
npm run build

# 3. Test production server execution
npm start
```

When running `npm start`, the server outputs:
`[Production Server] Application listening on host 0.0.0.0 and port 3000 (NODE_ENV=production)`

---

## 4. GoDaddy cPanel / Node.js Setup Instructions

### Step A: Setup Node.js Application in cPanel
1. Log into your **GoDaddy Hosting Control Panel (cPanel)**.
2. Under the **Software** section, click **Setup Node.js App**.
3. Click **Create Application**.
4. Fill in the following application settings:
   - **Node.js version**: Select `18.x` or `20.x`.
   - **Application mode**: Select `Production`.
   - **Application root**: `hbams` (or your application folder name).
   - **Application URL**: Select your domain or sub-domain (e.g., `permit.yourdomain.com`).
   - **Application startup file**: `dist/server.cjs`
5. Click **Create**.

### Step B: Upload Application Files
Upload your application files to the specified application root directory via cPanel File Manager or FTP/SSH:
- Upload all source files (`src/`, `server.ts`, `package.json`, `vite.config.ts`, `.env`, etc.).
- **DO NOT upload `node_modules`**.

### Step C: Run Build & Install Dependencies
In cPanel Node.js Selector terminal (or SSH):
```bash
# Enter virtualenv command provided at top of cPanel Node.js UI
npm install
npm run build
```

### Step D: Restart Node.js Application
1. In cPanel **Setup Node.js App**, click **Restart**.
2. Visit your domain URL to verify the application loads smoothly.

---

## 5. Client-Side SPA Routing & Asset Handling

- The production server (`dist/server.cjs`) serves static assets from `dist/` directly.
- Direct navigation to SPA routes such as `/dashboard`, `/login`, `/settings`, `/forms`, `/tables`, `/payments`, etc., automatically fall back to `dist/index.html`.
- Server API routes under `/api/*` and file uploads under `/uploads/*` are preserved and bypass SPA fallback.

---

## 6. Gemini AI Security

- Gemini requests are proxied via server endpoint `/api/gemini`.
- `GEMINI_API_KEY` remains strictly server-side in `.env` and is never exposed in client bundles.
- In case `GEMINI_API_KEY` is missing, the API returns a structured JSON error (`503 Service Unavailable`) explaining that server AI key configuration is required.
