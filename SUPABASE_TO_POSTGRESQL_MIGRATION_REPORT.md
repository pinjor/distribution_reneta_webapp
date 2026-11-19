# Supabase to PostgreSQL migration report

**Date:** 2026-11-19  
**Scope:** Read-only audit of the repository, then removal of unused Supabase configuration only.  
**Database:** No PostgreSQL schema, data, or migration was changed. No Supabase cloud project or remote data was deleted.

## Conclusion

Supabase is not an active dependency. The frontend does not initialize a Supabase client. The backend does not call Supabase. Authentication, data access, and file references already go through FastAPI and PostgreSQL.

The only live residue was three unused `VITE_SUPABASE_*` variables in `.env`. Those were removed. No replacement feature had to be built.

## Target architecture

```
React + TypeScript
        |
        v
FastAPI REST API  (src/lib/api.ts → /api)
        |
        v
SQLAlchemy ORM
        |
        v
PostgreSQL
```

The frontend does not open a database connection. `src/lib/api.ts` sends HTTP requests to `VITE_API_URL` or `/api`.

## Dependencies discovered

| Item | Result |
|---|---|
| `@supabase/supabase-js` in `package.json` | Absent |
| `@supabase/supabase-js` in `package-lock.json` | Absent |
| Supabase client, `createClient`, Auth, Storage, Realtime, or Edge Functions under `src/` or `backend/` | None |
| Supabase config directory or `supabase/config.toml` | None |
| Docker Compose, Dockerfiles, nginx, deployment docs | No Supabase service or variable |
| `.env` | Had `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_SUPABASE_URL`. No application code read them. Removed. |
| `.env.example` or other env templates | None in the repo |

Historical notes that Supabase had already been removed from the SDK live in `MIGRATION_COMPLETE.md` and `PROJECT_SUMMARY.md`. `CHECKLIST.md` still had those items unchecked. The checklist is now marked done. Values from `.env` are not repeated in this report.

## Active versus unused

| Area | Active Supabase use | Current implementation |
|---|---|---|
| Authentication | None | `POST /api/auth/login` in `backend/app/routers/auth.py`. JWT via `backend/app/auth.py`. Users are `employees` rows in PostgreSQL. |
| Authorization | None | `require_auth` and `require_permission` in `backend/app/core/deps.py`. |
| Database queries | None | SQLAlchemy sessions in FastAPI routers against PostgreSQL. |
| Storage | None | No Supabase Storage client. `collection_deposits.attachment_url` is a string column. No upload client was found. |
| Realtime | None | Not used. |
| Edge Functions | None | Not used. |

No active feature depended on Supabase, so nothing was left in place waiting for a replacement.

## Files modified

| File | Change |
|---|---|
| `.env` | Removed the three unused `VITE_SUPABASE_*` variables. Docker host-port variables were left as they were. |
| `CHECKLIST.md` | Marked the Supabase removal items complete. |
| `BACKEND_AUDIT_AND_COMPLETION_REPORT.md` | Corrected the third-party note that those env vars were still present. |
| `SUPABASE_TO_POSTGRESQL_MIGRATION_REPORT.md` | This report. |

No React component, API route, model, or package manifest required a code change.

## PostgreSQL replacements

Already present. This cleanup did not add endpoints.

- Login, signup, current user, logout: `/api/auth/*`
- Business data: existing `/api` routers and PostgreSQL tables
- Browser access: `ApiClient` in `src/lib/api.ts`

## Authentication impact

None. Login still uses the FastAPI JWT flow. Supabase Auth was not referenced.

## Storage impact

None. No Supabase bucket client existed. Removing the env vars does not change file fields stored in PostgreSQL.

## Tests performed

| Check | Result |
|---|---|
| Repository search for `supabase` / `SUPABASE` in source, lockfile, compose, and env files | After cleanup, matches remain only in historical migration docs (`MIGRATION_COMPLETE.md`, `PROJECT_SUMMARY.md`), this report, the audit correction, and the completed checklist. |
| `package.json` and `package-lock.json` | No Supabase package. |
| Application runtime tests | Not re-run. No code path imported Supabase, so deleting unused env vars does not change request behavior. |
| PostgreSQL | Not queried and not modified for this task. |

## Remaining migration requirements

None for this codebase.

The Supabase cloud project, if it still exists, was not accessed and was not deleted. Any data that lives only in that project is outside this repository. Do not add `@supabase/supabase-js`, Supabase Auth, Storage, or Realtime to later modules. New data access stays on FastAPI and PostgreSQL.
