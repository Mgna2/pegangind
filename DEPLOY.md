# Deploy to Vercel

## Prerequisites

1. **GitHub repository** — push your code to GitHub
2. **Turso account** — https://turso.tech (free tier available)
3. **Vercel account** — https://vercel.com (connected to GitHub)

## Step 1: Set up Turso Database

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Login
turso auth login

# Create database
turso db create pegangind

# Get database URL (add to Vercel env vars)
turso db show pegangind --url

# Create auth token (add to Vercel env vars)
turso db tokens create pegangind
```

## Step 2: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/your-repo.git
git push -u origin main
```

## Step 3: Deploy to Vercel

1. Go to https://vercel.com and click **Add New Project**
2. Select your GitHub repository
3. Under **Environment Variables**, add:

| Key | Value |
|-----|-------|
| `TURSO_DATABASE_URL` | `libsql://your-db-name-your-org.turso.io` |
| `TURSO_AUTH_TOKEN` | Your Turso auth token |
| `JWT_SECRET` | Random 64-char string |
| `SESSION_SECRET` | Random string |
| `VERCEL` | `true` |
| `APP_BASE_URL` | `https://your-app.vercel.app` |

4. Click **Deploy**

## Step 4: Initialize Database (first deploy)

After first deploy, the database tables are created automatically by `api/db.js`.

**Create admin user manually:**

```bash
# Open Turso shell
turso db shell pegangind

# Insert admin user (bcrypt hash for 'pegangind2024')
sqlite3 (your-db-name-your-org.turso.io) "INSERT INTO users (username, password_hash, role) VALUES ('admin', '\$2b\$10\$...', 'admin');"
```

Or: access `/admin` on your deployed site — the seed data should create the admin user on first DB init.

## Step 5: Domain & Environment

- Set custom domain in Vercel project settings if needed
- Update `APP_BASE_URL` in Vercel env vars to match your domain
- For Midtrans callbacks, whitelist your Vercel domain in Midtrans dashboard

## Architecture Notes

### What changes on Vercel

| Feature | Local | Vercel |
|---------|-------|--------|
| Database | `better-sqlite3` (local file) | `@libsql/client` → Turso cloud |
| Auth | `express-session` | JWT cookie |
| File uploads | Multer → `public/uploads/` | Vercel Blob |
| Real-time chat | Socket.io | Polling API (`/api/chat/poll`) |

### API Routes (Vercel)

The `api/` directory contains Vercel serverless functions:
- `api/track.js` — Order tracking
- `api/admin/login.js` — Admin login
- `api/admin/dashboard.js` — Dashboard data
- `api/admin/orders.js` — Order CRUD
- `api/chat/poll.js` — Chat polling (replaces Socket.io)
- `api/chat/send.js` — Send chat message

### Local Development

```bash
npm install
npm run dev
```

Local still uses `better-sqlite3` with the local SQLite file (`./data/pegangind.db`).

### Environment Variables

Copy `.env.example` to `.env` and fill in values for local development.
