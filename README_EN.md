# Get an Email

A temporary email service built on Cloudflare Workers, Email Routing, and D1. It includes a responsive web client, user accounts, address-credential login, an administration console, outbound mail, webhooks, OAuth2, passkeys, and multiple languages.

[中文](README.md) | [English](README_EN.md) | [日本語](README_JA.md) | [Changelog](CHANGELOG_EN.md)

> This project is intended for learning and personal use. The operator is responsible for complying with domain, email-provider, and local legal requirements.

## Features

- Receive, parse, search, delete, download, and inspect messages and attachments
- Anonymous addresses, address passwords, address JWT credentials, user accounts, and passkeys
- Bind, switch, transfer, and unbind addresses from a user account
- Send through Cloudflare Email Workers, Resend, or SMTP
- OAuth2 federation, roles, per-role domains, and sending-balance controls
- Global and per-address webhooks, auto replies, forwarding, and junk-mail checks
- Optional Workers AI extraction, S3/R2 attachment storage, Telegram, and SMTP/IMAP proxy integration
- Chinese, English, Japanese, German, Spanish, and Portuguese interfaces
- Administration at `/dashboard`; all backend endpoints are under `/api/`

## Architecture

| Directory | Stack | Responsibility |
| --- | --- | --- |
| `frontend/` | Vite, React, React Router, TanStack Query, Tailwind CSS, shadcn/ui, Radix UI | User and administration interfaces |
| `worker/` | Cloudflare Workers, Hono, TypeScript | HTTP API, inbound email, authentication, and cron jobs |
| `db/` | Cloudflare D1 / SQLite | Current schema and historical migration scripts |
| `pages/` | Cloudflare Pages Functions | Optional same-origin `/api/` forwarding through a Service Binding |
| `vitepress-docs/` | VitePress | Complete configuration and feature documentation |

D1 is required. KV is used by verification email, webhook, and Telegram features. Workers AI, S3/R2, and Worker Service Bindings are optional.

## Prerequisites

You need:

- A domain or subdomain whose DNS is hosted by Cloudflare
- Cloudflare Email Routing enabled for every receiving domain
- A Cloudflare account with permission to deploy Workers
- Git, Node.js 24, and pnpm 10

Install pnpm and authenticate Wrangler:

```bash
corepack enable
corepack prepare pnpm@10 --activate
```

Clone the repository and install dependencies:

```bash
git clone https://github.com/closeid/Temp-Mail.git
cd Temp-Mail
cd worker
pnpm install
pnpm wrangler login
cd ../frontend
pnpm install
cd ..
```

## Quick Deployment: Frontend and API in One Worker

This is the simplest deployment. The page and `/api/` share one origin, so a separate Pages project and browser CORS configuration are unnecessary.

### 1. Create D1 and optional KV resources

```bash
cd worker
pnpm wrangler d1 create getanemail
```

Record the returned `database_name` and `database_id`.

Create KV when you need registration verification email, webhooks, or Telegram:

```bash
pnpm wrangler kv namespace create KV
```

### 2. Configure the Worker

Copy the template:

```bash
# macOS / Linux
cp wrangler.toml.template wrangler.toml

# Windows PowerShell
Copy-Item wrangler.toml.template wrangler.toml
```

At minimum, configure the following values:

```toml
name = "get-an-email"
main = "src/worker.ts"
compatibility_date = "2025-04-01"
compatibility_flags = ["nodejs_compat"]

routes = [
  { pattern = "mail.example.com", custom_domain = true },
]

[assets]
directory = "../frontend/dist/"
binding = "ASSETS"
run_worker_first = true

[vars]
PREFIX = "tmp"
DEFAULT_DOMAINS = ["example.com"]
DOMAINS = ["example.com"]
ENABLE_USER_CREATE_EMAIL = true
ENABLE_USER_DELETE_EMAIL = true
ENABLE_ADDRESS_PASSWORD = true

[[d1_databases]]
binding = "DB"
database_name = "getanemail"
database_id = "replace-with-your-d1-id"

# Uncomment for verification email, webhooks, or Telegram
# [[kv_namespaces]]
# binding = "KV"
# id = "replace-with-your-kv-id"
```

