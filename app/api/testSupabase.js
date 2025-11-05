import { supabase } from "./supabaseClient.js";

async function testConnection() {
    // simplest "ping" → ask for 1 row from any table, for example 'places'
    const { data, error } = await supabase.from("places").select("*").limit(1);

    if (error) {
        console.error("❌ Connection failed:", error.message);
    } else {
        console.log("✅ Supabase connection successful!");
        console.log("Sample data:", data);
    }
}

testConnection();