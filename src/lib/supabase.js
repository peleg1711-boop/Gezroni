// Gezroni — shared Supabase client
// Anon key is safe for browser use; Row Level Security enforces access control.

const SUPABASE_URL = 'https://owugjzjegchuldizgurj.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93dWdqemplZ2NodWxkaXpndXJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMzg0ODMsImV4cCI6MjA5NTcxNDQ4M30.ib5cow6f0JZtkhsaognAUsqNHs8W6w2526m7DoW5XhQ';

// Lazy-initialised singleton — works whether supabase-js CDN loaded before or after this file
let _db = null;
function getDb() {
  if (!_db) {
    if (typeof supabase === 'undefined' || !supabase.createClient) {
      console.warn('[gezroni] supabase-js not loaded yet');
      return null;
    }
    _db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
  }
  return _db;
}

export { getDb };
