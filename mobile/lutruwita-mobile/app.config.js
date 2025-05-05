import 'dotenv/config';

export default {
  name: 'Cya Trails',
  slug: 'lutruwita-mobile',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  jsEngine: 'hermes',
  newArchEnabled: false,
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff'
  },
  assetBundlePatterns: [
    '**/*'
  ],
  scheme: 'cyatrails',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.lutruwita.mobile',
    infoPlist: {
      CFBundleURLTypes: [
        {
          CFBundleTypeRole: 'None',
          CFBundleURLName: 'auth0',
          CFBundleURLSchemes: [
            'cyatrails'
          ]
        }
      ]
    }
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff'
    },
    package: 'com.lutruwita.mobile',
    intentFilters: [
      {
        action: 'VIEW',
        category: [
          'DEFAULT',
          'BROWSABLE'
        ],
        data: {
          scheme: 'cyatrails'
        }
      }
    ]
  },
  web: {
    favicon: './assets/favicon.png'
  },
  plugins: [
    [
      '@rnmapbox/maps',
      {
        RNMapboxMapsImpl: 'mapbox',
        RNMapboxMapsVersion: '11.11.0',
        RNMapboxMapsDownloadToken: process.env.MAPBOX_DOWNLOADS_TOKEN,
        RNMapboxMapsAccessToken: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN,
        RNMapboxMapsPackageImportPath: 'import MapboxMaps',
        RNMapboxMapsIOSDeploymentTarget: '15.1',
        RNMapboxMapsInstallMethod: 'spm'
      }
    ],
    [
      'react-native-auth0',
      {
        domain: process.env.EXPO_PUBLIC_AUTH0_DOMAIN
      }
    ]
  ],
  extra: {
    eas: {
      projectId: 'b2cdb06f-9027-423f-ae2a-2ca5fcef7bae'
    },
    // Expose environment variables to the app
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
    EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN,
    MAPBOX_DOWNLOADS_TOKEN: process.env.MAPBOX_DOWNLOADS_TOKEN, // Add downloads token to extra
    EXPO_PUBLIC_GOOGLE_PLACES_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY,
    EXPO_PUBLIC_AUTH0_DOMAIN: process.env.EXPO_PUBLIC_AUTH0_DOMAIN,
    EXPO_PUBLIC_AUTH0_CLIENT_ID: process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID,
    EXPO_PUBLIC_AUTH0_AUDIENCE: process.env.EXPO_PUBLIC_AUTH0_AUDIENCE
  }
};
