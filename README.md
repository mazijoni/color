# Color

A tiny static site with three accounts — yellow, green, blue — where each can
upload an image. Images go to Cloudinary; the resulting URLs (plus which
account posted them) are stored in Firestore, and the gallery updates in
real time for everyone viewing the site.

It's deployed as a plain static site on GitHub Pages, so there's no server.

## How the config flow works

Same pattern as the portfolio-site repo: a committed file with `%%TOKEN%%`
placeholders, substituted in place by GitHub Actions at deploy time, plus a
gitignored local file with real values for development.

- `config.js` — **committed**, contains `%%PLACEHOLDER%%` tokens instead of
  real values. The app falls back to this when not running locally.
- `config.local.js` — **never committed** (gitignored). Real values for
  local development. `app.js` loads this automatically when the hostname is
  `localhost`/`127.0.0.1`.
- `.github/workflows/deploy.yml` — on push to `main`, runs `sed` over
  `config.js` to substitute each `%%TOKEN%%` with the matching GitHub Actions
  secret, verifies nothing was missed, then deploys to the `gh-pages` branch.
  The substituted file only ever exists on that branch, never on `main`.

⚠️ Security note: this is a static site with no backend, so the browser has
to be able to check the password itself, which means `config.js` (with the
three plaintext passwords) ships to every visitor. That's fine for keeping
casual visitors out, but anyone who opens dev tools can read the passwords
straight out of the network tab. Don't reuse a password here that matters
elsewhere, and don't treat this as real authentication.

## One-time setup

### 1. Cloudinary

1. Create a free account at cloudinary.com.
2. Note your **Cloud name** (dashboard home page).
3. Settings → Upload → Upload presets → add an **unsigned** preset. Note its
   name. (Unsigned presets are safe to use from client-side code — no API
   secret is ever exposed to the browser.)

### 2. Firebase

1. Create a project at the Firebase console.
2. Build → Firestore Database → create a database (start in production
   mode).
3. Firestore → Rules → paste the contents of [`firestore.rules`](firestore.rules)
   and publish. This allows anyone to read the gallery, but only allows
   creating well-formed upload records — no edits or deletes.
4. Project settings → General → "Your apps" → add a Web app. Copy the
   `firebaseConfig` values (`apiKey`, `authDomain`, `projectId`,
   `storageBucket`, `messagingSenderId`, `appId`).

### 3. GitHub repo secrets

Settings → Secrets and variables → Actions → New repository secret. Add:

- `PASSWORD_YELLOW`, `PASSWORD_GREEN`, `PASSWORD_BLUE` — plaintext
  passwords for each account (GitHub encrypts these at rest).
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_UPLOAD_PRESET`
- `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`,
  `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`,
  `FIREBASE_APP_ID`

### 4. GitHub Pages

Settings → Pages → Source → **Deploy from a branch** → `gh-pages` / `/(root)`.
Push to `main` and the `deploy.yml` workflow builds the `gh-pages` branch and
sets the custom domain (`color.maze-development.com`) via the `cname` option,
which also writes the `CNAME` file for you.

## Local development

`config.local.js` already exists in the repo (gitignored) as a starting
point — fill in its placeholder values with real ones, then:

```
npx serve .
# open the printed http://localhost:... URL — ES modules need http(s), not file://
```
