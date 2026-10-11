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

Run `npm run mobile:build` alone only when you want to prepare `dist/` without syncing native projects. Use `npx cap add android` or `npx cap add ios` only if the corresponding native folder has been removed and needs to be regenerated.

To build or open one platform at a time:

```sh
npm run mobile:android
npm run mobile:ios
```

`mobile:android` opens Android Studio after syncing. On macOS, `mobile:ios` opens the iOS project in Xcode. Android release signing, store listing, iOS signing, and store submission still require the owner's developer accounts and credentials.
