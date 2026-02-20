# SCM-INSIGHTS Backend

Separate backend for SCM-INSIGHTS app. Same tech (Flask, PostgreSQL) and auth flow as the main Impexinfo backend; own database and login/register.

## Setup

1. **Copy env**
   ```powershell
   copy env.example .env
   ```
2. **Edit `.env`** – set PostgreSQL credentials (`POSTGRES_DB_HOST`, `POSTGRES_DB_USER`, `POSTGRES_DB_PASSWORD`, `POSTGRES_DB_NAME`) and `WHITELISTED_ADMINS` (comma-separated admin emails).
3. **Install deps**
   ```powershell
   pip install -r requirements.txt
   ```
4. **Create DB and tables, then run**
   ```powershell
   .\run.ps1
   ```
   Or step by step:
   ```powershell
   python -m tools.create_db   # creates database if missing
   python -m tools.init_db     # creates tables
   python app.py               # start server
   ```
   Server runs at `http://0.0.0.0:5001` by default.

5. **Seed HS codes and directory (optional, for full data)**
   Place `static/all_hscodes_with_descriptions.csv` and/or `static/sims-data.json` in `backend-scm/static/`, then:
   ```powershell
   python -m tools.seed_hscodes          # populates HSCodeDescription from CSV
   python -m tools.seed_sims_directory   # populates SimsDirectory from sims-data.json
   ```
   After seeding, `/hscodes-descriptions` and `/api/sims-data` serve from the database instead of static files.

**If connection fails:** Check that `POSTGRES_DB_HOST`, `POSTGRES_DB_USER`, `POSTGRES_DB_PASSWORD` are correct and that the server allows connections from your IP. For local development use `POSTGRES_DB_HOST=localhost` and ensure PostgreSQL is running.

## SCM Frontend

In **SCM-INSIGHTS** set `.env`:
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5001
```
No code changes needed; frontend uses `/login`, `/signup`, `/logout` which are provided by this backend.

## API

- **Auth (and legacy):** `POST /api/auth/login`, `POST /api/auth/signup`, `POST /api/auth/logout`, `POST /api/auth/account-activate`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`, `POST /api/auth/resend-activation`
- **Legacy (same behaviour):** `POST /login`, `POST /signup`, `POST /logout`, `POST /forgot-password`
- **Admin (auth + admin):** `GET /api/admin/users`, `GET /api/admin/user?EmailId=...`, `PUT /api/admin/user/status`, `DELETE /api/admin/user?EmailId=...`, `GET /api/admin/overview`
- **Health:** `GET /health`

## Admin

- Add admin emails in `.env`: `WHITELISTED_ADMINS=admin@example.com`
- Or set a user's `Role` to `ADMIN` in the database (e.g. after first signup).

## Git

A `.gitignore` is set up so these are **not** committed:

- `.env` (secrets)
- `__pycache__/`, `*.pyc`
- `venv/`, `.venv/`
- `static/*.csv`, `static/*.json` (large data; add via script or CI)
- SSL certs, logs, IDE/OS junk

**If you already pushed files that should be ignored**, remove them from the index (they stay on disk):

```powershell
cd backend-scm
git rm --cached .env
git rm --cached "static/all_hscodes_with_descriptions.csv" "static/hscodes_descriptions.json"
git ls-files "**/__pycache__/**" | ForEach-Object { git rm --cached $_ }
git add .gitignore
git commit -m "chore: add .gitignore and stop tracking env, cache, and static data"
```

Then ensure `static/` has the CSV/JSON files locally (or copy from `backend/static/`) for the app to run.
