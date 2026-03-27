export default {
  name: 'narrateiq',
  slug: 'narrateiq',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.mouseionfabworks.narrateiq',
    infoPlist: {
      NSPhotoLibraryUsageDescription:
        'NarrateIQ does not currently access your photo library. This permission is required by the development framework.',
      NSMicrophoneUsageDescription:
        'NarrateIQ uses your microphone to capture voice notes in the field.',
      NSSpeechRecognitionUsageDescription:
        'NarrateIQ uses speech recognition to transcribe your field observations.',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    permissions: ['android.permission.RECORD_AUDIO'],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-secure-store',
    [
      'expo-speech-recognition',
      {
        microphonePermission: 'Allow NarrateIQ to access your microphone for voice note capture.',
        speechRecognitionPermission:
          'Allow NarrateIQ to transcribe your speech for claim notes.',
      },
    ],
  ],
  extra: {
    supabaseUrl:     process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    apiBaseUrl:      process.env.EXPO_PUBLIC_API_BASE_URL,
    anthropicApiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY,
    eas: {
      projectId: 'e1dddd2b-5846-4810-be33-bf437009619b',
    },
  },
};
