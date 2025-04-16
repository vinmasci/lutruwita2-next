# Lutruwita Mobile App

A native mobile app for the Lutruwita platform, built with React Native and Expo.

## Features

- View and interact with maps created in the web app
- Save routes for offline access
- Filter routes by map type, location, distance, and surface type
- Light and dark mode support
- Native map integration with Mapbox

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- npm or yarn
- Expo CLI
- Xcode (for iOS development)
- Android Studio (for Android development)

### Installation

1. Clone the repository
2. Install dependencies:

```bash
cd lutruwita-mobile
npm install
```

3. Set up environment variables:

```bash
cp .env.template .env
```

Edit the `.env` file and add your Mapbox access token.

### Running the App

#### Development

```bash
# Start the development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android
```

#### Building with Swift Package Manager (iOS)

The app uses Swift Package Manager for Mapbox integration on iOS. To build the app with SPM:

```bash
# Run the SPM build script
npm run ios:spm
```

This script handles the entire build process, including setting up Mapbox with SPM.

For more details on the SPM integration, see [MAPBOX_SPM_INTEGRATION.md](./docs/MAPBOX_SPM_INTEGRATION.md).

## Project Structure

```
lutruwita-mobile/
├── src/
│   ├── theme/                 # Theming system
│   │   ├── colors.ts          # Color definitions
│   │   ├── typography.ts      # Typography styles
│   │   ├── paper-theme.ts     # React Native Paper theme config
│   │   ├── ThemeContext.tsx   # Theme context provider
│   │   └── index.ts           # Theme exports
│   ├── screens/               # App screens
│   │   ├── HomeScreen.tsx     # Route discovery
│   │   ├── SavedRoutesScreen.tsx # Saved routes management
│   │   ├── MapScreen.tsx      # Map viewing with enhanced UI
│   │   ├── DownloadsScreen.tsx # Offline maps
│   │   └── ProfileScreen.tsx  # User profile & settings
│   ├── components/            # Reusable components
│   │   ├── filters/           # Filter components
│   │   ├── routes/            # Route-related components
│   │   └── map/               # Map-related components
│   ├── context/               # Context providers
│   │   ├── MapContext.tsx     # Map state management
│   │   ├── RouteContext.tsx   # Route data management
│   │   └── POIContext.tsx     # Points of interest management
│   ├── hooks/                 # Custom React hooks
│   ├── services/              # API and data services
│   ├── navigation/            # Navigation setup
│   ├── types/                 # TypeScript type definitions
│   └── config/                # Configuration files
└── ios/                       # iOS native code
    ├── Package.swift          # Swift Package Manager configuration
    └── .netrc                 # Mapbox authentication
```

## Mapbox Integration

The app uses Mapbox for map rendering. The integration is done using:

- **iOS**: Swift Package Manager (SPM)
- **Android**: Gradle

For more details on the Mapbox integration, see [MAPBOX_SPM_INTEGRATION.md](./docs/MAPBOX_SPM_INTEGRATION.md).

## Scripts

- `npm start`: Start the development server
- `npm run ios`: Run on iOS simulator
- `npm run android`: Run on Android emulator
- `npm run web`: Run on web browser
- `npm run ios:spm`: Build iOS app with Swift Package Manager
- `npm run prebuild:clean`: Clean and regenerate native code

## Documentation

Additional documentation can be found in the `docs/` directory:

- [MAPBOX_SPM_INTEGRATION.md](./docs/MAPBOX_SPM_INTEGRATION.md): Details on the Mapbox SPM integration
