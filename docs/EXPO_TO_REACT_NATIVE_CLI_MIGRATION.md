# Migrating from Expo to React Native CLI

This document outlines the step-by-step process for migrating the Lutruwita mobile app from Expo to React Native CLI. This migration will help resolve the Firebase integration issues and provide more direct control over native dependencies.

## Table of Contents
- [Preparation Phase](#preparation-phase)
- [Project Setup Phase](#project-setup-phase)
- [Code Migration Phase](#code-migration-phase)
- [Native Module Integration Phase](#native-module-integration-phase)
- [Testing and Refinement Phase](#testing-and-refinement-phase)
- [Deployment Phase](#deployment-phase)

## Preparation Phase

- [ ] **1.1. Create a backup of the current Expo project**
  ```bash
  cp -r mobile/lutruwita-mobile mobile/lutruwita-mobile-expo-backup
  ```

- [ ] **1.2. Document current dependencies**
  ```bash
  cd mobile/lutruwita-mobile
  npm list --depth=0 > dependencies.txt
  ```

- [ ] **1.3. Document environment variables**
  ```bash
  cp .env .env.backup
  cp .env.template .env.template.backup
  ```

- [ ] **1.4. Identify Expo-specific APIs used in the codebase**
  - Search for imports from 'expo' packages
  ```bash
  grep -r "from 'expo" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" ./src
  ```

- [ ] **1.5. Create a list of native modules that need special attention**
  - Firebase (app, auth, firestore)
  - Mapbox
  - Auth0
  - AsyncStorage
  - Navigation libraries

## Project Setup Phase

- [ ] **2.1. Install React Native CLI globally**
  ```bash
  npm install -g react-native-cli
  ```

- [ ] **2.2. Create a new React Native project**
  ```bash
  npx react-native init LutruwitaMobile --version 0.76.9 --template react-native-template-typescript
  ```

- [ ] **2.3. Set up project structure**
  ```bash
  cd LutruwitaMobile
  mkdir -p src/components src/screens src/services src/context src/utils src/hooks src/config
  ```

- [ ] **2.4. Configure TypeScript**
  - Copy and adapt tsconfig.json from the Expo project
  ```bash
  cp ../lutruwita-mobile/tsconfig.json ./tsconfig.json
  ```
  - Update paths and configuration as needed

- [ ] **2.5. Set up environment variables**
  - Install react-native-dotenv
  ```bash
  npm install react-native-dotenv --save-dev
  ```
  - Create .env file with required variables
  ```bash
  cp ../lutruwita-mobile/.env ./.env
  ```

- [ ] **2.6. Configure ESLint and Prettier**
  ```bash
  npm install --save-dev eslint prettier @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-plugin-react eslint-plugin-react-hooks
  ```

## Code Migration Phase

- [ ] **3.1. Migrate package.json dependencies**
  - Install core dependencies
  ```bash
  npm install react-native-safe-area-context react-native-screens @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
  ```

- [ ] **3.2. Migrate source code**
  - Copy src directory from Expo project
  ```bash
  cp -r ../lutruwita-mobile/src/* ./src/
  ```

- [ ] **3.3. Update imports for Expo-specific APIs**
  - Replace Expo StatusBar with React Native StatusBar
  - Replace Expo Asset with appropriate alternatives
  - Replace Expo FileSystem with react-native-fs

- [ ] **3.4. Migrate navigation setup**
  - Update navigation configuration
  - Ensure proper screen registration

- [ ] **3.5. Migrate theme and styling**
  - Copy theme configuration
  - Update any Expo-specific styling

- [ ] **3.6. Migrate context providers**
  - Update AuthProvider
  - Update MapProvider
  - Update RouteProvider
  - Update SavedRoutesProvider
  - Update OfflineMapsProvider

- [ ] **3.7. Update App.tsx**
  - Adapt the main App component to React Native CLI structure
  - Set up provider hierarchy

## Native Module Integration Phase

- [ ] **4.1. Set up React Native Firebase**
  ```bash
  npm install @react-native-firebase/app @react-native-firebase/auth @react-native-firebase/firestore
  ```

- [ ] **4.2. Configure Firebase for iOS**
  - Add GoogleService-Info.plist to iOS project
  - Update AppDelegate.mm to initialize Firebase
  - Configure Podfile for Firebase dependencies

- [ ] **4.3. Configure Firebase for Android**
  - Add google-services.json to Android project
  - Update build.gradle files
  - Configure MainApplication.java

- [ ] **4.4. Set up Mapbox**
  ```bash
  npm install @rnmapbox/maps
  ```
  - Configure Mapbox for iOS in Podfile and Info.plist
  - Configure Mapbox for Android in build.gradle and strings.xml

- [ ] **4.5. Set up Auth0**
  ```bash
  npm install react-native-auth0
  ```
  - Configure Auth0 for iOS
  - Configure Auth0 for Android

- [ ] **4.6. Set up AsyncStorage**
  ```bash
  npm install @react-native-async-storage/async-storage
  ```

- [ ] **4.7. Set up remaining native dependencies**
  ```bash
  npm install react-native-vector-icons react-native-svg react-native-webview
  ```
  - Configure each module according to its documentation

- [ ] **4.8. Update native service implementations**
  - Update firebaseService.ts
  - Update mapboxOfflineManager.ts
  - Update other service files that interact with native modules

## Testing and Refinement Phase

- [ ] **5.1. Run the app on iOS simulator**
  ```bash
  npx react-native run-ios
  ```
  - Fix any iOS-specific issues

- [ ] **5.2. Run the app on Android emulator**
  ```bash
  npx react-native run-android
  ```
  - Fix any Android-specific issues

- [ ] **5.3. Test Firebase integration**
  - Verify authentication works
  - Verify Firestore operations work
  - Fix any Firebase-specific issues

- [ ] **5.4. Test Mapbox integration**
  - Verify maps load correctly
  - Verify offline maps functionality
  - Fix any Mapbox-specific issues

- [ ] **5.5. Test Auth0 integration**
  - Verify login flow works
  - Fix any Auth0-specific issues

- [ ] **5.6. Test navigation**
  - Verify all screens navigate correctly
  - Fix any navigation-specific issues

- [ ] **5.7. Test offline functionality**
  - Verify app works in offline mode
  - Fix any offline-specific issues

- [ ] **5.8. Performance optimization**
  - Identify and fix performance bottlenecks
  - Optimize bundle size

## Deployment Phase

- [ ] **6.1. Configure iOS for release**
  - Update Info.plist
  - Configure signing
  - Create release build

- [ ] **6.2. Configure Android for release**
  - Update build.gradle
  - Configure signing
  - Create release build

- [ ] **6.3. Test release builds**
  - Verify release builds work correctly on real devices

- [ ] **6.4. Update CI/CD pipelines**
  - Update build scripts
  - Configure automated testing

- [ ] **6.5. Document migration changes**
  - Update README.md
  - Document any API changes
  - Document build and deployment process

## Detailed Instructions for Key Steps

### Firebase Configuration in AppDelegate.mm

Add the following to your AppDelegate.mm:

```objective-c
#import <Firebase.h>

// In didFinishLaunchingWithOptions method
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  [FIRApp configure];
  // ... rest of your existing code
}
```

### Firebase Configuration in Android

Add the following to your MainApplication.java:

```java
import io.invertase.firebase.app.ReactNativeFirebaseAppPackage;

// In the getPackages method
@Override
protected List<ReactPackage> getPackages() {
  @SuppressWarnings("UnnecessaryLocalVariable")
  List<ReactPackage> packages = new PackageList(this).getPackages();
  // ... add any other packages you need
  return packages;
}
```

### Mapbox Configuration

For iOS, add to your Podfile:

```ruby
target 'YourAppName' do
  # ... other configurations
  
  pod 'MapboxMaps', '~> 11.11.0'
end
```

For Android, add to your build.gradle:

```gradle
allprojects {
    repositories {
        // ... other repositories
        maven {
            url 'https://api.mapbox.com/downloads/v2/releases/maven'
            authentication {
                basic(BasicAuthentication)
            }
            credentials {
                username = "mapbox"
                password = project.hasProperty('MAPBOX_DOWNLOADS_TOKEN') ? project.property('MAPBOX_DOWNLOADS_TOKEN') : System.getenv('MAPBOX_DOWNLOADS_TOKEN')
            }
        }
    }
}
```

### Handling Environment Variables

Create a react-native.config.js file:

```javascript
module.exports = {
  project: {
    ios: {},
    android: {},
  },
  assets: ['./assets/fonts/'],
  env: {
    MAPBOX_ACCESS_TOKEN: process.env.MAPBOX_ACCESS_TOKEN,
    API_URL: process.env.API_URL,
    AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
    AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
  },
};
```

### Replacing Expo-specific APIs

| Expo API | React Native Alternative |
|----------|--------------------------|
| Expo.Asset | require('./path/to/asset') |
| Expo.FileSystem | react-native-fs |
| Expo.Font | react-native-vector-icons |
| Expo.Constants | Use environment variables |
| Expo.Linking | Linking from react-native |
| Expo.StatusBar | StatusBar from react-native |

## Common Issues and Solutions

### Pod Install Failures

If you encounter pod install failures:

1. Delete the Pods directory and Podfile.lock
2. Run `pod repo update`
3. Run `pod install --repo-update`

### Firebase Integration Issues

If Firebase fails to initialize:

1. Verify GoogleService-Info.plist is correctly added to the iOS project
2. Verify google-services.json is correctly added to the Android project
3. Ensure Firebase is initialized before any Firebase API calls

### Mapbox Issues

If Mapbox fails to load:

1. Verify access token is correctly set
2. Check Mapbox version compatibility with React Native version
3. Ensure Mapbox is properly linked

## Resources

- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [React Native Firebase Documentation](https://rnfirebase.io/)
- [React Native Mapbox Documentation](https://github.com/rnmapbox/maps)
- [React Native Navigation Documentation](https://reactnavigation.org/docs/getting-started)
