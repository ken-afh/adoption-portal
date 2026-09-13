# Questionnaire Automation Plan

## Overview

Automate the end-to-end lifecycle of a dog adoption application questionnaire.
Public submitters register with an email + password (or Google Sign-In), fill the
mobile-first form, and can return to edit and resubmit at any time. Internal
reviewers log in with their free Google Workspace accounts, see a role-gated
reviewer dashboard in the same React app, and can comment, request clarification,
and issue approve/reject decisions. A full change log is maintained per application.

**Design principle: mobile-first.** All UI is designed for small screens first,
enhanced for desktop. No separate "desktop" layouts.

---

## Stack

| Layer | Technology | Cost |
|---|---|---|
| Frontend (single codebase) | React SPA (Vite + TypeScript) | Free |
| UI component library | shadcn/ui + Tailwind CSS | Free |
| Hosting | Firebase Hosting | Free (Spark plan) |
| Identity — submitters | Firebase Auth (email+password + email verification) | Free ≤10k MAU/month |
| Identity — reviewers | Firebase Auth (Google Sign-In, Workspace accounts) | Free |
| Role management | Firestore `/roles/{uid}` collection + Firebase custom claims | Free |
| Database | Cloud Firestore | Free (1 GB, 50k reads/day, 20k writes/day) |
| Backend logic | Cloud Functions for Firebase (Node.js 20, 2nd gen) | Free ≤2M calls/month |
| Email (transactional) | Gmail API via Workspace service account (or Nodemailer+SMTP) | Free |
| MX validation | Google DNS-over-HTTPS API | Free, no key required |
| File storage (optional) | Firebase Storage | Free ≤5 GB |

**All components run on Firebase's free Spark plan.** No billing account required
unless you exceed generous free-tier limits (well above 150 apps/month).

---

## Status State Machine

```
Draft → Submitted → Under Review → Clarification Requested
     ↑                                        ↓
     └──────── Clarification Received ←───────┘
                        ↓
               Approved  |  Rejected
                                ↓
                         (submitter edits → Draft → Submitted)
```

All state transitions are enforced in Cloud Functions. The frontend only requests
transitions; the backend validates that the transition is permitted.

---

## Role Model

| Role | Identity provider | Firestore claim | Capabilities |
|---|---|---|---|
| `submitter` | Firebase Auth (email+password) | `role: "submitter"` | Own applications only |
| `reviewer` | Firebase Auth (Google / Workspace) | `role: "reviewer"` | All applications, read-only on data, full workflow actions |
| `admin` | Firebase Auth (Google / Workspace) | `role: "admin"` | Assign reviewers, manage roles, all reviewer capabilities |

Roles are set via a Firestore `/roles/{uid}` document. A Cloud Function syncs
the Firestore role into a Firebase custom claim so the React app and Firestore
security rules can both read it without an extra Firestore lookup on every request.

---

## Application Data Model (Firestore)

**Collection: `applications`**
```
{
  id: string,                    // Firestore auto-ID
  submitterId: string,           // Firebase Auth UID
  submitterEmail: string,
  status: StatusEnum,
  submittedAt: Timestamp | null,
  lastEditedAt: Timestamp,
  resubmitCount: number,         // increments on each resubmit
  assignedReviewerUid: string | null,
  assignedReviewerEmail: string | null,
  decisionAt: Timestamp | null,
  decisionBy: string | null,
  decisionReason: string | null,

  // Questionnaire fields (Section 1–8)
  applicantName: string,
  coApplicantName: string,
  address: string, city: string, state: string, zip: string,
  phone: string,
  homeType: "house" | "condo" | "apartment" | "other",
  homeOwnership: "own" | "rent",
  landlordContact: string,
  hasYard: boolean, yardFenced: boolean, fenceHeight: string,
  adultsInHome: number, childrenInHome: number, childrenAges: string,
  currentPets: string,           // free-text JSON or structured
  previousPets: string,
  vetName: string, vetClinic: string, vetPhone: string,
  hoursAlonePerDay: number,
  dogSleepLocation: string,
  dogDayLocation: string,
  exercisePlan: string,
  dogExperience: string,
  adoptionReason: string,
  specificDogRequested: string,
  agreeToHomeVisit: boolean,
  signatureAcknowledgment: boolean,
  signatureDate: Timestamp | null
}
```

