# CLAUDE.md — `D:\BeatEmAll\app\` (the code repo)

> Read this at the start of every session inside `D:\BeatEmAll\app\`. It's the entry point for all engineering work.

---

## Where the canonical docs live

The product specs are in **`D:\BeatEmAll\Beatemall\docs\`** (sibling folder, separate on purpose). Read them in this order before doing anything:

1. `..\Beatemall\docs\PRODUCT_VISION.md` — what we are building and why
2. `..\Beatemall\docs\TECH_STACK.md` — locked technology choices
3. `..\Beatemall\docs\DOMAIN_MODEL.md` — entities and relationships
4. `..\Beatemall\docs\PRD.md` — full product requirements
5. `..\Beatemall\docs\EPICS.md` — epic map
6. `..\Beatemall\docs\MVP_SCOPE.md` — what ships in v1
7. `..\Beatemall\docs\SCREENS.md` — 59-screen master inventory
8. `..\Beatemall\docs\epics\<EPIC_ID>.md` — for whatever epic you're implementing
9. `..\Beatemall\docs\page-specs\<SCREEN_ID>.md` — for whatever screen you're building

The 59 designed-screen prototypes from Claude Design live at `Screens\beat-em-all\project\`. They are reference material — `Screens\` is git-ignored. Re-implement the visual output in our React + Tailwind v4 stack; do not copy the JSX prototype structure verbatim.

---

## What this project is, in one paragraph

Beat'Em All is a GCC-first competitive gaming platform. **As of 2026-05 the architecture pivoted to Vercel-native** — Vercel Functions for backend APIs, Vercel Postgres (Neon-backed) for storage, Vercel Blob for files, Auth.js v5 for sessions, Unifonic for SMS OTP, Tap Payments for payments. Each epic now ships its DB tables, Functions, and frontend wiring in a single PR (no more "Phase 1 = localhost only / Phase 9 = backend"). Mock data + persona-switcher (Khaled / Sara / Ahmad / Omar / Fatima) remains as a dev-only override for unauthenticated browsing while real auth + DB are in flight.

---

## Stack (locked)

| Layer | Choice |
|---|---|
| Framework | **Next.js 16.2** App Router with **Turbopack** |
| React | 19.2 |
| TypeScript | strict mode, `noUncheckedIndexedAccess` on |
| Styling | **Tailwind v4** + custom CSS tokens from `@beat-em-all/design-tokens` |
| Components | Custom dark-mode bento primitives + shadcn/ui (added per-epic as needed) |
| Icons | **Lucide** |
| i18n | **next-intl 4.x** with `[locale]` segment routing (`/en/...` and `/ar/...`) |
| Forms | React Hook Form + Zod |
| Server data | TanStack Query (against `@beat-em-all/api-client`) |
| Client state | Zustand |
| Animation | Framer Motion |
| Backend runtime | **Vercel Functions** (Node + Edge) under `apps/web/src/app/api/**/route.ts` |
| Database | **Vercel Postgres** (Neon-backed) via `@neondatabase/serverless` + **Drizzle ORM** |
| Migrations | **drizzle-kit** generate + `pnpm --filter @beat-em-all/db db:migrate` against `DATABASE_URL_UNPOOLED` |
| Auth | **Auth.js v5** (NextAuth) with credentials provider that calls Unifonic for phone-OTP |
| File storage | **Vercel Blob** (avatars, civil ID images) |
| Cache / sessions | **Vercel KV** (Upstash Redis) — added when an epic needs it |
| Scheduled jobs | **Vercel Cron Jobs** — added when first needed |
| Feature flags | **Vercel Edge Config** — added when first needed |
| SMS / WhatsApp | **Unifonic** (regional necessity, not replaceable) |
| Email | **Resend** |
| Payments | **Tap Payments** (regional necessity) |
| Format | Biome (formatter only) |
| Lint | ESLint + typescript-eslint + react-hooks + tailwindcss + security |
| Dead-code | Knip |
| Tests | Vitest |
| Pre-commit | Husky + lint-staged + commitlint |
| Monorepo | Turborepo + pnpm workspaces |
| Package manager | **pnpm** (never npm/yarn) |

---

## Brand tokens (from Claude Design — `Screens/beat-em-all/project/`)

| Token | Value |
|---|---|
| Background | `#0A0B0F` (`--bg-0`) |
| Brand violet | `#8B5CF6` (`--violet`) |
| Accent cyan | `#22D3EE` (`--cyan-2`) |
| Accent coral | `#FB7185` (`--coral`) |
| Display font | **Space Grotesk** (`--f-display`) |
| Mono / numerical | **JetBrains Mono** (`--f-mono`) |
| Arabic body | **IBM Plex Sans Arabic** (`--f-arabic`) |
| English body | **Inter** (`--f-body-en`) |
| Default card style | `glass` |
| Signature visualisations | Pentagon stat plot, sparklines, oversized display numerals |
| Layout | Bento grid, **dark mode only** (no light mode at MVP) |

