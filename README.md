# KnowWhere

KnowWhere is a social iOS app for building and sharing lists of places. Make lists of restaurants, coffee shops, and spots worth visiting, see what the people you follow are saving, and find places from other people's lists near you.

## Features

- **Lists:** add places with Google Places search or drop a custom pin, add notes to each place, and keep lists public or private.
- **Import from Google Maps:** paste a link to a publicly shared Google Maps list, or upload a Google Takeout CSV, and KnowWhere matches each entry to a Google place.
- **Feed and Explore:** lists from people you follow, plus trending lists and suggested users.
- **Near me:** places from lists within about 25 miles of your location, on a map.
- **Social:** follow people, and like, save, and comment on lists.
- **Sign in** with Apple, Google, or email.
- **Safety:** report content and block users, built to meet App Store guidelines for user-generated content, plus in-app account deletion.
- **Reliability:** an offline banner, friendly error messages, and optional Sentry crash reporting.

## Tech stack

- [Expo](https://expo.dev) SDK 54, React Native 0.81, React 19, and TypeScript
- Expo Router for file-based navigation
- `react-native-maps` for maps
- [Supabase](https://supabase.com) for Postgres with row level security, authentication, avatar storage, and Edge Functions
- Google Places API (New), called through a Supabase Edge Function so the API key never ships in the app
- [Apify](https://apify.com) for reading shared Google Maps lists, which have no public API
- Sentry for crash reporting
- Jest and React Native Testing Library
- GitHub Actions CI that type checks, lints, and runs tests

## Getting started

### Prerequisites

- Node.js 20.19.4 (see `.nvmrc`)
- Xcode with an iOS Simulator
- A Supabase project and the [Supabase CLI](https://supabase.com/docs/guides/cli)
- A Google Cloud project with the Places API (New) enabled
- An Apify account, only needed for importing shared Google Maps lists

### Setup

1. Clone and install:

   ```bash
   git clone https://github.com/ryan-spencer1220/knowwhere.git
   cd knowwhere
   npm install
   ```

2. Copy the example environment file and fill in your Supabase values:

   ```bash
   cp .env.example .env
   ```

   | Variable | Where to find it |
   | --- | --- |
   | `EXPO_PUBLIC_SUPABASE_URL` | Supabase project settings, API |
   | `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase project settings, API |
   | `EXPO_PUBLIC_SENTRY_DSN` | Optional. Leave blank to turn off crash reporting |

3. Set up the database and Edge Functions:

   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push

   supabase secrets set GOOGLE_PLACES_KEY=your_google_places_key
   supabase secrets set APIFY_TOKEN=your_apify_token

   supabase functions deploy places
   supabase functions deploy import-list
   supabase functions deploy submit-report
   supabase functions deploy delete-account
   ```

4. Start the app:

   ```bash
   npx expo start
   ```

   Press `i` to open the iOS Simulator.

### Tests and checks

```bash
npm test          # Jest tests
npx tsc --noEmit  # TypeScript
npm run lint      # ESLint
```

## Project structure

```
app/                 Screens and routes (Expo Router)
  (tabs)/            Feed, Near me, Add, Explore, Profile
  list/, place/      List and place detail screens
  import.tsx         Google Maps list import
components/          Shared UI components
lib/                 Supabase data access, Places search, import parsing, auth
supabase/
  migrations/        Database schema and row level security policies
  functions/         Edge Functions: places, import-list, submit-report, delete-account
```