**Subcollection: `applications/{id}/comments`**
```
{
  id: string,
  type: "internal_note" | "clarification_request" | "submitter_reply",
  text: string,
  authorUid: string,
  authorName: string,
  authorRole: "reviewer" | "submitter",
  createdAt: Timestamp,
  isResolved: boolean
}
```

**Subcollection: `applications/{id}/changelog`**
```
{
  id: string,
  fieldName: string,
  oldValue: unknown,
  newValue: unknown,
  changedBy: string,   // uid
  changedByEmail: string,
  changedAt: Timestamp,
  reason: string       // "submitter_edit" | "resubmission" | "reviewer_status_change"
}
```

**Collection: `roles`**
```
{ uid: string, role: "submitter" | "reviewer" | "admin", email: string }
```

---

## Sub-Task 1 — Firebase project setup and security rules

**Status:** [x] done

**Intent:**
Stand up the Firebase project, configure all services, and write Firestore security
rules before any application code. Security rules are the authorization layer for
all direct Firestore reads — getting them right first prevents data exposure.

**Expected Outcomes:**
- Firebase project `adoption-portal` created with Firestore, Auth, Hosting,
  Functions, and Storage enabled
- Firebase Auth configured: email+password provider (submitters) and Google
  provider (reviewers, restricted to org domain)
- Firestore security rules enforced:
  - Submitters can only read/write their own application documents
  - Submitters cannot read `internal_note` comments
  - Reviewers can read all applications and all comments
  - Reviewers can write to status fields and comments only via Cloud Functions
    (rules block direct client writes to `status`)
  - `changelog` subcollection is read-only for submitters (own app only),
    read-only for reviewers (any app)
  - `roles` collection: read by owner only; write by admin only (or Functions)
- Firebase Hosting configured for the React SPA (single-page app rewrite rule)

**Todo List:**
1. Create Firebase project `adoption-portal` at console.firebase.google.com
2. Enable Firestore (Native mode, us-central1)
3. Enable Firebase Auth:
   - Enable Email/Password provider
   - Enable Google provider; restrict to Workspace domain
     (`allowedDomains: ["aforeverhome.org"]` in Google provider settings)
4. Enable Firebase Hosting
5. Enable Cloud Functions (requires Blaze plan upgrade — pay-as-you-go, but free
   tier still applies and cost at 150 apps/month is effectively $0)
6. Enable Firebase Storage (for any future file upload needs)
7. Write Firestore security rules covering all collections and subcollections
   as described in Expected Outcomes above
8. Write Firestore indexes needed for common queries:
   - `applications` collection: composite index on `(status ASC, submittedAt DESC)`
   - `applications` collection: composite index on `(assignedReviewerUid ASC, status ASC)`
9. Initialize Firebase CLI locally: `firebase init` (Hosting, Functions, Firestore)
10. Create GitHub repo `adoption-portal`; add Firebase deploy GitHub Action

**Relevant Context:**
- Firestore security rules use `request.auth.token.role` after custom claims are set
- Until custom claim is set (new user), default role = `submitter`; Cloud Function
  sets the claim on user creation via `auth.onCreate` trigger
- Google provider domain restriction in Firebase Auth does NOT restrict by workspace
  domain at the SDK level — enforce in an `auth.onCreate` Cloud Function that
  deletes accounts not matching the org domain (for Google sign-ins)

---

## Sub-Task 2 — Cloud Functions backend

**Status:** [x] done

