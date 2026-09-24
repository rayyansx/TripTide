# `@trek/native`

React Native (Expo) client for TREK — iOS and Android, alongside the existing
web PWA (`client/`), not replacing it. Talks to the same NestJS server
(`server/`) over the same REST + `/ws` contract; **no server changes** were
needed to add this app.

Not a root npm workspace (see root `package.json`'s `workspaces`), by design —
same reasoning as `plugin-sdk/`: Expo/React Native's dependency tree is large
and version-sensitive, so it gets its own `package.json`/lockfile instead of
being hoisted into the root install.

## Setup

Run steps for the iOS simulator are in [NATIVE.md](../NATIVE.md).

## What's here (Phase 1)

Auth (bearer token via `POST /api/auth/login`, stored in `expo-secure-store`
— the web app's httpOnly-cookie session doesn't carry over to RN), realtime
plumbing (`/api/auth/ws-token` + native `WebSocket`, `X-Socket-Id` echoed on
writes exactly like the web client), shared Zod contracts and i18n strings
reused as-is from `@trek/shared`, and the phone shell from `client/src/mobile/`:
dashboard (spotlight + trip cards), trip screen (day chips, plan timeline,
places, and the same dock sections), settings, and login. Trip sections other
than the plan and the places list are the chrome only — their editors are still
ahead.

This is deliberately a vertical slice, not a broad shell: every piece here
(interceptors, repo shape, navigation, i18n loading) is the pattern the rest
of the app repeats, so subsequent features are mostly repetition, not new
plumbing.

## What's here (visual/branding pass)

`src/theme/` ports both palettes the web app actually uses: the desktop tokens
from `client/src/index.css`, and the phone-shell tokens from
`client/src/mobile/mobile.css` (`useTheme().m`). Light/dark/auto follows
`Appearance.getColorScheme()` and is persisted via AsyncStorage. Poppins is
the UI typeface (the web app's `--font-system`). Screens use the phone shell:
paper gradient, glass top bar, floating dock with the centre "+". The app
icon/splash/adaptive icon are rasterized from `client/public/icons/icon.svg`.
Colored accent schemes and the wordmark fonts (Geist, MuseoModerno) aren't
ported yet.

## Roadmap

**Phase 2 — offline data layer.** `client/`'s offline core (`repo/` +
`sync/mutationQueue.ts` + Dexie) is the data layer to extend — its algorithm
(optimistic write → temp id → idempotency-keyed replay → conflict
resolution) is platform-agnostic, but its storage calls are IndexedDB/Dexie,
which doesn't exist in Hermes. This app mirrors the *algorithm*, not the
code, against `expo-sqlite` (schema stub already in `src/db/nativeDb.ts`).
Because this is a second implementation of security/data-integrity-sensitive
logic (idempotency keys, conflict resolution), it ships with a parity test
suite that runs the same fixture cases against both the web and native
mutation-queue implementations, so the two can't silently diverge — per the
project's "guard the copy with a parity test that cannot silently skip"
principle.

**Phase 3 — feature parity.** Remaining feature areas, roughly in order of
value: Planner (place/day editing, drag-reorder), Budget, Roadtrip, Map,
Packing, Todo, Atlas, Collections, Journey, Vacay, Dashboard, Admin,
Plugins, Files, Notifications. Each follows the Phase 1 pattern: a repo
module with the same method names as `client/src/repo/*`, a screen, and
(once Phase 2 lands) an offline cache.

**Phase 4 — native features & shipping.** Push notifications, camera/photo
uploads (RN's `{uri, name, type}` FormData part against the server's
existing `file`/`avatar`/`cover`/`image`/`backup` multipart fields — no
server change needed there either), deep linking, EAS build/signing, and a
`mobile-build.yml` CI workflow modeled on `.github/workflows/publish-plugin-sdk.yml`.

## Notes

- Don't call this package `mobile/` anywhere in docs or CI — `client/src/mobile/`
  already means "the web app's responsive phone shell," an unrelated concept.
- `@trek/shared`'s `sanitize` export pulls in `isomorphic-dompurify`, which
  has no Hermes-safe build; avoid importing it (or `tHtml`) from native code —
  prefer `t()` + RN `<Text>` composition, which is what every screen here does.
- `scripts/setDefaultIosSimulator.js` runs before `expo start` (see `start` in
  `package.json`) to pin which simulator Expo's `i` shortcut opens — it always
  opens whatever device is currently the *default*, not one you name on the
  command line. Override per-run with `EXPO_IOS_SIMULATOR_DEVICE="<name>"`.
- `patches/@expo+cli+*.patch` (applied automatically via the `postinstall`
  script, `patch-package`) carries three fixes on top of `@expo/cli`, all
  hit when running `npm start` + `i` on this machine (Node 26, Homebrew's
  global npm root, and a Simulator front-end that isn't literally named
  "Simulator" — see `devicehub` below). If you ever bump the `expo` version,
  re-verify all three still apply (`npm install` will tell you if a patch
  fails) and re-generate with `npx patch-package @expo/cli` after
  re-editing the files below.
  1. `SimulatorAppPrerequisite.js` hard-requires an app literally named
     "Simulator" to be registered in macOS Launch Services. Some machines
     run a third-party simulator front-end that talks to CoreSimulator
     directly (this repo was built against a "devicehub"-style setup) and
     never registers under that name, even though `xcrun simctl` — the
     thing Expo actually needs — works fine. Patched to fall back to a
     plain `xcrun simctl help` check instead of hard-failing.
  2. `downloadAppAsync.js` (used to fetch the Expo Go binary the first time
     you launch on a device without it installed) passes a `dispatcher`
     built from the standalone `undici` npm package to the runtime's native
     `fetch`. On Node 26, whose built-in `fetch` uses its own internal,
     newer `undici`, that cross-package `Agent` object fails stricter
     handler-shape validation, surfacing as an opaque `TypeError: fetch
     failed` (real cause, one level down: `InvalidArgumentError: invalid
     onError method`). Patched to use `AbortSignal.timeout(...)` for the
     same connect-timeout behavior without constructing a foreign `Agent`.
  3. `ExternalModule.js`'s `_resolveGlobal` (used to find `@expo/ngrok`,
     required for `--tunnel` mode — see below) shells out to the ancient,
     unmaintained `requireg` package, whose global-path detection doesn't
     know about this Homebrew + Node 26 setup: it silently returns
     `undefined` instead of the real path, so Expo reports a genuinely
     globally-installed package as missing and refuses to proceed even
     after installing it. Patched to resolve via `npm root -g` + Node's own
     `require.resolve` instead.

### Networking: use tunnel mode

`npm start` (LAN mode) prints `exp://<your-LAN-IP>:8081`, which assumes the
simulator can reach the Mac's real network interface directly — true for a
plain local Xcode Simulator, but this machine's devicehub-managed simulator
apparently can't reach it (confirmed: the Mac's firewall is off and `node`
is explicitly permitted, so it's the simulator's own network path, not
anything on the host, blocking it). Use `npm run start:tunnel` instead,
which routes the connection through a public relay (`@expo/ngrok`) so the
simulator never needs direct LAN reachability to the Mac.
