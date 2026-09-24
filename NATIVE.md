# Run the TripTide app

TripTide is the Expo app in `native/`. It signs in against the API in `server/` (port **3001**). The website in `client/` does not need to be running.

## 1. API

From the repository root:

```bash
npm install
npm run build --workspace=shared
npm run dev --workspace=server
```

Leave that process running. The API listens on `http://localhost:3001`.

## 2. App

In a second terminal:

```bash
cd native
npm install
npm start
```

When Metro is up, press **`i`** to open the iOS simulator.

`npm start` at the repository root does nothing useful. The start script lives in `native/`.

The simulator uses `http://localhost:3001`. An Android emulator uses `http://10.0.2.2:3001`. A physical phone needs your computer's LAN address:

```bash
EXPO_PUBLIC_API_BASE_URL=http://YOUR_LAN_IP:3001 npm start
```

If the simulator cannot reach Metro on the LAN, start with a tunnel instead:

```bash
npm run start:tunnel
```

## 3. Sign in

The app asks for the email and password of an account in the local database (`server/data/`, which is not in git).

On a fresh database the server prints a one-time admin password in the terminal, in the box titled first-run admin account. That password is not stored in this repository. If the database already exists, use the account that was created then.

Two accounts that may already be in a local database:

| Email | Username | Role |
| --- | --- | --- |
| `admin@trek.local` | `admin` | admin |
| `trekdev@trek.local` | `trekdev` | user |

Passwords are hashed. If the first-run printout is gone, reset the password from the server rather than looking for it in the repo.

## Maps and photos

Trip maps load OpenFreeMap tiles, so the simulator needs network access for the map. Cover photos are chosen from the API's Unsplash search (`GET /api/trips/cover-images/search`) and saved on the trip by the server.

After installing a native module (`react-native-webview`, `expo-blur`, `expo-linear-gradient`), reload the app in Expo Go.
