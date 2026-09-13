# Adoption Portal

A full-stack dog adoption application portal built on Firebase. Public applicants submit
a multi-section questionnaire via a mobile-first React SPA. Internal reviewers log in
with their Google Workspace accounts, review applications, request clarifications, and
issue approve/reject decisions. A Cloud Functions backend enforces the status state
machine, syncs role-based custom claims, and sends transactional email notifications.
All data is stored in Cloud Firestore with role-gated security rules.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20 LTS | https://nodejs.org |
| npm | 10+ | bundled with Node |
| Firebase CLI | latest | `npm install -g firebase-tools` |
| Google account | — | For Firebase console access |

---

## Firebase Console — one-time manual setup

These steps must be completed before running the app locally.

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and create
   a new project named **adoption-portal**.
2. **Firestore** — Add database → Native mode → region `us-central1`.
3. **Authentication** — Enable two providers:
   - **Email/Password** (for public submitters)
   - **Google** (for org reviewers — configure domain restriction after setup via an
     `auth.onCreate` Cloud Function that enforces `@aforeverhome.org` emails)
4. **Hosting** — Add web app; copy the Firebase SDK config snippet.
5. **Functions** — Upgrade to Blaze (pay-as-you-go) plan. At ~150 apps/month, cost
   is effectively $0 — well within the free tier limits.
6. **Storage** — Enable Firebase Storage (optional; for future file upload support).

---

## Local development setup

```bash
# 1. Clone the repository
git clone https://github.com/your-org/adoption-portal.git
cd adoption-portal

# 2. Install Cloud Functions dependencies
cd functions
npm install
cd ..

# 3. Install React UI dependencies
cd ui
npm install
cd ..

# 4. Configure environment variables
cp ui/.env.example ui/.env.local
# Edit ui/.env.local and paste in your Firebase web app config values.
# Find them at: Firebase Console → Project Settings → General → Your apps

# 5. (Optional) Log in to Firebase CLI
firebase login
```

---

## Running locally with emulators

Start the Firebase emulators (Auth, Firestore, Functions) and the Vite dev server in
two separate terminals:

**Terminal 1 — Firebase emulators:**
```bash
firebase emulators:start
```

The emulator UI is available at http://localhost:4000.

**Terminal 2 — React dev server:**
```bash
# In ui/.env.local, set:  VITE_USE_EMULATOR=true
cd ui
npm run dev
```

The app is served at http://localhost:5173.

---

## Build and deploy

```bash
# Build the React app
cd ui && npm run build && cd ..

# Build the Cloud Functions
cd functions && npm run build && cd ..

# Deploy everything to Firebase
firebase deploy
```

---

## Project structure

```
adoption-portal/
├── firebase.json           # Firebase CLI configuration
├── .firebaserc             # Project alias
├── firestore.rules         # Firestore security rules
├── firestore.indexes.json  # Composite indexes
├── functions/              # Cloud Functions (Node.js 20, TypeScript)
│   ├── src/
│   │   ├── index.ts        # Exported function stubs (Sub-Task 2 adds implementations)
│   │   ├── types.ts        # Shared TypeScript types
│   │   └── config.ts       # Environment/secret config helpers
│   ├── package.json
│   └── tsconfig.json
└── ui/                     # React SPA (Vite + TypeScript + Tailwind + shadcn/ui)
    ├── src/
    │   ├── main.tsx        # Entry point
    │   ├── App.tsx         # App shell (routing added in Sub-Task 3)
    │   ├── firebase.ts     # Firebase SDK initialization
    │   └── index.css       # Tailwind imports
    ├── .env.example        # Required environment variables
    ├── index.html
    ├── tailwind.config.ts
    ├── vite.config.ts
    └── package.json
```

---

## Environment variables

Copy `ui/.env.example` to `ui/.env.local` and fill in these values:

| Variable | Description |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase web app ID |
| `VITE_USE_EMULATOR` | Set `true` to use local emulators |
