'use client';

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Loader2, Users, Settings as SettingsIcon, MapPin,
  LayoutDashboard, Trash2, Shield, Mail, KeyRound,
} from 'lucide-react';
import { AddUserDialog } from '@/components/settings/add-user-dialog';
import { ChangePasswordDialog } from '@/components/settings/change-password-dialog';
import { useAuth } from '@/components/providers/auth-provider';
import { toast } from 'sonner';
import type { Profile } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';

const ROLE_COLORS: Record<string, string> = {
  Admin: 'bg-purple-100 text-purple-700',
  Dispatcher: 'bg-blue-100 text-blue-700',
  Sales: 'bg-orange-100 text-orange-700',
  Engineer: 'bg-green-100 text-green-700',
  Technician: 'bg-green-100 text-green-700',
};

export default function SettingsPage() {
  const { user, profile } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [passwordTarget, setPasswordTarget] = useState<Profile | null>(null);

  const isAdmin = profile?.role === 'Admin';

  async function fetchUsers() {
    setLoading(true);
    try {
      // 1. Try to fetch from Admin API (needed for some advanced data)
      const res = await fetch('/api/admin/users');
      const json = await res.json();
      
      // 2. Regardless of API success, always fetch from the public profiles table
      // This ensures the list shows up even if the Admin Key is missing on Netlify
      const supabase = createClient();
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (profileError) throw profileError;
      setUsers(profiles || []);

      if (!res.ok) {
        console.warn('Admin API restricted:', json.error);
        // We don't toast error here because we successfully loaded profiles at least
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load team members. Please check database permissions.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    Promise.resolve().then(() => fetchUsers());
  }, []); // eslint-disable-next-line react-hooks/exhaustive-deps

  const handleDeleteUser = async (u: Profile) => {
    if (u.id === user?.id) { toast.error("You can't delete your own account"); return; }
    if (!confirm(`Remove ${u.full_name}? This will permanently delete their login and all access.`)) return;

    try {
      const res = await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(`${u.full_name} removed from the system`);
      fetchUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove user');
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3 p-10">
          <Shield className="w-12 h-12 text-light-gray mx-auto" />
          <p className="text-sm font-bold text-mid-gray uppercase tracking-widest">Admin Access Required</p>
          <p className="text-xs text-mid-gray">This page is restricted to administrators only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-8 bg-off-white overflow-auto h-full">
      <div className="max-w-5xl mx-auto space-y-8 pb-24">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-black text-charcoal flex items-center gap-4 tracking-tight">
              <div className="p-2.5 bg-primary/10 rounded-2xl shadow-sm border border-primary/10">
                <SettingsIcon className="w-8 h-8 text-primary" />
              </div>
              System Settings
            </h1>
            <p className="text-mid-gray text-base font-medium pl-1">
              Manage team accounts and system configurations.
            </p>
          </div>
          <AddUserDialog onSuccess={fetchUsers} />
        </div>

        {/* User Management Card */}
        <div className="bg-white rounded-[2rem] border border-light-gray shadow-sm overflow-hidden">
          <div className="p-6 md:p-8 border-b border-light-gray bg-gray-50/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-xl font-black text-charcoal flex items-center gap-2.5 uppercase tracking-wider">
                <Users className="w-5 h-5 text-secondary" />
                Team Management
              </h2>
              <p className="text-xs font-bold text-mid-gray uppercase tracking-widest pl-7">
                Control login access and roles for all staff
              </p>
            </div>
            {!loading && (
              <div className="bg-white px-4 py-2 rounded-xl border border-light-gray shadow-sm">
                <span className="text-xs font-black text-primary uppercase tracking-widest">
                  {users.length} Active Members
                </span>
              </div>
            )}
          </div>

          {loading ? (
            <div className="p-24 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-sm font-black text-mid-gray uppercase tracking-[0.2em] animate-pulse">
                Loading Team Data
              </p>
            </div>
          ) : (
            <div className="divide-y divide-light-gray/60">
              {users.length > 0 ? users.map(u => (
                <div
                  key={u.id}
                  className="p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-off-white/50 transition-all duration-300 group"
                >
                  {/* Avatar + Info */}
                  <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12 border-4 border-white shadow-md ring-1 ring-light-gray/50 group-hover:scale-105 transition-transform duration-300 shrink-0">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary-dark text-white font-black text-lg">
                        {u.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-0.5 min-w-0">
                      <p className="font-black text-charcoal text-base group-hover:text-primary transition-colors truncate">
                        {u.full_name}
                        {u.id === user?.id && (
                          <span className="ml-2 text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">YOU</span>
                        )}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-mid-gray">
                        <Mail className="w-3 h-3 shrink-0" />
                        <span className="truncate">{u.email}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-auto shrink-0">
                    <Badge
                      variant="secondary"
                      className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border-none shadow-sm ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-600'}`}
                    >
                      {u.role}
                    </Badge>

                    {/* Change Password */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPasswordTarget(u)}
                      className="h-9 gap-1.5 rounded-xl text-xs font-bold border-light-gray hover:border-slate-400 hover:bg-slate-50 transition-all"
                      title="Change Password"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Password</span>
                    </Button>

                    {/* Delete */}
                    {u.id !== user?.id && (
                      <button
                        onClick={() => handleDeleteUser(u)}
                        className="p-2.5 text-mid-gray hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100 active:scale-90"
                        title="Remove user"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )) : (
                <div className="p-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-off-white rounded-full flex items-center justify-center mx-auto border-2 border-dashed border-light-gray">
                    <Users className="w-8 h-8 text-light-gray" />
                  </div>
                  <p className="text-sm font-black text-mid-gray uppercase tracking-widest">No users found</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Additional Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-10">
          <div className="bg-white rounded-[2rem] border border-light-gray p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500 cursor-pointer group">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-blue-100 transition-all duration-500">
              <MapPin className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-black text-charcoal mb-2 uppercase tracking-tight">Regional Settings</h3>
            <p className="text-sm font-medium text-mid-gray leading-relaxed">
              Configure Chennai timezone, local currency (₹), and service areas across Tamil Nadu.
            </p>
          </div>
          <div className="bg-white rounded-[2rem] border border-light-gray p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500 cursor-pointer group">
            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-orange-100 transition-all duration-500">
              <LayoutDashboard className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="text-lg font-black text-charcoal mb-2 uppercase tracking-tight">App Configuration</h3>
            <p className="text-sm font-medium text-mid-gray leading-relaxed">
              Customize dispatch board thresholds, notification triggers, and reporting schedules.
            </p>
          </div>
        </div>
      </div>

      {/* Change Password Dialog */}
      {passwordTarget && (
        <ChangePasswordDialog
          userId={passwordTarget.id}
          userName={passwordTarget.full_name}
          open={!!passwordTarget}
          onOpenChange={(v) => { if (!v) setPasswordTarget(null); }}
        />
      )}
    </div>
  );
}
