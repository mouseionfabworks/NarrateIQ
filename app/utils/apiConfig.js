// app/utils/apiConfig.js
// Env vars are embedded at build time via app.config.js extra block
// and accessed via expo-constants (works in both dev and production builds).
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

export const config = {
  apiBaseUrl:      extra.apiBaseUrl,
  supabaseUrl:     extra.supabaseUrl,
  supabaseAnonKey: extra.supabaseAnonKey,
};
if (!config.apiBaseUrl) {
  console.warn('[apiConfig] WARNING: apiBaseUrl is missing. Backend calls will fail.');
}
export function getApiBaseUrl() {
  return config.apiBaseUrl ?? 'http://192.168.0.4:3001';
}
export function buildHeaders() {
  return {
    'Content-Type': 'application/json',
  };
}
