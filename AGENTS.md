# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## Cursor Cloud specific instructions

This is a single Expo SDK 56 React Native app (no monorepo, no backend). The only service is the Metro/Expo dev server.

### Running the app

- `npx expo start --web --port 8081` starts the web dev server at http://localhost:8081.
- Native (iOS/Android) targets are not available in Cloud Agent VMs; use `--web` for testing.
- The first bundle takes ~12s; subsequent reloads are faster via Metro cache.

### Lint / Type-check

- **Lint**: `npx expo lint` (ESLint, auto-installs config on first run).
- **Type-check**: `npx tsc --noEmit`. Two pre-existing CSS-module TS errors (`animated-icon.module.css`, `global.css`) are expected and do not affect runtime.

### Key notes

- Package manager is **npm** (lockfile: `package-lock.json`).
- Scripts are in `package.json`: `start`, `web`, `lint`, `reset-project`.
- No `.env` files, no secrets, no backend, no database required.