**Intent:**
All business logic that must not run on the client — state transitions, change log
writes, MX validation, email notifications, and role management — lives in Cloud
Functions. The frontend calls these as HTTPS callable functions or REST endpoints;
Firestore security rules ensure clients cannot bypass the functions to mutate
protected fields directly.

**Function inventory:**

| Function | Trigger | Description |
|---|---|---|
| `onUserCreated` | auth.onCreate | Sets default `submitter` role as custom claim; rejects non-org Google accounts |
| `onRoleDocWritten` | Firestore onCreate/onUpdate on `/roles/{uid}` | Syncs Firestore role → Firebase custom claim |
| `createApplication` | HTTPS callable | Creates new draft application document |
| `saveApplication` | HTTPS callable | Saves field edits; diffs against current doc; writes changelog entries |
| `submitApplication` | HTTPS callable | Validates required fields; transitions status Draft→Submitted or ClarificationRequested→ClarificationReceived or Rejected→Submitted; increments resubmitCount; sends email to info@; notifies assigned reviewer if re-submit |
| `requestClarification` | HTTPS callable (reviewer) | Transitions status to ClarificationRequested; creates clarification_request comment; emails submitter |
| `approveApplication` | HTTPS callable (reviewer) | Transitions to Approved; writes changelog; emails submitter congrats |
| `rejectApplication` | HTTPS callable (reviewer) | Transitions to Rejected; writes changelog; emails submitter with reason + resubmit link |
| `assignReviewer` | HTTPS callable (admin) | Sets assignedReviewerUid/Email on application |
| `addComment` | HTTPS callable | Adds comment to subcollection; validates type allowed for caller's role |
| `validateMx` | HTTPS callable | Checks DNS MX records for email domain; called during registration |

**Todo List:**
1. Scaffold Cloud Functions in `/functions` using TypeScript:
   `firebase init functions` → TypeScript, ESLint
2. Install deps: `firebase-admin`, `firebase-functions`, `nodemailer` (or Gmail API)
3. Implement `onUserCreated`: set custom claim `{ role: "submitter" }`;
   if Google provider and email domain ≠ `aforeverhome.org`, delete user and throw
4. Implement `onRoleDocWritten`: read new role from Firestore doc,
   call `admin.auth().setCustomUserClaims(uid, { role })`
5. Implement `validateMx`: HTTP call to
   `https://dns.google/resolve?name={domain}&type=MX`;
   return `{ valid: boolean }`
6. Implement `createApplication`: auth check (submitter), create Firestore doc
   with `status: "Draft"`, `submitterId`, timestamps
7. Implement `saveApplication`: auth check (owner submitter OR reviewer for notes),
   fetch current doc, diff each changed field, batch-write doc update +
   changelog entries in a single Firestore transaction
8. Implement `submitApplication`:
   - Validate required fields (return 400 with field list if missing)
   - Validate allowed transition (Draft, ClarificationRequested, or Rejected → Submitted;
     ClarificationRequested → ClarificationReceived is a special sub-path)
   - Increment `resubmitCount` if previous status was Rejected or ClarificationRequested
   - Update status; write changelog entry
   - Send confirmation email to submitter
   - Send notification email to `info@aforeverhome.org`
   - If resubmission: send notification to assigned reviewer
9. Implement `requestClarification`, `approveApplication`, `rejectApplication`
   (all require `role === "reviewer"` or `"admin"` in custom claim)
10. Implement `assignReviewer` (requires `role === "admin"`)
11. Implement `addComment`: internal_note blocked for submitter role;
    submitter_reply blocked for reviewer role
12. Configure Gmail API or Nodemailer with Workspace SMTP credentials stored in
    Firebase environment config / Secret Manager
13. Deploy all functions: `firebase deploy --only functions`

