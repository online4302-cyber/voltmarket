import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  // Helps you spot a missing .env quickly during setup
  console.warn("Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — see .env.example");
}

export const supabase = createClient(url || "http://localhost", anon || "public-anon-key");
