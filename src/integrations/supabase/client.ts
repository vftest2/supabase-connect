import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://srv1244572.hstgr.cloud';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzY3NDcwMjU1LCJleHAiOjIwODI4MzAyNTV9.Oae38TvmA6oWfIKBu-Ik6ZkWalfwVkRdEftBN4AbkY8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
