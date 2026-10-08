# Stratavax Capability Assessment Platform
## Secrets Rotation Policy

**Document Version:** 1.0
**Effective Date:** October 8, 2026
**Owner:** Stratavax Engineering
**Review Cycle:** Annually, or after any security incident

---

## 1. Purpose

This document defines which secrets the Stratavax Capability Assessment
Platform relies on, how they are stored, how often they should be rotated,
and the procedure for rotating each one safely.

Secrets are the credentials that grant privileged access to systems. If a
secret leaks, an attacker can act as the platform. Rotation limits the
window of exposure when a leak occurs.

**This document is process, not code.** No implementation changes are
required to comply with it. It is a reference for what to do, when to do
it, and how to do it without breaking the platform.

---

## 2. Scope

The following categories of secrets are covered:

1. Supabase service role key
2. Supabase anon key (public, but included for completeness)
3. Supabase JWT secret
4. Admin API key (`ADMIN_API_KEY`)
5. Email service credentials (SMTP or API key)
6. Vercel deployment tokens
7. GitHub tokens (if any automation uses them)
8. Any third-party API keys (e.g. monitoring, analytics)

---

## 3. Classification

Secrets are classified by blast radius — what an attacker could do with
them.

| Classification | Meaning | Rotation frequency | Examples |
|---|---|---|---|
| **Critical** | Full database access or ability to impersonate any user | Every 6 months, or immediately on suspected leak | Supabase service role key, JWT secret |
| **High** | Elevated privileges but scoped access | Every 12 months, or on suspected leak | Admin API key, email API key |
| **Medium** | Deployment or CI/CD control | Every 12 months | Vercel tokens, GitHub tokens |
| **Low** | Public by design or read-only | Not rotated | Supabase anon key (public) |

---

## 4. Secret Inventory

### 4.1 Supabase Service Role Key

**Classification:** Critical

**What it grants:** Full read/write access to every table in the database.
Bypasses Row Level Security. Can create, modify, or delete any row in any
table. Can read the `auth.users` table.

**Storage:** Vercel environment variable `SUPABASE_SERVICE_ROLE_KEY`.

**Used by:** Every API route that needs admin operations (assessment
submission, report generation, supervisor scope queries).

**Rotation procedure:**

1. Log into Supabase Dashboard → Project Settings → API.
2. Click **"Rotate service_role key"**.
3. Copy the new key.
4. Update Vercel → Settings → Environment Variables → `SUPABASE_SERVICE_ROLE_KEY` (Production, Preview, Development).
5. Trigger a redeploy (Vercel does this automatically on env var change).
6. Verify a known API endpoint still works (e.g. load the admin reports list).
7. Delete the old key from any local `.env.local` files.

**Downtime:** ~2 minutes during redeploy. The old key continues to work
until the new one is applied. To avoid 401s during the transition, rotate
during a low-traffic window.

**Testing after rotation:**
- Admin dashboard loads
- Supervisor dashboard loads
- A test candidate can start an assessment

### 4.2 Supabase JWT Secret

**Classification:** Critical

**What it grants:** Ability to forge valid session tokens for any user.
Combined with a known user ID, an attacker can impersonate that user.

**Storage:** Supabase project configuration (not exposed to code).

**Used by:** Supabase Auth internally — every signed JWT is verified against this secret.

**Rotation procedure:**

⚠️ **Rotating the JWT secret invalidates all active sessions.** Every
logged-in user will be signed out and must log in again.

1. Log into Supabase Dashboard → Project Settings → API.
2. Click **"Rotate JWT secret"**.
3. Confirm.
4. **No code changes needed** — Supabase and the client SDK both pick up the new secret automatically.
5. Notify all active users they will need to sign in again.

**Downtime:** None, but all sessions are invalidated.

**When to rotate:**
- Every 12 months as routine hygiene
- **Immediately** if you suspect a secret leak
- When an employee with admin access leaves the company

### 4.3 Supabase Anon Key

**Classification:** Low (public by design)

**What it grants:** Read/write access scoped by Row Level Security policies.

**Storage:** `NEXT_PUBLIC_SUPABASE_ANON_KEY` — exposed in browser bundle by design.

**Rotation:** Not required. The key is safe to be public because RLS policies
protect the data.

**If compromised:** Verify that your RLS policies are correctly applied
(see Phase 7 security work). If RLS is configured correctly, the anon key
is safe to leak.

### 4.4 Admin API Key

**Classification:** High

**What it grants:** Access to admin-only endpoints that don't use Supabase
Auth — primarily `/api/admin/reprocess-assessment` and similar.

**Storage:** Vercel environment variable `ADMIN_API_KEY`.

