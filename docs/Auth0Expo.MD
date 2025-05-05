Add Login to Your Expo Application
This Quickstart is for the Expo framework. To integrate Auth0 into your React Native application, please refer to the React Native Quickstart.

This SDK is not compatible with "Expo Go" app. It is compatible only with Custom Dev Client and EAS builds.
1
Configure Auth0
To use Auth0 services, you need to have an application set up in the Auth0 Dashboard. The Auth0 application is where you will configure authentication in your project.

Configure an application

Use the interactive selector to create a new Auth0 application or select an existing application that represents the project you want to integrate with. Every application in Auth0 is assigned an alphanumeric, unique client ID that your application code will use to call Auth0 APIs through the SDK.

Any settings you configure using this quickstart will automatically update for your Application in the Dashboard, which is where you can manage your Applications in the future.

If you would rather explore a complete configuration, you can view a sample application instead.

Configure callback and logout URLs

Auth0 invokes the callback and logout URLs to redirect users back to your application. Auth0 invokes the callback URL after authenticating the user and the logout URL after removing the session cookie. If you do not set the callback and logout URLs, users will not be able to log in and out of the app, and your application will produce an error.

Add the corresponding URL to Callback URLs and Logout URLs, according to your app's platform. If you are using a custom domain, use the value of your custom domain instead of your Auth0 tenant’s domain.

iOS
BUNDLE_IDENTIFIER.auth0://dev-8jmwfh4hugvdjwh8.au.auth0.com/ios/BUNDLE_IDENTIFIER/callback

Android
PACKAGE_NAME.auth0://dev-8jmwfh4hugvdjwh8.au.auth0.com/android/PACKAGE_NAME/callback


If you are following along with our sample project, use the following value:

iOS: com.auth0samples.auth0://{yourDomain}/ios/com.auth0samples/callback
Android: com.auth0samples.auth0://{yourDomain}/android/com.auth0samples/callback
2
Install dependencies
In this section, you will learn how to install the React Native Auth0 module.

Please refer to the official documentation for additional details on React Native.
Yarn

yarn add react-native-auth0

For further reference on yarn, check their official documentation.
npm

npm install react-native-auth0 --save

3
Setup Auth0 Config Plugin
The Auth0 package runs custom native code that must be configured at build time. Use Expo Config Plugin to achieve this.

The react-native-auth0 plugin will be added in the Expo config.

4
Generate Native Source Code
You must generate the native code for the above configuration to be set. To do this, run the following command:

expo prebuild

You will be prompted to provide the Android package and iOS bundle identifier if they are not already present in the Expo config.

? What would you like your Android package name to be? > com.auth0samples # or your desired package name
? What would you like your iOS bundle identifier to be? > com.auth0samples # or your desired bundle identifier
Was this helpful?

/
These values are used to set the callback and logout URLs.

5
Configure the Auth0Provider component
The useAuth0 hook relies on a React Context to provide state management. This context is provided by the Auth0Provider component.

Import the useAuth0 hook and Auth0Provider component from the react-native-auth0 package:

import {useAuth0, Auth0Provider} from 'react-native-auth0';
Was this helpful?

/
For the SDK to function properly, you must wrap your application in the Auth0Provider component, and set the following properties:

domain: The domain of your Auth0 tenant. Generally, you can find this in the Auth0 Dashboard under your Application's Settings in the Domain field. If you are using a custom domain, you should set this to the value of your custom domain instead.

clientId: The client ID of the Auth0 Application you set up earlier in this quickstart. You can find this in the Auth0 Dashboard under your Application's Settings in the Client ID field.

Checkpoint

Your Auth0Provider component should now be properly configured. Run your application to verify that:

the SDK is initializing correctly

your application is not throwing any errors related to Auth0

6
Add login to your application
Authenticate the user by calling the authorize method provided by the useAuth0 hook. This redirects the user to the Auth0 Universal Login page for authentication, then back to your app.

For confirmation that the user was logged in successfully, check that the user property provided by the hook is not null.

Checkpoint

Add a button component that calls authorize when clicked. Verify that you are redirected to the login page and then back to your application.

7
Add logout to your application
To log the user out, redirect them to the Auth0 logout endpoint by calling clearSession. This will remove their session from the authorization server and log the user out of the application.

Checkpoint

Add a logout button that calls clearSession and observe that you are redirected to the Auth0 logout endpoint and back again. You should no longer be logged in to your application.

8
Show user profile information
The useAuth0 hook exposes a user object that contains information about the authenticated user. You can use this to access user profile information about the authenticated user that has been decoded from the ID token.

If a user has not been authenticated, this property will be null.

Checkpoint

Log in and inspect the user property on the result. Verify the current user's profile information, such as email or name.

Next Steps

Excellent work! If you made it this far, you should now have login, logout, and user profile information running in your application.

This concludes our quickstart tutorial, but there is so much more to explore. To learn more about what you can do with Auth0, check out:

Auth0 Dashboard - Learn how to configure and manage your Auth0 tenant and applications
react-native-auth0 SDK - Explore the SDK used in this tutorial more fully
Auth0 Marketplace - Discover integrations you can enable to extend Auth0’s functionality

{
  "expo": {
    "name": "00-Login-Expo",
    "slug": "00-Login-Expo",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "plugins": [
      [
        "react-native-auth0",
        {
          "domain": "dev-8jmwfh4hugvdjwh8.au.auth0.com",
        }
      ]
    ],
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "updates": {
      "fallbackToCacheTimeout": 0
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "android": {
      "package": "com.auth0samples"
    },
    "ios": {
      "bundleIdentifier": "com.auth0samples"
    }
  }
}<Button
    onPress={loggedIn ? onLogout : onLogin}
    title={loggedIn ? 'Log Out' : 'Log In'}
  />
</View>
