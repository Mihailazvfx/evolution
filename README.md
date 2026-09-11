# AI Filmmaker Evolution System — hosted version

Same dashboard as the Claude artifact, at your own URL, with a cloud database, magic-link login
and live sync between phone and laptop. Hosting is GitHub Pages (free); the database is Supabase (free).

## Setup, once (about 15 minutes)

### 1. Database — Supabase
1. supabase.com → **New project** (region: eu-central). Wait for it to finish provisioning.
2. **SQL Editor → New query** → paste `supabase/schema.sql` → **Run**.
3. **Project Settings → API** → copy the **Project URL** and the **anon public** key. Keep the tab open.

### 2. Repo — GitHub
1. github.com → **New repository**. Name it e.g. `evolution`. Public or private both work with Pages. Create it empty.
2. Upload this project: on the empty repo page click **uploading an existing file**, drag the whole
   folder contents in (everything except `node_modules`), commit to `main`.
   (Hidden folder `.github` must be included — if your file manager hides it, use `git push` instead.)
3. **Settings → Secrets and variables → Actions → New repository secret**, twice:
   - `VITE_SUPABASE_URL` = the Project URL
   - `VITE_SUPABASE_ANON_KEY` = the anon public key
4. **Settings → Pages → Source: GitHub Actions**.
5. **Actions** tab → run "Build and publish to GitHub Pages" (or just push again). About a minute later the
   site is live at `https://YOUR-USERNAME.github.io/evolution/`.

### 3. Point the login at your URL — Supabase
**Authentication → URL Configuration**: set **Site URL** to `https://YOUR-USERNAME.github.io/evolution/`
and add the same to **Redirect URLs**. Without this the magic link sends you to localhost.

### 4. Use it
- Open the URL, enter your email, tap the link in the email.
- Phone: open the URL in Safari/Chrome → Share → **Add to Home Screen**.
- Sign in on both devices with the same email. Edits sync within a second; a device that was asleep
  re-syncs when you return to the tab. Sidebar shows **Synced / Saving… / Not synced**.

### Moving data from the Claude version
Claude artifact: Settings → **Full backup (JSON)**. Hosted app: Settings → **Import JSON backup**.

## Later changes
Edit files in the repo (or ask Claude for a new version and upload it). Every push to `main` rebuilds and republishes.

## Run locally
```
npm install
cp .env.example .env   # fill in the two values
npm run dev
```

## Security
Row-level security in the schema means only your account can read or write your data. The anon key is
designed to be public; the policies are what protect the data. `.env` is git-ignored.
