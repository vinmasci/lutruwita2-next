# Mapbox Native Maps Authentication Issue

## Problem

The Mapbox native maps were failing to load because of an authentication issue when downloading the Mapbox SDK during the build process.

## Root Cause

We identified two issues:

1. In the Podfile, there was a line that explicitly set the Mapbox download token to the public key (pk) instead of the secret key (sk):

```ruby
$RNMapboxMapsDownloadToken = 'pk.eyJ1IjoidmlubWFzY2kiLCJhIjoiY20xY3B1ZmdzMHp5eDJwcHBtMmptOG8zOSJ9.Ayn_YEjOCCqujIYhY9PiiA'
```

The public key doesn't have permission to download the Mapbox SDK, which was causing the 403 Forbidden error.

2. The .netrc file was also using the public key, which was causing issues when the build process tried to download the Mapbox SDK.

## Solution

We fixed the issue by:

1. Updating the Podfile to use the secret key (sk) instead of the public key (pk):

```ruby
$RNMapboxMapsDownloadToken = 'sk.eyJ1IjoidmlubWFzY2kiLCJhIjoiY205ZjcyNDRoMHcybjJqb2Fsd2p4NTFzZyJ9.RypRAeS61ChnzZJRSViOpg'
```

2. Ensuring the .netrc file only contains the secret key entry.

## Current Status (April 15, 2025)

The initial Mapbox SDK download authentication issue (related to `.netrc` and `Podfile` token) has been resolved.

However, EAS builds are consistently failing with a linker error:
`ld: framework 'rnmapbox_maps' not found`

This indicates the Xcode project is still trying to link the CocoaPods version of `@rnmapbox/maps`, even though the intention is to use the Mapbox SDK via Swift Package Manager (SPM) as configured in the `Podfile`.

## Troubleshooting Steps Taken

1.  **Verified `.netrc`:** Confirmed `ios/.netrc` contains the correct Mapbox secret token (sk.).
2.  **Dependency Check & Update:** Ran `expo doctor` and `npx expo install --check` to align dependencies (`@react-native-async-storage/async-storage`, `react-native-safe-area-context`, `react-native-screens`, `react-native-svg`, `react-native-webview`) with Expo SDK 52.
3.  **Removed `sharp`:** Removed the unnecessary `sharp` dependency from `package.json`.
4.  **Cleaned Build Environment:**
    *   Removed `ios/build`, `ios/Pods`, `node_modules`.
    *   Ran `npm cache clean --force`.
    *   Reinstalled npm packages (`npm install`).
    *   Reinstalled pods (`pod install`).
5.  **Regenerated Native Project:** Ran `npx expo prebuild --platform ios --clean` to regenerate the `ios` directory and Xcode project settings.
6.  **Configured `Podfile` for SPM:**
    *   Manually edited the `Podfile` after prebuild to:
        *   Remove default `@rnmapbox/maps` CocoaPods configuration.
        *   Add `pod "MapboxMaps", :modular_headers => true` for SPM.
        *   Add `use_frameworks! :linkage => :static` (later changed to `:dynamic`).
        *   Add `post_install` hook to delete `rnmapbox-maps` and `rnmapbox_maps_specs` pod targets.
7.  **Attempted Static vs. Dynamic Linkage:** Switched `use_frameworks!` linkage between `:static` and `:dynamic` in the `Podfile`.
8.  **Reinstalled Pods:** Ran `pod install` after each `Podfile` modification.

Despite these steps, the linker error persisted when attempting to use SPM for Mapbox integration alongside the `@rnmapbox/maps` package.

## Resolution (April 15, 2025)

The linker error `ld: framework 'rnmapbox_maps' not found` was resolved by reverting to the standard CocoaPods integration method for `@rnmapbox/maps`, as managed by Expo's prebuild process.

**Final Steps:**

1.  **Ran `npx expo prebuild --platform ios --clean`:** This regenerated the `ios` directory and `Podfile` with the default CocoaPods setup for `@rnmapbox/maps`.
2.  **Corrected Mapbox Token in `Podfile`:** Manually edited the regenerated `Podfile` to replace the default public token (`pk...`) with the correct **secret token (`sk...`)** for the `$RNMapboxMapsDownloadToken` variable.
3.  **Ran `pod install`:** Updated the pods based on the corrected `Podfile`.
4.  **Ran EAS Build:** The subsequent `eas build --platform ios` completed successfully.

**Conclusion:** The standard CocoaPods integration method for `@rnmapbox/maps`, combined with the correct secret download token in the `Podfile`, is the working configuration for this project with EAS Build. Attempts to use SPM for Mapbox integration caused persistent linker issues.

## References

- [Mapbox Downloads API Documentation](https://docs.mapbox.com/api/maps/mapbox-gl-js/)
- [React Native Mapbox GL Documentation](https://github.com/rnmapbox/maps)
