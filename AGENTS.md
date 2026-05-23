# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## Cursor Cloud specific instructions

### Project overview

Gumloop Native — an Expo SDK 56 / React Native 0.85 mobile app for monitoring Gumloop automations. Single-project repo (not a monorepo). Package manager is **npm** (lockfile: `package-lock.json`).

### Running the app

The app runs in web mode for cloud development. Standard commands from `package.json`:

- `npm start` — starts Metro bundler (Expo dev server)
- `npm run web` — starts in web mode (`expo start --web`)
- `npm run lint` — runs ESLint via `expo lint`
- `npm run typecheck` — runs `tsc --noEmit`

### Mock mode (no external credentials needed)

Create a `.env.local` at the repo root with:

```
EXPO_PUBLIC_USE_MOCK_API=true
EXPO_PUBLIC_USE_MOCK_SUPABASE=true
```

This enables fully functional mock adapters for both the Gumloop API and Supabase auth/persistence. The sign-in screen pre-fills `dev@gumloop.local` / `demo1234`.

If `.env.local` is missing entirely, the app auto-detects missing env vars and falls back to mock mode as well.

### Gotchas

- The web bundler takes ~15 seconds on first load. Wait for the "Bundled" log before opening the browser.
- `expo-notifications` warns about partial web support — this is expected and does not affect functionality.
- The `punycode` deprecation warning from Node is a known upstream issue and is harmless.
