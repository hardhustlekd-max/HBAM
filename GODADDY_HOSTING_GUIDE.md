# GoDaddy Hosting Deployment Guide (HBAM Permit System)

This guide provides step-by-step instructions to deploy the **HBAM Permit System** to **GoDaddy Web Hosting** (cPanel / Shared Hosting / Node.js Application Manager / VPS).

---

## Prerequisites

1. Active **GoDaddy Hosting Account** (cPanel Web Hosting, Web Hosting Plus, or VPS).
2. Domain registered or pointed to your GoDaddy hosting IP/Nameservers.

---

## Option 1: Static Deployment (GoDaddy cPanel Shared Hosting)

Use this method for standard GoDaddy Web Hosting (Apache / cPanel) serving the frontend client.

### Step 1: Build the Project
Run the production build command in your terminal:
```bash
npm run build
```
This generates a production-ready `dist/` folder containing all HTML, CSS, JavaScript, assets, and the `.htaccess` file.

### Step 2: Upload to GoDaddy cPanel
1. Log in to your **GoDaddy Account** and open **cPanel**.
2. Navigate to **File Manager** -> `public_html/`.
3. Select all files inside the `dist/` folder on your local machine and compress them into a `dist.zip` file.
4. Click **Upload** in cPanel File Manager and upload `dist.zip` into `public_html/`.
5. Extract `dist.zip` inside `public_html/`.
6. Ensure `.htaccess` (included automatically from `public/.htaccess`) is present in `public_html/` to enable Single-Page Application (SPA) routing.

---

## Option 2: Full-Stack Node.js Deployment (cPanel "Setup Node.js App")

Use this method if your GoDaddy plan supports the cPanel Node.js Application Manager.

### Step 1: Prepare Project Files
1. Run `npm run build` locally or directly on the server.
2. Ensure `dist/server.cjs` and `app.js` are present.

### Step 2: Configure Node.js App in cPanel
1. Open **cPanel** and click **Setup Node.js App** under **Software**.
2. Click **Create Application**.
3. Set the following fields:
   - **Node.js version**: Select `18.x`, `20.x`, or higher.
   - **Application mode**: `Production`.
   - **Application root**: `hbam` (or the folder where you uploaded project files).
   - **Application URL**: Your domain (e.g., `https://yourdomain.com`).
   - **Application startup file**: `app.js` (or `dist/server.cjs`).
4. Click **Create**.

### Step 3: Install Dependencies & Run
1. Upload project files (or clone from GitHub) into the application root folder.
2. In the cPanel Node.js App dashboard, click **Run npm install** or run `npm run build`.
3. Click **Restart Application**.

---

## Option 3: GoDaddy VPS / Dedicated Server (Linux / Nginx / PM2)

For GoDaddy Virtual Private Servers (VPS):

1. SSH into your GoDaddy server:
   ```bash
   ssh user@your-godaddy-ip
   ```
2. Clone the repository and install dependencies:
   ```bash
   git clone https://github.com/hardhustlekd-max/HBAM.git
   cd HBAM
   npm install
   npm run build
   ```
3. Start the application with PM2:
   ```bash
   npm install -g pm2
   pm2 start dist/server.cjs --name "hbam-permit"
   pm2 save
   pm2 startup
   ```
4. Configure Nginx reverse proxy to port `3000`.

---

## Environment Variables Configuration

If using Firebase database persistence, set your environment variables in your hosting environment (`.env` file or cPanel Environment Variables section):

```env
FIREBASE_PROJECT_ID=permit
PORT=3000
```

---

## Troubleshooting "Process exited before becoming ready" on GoDaddy

If GoDaddy's cPanel Node.js App Manager shows `Process exited before becoming ready`:

1. **Automatic Port / Socket Listening**:
   - GoDaddy Phusion Passenger passes a Unix domain socket path in `process.env.PORT`.
   - The server code in `server.ts` handles socket strings dynamically so Express binds directly to Passenger's IPC channel.

2. **Automated Production Build on Startup**:
   - The launcher scripts `app.js` and `server.js` automatically check if `dist/server.cjs` exists.
   - If `dist/` is missing when GoDaddy boots the app, `app.js` runs `npm run build` on the fly before launching Express.

3. **Application Startup File Field**:
   - In GoDaddy cPanel Node.js App UI, set **Application startup file** to `app.js` or `server.js` or `dist/server.cjs`.

---

## Support & Verification

- Test health probe: `https://yourdomain.com/api/health`
- Verify SPA navigation refresh behavior (handled by `.htaccess`).
