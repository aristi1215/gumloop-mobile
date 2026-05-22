# Gumloop Native

Mobile supervision layer for [Gumloop](https://www.gumloop.com) automations — built with **Expo SDK 56**, **React Native 0.85**, **TypeScript**, **NativeWind**, **Supabase**, and **TanStack Query**.

Operators monitor runs, receive failure alerts, kill stuck workflows, and review enterprise audit logs from their phone.

> The app runs end-to-end **without any Gumloop or Supabase credentials**. A realistic in-memory mock layer powers the entire experience until real credentials are wired in.

## Features

| Area                | What's included                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| Auth                | Supabase email/password, secure session persistence, protected routes, sign out                       |
| Dashboard           | Live run feed, FAILED/TERMINATED prioritized, search, status & workspace filters, infinite scroll, pull-to-refresh, background polling |
| Flow detail         | Current run summary, inputs/outputs, ANSI-aware log viewer w/ search, historical runs, input schema, start/retry/kill/refresh actions |
| Notifications       | Background watcher with state-transition detection, local push delivery, per-flow opt-in/out, history, deep linking |
| Audit log           | Enterprise admin viewer with date-range, event filters, search, pagination                            |
| Settings            | Notification toggles, polling interval, theme (system/light/dark), workspace selection, account info  |
| Design system       | Token-based design (mirrored in Tailwind + JS), dark mode, skeletons, status badges, reusable cards   |

## Tech stack

- **Expo SDK 56** + **expo-router** file-based routing
- **React Native 0.85** + **React 19.2** + **TypeScript** (strict)
- **NativeWind v4** (TailwindCSS for React Native) — co-exists with `StyleSheet` for fine-grained primitives
- **Supabase** for auth, database, RLS (gracefully falls back to an in-memory client when not configured)
- **TanStack Query (v5)** for server state, caching, polling, infinite scroll
- **expo-notifications** for local push delivery
- `expo-secure-store`, `react-native-url-polyfill`, `@react-native-async-storage/async-storage`

## Project structure

```
src/
  app/                            # expo-router routes
    _layout.tsx                   # Root providers + notification watcher boot
    index.tsx                     # Splash redirect → auth or app
    (auth)/sign-in.tsx
    (app)/
      _layout.tsx                 # Auth-guarded stack
      (tabs)/
        dashboard.tsx
        notifications.tsx
        audit.tsx
        settings.tsx
      flow/[id].tsx               # Flow detail screen
  components/
    TabBar.tsx                    # Custom bottom tab bar
    ui/                           # Reusable design-system components
  constants/
    theme.ts                      # Design tokens (also mirrored in tailwind.config.js)
    config.ts                     # Env / runtime config + mock toggle
  features/runs/                  # Run cards, filters, log viewer, sort logic
  hooks/                          # Reusable hooks (useDebouncedValue, useNotifications…)
  providers/                      # AuthProvider, ThemeProvider, QueryProvider
  services/
    api/                          # Gumloop API client (live + mock adapters)
    notifications/                # Local notification dispatcher + run watcher
    queries/                      # TanStack Query hooks
    supabase/                     # Supabase client + auth helpers (+ mock fallback)
  types/                          # Typed Gumloop / Supabase / notification models
  utils/                          # Formatters
supabase/
  schema.sql                      # Postgres schema with RLS
```

## Getting started

```bash
npm install
npx expo start
```

The app boots in mock mode by default. Use any email + password (≥4 chars) at the sign-in screen.

### Wiring live credentials

Create a `.env.local` and set:

```
EXPO_PUBLIC_USE_MOCK_API=false
EXPO_PUBLIC_GUMLOOP_BASE_URL=https://api.gumloop.com/api/v1
EXPO_PUBLIC_GUMLOOP_API_KEY=...
EXPO_PUBLIC_GUMLOOP_USER_ID=...
EXPO_PUBLIC_GUMLOOP_PROJECT_ID=...        # optional
EXPO_PUBLIC_GUMLOOP_ORG_ID=...            # required for audit logs

EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

Run `supabase/schema.sql` against your Supabase project to provision tables, RLS policies, and the `auth.users` → `user_profiles` sync trigger.

That's it — `gumloopAdapter` and `supabase` automatically switch to the live implementations.

## Gumloop API mapping

The mock layer matches Gumloop's public OpenAPI shapes so the swap is drop-in. Cross-referenced sources:

| Service method                  | Live endpoint                                |
| ------------------------------- | -------------------------------------------- |
| `listSavedFlows()`              | `GET /list_saved_items`                      |
| `listWorkbooks()`               | `GET /list_workbooks`                        |
| `getRun(runId)`                 | `GET /get_pl_run`                            |
| `getRunHistory({...})`          | `GET /get_plrun_saved_item_map`              |
| `startRun({...})`               | `POST /start_pipeline`                       |
| `killRun(runId)`                | `POST /kill_pipeline`                        |
| `getInputSchema(savedItemId)`   | `GET /get_saved_item_input_schema`           |
| `getAuditLogs({...})`           | `GET /get_audit_logs`                        |

Authentication uses `Authorization: Bearer <api_key>` + the `x-auth-key` user header per Gumloop's docs.

## Scripts

```bash
npm start          # expo start
npm run android    # expo start --android
npm run ios        # expo start --ios
npm run web        # expo start --web
npm run lint       # expo lint
```
