import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const DEFAULT_STORAGE_BUCKET = 'knotrail-source-files';

export class SupabaseConfigError extends Error {
  constructor(message?: string) {
    super(
      message ||
        'Supabase backend is enabled (STORAGE_BACKEND=supabase), but SUPABASE_URL or SUPABASE_SECRET_KEY is missing. Configure server environment variables to proceed.'
    );
    this.name = 'SupabaseConfigError';
  }
}

export interface SupabaseConfig {
  url: string;
  secretKey: string;
  bucket: string;
  isLegacyServiceRole: boolean;
}

/**
 * Checks whether Supabase credentials are provided in server environment variables.
 * Preferred key: SUPABASE_SECRET_KEY
 * Fallback key: SUPABASE_SERVICE_ROLE_KEY (legacy)
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.SUPABASE_URL?.trim();
  const secretKey =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  return Boolean(url && secretKey);
}

/**
 * Retrieves validated Supabase configuration.
 * Throws SupabaseConfigError if credentials are missing or malformed.
 */
export function getSupabaseConfig(): SupabaseConfig {
  const url = process.env.SUPABASE_URL?.trim();
  const modernKey = process.env.SUPABASE_SECRET_KEY?.trim();
  const legacyKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const secretKey = modernKey || legacyKey;

  if (!url || !secretKey) {
    const missing: string[] = [];
    if (!url) missing.push('SUPABASE_URL');
    if (!secretKey) missing.push('SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)');

    throw new SupabaseConfigError(
      `Supabase configuration error: Missing required server environment variable(s): ${missing.join(', ')}.`
    );
  }

  // Basic URL validation
  try {
    new URL(url);
  } catch {
    throw new SupabaseConfigError(
      'Supabase configuration error: SUPABASE_URL must be a valid HTTP or HTTPS URL.'
    );
  }

  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || DEFAULT_STORAGE_BUCKET;

  return {
    url,
    secretKey,
    bucket,
    isLegacyServiceRole: !modernKey && Boolean(legacyKey),
  };
}

let serverClientInstance: SupabaseClient | null = null;

/**
 * Creates or retrieves the singleton server-side Supabase client.
 * Strictly restricted to server runtime; throws if invoked in a browser environment.
 */
export function getServerSupabaseClient(injectedClient?: SupabaseClient): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('Security Violation: Supabase admin client cannot be initialized in browser context.');
  }

  if (injectedClient) {
    return injectedClient;
  }

  if (serverClientInstance) {
    return serverClientInstance;
  }

  const config = getSupabaseConfig();

  serverClientInstance = createClient(config.url, config.secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return serverClientInstance;
}

/**
 * Resets the client singleton (useful for testing or reconfiguring).
 */
export function resetServerSupabaseClient(): void {
  serverClientInstance = null;
}
