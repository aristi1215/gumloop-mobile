# Gumloop Mobile

**Your Gumloop automations, in your pocket.**

Gumloop Mobile is a native supervision layer for [Gumloop](https://www.gumloop.com) workflows. It connects directly to Gumloop's public API so operators can monitor pipeline runs, respond to failures instantly, and keep automations healthy â€” without opening a laptop.

Built for teams who run production automations and need **real-time visibility on mobile**.

---

## The problem it solves

Automation platforms are powerful at the desk, but ops don't stop when you leave it. When a pipeline fails at 11 PM, you need to know immediately â€” and sometimes you need to kill a stuck run or retry from your phone. This app closes that gap.

| Capability | Impact |
|------------|--------|
| **Live run dashboard** | FAILED/TERMINATED runs surface first â€” no digging |
| **Flow control** | Start, retry, kill, and refresh pipelines remotely |
| **Push notifications** | Background watcher detects state transitions and alerts you |
| **Audit logs** | Enterprise admin viewer with filters, search, and pagination |
| **Secure auth** | Supabase email/password with protected routes and session persistence |

---

## Tech stack

- **Expo SDK 56** + **expo-router** (file-based routing)
- **React Native 0.85** + **React 19** + **TypeScript** (strict)
- **NativeWind v4** â€” TailwindCSS for React Native
- **Supabase** â€” Auth, Postgres, RLS, notification prefs/history, run cache
- **TanStack Query v5** â€” Server state, caching, polling, infinite scroll
- **expo-notifications** â€” Local push delivery with deep linking

> Production defaults to live Gumloop + Supabase. Set `EXPO_PUBLIC_USE_MOCK_API=true` only for local demos without Gumloop credentials.

---

## Architecture

```
src/
  app/                  # expo-router routes (auth, tabs, flow detail)
  components/           # Tab bar + design-system UI
  features/runs/        # Run cards, filters, log viewer
  services/
    api/                # Gumloop API client (live + mock adapters)
    notifications/      # Background watcher + push dispatcher
    supabase/           # Auth, persistence, production cache
  providers/            # Auth, Theme, Query providers
supabase/migrations/    # Postgres schema, RLS, storage
```

The mock layer mirrors Gumloop's OpenAPI shapes â€” swapping to live credentials is drop-in.

---

## Gumloop API integration

| Service method | Live endpoint |
|----------------|---------------|
| `listSavedFlows()` | `GET /list_saved_items` |
| `getRun(runId)` | `GET /get_pl_run` |
| `startRun({...})` | `POST /start_pipeline` |
| `killRun(runId)` | `POST /kill_pipeline` |
| `getAuditLogs({...})` | `GET /get_audit_logs` |

Authentication uses `Authorization: Bearer <api_key>` + the `x-auth-key` user header per Gumloop's docs.

---

## Getting started

```bash
npm install
npx expo start
```

Copy `.env.example` to `.env.local` and configure Gumloop + Supabase credentials. Run migrations in `supabase/migrations/` against your Supabase project.

```bash
npm start          # expo start
npm run android    # expo start --android
npm run ios        # expo start --ios
npm run lint       # expo lint
```

---

## What this demonstrates

- **Third-party API integration** â€” Production mapping to Gumloop's public OpenAPI
- **Mobile-first ops UX** â€” Polling, infinite scroll, pull-to-refresh, background tasks
- **Adapter pattern** â€” Mock/live swap for development without credential lock-in
- **Enterprise features** â€” Audit logs, notification preferences, workspace selection
- **Design system discipline** â€” Token-based theming with dark mode and reusable primitives

---

Built by [aristi1215](https://github.com/aristi1215)
