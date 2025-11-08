import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://tlasngjgbclacyuwtilp.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsYXNuZ2pnYmNsYWN5dXd0aWxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzOTcxODAsImV4cCI6MjA3Nzk3MzE4MH0.bk9YQm4z2O-nH-iW7w_wqHrMlTDGDZHJzDsd86-Lp4g";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
