import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://euofxswindukaxloenuk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1b2Z4c3dpbmR1a2F4bG9lbnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNzQ1MzYsImV4cCI6MjA5Njk1MDUzNn0.LRJQCSo4fjiSjl8YQSxwrLKErLdCe0ahT0JpCTpPiAg'; // UPDATE THIS with the anon public key (eyJhbGciOi...)

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
