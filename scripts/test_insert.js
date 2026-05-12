import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
    console.log("🔐 Authenticating...");
    await supabase.auth.signInWithPassword({
        email: 'demo-ministry@edu.gov.eg',
        password: 'Demo@2026!'
    });
    
    console.log("📝 Testing insert...");
    const { data, error } = await supabase.from('schools').insert({
        name: "Test School " + Date.now(),
        name_ar: "مدرسة اختبار " + Date.now(),
        is_demo: false,
        source_system: 'debug'
    }).select();
    
    console.log("Result:", data);
    console.log("Error:", error);
}
testInsert();
