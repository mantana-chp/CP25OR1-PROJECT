import { ConfigContext, ExpoConfig } from 'expo/config'
import { version } from './package.json'

// Replace these with your EAS project ID and project slug.
// You can find them at https://expo.dev/accounts/[account]/projects/[project].
const EAS_PROJECT_ID = '81f2885b-b8e8-47ec-8226-fddc71c8d3e2'
const PROJECT_SLUG = 'cp25or1frontend'
const OWNER = 'delusional-dev'

// App production config
const APP_NAME = 'CP25OR1 Prod'
const BUNDLE_IDENTIFIER = 'dev.expo.mantana.cp25or1frontend'
const PACKAGE_NAME = 'dev.expo.mantana.cp25or1frontend'
const ICON = './assets/images/icons/iOS-Prod.png'
const ADAPTIVE_ICON = './assets/images/icons/Android-Prod.png'
const SCHEME = 'cp25or1-frontend'

export default ({ config }: ConfigContext): ExpoConfig => {
  console.log('⚙️ Building app for environment:', process.env.APP_ENV)
  const { name, bundleIdentifier, icon, adaptiveIcon, packageName, scheme } =
    getDynamicAppConfig(
      (process.env.APP_ENV as 'development' | 'preview' | 'production') ||
        'development'
    )

  return {
    ...config,
    name: name,
    version: version,
    slug: PROJECT_SLUG, // Must be consistent across all environments.
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    icon: icon,
    scheme: scheme,
    ios: {
      supportsTablet: true,
      bundleIdentifier: bundleIdentifier
    },
    android: {
      adaptiveIcon: {
        foregroundImage: adaptiveIcon,
        backgroundColor: '#ffffff'
      },
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON || './google-services.json',
      package: packageName
    },
    updates: {
      url: `https://u.expo.dev/${EAS_PROJECT_ID}`
    },
    runtimeVersion: {
      policy: 'appVersion'
    },
    extra: {
      eas: {
        projectId: EAS_PROJECT_ID
      }
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png'
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff'
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    owner: OWNER
  }
}

// Dynamically configure the app based on the environment.
// Update these placeholders with your actual values.
export const getDynamicAppConfig = (
  environment: 'development' | 'preview' | 'production'
) => {
  if (environment === 'production') {
    return {
      name: APP_NAME,
      bundleIdentifier: BUNDLE_IDENTIFIER,
      packageName: PACKAGE_NAME,
      icon: ICON,
      adaptiveIcon: ADAPTIVE_ICON,
      scheme: SCHEME
    }
  }

  if (environment === 'preview') {
    return {
      name: `${APP_NAME} Preview`,
      bundleIdentifier: `${BUNDLE_IDENTIFIER}.preview`,
      packageName: `${PACKAGE_NAME}.preview`,
      icon: './assets/images/icons/iOS-Prev.png',
      adaptiveIcon: './assets/images/icons/Android-Prev.png',
      scheme: `${SCHEME}-prev`
    }
  }

  return {
    name: `${APP_NAME} Development`,
    bundleIdentifier: `${BUNDLE_IDENTIFIER}.dev`,
    packageName: `${PACKAGE_NAME}.dev`,
    icon: './assets/images/icons/iOS-Dev.png',
    adaptiveIcon: './assets/images/icons/Android-Dev.png',
    scheme: `${SCHEME}-dev`
  }
}
