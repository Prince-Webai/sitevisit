const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runDiagnostics() {
  console.log('--- Database Diagnostics ---');
  
  // 1. Check tables
  const tables = ['profiles', 'jobs', 'clients', 'staff_locations', 'audit_logs'];
  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.error(`Error counting ${table}:`, error.message);
    } else {
      console.log(`${table}: ${count} rows`);
    }
  }

  // 2. Check auth users
  console.log('\n--- Auth Users ---');
  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) {
    console.error('Error listing auth users:', userError.message);
  } else {
    console.log(`Found ${users.length} authenticated users.`);
    for (const user of users) {
      console.log(`- ${user.email} (ID: ${user.id})`);
      
      // Check if profile exists
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (!profile) {
        console.log(`  ⚠️  MISSING PROFILE for ${user.email}. Creating one now...`);
        const { error: insertError } = await supabase.from('profiles').insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || 'Staff Member',
          role: 'Admin'
        });
        if (insertError) console.error(`  ❌ Failed to create profile:`, insertError.message);
        else console.log(`  ✅ Profile created successfully.`);
      } else {
        console.log(`  ✅ Profile exists (Role: ${profile.role})`);
      }
    }
  }
}

runDiagnostics();
