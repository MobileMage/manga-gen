# enpitsu — Frontend

Next.js 16 (App Router) frontend for the enpitsu AI manga generator.

## Tech

- **Framework**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Auth**: Firebase (Google OAuth + email/password)
- **Fonts**: DM Sans, Space Mono, Noto Sans JP
- **PDF export**: html2canvas + jsPDF
- **Animation**: Framer Motion

## Setup

```bash
npm install
```

Create `.env.local` in this directory:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

## Commands

```bash
npm run dev      # Dev server at http://localhost:3000
npm run build    # Production build
npm run lint     # ESLint check
```

## Structure

```
src/
├── app/
│   ├── (app)/
│   │   ├── layout.tsx      # App shell with TopBar + MangaProvider
│   │   └── page.tsx        # ConceptPage — story generation
│   └── login/
│       └── page.tsx        # Auth page
├── components/
│   ├── TopBar.tsx          # Nav bar with step progress
│   ├── CharactersStep.tsx  # Character sheet generation (SSE)
│   ├── StoryboardStep.tsx  # Panel generation (SSE)
│   ├── ReaderStep.tsx      # Manga reader + PDF export
│   └── Toast.tsx
├── contexts/
│   ├── MangaContext.tsx    # Global state: story, sheets, panels, step
│   └── AuthContext.tsx     # Firebase auth state
└── lib/
    ├── api.ts              # Fetch wrapper + SSE streaming helpers
    ├── firebase.ts         # Firebase app init
    ├── exportPdf.ts        # html2canvas + jsPDF export
    ├── panelLayout.ts      # Manga panel grid layout
    └── storyPrompts.ts     # Story idea templates
```
