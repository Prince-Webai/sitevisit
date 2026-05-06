import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getAdminClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

// PATCH /api/admin/users/[id] — update password or role
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const { password, role, fullName } = await req.json();
    const supabase = getAdminClient();

    if (password) {
      if (password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
      }
      const { error } = await supabase.auth.admin.updateUserById(userId, { password });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (role || fullName) {
      const updates: Record<string, string> = {};
      if (role) updates.role = role;
      if (fullName) updates.full_name = fullName;
      const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/admin/users/[id] — delete a user completely
export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const supabase = getAdminClient();

    await supabase.from('profiles').delete().eq('id', userId);
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal Server Error' }, { status: 500 });
  }
}
