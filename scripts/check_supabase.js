import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { count, error } = await supabase.from('schools').select('*', { count: 'exact', head: true });
    console.log("Total Schools in DB:", count);
    
    const { data } = await supabase.from('schools')
        .select('name_ar, gender_type, source_system')
        .order('created_at', { ascending: false })
        .limit(10);
        
    if (data && data.length > 0) {
        console.log("Last 10 Schools Inserted:");
        data.forEach((s, i) => {
            console.log(`${i+1}. ${s.name_ar} (${s.gender_type})`);
        });
    } else {
        console.log("No schools found in DB yet.");
    }
}
check();