**Relevant Context:**
- HTTPS callable functions receive `context.auth` with custom claims
- Firestore transactions (`runTransaction`) ensure changelog + doc update are atomic
- Gmail API via service account requires domain-wide delegation in Workspace Admin
- Simpler alternative: Nodemailer with an app password from a dedicated Gmail account
  (`no-reply@aforeverhome.org`)

---

## Sub-Task 3 — React app scaffold and routing

**Status:** [x] done

**Intent:**
Set up the React application with mobile-first styling, Firebase SDK wiring,
authentication context, and role-based route guards. All subsequent UI sub-tasks
build on this foundation.

**Expected Outcomes:**
- Vite + React + TypeScript project initialized in `/ui`
- Tailwind CSS and shadcn/ui installed and configured
- Firebase SDK initialized; `AuthContext` provides current user + role everywhere
- Route structure supports both submitter and reviewer flows in one SPA
- Protected routes redirect unauthenticated users to `/login`
- Reviewer-only routes redirect submitter-role users to `/dashboard`
- Mobile-first: base styles target 375px viewport; desktop enhancements via
  `md:` and `lg:` Tailwind breakpoints

**Route structure:**

| Route | Access | Description |
|---|---|---|
| `/` | Public | Landing page with "Apply to Adopt" CTA |
| `/register` | Public (unauthenticated only) | Email+password signup + MX validation |
| `/login` | Public (unauthenticated only) | Sign in (email or Google) |
| `/dashboard` | Submitter | List of own applications with status |
| `/apply` | Submitter | New application form (creates draft) |
| `/application/:id` | Submitter (owner) | Edit/view own application |
| `/application/:id/status` | Submitter (owner) | Status page: current state + clarification messages |
| `/review` | Reviewer + Admin | Application queue |
| `/review/:id` | Reviewer + Admin | Application detail: answers, comments, changelog |
| `/admin` | Admin | Role management, reviewer assignment |

**Todo List:**
1. Scaffold: `npm create vite@latest ui -- --template react-ts`
2. Install: `tailwindcss`, `@tailwindcss/vite`, `shadcn/ui`, `react-router-dom v6`,
   `firebase`, `react-hook-form`, `zod`, `@hookform/resolvers`
3. Configure Tailwind with mobile-first defaults; set base font size 16px,
   touch targets minimum 44px
4. Initialize shadcn/ui: `npx shadcn@latest init`
5. Create `src/firebase.ts`: initialize Firebase app, export `auth`, `db`, `functions`
6. Create `src/context/AuthContext.tsx`:
   - Subscribes to `onAuthStateChanged`
   - After sign-in, calls `getIdTokenResult()` to read custom claim `role`
   - Exposes `{ user, role, loading }` to all consumers
7. Create `<RequireAuth>` and `<RequireRole>` route guard components
8. Build route structure using React Router v6 `<Routes>` with guards
9. Create bottom navigation bar component (mobile) that conditionally shows
   submitter nav vs reviewer nav based on role
10. Create top app bar component with back navigation and user avatar/logout
11. Add `staticwebapp.config.json` equivalent — for Firebase Hosting, add
    SPA rewrite rule to `firebase.json`: all non-asset paths → `/index.html`

**Relevant Context:**
- shadcn/ui components are unstyled/accessible by default and compose well with Tailwind
- Bottom nav bar is the standard mobile navigation pattern (vs sidebar on desktop)
- `getIdTokenResult(true)` forces token refresh to pick up newly set custom claims

---

## Sub-Task 4 — Submitter registration, login, and dashboard

**Status:** [x] done

**Intent:**
Build the public-facing auth screens and the submitter's personal dashboard.
Registration validates the email domain has MX records before creating the account.

**Expected Outcomes:**
- Registration form: email, password, confirm password; calls `validateMx` before
  `createUserWithEmailAndPassword`; sends email verification
- Login form: email+password with "Forgot password" link
- Submitter dashboard: card list of own applications, status badge, last edited date,
  "New Application" FAB (floating action button, bottom-right, mobile standard)
