# FOODLINK — Web + Android starter

This is a connected application starter for the FOODLINK college project.

## What is included
- React + Vite website with Firebase phone OTP sign-in, role selection, provider listing form, nearby search, browser GPS, Google Maps display, and collection requests.
- Android Kotlin starter with Firebase phone authentication and location permission/current location.
- Firestore security rules with role-aware access patterns.
- Firebase setup instructions and environment variable templates.

## Important
This is a source-code starter, **not a deployed production service**. Real OTP, database sync, maps, push notifications, and account verification require your own Firebase and Google Cloud projects, enabled billing/APIs where applicable, configuration files, and deployment. Never publish API secrets or service-account keys in source control.

## 1. Create Firebase project
1. Create a project at https://console.firebase.google.com/
2. Add a Web app and copy its Firebase config into `web/.env`.
3. Enable Authentication → Phone.
4. Create Firestore Database.
5. Add an Android app using package name `in.foodlink.app`; download `google-services.json` into `android/app/`.
6. Enable Firebase App Check before public launch.

## 2. Google Maps
1. Create/choose a Google Cloud project linked to Firebase.
2. Enable Maps JavaScript API for the website.
3. Create a browser key restricted by website referrers and API restrictions.
4. Add the key to `VITE_GOOGLE_MAPS_API_KEY`.
5. For Android, enable Maps SDK for Android and create an Android-restricted key. Put it in `android/local.properties` as `MAPS_API_KEY=...` (do not commit that file).

Maps and Firebase may require billing setup. Configure quotas and budget alerts.

## 3. Run website
```bash
cd web
cp .env.example .env
npm install
npm run dev
```

## 4. Android
Open `android/` in Android Studio. Add `google-services.json`, configure the Maps key, sync Gradle, and run on a real Android device. Phone auth may need a SHA-1/SHA-256 fingerprint registered in Firebase. Use Firebase test phone numbers during development.

## 5. Verification workflow
The client allows users to request a provider/NGO role, but the app should only grant `verified` status after an administrator checks documents. The starter writes a verification request. For production, move privileged approval into a trusted Cloud Function or secured admin console; never let a client set its own verified flag.

## 6. Food safety
The platform is not a food-safety certification service. Providers must enter preparation time, safe-consumption deadline, collection deadline, storage details, allergens, and food type. Admin review and local food-safety compliance are required. Automatically hide expired listings; do not assume an entered expiry time proves food is safe.

## 7. Production hardening checklist
- Implement server-side role assignment and admin approval.
- Add rate limiting / abuse prevention for OTP.
- Use App Check and strict Firestore rules.
- Add secure image upload and moderation.
- Use server timestamps and transactions for stock reservation.
- Add geohash indexing (e.g. GeoFire) for scalable nearby search.
- Add FCM push notifications.
- Add privacy policy, consent, account deletion, data retention and grievance contact.
- Test GPS permissions, inaccurate location, network loss, duplicate reservations, expired food, and concurrent bookings.