Country accents: KW=coral, KSA=violet, AE=cyan, BH=lime, QA=amber, OM=coral-2.

---

## Folder structure

```
app/
├── apps/
│   ├── web/                # Next.js — player web (port 3000), also hosts /api/* Vercel Functions
│   └── admin/              # Next.js — admin console (port 3001)
├── packages/
│   ├── ui/                 # Shared shadcn-style components
│   ├── design-tokens/      # CSS variables + TypeScript token exports
│   ├── types/              # TypeScript types from DOMAIN_MODEL.md
│   ├── mock-data/          # KEC + 5 personas + 3 teams + 5 venues + 1 tournament (dev-only)
│   ├── api-client/         # Typed data-access — wraps mock-data + (per-epic) real /api calls
│   ├── db/                 # Drizzle schema, migrations, Neon-serverless client
│   ├── i18n/               # en.json + ar.json
│   ├── utils/              # Zod schemas + helpers
│   └── config/             # Shared eslint + biome + tailwind presets
├── Screens/                # gitignored — Claude Design HTML prototypes (reference)
├── .claude/
│   ├── settings.json       # PostToolUse hook: biome format on every Edit/Write
│   └── launch.json         # 3 dev-server entries (web, admin, all)
├── .husky/
│   ├── pre-commit          # lint-staged
│   └── commit-msg          # commitlint
├── .env.example            # template for local DATABASE_URL etc. (copy to .env.local)
└── (root configs: package.json, pnpm-workspace.yaml, turbo.json, tsconfig.base.json,
                  biome.json, knip.json, .gitignore, .gitattributes, .nvmrc)
```

---

## Operational rules (binding)

### Before code

1. Confirm the epic + story you're implementing. **Do not invent features.**
2. Confirm the story is in MVP scope (`..\Beatemall\docs\MVP_SCOPE.md`).
3. Read the relevant section of `DOMAIN_MODEL.md` for any entities you'll touch.
4. Check `TECH_STACK.md` for anything you're about to use.
5. **Never invent entities** not in `DOMAIN_MODEL.md`. If a spec needs a new entity, stop and update the doc first.

### While writing code

