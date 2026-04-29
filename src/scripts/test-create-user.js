
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('CRITICAL ERROR: SUPABASE_SERVICE_ROLE_KEY is missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function testCreateUser() {
  const userData = {
    email: 'princegaur088@gmail.com',
    password: '956099',
    fullName: 'Prince Gaur',
    role: 'Sales'
  };

  console.log(`Attempting to create user: ${userData.email}...`);

  try {
    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true
    });

    if (authError) {
      if (authError.message.includes('already been registered')) {
        console.log('User already exists in Auth. Proceeding to check profile...');
        // Try to find the existing user to update profile
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers.users.find(u => u.email === userData.email);
        if (existingUser) {
           await updateProfile(existingUser.id, userData);
        }
      } else {
        throw authError;
      }
    } else {
      console.log('Auth user created successfully:', authData.user.id);
      await updateProfile(authData.user.id, userData);
    }
  } catch (err) {
    console.error('Failed to create user:', err.message);
  }
}

async function updateProfile(userId, userData) {
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      email: userData.email,
      full_name: userData.fullName,
      role: userData.role
    });

  if (profileError) {
    console.error('Failed to create/update profile:', profileError.message);
  } else {
    console.log('Profile created/updated successfully for:', userData.fullName);
    console.log('--- TEST SUCCESSFUL ---');
  }
}

testCreateUser();
