const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://kkaxlghccbuecyzwlgxb.supabase.co"
const supabaseKey = "sbsb_publishable_YBHO9Px2faM4yZuMlooHRw_PMC5sR4l";

console.log("DEBUG URL:", supabaseUrl);
console.log("DEBUG KEY:", supabaseKey ? "FOUND" : "MISSING");

if (!supabaseUrl || !supabaseKey) {
  throw new Error("❌ Supabase URL or KEY missing in .env");
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;