- Empty state when no applications exist

**Todo List:**
1. Build `/register` page:
   - Fields: Email, Password (min 8 chars), Confirm Password
   - On submit: call `validateMx` Cloud Function with email domain
   - If MX invalid: show inline error "This email domain doesn't appear to be valid.
     Please use a working email address."
   - If MX valid: `createUserWithEmailAndPassword` → `sendEmailVerification`
   - Redirect to `/dashboard` with banner: "Check your email to verify your address"
2. Build `/login` page:
   - Email + password form
   - "Sign in with Google" button (for reviewers — but available to all)
   - "Forgot password?" link → `sendPasswordResetEmail`
3. Build `/dashboard` page:
   - On mount: read from Firestore `applications` where `submitterId == currentUser.uid`
     ordered by `lastEditedAt desc`
   - Render scrollable list of `<ApplicationCard>` components
   - `<ApplicationCard>`: applicant name (or "Draft"), status badge (color-coded),
     last edited date, chevron → navigate to `/application/:id`
   - Status badge colors: Draft=gray, Submitted=blue, Under Review=yellow,
     Clarification Requested=orange, Clarification Received=teal,
     Approved=green, Rejected=red
   - Floating action button (bottom-right): "Start New Application" → `/apply`
4. Handle email-not-verified state: show banner on dashboard, block submission
   until verified

**Relevant Context:**
- Firebase Auth `user.emailVerified` flag is checked before allowing `submitApplication`
- Firestore security rules also enforce `request.auth.token.email_verified`
  for submit operations

---

## Sub-Task 5 — Application form (submitter)

**Status:** [x] done

**Intent:**
The mobile-first multi-section questionnaire form. Mirrors all fields from the
original PDF. Auto-saves as draft. Status-aware: read-only when under review,
editable when draft/rejected/clarification-requested.

**Expected Outcomes:**
- Form divided into 8 named sections, displayed one section at a time on mobile
  (stepper pattern) or as a scrollable long-form on desktop
- All PDF fields present with appropriate input types
- Auto-save: debounced 3-second `saveApplication` call after any field change
  (only fires if form is dirty and status is editable)
- Progress indicator shows section completion on mobile stepper
- "Save & Continue" advances to next section; "Submit Application" on final section
- Status banner at top when form is read-only (with explanation)
- Clarification banner: when status is `Clarification Requested`, a highlighted
  card at the top shows the reviewer's message and "Edit your application below"

**Form sections:**
1. **Applicant Information** — full name, co-applicant name, address, city, state,
   zip, phone, email (read-only, from account)
2. **Home & Living Situation** — home type (radio), own/rent (radio),
   landlord name/phone (conditional on "rent"), yard (toggle), fenced (toggle),
   fence height (conditional on fenced=yes)
3. **Household Members** — number of adults (number), number of children (number),
   ages of children (text, conditional)
4. **Current & Previous Pets** — current pets (repeatable pet card: species, breed,
   age, spayed/neutered toggle, owned how long), previous pets (long text)
5. **Veterinarian** — vet name, clinic name, clinic phone
6. **Dog Care Plan** — hours alone per day (number), where dog sleeps (text),
   where dog stays during day (text), exercise plan (long text)
7. **About You** — dog experience (long text), reason for adopting (long text),
   specific dog requested or open (radio + conditional text)
8. **Agreement** — home visit consent (checkbox, required), signature acknowledgment
   (checkbox + typed name, required), date (auto-filled)

**Todo List:**
1. Create `useApplication` hook:
   - Loads application by ID from Firestore
   - Exposes `fields`, `setField`, `isDirty`, `isSaving`, `canEdit` (derived from status)
2. Implement debounced auto-save (calls `saveApplication` Cloud Function)
3. Build `<FormStepper>` component: mobile = step-by-step with progress dots;
   desktop = single-page scroll with section anchors
