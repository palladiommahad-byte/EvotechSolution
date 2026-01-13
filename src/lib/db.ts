/**
 * Database Connection Layer (Supabase)
 * 
 * This file provides a database abstraction layer using Supabase
 * It provides helper functions compatible with existing code patterns
 * 
 * Environment Variables Required:
 * VITE_SUPABASE_URL=your-project-url
 * VITE_SUPABASE_ANON_KEY=your-anon-key
 */

import { getSupabaseClient } from './supabase';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Get Supabase client
 * This replaces the old getPool() function
 */
export const getPool = (): SupabaseClient => {
  return getSupabaseClient();
};

/**
 * Execute a raw SQL query using Supabase RPC
 * 
 * Note: For this to work, you need to create SQL functions in Supabase
 * For most queries, use the PostgREST API directly instead:
 * - supabase.from('table').select('*')
 * - supabase.from('table').insert({...})
 * - supabase.from('table').update({...}).eq('id', id)
 * 
 * @param text SQL query string or function name for RPC
 * @param params Query parameters
 * @returns Array of result rows
 */
export const query = async <T = any>(
  text: string,
  params?: any[]
): Promise<T[]> => {
  console.warn(
    '⚠️  Using query() with raw SQL. Consider migrating to PostgREST API.\n' +
    'For raw SQL, create an RPC function in Supabase and call it via .rpc()'
  );
  
  // If this looks like an RPC function call (no SELECT/INSERT/UPDATE keywords)
  // and params are provided, treat it as an RPC function name
  const sqlKeywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP'];
  const isRawSQL = sqlKeywords.some(keyword => text.trim().toUpperCase().startsWith(keyword));
  
  if (!isRawSQL && params) {
    // This might be an RPC function call
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc(text, params[0] || {});
    
    if (error) throw error;
    return (Array.isArray(data) ? data : [data]) as T[];
  }
  
  // For raw SQL queries, we need RPC functions
  throw new Error(
    `Raw SQL queries require RPC functions in Supabase.\n` +
    `Query: ${text.substring(0, 100)}\n` +
    `Please create an RPC function or use PostgREST API instead.`
  );
};

/**
 * Execute a transaction
 * Note: Supabase doesn't support client-side transactions
 * Transactions should be handled in Edge Functions or RPC functions
 */
export const transaction = async <T>(
  callback: (client: SupabaseClient) => Promise<T>
): Promise<T> => {
  const supabase = getSupabaseClient();
  // Execute callback with supabase client
  // Note: This is not a real transaction - multiple operations won't be atomic
  // For real transactions, use Edge Functions or RPC functions
  return callback(supabase);
};

/**
 * Close connection (no-op for Supabase, connections are managed automatically)
 */
export const closePool = async (): Promise<void> => {
  // Supabase connections are managed automatically
  console.log('Supabase connections are managed automatically');
};

// Export supabase client for direct access
export { getSupabaseClient };