- TypeScript strict mode. Never `any` without a `// reason` comment.
- Tailwind classes only. Never inline styles. Never CSS-in-JS.
- shadcn/ui components only. Lucide icons only.
- Zod for all validation.
- Server Components by default; `"use client"` only when interactivity demands it.
- **Dark mode only** at MVP (light mode deferred per the design brief).
- **RTL-aware** via Tailwind logical properties (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`).
- Pull all user-facing strings from `@beat-em-all/i18n` translation files. **Never hardcode user-facing text.**
- Skeleton + empty + error states for every screen.
- All third-party integrations through `@beat-em-all/api-client` — no direct vendor SDK calls in app code.

### After

- Run `pnpm lint && pnpm typecheck && pnpm test` before committing.
- **Conventional Commits** with epic+story tag: `feat(E1): add player profile creation form (Story 1.2)`.
- If you made an architectural decision, write an ADR in `..\Beatemall\docs\decisions\`.
- If you discovered something that contradicts the canonical docs, **update the doc in the same PR**.

---

## Multi-tenancy reminder

**KEC is `Organization #1`, not a hardcoded special case.** Every tournament, venue, brand, and federation is an Organization with a tier (Federation / Venue / Brand / Community / Personal). When you see "KEC needs X" in a spec, ask: **"Could SEF do this same thing if they signed up tomorrow?"** If the answer is no, you've hardcoded something. Fix it.

---

## Common workflows

### Start the dev servers

```bash
pnpm dev                                  # both apps via turbo
pnpm --filter @beat-em-all/web dev        # just web on :3000
pnpm --filter @beat-em-all/admin dev      # just admin on :3001
```

### Add a translation key

1. Add to `packages/i18n/src/en.json` AND `packages/i18n/src/ar.json`.
2. Use via `useTranslations('namespace')` (server) or `useTranslations()` (client).
3. **Never hardcode user-facing strings.**

### Add a shadcn component

```bash
cd apps/web    # or apps/admin
pnpm dlx shadcn@latest add <component-name>
```

If the component is reused across web + admin, promote it to `packages/ui` after the second use.

### Add a new domain entity

1. **Update** `..\Beatemall\docs\DOMAIN_MODEL.md` first.
2. Add the TypeScript type to `packages/types/src/`.
3. Add Zod schema to `packages/utils/src/`.
4. Add mock seed to `packages/mock-data/src/`.
5. Add typed accessor to `packages/api-client/src/` reading from mock-data.
6. Use it in components.

---

## Tools available to the session

### Anthropic-official Claude Code plugins (user scope, installed)
- `commit-commands` — `/commit`, `/commit-push-pr`
- `pr-review-toolkit` — `/review`
- `security-guidance` — security reminders + `/security-review`

### MCPs (user scope, installed)
- `memory` — knowledge-graph layered on file-based auto-memory
- `taskmaster-ai` — parses `..\Beatemall\docs\PRD.md` / `EPICS.md` into task graphs

### Skills (user scope, installed)
- `brainstorming` (Superpowers) — REQUIRED before any creative work; treat its `<HARD-GATE>` as binding
- `systematic-debugging` (Superpowers) — invoke on any bug or unexpected behaviour BEFORE proposing a fix
- `test-driven-development` (Superpowers) — Vitest + Playwright TDD methodology
- Plus all `product-management:*` and `engineering:*` Anthropic skills

### Already wired
- `.claude/settings.json` PostToolUse hook auto-formats every Edit/Write with Biome
- Husky pre-commit runs `lint-staged` (Biome format + ESLint fix)
- Husky commit-msg runs commitlint (Conventional Commits enforcement)

---

## What NOT to do

- **Do not invent entities** not in `DOMAIN_MODEL.md`.
- **Do not introduce new dependencies** without explicit approval.
- **Do not add features outside the current epic and story.**
- **Do not refactor unrelated code** in the same PR as a feature.
- **Do not write business logic in client components.** Push it to Server Actions or `@beat-em-all/api-client`.
- **Do not commit secrets.** Use environment variables and update `.env.example`.
- **Do not bypass the integration abstraction layer** in `@beat-em-all/api-client` for third-party APIs.
- **Do not add real Supabase / Tap / Sentry / PostHog yet.** That's Phase 9 per `MVP_SCOPE.md`.
- **Do not add the mobile app yet.** That's Phase 9.
- **Do not edit anything in `..\Beatemall\docs\`** — those are the canonical specs. Discuss changes first.

---

## When you don't know what to do

**Ask.** A 30-second clarifying question is far cheaper than 4 hours of rework.

— Founder
