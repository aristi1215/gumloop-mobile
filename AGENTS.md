# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## Cursor Cloud specific instructions

### Overview

This is a single Expo SDK 56 / React Native 0.85 mobile app (not a monorepo). It runs entirely in **mock mode** without any external credentials—no Supabase, no Gumloop API key needed for development.

### Running the app

```bash
npx expo start --web --port 8081   # web mode (best for headless Cloud VM)
```

The app serves on `http://localhost:8081`. Sign in with any email and a password of 4+ characters (mock auth accepts anything).

### Key commands

| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Lint | `npm run lint` |
| Typecheck | `npm run typecheck` |
| Start (web) | `npm run web` |
| Start (general) | `npm start` |

### Gotchas

- The web bundle takes ~14s on first load; wait for "Web Bundled" in the terminal before testing.
- `expo-notifications` emits a harmless warning on web: "Listening to push token changes is not yet fully supported on web."
- There are no automated test suites (no Jest/Vitest config). Validation is via lint, typecheck, and manual testing in the browser.
- The `punycode` deprecation warning from Node is cosmetic and can be ignored.