**Used by:** Server-to-server calls, manual admin operations, debugging.

**Rotation procedure:**

1. Generate a new random string (32+ characters, base64 or hex).
   - Example generator: `openssl rand -hex 32`
2. Update Vercel → Settings → Environment Variables → `ADMIN_API_KEY`.
3. Trigger a redeploy.
4. Update any scripts or clients that use the old key.
5. Verify a test call to `/api/admin/reprocess-assessment` succeeds with the new key.

**Downtime:** ~2 minutes. Old key stops working immediately on redeploy.

### 4.5 Email Service Credentials

**Classification:** High

**What it grants:** Ability to send email from your domain (invites,
password resets, reminders).

**Storage:** Depends on provider — Vercel env vars for API keys, or
SMTP credentials.

**Rotation procedure:** Provider-specific. Follow the provider's guidance.
For API-key-based providers (Resend, SendGrid, Postmark):

1. Generate a new API key in the provider's dashboard.
2. Update Vercel env vars.
3. Trigger a redeploy.
4. Revoke the old key in the provider's dashboard.
5. Send a test email.

**Rotation frequency:** Every 12 months, or on suspected leak.

### 4.6 Vercel Deployment Tokens

**Classification:** Medium

**What it grants:** Ability to trigger deployments and modify project
settings.

**Storage:** Only in local dev environments or CI systems that need to
deploy programmatically. Not in the production runtime.

**Used by:** Manual deploys via CLI, GitHub Actions (if configured).

**Rotation procedure:**

1. Vercel Dashboard → Settings → Tokens.
2. Revoke old token.
3. Generate new token.
4. Update any CI secrets that reference it.
5. Test a deployment from CI if applicable.

**Rotation frequency:** Every 12 months, or when an engineer with token
access leaves.

### 4.7 GitHub Tokens

**Classification:** Medium

**What it grants:** Repository access — depends on scope.

**Storage:** Only in CI secrets or local dev. Never in the repo.

**Used by:** GitHub Actions, local CLI, any automation.

**Rotation:** Revoke on GitHub → Settings → Developer settings → Personal
access tokens. Regenerate as needed.

**Rotation frequency:** Every 12 months, or when a contributor leaves.

---

## 5. Handling a Suspected Leak

If any secret is suspected to have leaked (e.g. committed to a public
repository, exposed in logs, shared accidentally):

**Immediate actions (within 1 hour):**

1. **Rotate the secret.** Do not wait to investigate first.
2. **Check access logs** for suspicious activity since the leak began.
   - Supabase: Dashboard → Logs → API Edge Logs
   - Vercel: Dashboard → Logs → Runtime Logs
3. **Notify** the security owner.

**Follow-up (within 24 hours):**

4. **Audit what the leaked secret could have granted access to** and
   whether any data was exfiltrated or modified.
5. **Document the incident** in a private incident log:
   - What secret was leaked
   - When it was leaked
   - How it was discovered
   - When it was rotated
   - What actions were taken
   - Any impact on user data

**Post-incident (within 1 week):**

6. **Root-cause the leak.** Was it committed to git? Logged? Shared over
   an insecure channel?
7. **Implement a preventive control** so the same leak can't happen again.
8. **Disclose if required.** If personal data was accessed by an
   unauthorised party, you may be legally required to notify affected
   individuals and the data protection authority. Consult legal counsel.

---

## 6. Rotation Calendar

To make this policy actionable, the team maintains a rotation calendar
in its operations tracker. Recommended cadence:

| Secret | Last rotated | Next rotation |
|---|---|---|
| Supabase service role key | [date] | [date + 6 months] |
| Supabase JWT secret | [date] | [date + 12 months] |
| Admin API key | [date] | [date + 12 months] |
| Email API key | [date] | [date + 12 months] |
| Vercel deployment token | [date] | [date + 12 months] |

**Fill in the "last rotated" column today** with the date each secret was
first set. Then schedule the "next rotation" dates.

**On any turnover of engineering staff:** rotate all Critical and High
secrets within 30 days of the engineer's last day.

---

## 7. Storage Rules

**Secrets must:**

- Live in Vercel environment variables (for production)
- Live in `.env.local` for local development (gitignored)
- Be documented in this policy's inventory (this document)

**Secrets must NOT:**

- Be committed to git (enforce `.gitignore`)
- Be pasted in Slack, email, or messaging apps
- Be stored in plaintext in shared documents
- Be printed to application logs (verify `console.log` doesn't leak tokens)
- Be hardcoded in source files

**Verification:** Run this periodically to check for accidental commits:

```bash
git log --all --full-history -- .env* | grep -i "service_role\|admin_key\|jwt"
