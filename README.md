# Trade Buddy Evolution

https://github.com/kuetomadred-ai/trade-buddy-lite-68







ادخل الى هذا المستودع وخذ التطبيق كاملا وانسخه لديك لنعمل عليه ونطوره واكتشف ماذا يحتاج ليصبح تطبيق متكامل

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/df947e6a-e03d-4178-91d9-4452bbca2c6a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Capacitor (Android and iOS)

The mobile wrapper packages the existing PLOTOS page from `public/plotos/` as a local web app. The native projects load bundled assets; no remote development server is configured.

Requirements: Node.js 22 or newer, Android Studio with an Android SDK for Android builds, and macOS with Xcode 26 or newer for iOS builds. iOS projects can be prepared in this repository, but compiling and signing them requires macOS and Xcode.

The Android and iOS native project folders are included in this repository. After cloning, install the dependencies:

```sh
npm install
```

Build the web app, stage the PLOTOS page in Capacitor's `dist/` directory, and sync both native projects:

```sh
npm run mobile:sync
```

Run `npm run mobile:build` alone only when you want to prepare `dist/` without syncing native projects. Use `npx cap add android` or `npx cap add ios` only if the corresponding native folder has been removed and needs to be regenerated. Native icons and launch screens use the existing `public/favicon.ico` mark; regenerate them with `python3 scripts/generate-mobile-brand-assets.py` (requires Pillow).

Open one platform in its native IDE after syncing:

```sh
npm run mobile:android
npm run mobile:ios
```

`mobile:android` opens Android Studio after syncing. To create a debug APK, run `cd android && ./gradlew assembleDebug`; the APK is written under `android/app/build/outputs/apk/debug/`. On macOS, `mobile:ios` opens the iOS project in Xcode, where you can build/run or archive after selecting a signing team. Android release signing, iOS signing, and store submission still require the owner's developer accounts and credentials.

### Mobile email confirmation

The native projects register the `com.plotos.trading://auth/callback` URL scheme, and the mobile build handles Supabase confirmation links sent to that URI. In the Supabase Dashboard, add the exact URI under **Authentication → URL Configuration → Redirect URLs** before testing signup or resend-confirmation on a device. For production, prefer Universal Links/App Links on a domain you own; domain association and release signing must be configured for that domain.
