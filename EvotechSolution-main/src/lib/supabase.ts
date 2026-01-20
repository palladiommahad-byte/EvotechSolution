/**
 * Supabase Client Configuration
 * 
 * This file handles the Supabase client initialization
 * Make sure to install: npm install @supabase/supabase-js
 * 
 * Environment Variables Required:
 * VITE_SUPABASE_URL=your-project-url
 * VITE_SUPABASE_ANON_KEY=your-anon-key
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️  Supabase credentials not found in environment variables.\n' +
    'Please create a .env file with:\n' +
    'VITE_SUPABASE_URL=your-project-url\n' +
    'VITE_SUPABASE_ANON_KEY=your-anon-key\n\n' +
    'Get these from your Supabase project settings: https://app.supabase.com/project/_/settings/api'
  );
}

// Create Supabase client
let supabaseClient: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient => {
  if (!supabaseClient) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase URL and Anon Key are required. Please check your .env file.');
    }

    try {
      supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
        db: {
          schema: 'public',
        },
      });

      // Test connection
      supabaseClient
        .from('contacts')
        .select('count')
        .limit(1)
        .then(() => {
          console.log('✅ Supabase client initialized successfully');
        })
        .catch((err) => {
          console.warn('⚠️  Supabase connection test failed (this is normal if tables don\'t exist yet):', err.message);
        });
    } catch (error) {
      console.error('❌ Failed to create Supabase client:', error);
      throw error;
    }
  }
  return supabaseClient;
};

// Export client for direct access
export { supabaseClient };