Core variables:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DOMAINS` | Yes | Every domain accepted when creating or receiving addresses |
| `DEFAULT_DOMAINS` | Recommended | Domains available to anonymous and no-role users; falls back to `DOMAINS` |
| `JWT_SECRET` | Yes | Random key used to sign address and user JWTs |
| `ADMIN_PASSWORDS` | Yes | JSON array of administration passwords; password access is unavailable when omitted |
| `ENABLE_USER_CREATE_EMAIL` | Yes | Allows address creation from the web client |
| `ENABLE_USER_DELETE_EMAIL` | Recommended | Allows an address user to delete messages |
| `PASSWORDS` | No | Optional JSON array that protects the whole site with an access password |

Do not commit production secrets. Store them as Worker Secrets:

```bash
# Generate JWT_SECRET with a command such as: openssl rand -hex 32
pnpm wrangler secret put JWT_SECRET

# Enter a JSON array, for example: ["a-strong-password"]
pnpm wrangler secret put ADMIN_PASSWORDS

# Optional whole-site access password
pnpm wrangler secret put PASSWORDS
```

See [`worker/wrangler.toml.template`](worker/wrangler.toml.template) and the [Worker variable reference](vitepress-docs/docs/en/guide/worker-vars.md) for every variable.

### 3. Initialize D1

For a new database, execute the consolidated schema:

```bash
pnpm wrangler d1 execute getanemail --remote --file=../db/schema.sql
```

You can alternatively deploy first and use Maintenance -> Database in `/dashboard`. Do not execute the full `schema.sql` against an existing installation. For upgrades, read [CHANGELOG_EN.md](CHANGELOG_EN.md), apply the missing `db/*-patch.sql` files, or run the database migration from the console.

### 4. Build the frontend

A same-origin build requires an empty `VITE_API_BASE`:

```bash
cd ../frontend

# macOS / Linux
cp .env.pages .env.prod

# Windows PowerShell
Copy-Item .env.pages .env.prod

pnpm build
```

The result is written to `frontend/dist/` and published by the Worker's `[assets]` binding.

### 5. Deploy

```bash
cd ../worker
pnpm deploy
```

Verify the health endpoint and the two application entries:

```text
https://mail.example.com/api/health
https://mail.example.com/
https://mail.example.com/dashboard
```

### 6. Route inbound email

Repeat these steps for every receiving domain in `DOMAINS`, `DEFAULT_DOMAINS`, and role configuration:

1. Open Cloudflare Dashboard -> Email -> Email Routing and enable the feature.
2. Add the MX and SPF records suggested by Cloudflare.
3. Create a Catch-all routing rule.
4. Select “Send to a Worker” and choose this Worker.
5. Send a message to a newly created address and verify that it appears in the inbox.

Deploying the HTTP Worker without a Catch-all rule produces a working website that cannot receive mail. Random subdomain addresses also require wildcard MX records for `*`; see the [subdomain guide](vitepress-docs/docs/en/guide/feature/subdomain.md).

## Other Frontend Deployment Modes

Choose one of these modes; do not deploy all of them for one site.

### Separate Pages project, direct browser-to-Worker API

Create and edit `frontend/.env.prod`:

```dotenv
VITE_API_BASE=https://api.example.com
VITE_CF_WEB_ANALY_TOKEN=
```

Build and deploy:

```bash
cd frontend
pnpm build
pnpm exec wrangler pages deploy ./dist --project-name get-an-email --branch production
```

Do not add a trailing slash to `VITE_API_BASE`. Pages must use the Single-page application fallback, or direct visits to `/dashboard` and other client routes will return 404.

### Separate Pages project with a Service Binding

The browser only accesses the Pages origin. `pages/functions/_middleware.js` forwards `/api/` to the bound Worker.

```bash
cd frontend
pnpm build:pages
cd ../pages
pnpm install
```

If the Worker is not named `cloudflare_temp_email`, update `service` in `pages/wrangler.toml`, then deploy:

```bash
pnpm deploy
```

### Manual upload from a Release

The **Tag Build CI** workflow can be dispatched manually and also runs after a successful Upstream Sync. It creates a Shanghai-time `vYYYYMMDD-HHMMSS` tag and publishes `frontend.zip`, `worker.js`, and the WASM Worker package. It builds release files only; it does not create D1, KV, routes, bindings, or Cloudflare Secrets.

For a manually uploaded Pages bundle, configure “Not found” handling as **Single-page application (SPA)**. For a manually uploaded Worker, bind D1, optional KV, variables, Secrets, Email Routing, and the custom domain in Cloudflare Dashboard.

## Local Development

Fill in local `wrangler.toml` as shown in the Worker configuration section, including `database_name = "getanemail"`, then initialize local D1:

```bash
cd worker
cp wrangler.toml.template wrangler.toml
# Edit wrangler.toml before continuing
pnpm wrangler d1 execute getanemail --local --file=../db/schema.sql
pnpm dev
```

In a second terminal, create `frontend/.env.local`:

```dotenv
VITE_API_BASE=http://127.0.0.1:8787
```

```bash
cd frontend
pnpm dev
```

Open the URL printed by Vite. A browser-only local environment cannot fully reproduce a real Email Routing event; use a test domain and remote Worker for final inbound-mail testing.

Useful checks:

```bash
cd frontend
pnpm exec tsc --noEmit
pnpm test
pnpm build

cd ../worker
pnpm lint
pnpm build
```

## Users, Login, and Permissions

The home page contains user login, registration, password recovery, passkey login, and address-credential login.

- **Address credential login:** use an address JWT or the password generated when `ENABLE_ADDRESS_PASSWORD` is enabled.
- **Registration:** available by default. Maintenance -> Administrator -> User Settings can require email verification. Verification requires KV, a working send provider, and a configured verification sender.
- **Passkeys:** require HTTPS and the correct relying-party domain. A signed-in user can register credentials from the account area.
- **OAuth2:** add providers under Maintenance -> Administrator -> OAuth2 in `/dashboard`. The callback is `https://your-frontend-domain/user/oauth2/callback` and must exactly match the provider configuration.
- **Administrators:** open `/dashboard` and authenticate with `ADMIN_PASSWORDS`, or assign a user the role configured by `ADMIN_USER_ROLE`. Never enable `DISABLE_ADMIN_PASSWORD_CHECK` on a public deployment.

OAuth2 is federated sign-in: the same email maps to the same local user. The current implementation is not an OAuth-only account mode and enabling OAuth2 does not disable password login. See the [OAuth2 guide](vitepress-docs/docs/en/guide/feature/user-oauth2.md).

## Outbound Email

Mail -> Send Configuration in the console reports provider status and matching order. Provider credentials must still be configured as Worker Secrets or Bindings. User sends are also controlled by balance, unlimited addresses, and `NO_LIMIT_SEND_ROLE`.

### Cloudflare `SEND_MAIL` Binding

Add this top-level block to `worker/wrangler.toml`:

```toml
send_email = [
  { name = "SEND_MAIL" },
]
```

The binding name must be `SEND_MAIL`. Complete Email Routing onboarding first. Optionally set `SEND_MAIL_DOMAINS = ["example.com"]` to restrict sender domains.

### Resend

Verify the sender domain in Resend, create an API key, and store it:

```bash
cd worker
pnpm wrangler secret put RESEND_TOKEN
```

For per-domain keys, use `RESEND_TOKEN_<UPPERCASE_DOMAIN>` with dots replaced by underscores:

```bash
pnpm wrangler secret put RESEND_TOKEN_EXAMPLE_COM
```

Resend verification CNAME records must be DNS-only in Cloudflare.

### SMTP

Store this JSON as the `SMTP_CONFIG` Secret. Each top-level key must match a sender domain:

```json
{
  "example.com": {
    "host": "smtp.example.com",
    "port": 465,
    "secure": true,
    "authType": ["plain", "login"],
    "credentials": {
      "username": "smtp-user",
      "password": "smtp-password"
    }
  }
}
```

```bash
pnpm wrangler secret put SMTP_CONFIG
```

See [outbound mail configuration](vitepress-docs/docs/en/guide/config-send-mail.md) for provider priority, balance behavior, and multi-domain examples.

## Webhooks and Optional Features

### Webhooks

1. Create and bind KV.
2. Set `[vars] ENABLE_WEBHOOK = true`.
3. Preferably set `FRONTEND_URL = "https://mail.example.com"`.
4. Redeploy the Worker.
5. Configure the global template and address permission in `/dashboard`; an address user can then configure its own endpoint.

Administrators may prepare webhook configuration while `ENABLE_WEBHOOK` is false, but delivery remains disabled. See the [webhook guide](vitepress-docs/docs/en/guide/feature/webhook.md) for payloads and Telegram, WeCom, and Discord examples.

### Workers AI extraction

```toml
[vars]
ENABLE_AI_EMAIL_EXTRACT = true
AI_EXTRACT_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast"

[ai]
binding = "AI"
```

Without an AI binding, extraction falls back to basic verification-code regular expressions.

### S3/R2 attachment storage

Configure `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, and `S3_BUCKET` as Secrets. See the [S3 attachment guide](vitepress-docs/docs/en/guide/feature/s3-attachment.md).

### Scheduled cleanup

Enable a Cron Trigger at the top level of `wrangler.toml`, for example daily at 00:00 UTC:

```toml
[triggers]
crons = ["0 0 * * *"]
```

Configure cleanup policy in the Maintenance section of the console.

## Usage

### Mailbox users

1. Create a named or random address from the home page.
2. Keep its credential safe. An unbound address cannot be recovered after losing the credential.
3. Select a message to inspect its content, attachments, text form, source, or fullscreen view.
4. Use Address Management to bind, switch, transfer, or unbind an address.
5. A signed-in user can manage several addresses, passkeys, webhooks, auto replies, and send permissions.

### Administration

Open `/dashboard`. The console provides addresses, users, unknown mail, sent mail, role-address rules, OAuth2, webhooks, database maintenance, system settings, statistics, and API documentation. All programmatic endpoints use the current domain's `/api/` prefix. Use the in-console API Documentation page and Worker source as the authoritative method, path, and authentication reference.

## Upgrading

1. Back up D1 and `wrangler.toml`.
2. Pull the new source and read all relevant Breaking Changes in the changelog.
3. Run `pnpm install` in `worker/`, `frontend/`, and `pages/` when used.
4. Apply required database patch files or run the console migration.
5. Rebuild the frontend and redeploy Worker/Pages.
6. Verify `/`, `/dashboard`, `/api/health`, inbound mail, and outbound mail in a private browser window.

Do not rerun the full `schema.sql` on an existing database.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Website works but mail never arrives | Email Routing, MX/SPF records, Catch-all Worker target, and membership in `DOMAINS` |
| Cannot sign in to `/dashboard` | `ADMIN_PASSWORDS` is a JSON array or parseable Secret and is present in the active Worker version |
| Registration verification is not sent | KV binding, verification setting, sender address, and at least one outbound provider |
| Webhook reports disabled | KV binding, `ENABLE_WEBHOOK=true`, and the variables on the latest deployment |
| Sending fails | Console provider status, matching sender domain, provider Secret or Binding, and user balance |
| Refreshing a Pages route returns 404 | Enable the SPA fallback or deploy Pages through Wrangler |
| Frontend still calls an old API host | Build-time `frontend/.env.prod`, `VITE_API_BASE`, and browser/PWA caches |
| D1 reports missing tables or an old version | Initialize a new DB with `db/schema.sql`; migrate an existing DB with patches or the console |

More feature-specific documentation is available under [`vitepress-docs/docs/en/guide/`](vitepress-docs/docs/en/guide/).

## Security Checklist

- Keep `JWT_SECRET`, passwords, OAuth client secrets, Resend keys, and SMTP credentials in Cloudflare Secrets.
- Use a strong `/dashboard` password and never skip administrator verification on a public site.
- Public deployments should enable Turnstile, address rate limiting, attachment limits, and scheduled cleanup.
- Put balance, sender-domain restrictions, and provider cost alerts around outbound mail.
- Back up D1 regularly and test migrations before production upgrades.

## License

Released under the [MIT License](LICENSE).
