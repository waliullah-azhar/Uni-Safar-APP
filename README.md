# Uni Safar 🚗🎓

**Uni Safar** is a secure, student-to-student peer carpooling network built using **React Native (Expo)** and **Supabase (PostgreSQL)**. It is specifically designed to facilitate safe, cost-efficient, and reliable commutes for university students, faculty, and staff in Pakistan.

By restricting access to verified academic email domains and institutional ID cards, Uni Safar ensures a trusted community of carpoolers traveling to and from campus.

---

## 🚀 Key Features

*   **Institutional Verification Gates**: Strict sign-up validation restricting users to specific university domains. Postings and bookings are locked behind student card approval (`is_verified` DB checks).
*   **Leaflet + OpenStreetMap Interactive Maps**: Custom webview-based map components rendering lightweight CartoDB Voyager styles tailored with emerald accents.
*   **Pakistan-Restricted Address Search**: Uses the Photon API restricted with a `&countrycode=pk` filter for responsive location autocomplete.
*   **OSRM Driving Route Engine**: Automatically calculates real-time routes, distances (km), estimated time of arrival (ETA), and alternatives, saving the coordinates geometry directly in the DB.
*   **Two-Way Negotiation Engine**: Allows riders to propose custom counter-offers on base fares with instant driver acceptance/rejection flow.
*   **Live Driver Location Tracking**: Matched passengers can track the driver’s location in real time via a custom animated car pin (`🚗`) utilizing Supabase Postgres change streams.
*   **Safety Location Sharing**: Easily share live journey details (driver information, car specs, current coordinates, and route mapping URL) with family or friends via the native Share API.
*   **Proximity Alerts & Rating Prompt**: Notifies riders to prepare when departure approaches (< 15 mins) and triggers a rating prompt 2 minutes before arrival, prompting mandatory review completion.
*   **Interactive Analytics Dashboard**: Beautiful profile history lists tracking ratings, completed rides, saved vehicles, and total kilometers shared.

---

## 🛠️ Tech Stack

*   **Mobile App Framework**: React Native via Expo Go (v54 Managed Workflow)
*   **State Management**: React Context (`AppContext.js`) with persistent AsyncStorage caching
*   **Backend Database**: Supabase (PostgreSQL with RLS, triggers, indexes, and realtime sockets)
*   **Maps & Polyline Geometries**: Leaflet, OpenStreetMap, OSRM Route API, Photon Geocoding
*   **Asset Management**: Core custom vector icon fonts and premium SVG assets

---

## 📂 Project Structure

```text
Uni Safar/
├── assets/               # Launcher icons, splash screens, and localized assets
├── components/           # Reusable UI widgets (MiniMap, StarRating, CustomButton, etc.)
├── constants/            # Design system tokens (Theme.js) and Map Configurations (MapConfig.js)
├── context/              # Global AppState Provider (AppContext.js) handles database transactions
├── lib/                  # Initialized API clients (supabaseClient.js)
├── screens/              # App Screen components (Feed, Profile, Post Ride, Auth, Requests, Details)
├── App.js                # Core entry point defining Root Navigators and Providers
├── app.json              # Expo application configuration (branding, versioning, plugins)
├── eas.json              # EAS Build setup defining APK and AAB build pipelines
├── package.json          # Dependency manifest and start scripts
└── uniride_supabase_ddl.md  # Database SQL migration script (tables, triggers, policies, and indexes)
```

---

## 🔧 Installation & Local Setup

### Prerequisites
*   Node.js (v18+)
*   Expo Go App installed on your Android/iOS device
*   A Supabase project initialized

### 1. Clone the repository and Install Dependencies
```bash
git clone https://github.com/waliullah-azhar/Uni-Safar-App.git
cd Uni-Safar-App
npm install
```

### 2. Configure Environment Configurations
Create a `.env` file or update [supabaseClient.js](file:///D:/Car%20pooling%20system/Uni%20Safar/lib/supabaseClient.js) with your project coordinates:
```javascript
const SUPABASE_URL = 'https://euofxswindukaxloenuk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1b2Z4c3dpbmR1a2F4bG9lbnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNzQ1MzYsImV4cCI6MjA5Njk1MDUzNn0.LRJQCSo4fjiSjl8YQSxwrLKErLdCe0ahT0JpCTpPiAg';
```

### 3. Initialize Database Tables
Run the SQL migration script from `uniride_supabase_ddl.md` directly inside your **Supabase SQL Editor**. This will set up:
*   `profiles`, `vehicles`, `trips`, `ride_requests`, and `reviews` tables
*   Autofill user-profile trigger from auth registration
*   Prevent self-riding constraint trigger
*   Auto-rating calculators and shared statistics increment triggers
*   Speed indexes for pricing sorts and location lookups
*   Row Level Security (RLS) policies

### 4. Run the App Locally
```bash
npm run start
```
Scan the QR code displayed in the terminal with your phone using **Expo Go** (Android camera or iOS camera/Expo app).

---

## 📢 Sharing the App with University Peers (Alternative Distribution)

Since we don't have access to official Google Play Developer Console or Apple Developer Store accounts now so you can distribute **Uni Safar** directly to your university community using these alternative methods:

### 1. Android Users (Direct APK Sideloading) - *Recommended*
You can compile a direct `.apk` installation package that students can download and install directly on their phones.

1.  **Install EAS CLI and Log In**:
    ```bash
    npm install -g eas-cli
    eas login
    ```
2.  **Run the APK Build Command**:
    ```bash
    eas build --profile preview --platform android
    ```
3.  **Share the Link**:
    *   Once the build completes in the cloud, EAS will generate a direct download URL.
    *   You can upload this `.apk` to **Google Drive**, **Dropbox**, or upload it to **GitHub Releases** on your repository.
    *   Students just need to download the file, tap it, and allow "Install from Unknown Sources" on their Android settings.

### 2. iOS Users (Local Sharing via Expo Go + Tunnel)
Because iOS strictly restricts direct sideloading and requires a paid Apple Developer Account to compile native installation packages (.ipa), iPhone users can test the app directly using the Expo Go sandbox via a network tunnel.

Prerequisite: Ensure the iPhone and your development machine are connected to the internet.

Start the Metro Bundler with Tunneling:
Run the following command in your terminal to bypass local network/firewall restrictions:

npx expo start --tunnel
**Scan the QR Code**:

---

## 🛡️ License
Distributed under the MIT License. See [LICENSE](file:///D:/Car%20pooling%20system/Uni%20Safar/LICENSE) for more information.
