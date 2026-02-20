# SCM Insights

Single repository containing the **SCM Insights** application: backend API and Next.js frontend.

---

## Repository structure

| Path | Description |
|------|-------------|
| **ScmInsights** (this repo root) | Monorepo root; backend + frontend. |
| **backend-scm** | Flask (Python) backend: auth, admin, trade/HS codes, SIMS data. Runs on port 5001. |
| **SCM-INSIGHTS** | Next.js frontend. Runs on port 3000. |

---

## Quick start

1. **Backend** – see [backend-scm/README.md](backend-scm/README.md)  
   - Copy `backend-scm/env.example` → `backend-scm/.env`, set PostgreSQL and SMTP, then run with `.\run.ps1`.
2. **Frontend** – see [SCM-INSIGHTS/README.md](SCM-INSIGHTS/README.md)  
   - Copy `SCM-INSIGHTS/env.example` → `SCM-INSIGHTS/.env`, set `NEXT_PUBLIC_BACKEND_URL=http://localhost:5001`, then `npm run dev`.

---

## What must NOT be pushed to Git

These are **excluded via `.gitignore`** and must never be committed:

### All environments (root, backend, frontend)

- **Environment and secrets**
  - `.env`, `.env.local`, `.env.*.local`, `.env.production`, `.env.staging`
  - Any file containing passwords, API keys, or secrets
- **SSL / keys**
  - `*.pem`, `*.key`, `*.crt`, `*.cer`, `ssl/`
- **IDE / OS**
  - `.vscode/`, `.idea/`, `*.iml`, `.DS_Store`, `Thumbs.db`, `Desktop.ini`
- **Logs and temp**
  - `logs/`, `*.log`, `tmp/`, `temp/`, `*.tmp`, `*.bak`, `*.backup`

### backend-scm

- **Python**
  - `__pycache__/`, `*.pyc`, `*.pyo`, `venv/`, `.venv/`, `env/`, `*.egg-info/`, `dist/`, `build/`
- **Data (large or sensitive)**
  - `static/*.csv`, `static/*.json` (use seed scripts or CI; keep `static/.gitkeep`)
- **Testing / coverage**
  - `.coverage`, `.pytest_cache/`, `htmlcov/`, `coverage.xml`
- **Database files**
  - `*.db`, `*.sqlite`, `*.sqlite3`

### SCM-INSIGHTS (Next.js)

- **Dependencies**
  - `node_modules/`, `.pnp`, `.yarn/*` (except allowed Yarn folders)
- **Build and output**
  - `.next/`, `out/`, `build/`
- **Debug**
  - `npm-debug.log*`, `yarn-debug.log*`, `yarn-error.log*`
- **Vercel**
  - `.vercel`
- **TypeScript**
  - `*.tsbuildinfo`, `next-env.d.ts`

---

## Git workflow

- Root `.gitignore` in **ScmInsights** and per-project `.gitignore` in **backend-scm** and **SCM-INSIGHTS** are already set so the above are not tracked.
- If you previously committed files that should be ignored (e.g. `.env`, `static/*.csv`), remove them from the index only:
  ```powershell
  git rm --cached <file-or-pattern>
  git commit -m "chore: stop tracking ignored files"
  ```

---

## Reports by component

- **Backend (API, DB, auth, admin):** [backend-scm/README.md](backend-scm/README.md)  
- **Frontend (Next.js):** [SCM-INSIGHTS/README.md](SCM-INSIGHTS/README.md)
