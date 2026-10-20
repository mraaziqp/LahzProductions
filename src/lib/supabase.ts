/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Please check your environment variables.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    // Staff must enter their password every time: the admin session lives in
    // memory only, so it ends on refresh or close and is never left behind on
    // a shared device.
    persistSession: false,
  },
});

// Earlier versions saved the admin session in localStorage; wipe any left over.
try {
  Object.keys(localStorage)
    .filter(key => /^sb-.+-auth-token/.test(key))
    .forEach(key => localStorage.removeItem(key));
} catch {
  // storage unavailable (private mode) — nothing to clean
}