4. Build each of the 8 section components using `react-hook-form` + `zod` schemas
5. Build `<PetCard>` repeatable component for current pets section
6. Build status-aware wrapper: if `canEdit === false`, render all inputs as `disabled`
   with a top banner explaining the status
7. Build clarification banner component: shown when status is `Clarification Requested`;
   fetches latest `clarification_request` comment and displays it
8. Build submit button with confirmation bottom sheet (mobile) / dialog (desktop):
   "Once submitted, you won't be able to edit until a reviewer responds."
9. Handle resubmit case: if status is `Rejected`, show "Resubmit Application" button
   instead of "Submit Application"; different confirmation message

**Relevant Context:**
- `saveApplication` only diffs changed fields — auto-save is cheap even if called often
- Bottom sheet (mobile drawer) for confirmations is the mobile-native pattern;
  shadcn/ui `<Drawer>` component handles this via `vaul`
- Section validation: warn on "Save & Continue" if section has errors; allow
  proceeding with warning (only block on final Submit)

---

## Sub-Task 6 — Reviewer dashboard and application detail

**Status:** [x] done

**Intent:**
Role-gated section of the same React app. Reviewers see the full application
queue, can open any application to read answers, view the comment thread and
change log, and take workflow actions. Designed mobile-first so reviewers can
triage on their phones.

**Expected Outcomes:**
- `/review` queue: filterable list of all applications; mobile = full-width cards;
  desktop = table
- Filter bar: by status (chip group), by assigned reviewer, date range
- "Unassigned" quick filter prominent at top (for `info@` triage use)
- `/review/:id` detail: tabbed layout (Answers | Comments | Change Log)
- Action buttons visible and tappable on mobile (sticky bottom action bar)
- Actions: Assign to Me, Request Clarification, Approve, Reject
- All actions call Cloud Functions, not direct Firestore writes

**Todo List:**
1. Build `/review` queue page:
   - Reads from Firestore `applications` (reviewer custom claim allows this per
     security rules)
   - `<ApplicationQueueCard>` (mobile) / `<ApplicationQueueRow>` (desktop):
     applicant name, status badge, submitted date, assigned reviewer chip,
     resubmit count badge (shown if > 0)
   - Filter chips row (scrollable horizontal on mobile): All, Unassigned,
     Submitted, Under Review, Clarification Received, Approved, Rejected
   - Tapping a card navigates to `/review/:id`
2. Build `/review/:id` detail page:
   - Sticky header: applicant name, status badge, action button row
   - Tabs: `<AnswersTab>`, `<CommentsTab>`, `<ChangeLogTab>`
3. Build `<AnswersTab>`: renders all questionnaire fields in labeled sections,
   read-only; same section grouping as submitter form
4. Build `<CommentsTab>`:
   - Scrollable comment thread; each comment shows type badge, author, timestamp, text
   - `internal_note` comments shown only to reviewers (never to submitters)
   - "Add Note" button → bottom sheet: text area → calls `addComment`
   - "Request Clarification" button → bottom sheet: text area → calls `requestClarification`
5. Build `<ChangeLogTab>`:
   - Reads `applications/{id}/changelog` subcollection, sorted descending by `changedAt`
   - Each entry: field name (human-readable label), old value, new value, timestamp,
     reason badge
   - Grouped by resubmission number for readability
6. Build sticky bottom action bar (mobile) / top action bar (desktop):
   - "Assign to Me" (visible if unassigned or assigned to someone else)
   - "Request Clarification" (visible if status is Under Review)
   - "Approve" (visible if status is Under Review or Clarification Received)
   - "Reject" (visible if status is Under Review or Clarification Received)
   - Approve/Reject → confirmation bottom sheet with required reason for Reject
7. "Approve" calls `approveApplication`; "Reject" calls `rejectApplication` with reason

**Relevant Context:**
- Tabs on mobile use a scrollable horizontal tab bar (standard Android/iOS pattern);
  shadcn/ui `<Tabs>` component
