/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_APP_ENV: string;
  readonly VITE_COMPLIANCE_MIN_AGE: string;
  readonly VITE_DEFAULT_BANKROLL_USD: string;
  readonly VITE_DEFAULT_KELLY_FRACTION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
