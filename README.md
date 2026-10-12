# NextLayer Studio + ISRO Racing — Netlify project

This project combines the NextLayer Studio landing page and AI services division with the ISRO Racing microsite at `/isro/`. The admin dashboard is at `/admin.html`.

## Included
- Responsive NextLayer Studio site with AI services and quote-request mail draft.
- ISRO Racing public driver directory, leaderboard, registration and certificate/reference verification UI.
- Netlify Functions for public data and admin operations, using Netlify Blobs for persistence.
- Admin dashboard for driver records, certificate records, registration review and audit entries.
- Admission policy on the main site: **payments are offline, in person in Pune, at admission time**. No payment gateway is configured.
- Optional Gemini/OpenAI variable placeholders only. No Anthropic integration and no Razorpay integration.

## Deploy to Netlify
1. Extract this ZIP and upload the *contents* to a GitHub repository (do not upload only the ZIP). Keep `public/`, `netlify/functions/`, `netlify.toml`, and `package.json` at repository root.
2. Connect the repository to Netlify. Build command: `npm run build`; publish directory: `public`; functions directory: `netlify/functions`.
3. In Site configuration → Environment variables, set `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` (bcrypt hash, never plaintext), and `JWT_SECRET` (fresh random secret). Add AI keys only if you implement/use the matching provider in server-side code.
4. Redeploy after changing environment variables.
5. Visit `/`, `/isro/`, and `/admin.html`.

## Local setup
- Install Node.js 20 or newer.
- Run `npm.cmd install` in PowerShell on Windows if PowerShell blocks `npm.ps1`.
- Run `npm.cmd run build`. For Netlify Functions locally, use `npx netlify dev` after setting up the Netlify CLI/login.

## Important
- `.env.example` is a template; copy it to `.env` locally and replace placeholders. Never commit `.env` or secrets. Netlify production variables must be configured in the Netlify dashboard.
- The build script is a static-site readiness check, not a bundler or a comprehensive automated test suite. JavaScript syntax and package/build checks should be run before release. A successful build does not prove every live integration works.
- This is an integration starter based on the available project files, not a merge of any unseen proprietary AI source. AI service cards describe offerings; provider API features only work when explicitly implemented and configured.
- Demo driver records are illustrative. Replace with authorized records before launch. Avoid collecting sensitive medical or identity data unless you have appropriate consent and security controls.
- Verify admin authentication, Blobs persistence, registration, image handling and all routes on a Netlify preview deployment before public production use.