- Sticky bottom action bar: `position: sticky; bottom: 0` with safe area inset for iOS
- `resubmitCount` badge: shown as a small numbered chip on the queue card,
  helps triage staff spot repeat applicants immediately

---

## Sub-Task 7 — Email notifications (Cloud Functions)

**Status:** [x] done

**Intent:**
Every workflow event that involves a person outside the current screen must trigger
an email. All email is sent from Cloud Functions using the Workspace Gmail account
via Nodemailer (simplest) or the Gmail API. Email templates are HTML for
professional formatting on mobile email clients.

**Email inventory:**

| Trigger | Recipient | Subject |
|---|---|---|
| New submission | info@aforeverhome.org | [New Application] {Name} |
| Resubmission | info@aforeverhome.org + assigned reviewer | [Resubmission #{n}] {Name} |
| Submission confirmation | Submitter | Your adoption application was received |
| Clarification request | Submitter | Action required — your application needs clarification |
| Clarification received | Assigned reviewer | {Name} has responded to your clarification request |
| Application approved | Submitter | Your adoption application was approved! |
| Application rejected | Submitter | Update on your adoption application |
| Reviewer assigned | Assigned reviewer | You have been assigned an adoption application |

**Todo List:**
1. Create a dedicated Gmail account or alias `no-reply@aforeverhome.org` in Workspace
2. Store SMTP credentials (or OAuth2 refresh token) in Firebase Secret Manager:
   `firebase functions:secrets:set GMAIL_USER` and `GMAIL_PASS`
3. Create `src/email/transporter.ts` in Functions: Nodemailer transport configured
   from secrets
4. Create HTML email templates for each event (mobile-responsive, inline CSS):
   - Header: org logo + name
   - Body: clear message, key details in a summary box
   - CTA button: "View Your Application" or "Open in Reviewer Dashboard"
   - Footer: contact info, unsubscribe note
5. Integrate email sends into the relevant Cloud Functions from Sub-Task 2
   (each function already has the data needed to compose its email)
6. Test all emails with Gmail, Apple Mail, and Outlook (the three most common
   clients for a nonprofit audience)

**Relevant Context:**
- Nodemailer with Gmail requires either an App Password (simpler) or OAuth2
  (more robust, recommended for production)
- CTA button in rejection email links to `https://<app-domain>/application/{id}`
  (submitter must be logged in; app handles redirect to login then back to app)
- CTA button in reviewer notification links to
  `https://<app-domain>/review/{id}`

---

## Sub-Task 8 — Admin panel (role management + reviewer assignment)

**Status:** [x] done

**Intent:**
A minimal admin screen for staff to assign reviewer roles to Workspace users and
to manually assign applications to reviewers. Only users with `role: "admin"` can
access this screen.

**Expected Outcomes:**
- `/admin` route gated to `admin` role
- "Manage Roles" section: lookup user by email, set role to reviewer/admin/submitter
- "Unassigned Applications" section: quick list of submitted applications with no
  assigned reviewer; one-tap assign from a reviewer dropdown

**Todo List:**
1. Build `/admin` page with two sections
2. "Manage Roles" form:
   - Email input + role dropdown + "Save" button
   - Calls an `setUserRole` Cloud Function (admin-only; writes to `/roles/{uid}`)
   - Cloud Function looks up user by email via `admin.auth().getUserByEmail()`,
     writes Firestore role doc, sets custom claim
3. "Unassigned Applications" list:
   - Reads `applications` where `assignedReviewerUid == null` and
     `status == "Submitted"`
   - Each row: applicant name, submitted date, "Assign" button →
     reviewer dropdown populated from `roles` collection (role=reviewer or admin)
   - "Assign" calls `assignReviewer` Cloud Function
4. First-time bootstrap: document the manual step of setting the first admin via
   Firebase Console (write directly to `/roles/{uid}` for the initial admin user)

**Relevant Context:**
- `setUserRole` requires `context.auth.token.role === "admin"` check server-side
- The `roles` collection is read by the admin function to populate the reviewer
  dropdown — client does NOT have direct read access to all roles
- First admin user must be created manually via Firebase Console or CLI one-time setup

---

## Sub-Task 9 — Mobile-first polish and PWA

**Status:** [x] done

**Intent:**
Ensure the app is installable as a Progressive Web App (PWA), loads fast on
mobile, and meets basic accessibility requirements. A PWA lets reviewers and
submitters "install" it to their home screen for app-like access with no App Store.

**Expected Outcomes:**
- App is installable on Android and iOS (PWA manifest + service worker)
- Lighthouse PWA score ≥ 90
- Lighthouse Accessibility score ≥ 90
- All touch targets ≥ 44×44px
- Form inputs do not cause zoom on iOS (font-size ≥ 16px on inputs)
- App functions offline for viewing already-loaded applications (service worker cache)

**Todo List:**
1. Add `vite-plugin-pwa` to Vite config
2. Create `public/manifest.json`: name, short_name, icons (192px + 512px), theme
   color, background color, `display: "standalone"`, `start_url: "/"`
3. Configure service worker: cache Firebase Hosting assets + last-loaded application
   data for offline read access
4. Audit all interactive elements for 44px minimum touch target size
5. Set `font-size: 16px` on all `<input>`, `<textarea>`, `<select>` elements to
   prevent iOS auto-zoom
6. Add `<meta name="viewport" content="width=device-width, initial-scale=1">` to
   `index.html` (Vite default includes this, but verify)
7. Add iOS-specific PWA meta tags (`apple-mobile-web-app-capable`,
   `apple-mobile-web-app-status-bar-style`, `apple-touch-icon`)
8. Run Lighthouse audit in Chrome DevTools; fix any score < 90 issues
9. Test on real Android and iOS devices (or BrowserStack)

---

## Sub-Task 10 — Testing and go-live

**Status:** [x] done

**Intent:**
End-to-end validation before opening the portal to the public. Covers the full
state machine, security rule correctness, email delivery, and team readiness.

**Expected Outcomes:**
- All 9 status transitions tested end-to-end with real accounts
- Security rules verified: submitter cannot read another user's application
- Security rules verified: submitter cannot write to `status` field directly
- All email notifications verified (correct content, links, delivery)
- Change log verified: every field edit captured correctly
- PWA verified: installable on Android and iOS
- info@aforeverhome.org receives correct notifications on submit and resubmit
- Admin panel tested: role assignment, reviewer assignment work end-to-end
- Portal URL live, linked from organization website
- Reviewer walkthrough guide written

**Todo List:**
1. Create test accounts: 3 submitter (email+password), 2 reviewer (Google Workspace),
   1 admin
2. Run full happy-path test: register → verify email → apply → submit → assign reviewer
   → request clarification → submitter edits + resubmits → approve
3. Run rejection + resubmit path: submit → reject → submitter edits → resubmit → approve
4. Run MX validation test: attempt registration with a fake domain
5. Verify security rules: attempt to read another submitter's application (should fail)
6. Verify security rules: attempt direct Firestore write to `status` from client
   (should fail — must go through Cloud Function)
7. Verify all emails arrive; check links; verify mobile email rendering
8. Verify change log entries for every field changed in tests
9. Run Lighthouse audit on live Firebase Hosting URL
10. Test PWA install on Android (Chrome) and iOS (Safari → Add to Home Screen)
11. Set Firebase Hosting custom domain; verify SSL auto-provisioned
12. Add link to portal from organization website
13. Write one-page reviewer guide: queue filters, assignment, requesting clarification,
    reading the change log, approving and rejecting
14. Set up Firebase Alerts for Cloud Function errors (Firebase Console → Alerts)
