import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/services/supabase/supabaseClient";

const adminKey = process.env.SUPABASE_APP_ADMIN_KEY;

export const supabaseAdmin = createClient(
  supabase.supabaseUrl,
  supabase.supabaseKey,
  {
    accessToken() {
      return adminKey;
    },
  },
);
