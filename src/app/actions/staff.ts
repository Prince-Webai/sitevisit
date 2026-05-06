'use server';

import { createClient } from '@supabase/supabase-js';
import type { UserRole } from '@/lib/constants';

// Create a Supabase client with the Service Role Key
// This bypasses RLS and allows creating auth users without logging the current user out.
const getAdminClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
};

export async function createStaffMember(data: {
  fullName: string;
  email: string;
  role: UserRole;
  password?: string; // Optional password, if not provided we generate one
}) {
  try {
    const supabaseAdmin = getAdminClient();
    
    // Generate a random password if none provided
    const password = data.password || Math.random().toString(36).slice(-10) + 'A1!';

    // 1. Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: data.fullName,
        role: data.role,
      }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: 'Failed to create user' };
    }

    // 2. Create the profile record
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: data.email,
        full_name: data.fullName,
        role: data.role,
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Rollback auth user creation if profile fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return { success: false, error: profileError.message };
    }

    return { success: true, password }; // Return generated password so admin can share it
  } catch (error: unknown) {
    console.error('Unexpected error creating staff member:', error);
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' };
  }
}
