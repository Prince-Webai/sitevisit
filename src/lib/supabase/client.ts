import { createBrowserClient } from '@supabase/ssr';

let supabaseSingleton: ReturnType<typeof createBrowserClient> | undefined;

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Graceful handling for build-time/SSR when env vars might be missing
  if (!url || !key) {
    if (typeof window === 'undefined') {
      console.warn('⚠️ Supabase environment variables are missing during build/SSR. Returning a skeleton client.');
      // Return a minimal object that won't crash the build process
      return createBrowserClient('https://placeholder.supabase.co', 'placeholder');
    }
    throw new Error('@supabase/ssr: Your project\'s URL and API key are required to create a Supabase client!');
  }

  if (typeof window === 'undefined') {
    return createBrowserClient(url, key);
  }

  if (supabaseSingleton) return supabaseSingleton;

  supabaseSingleton = createBrowserClient(url, key);
  return supabaseSingleton;
}
