'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createStaffMember } from '@/app/actions/staff';
import type { UserRole } from '@/lib/constants';

interface AddStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddStaffDialog({ open, onOpenChange, onSuccess }: AddStaffDialogProps) {
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('Technician');
  const [password, setPassword] = useState('');

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setRole('Technician');
    setPassword('');
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) resetForm();
    onOpenChange(newOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !role) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      const result = await createStaffMember({
        fullName,
        email,
        role,
        password: password || undefined,
      });

      if (result.success) {
        toast.success(`Staff member added!`);
        if (result.password) {
          // In a real production app, you might want a better way to display or send this password
          toast.info(`Temporary password: ${result.password}`, { duration: 10000 });
        }
        onSuccess();
        handleOpenChange(false);
      } else {
        toast.error(result.error || 'Failed to create staff member.');
      }
    } catch (error) {
      console.error(error);
      toast.error('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[460px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
        <div className="bg-gradient-to-r from-primary/10 to-transparent p-6 pb-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-charcoal">Invite Staff Member</DialogTitle>
            <DialogDescription className="text-sm text-mid-gray mt-1.5">
              Add a new team member to your dispatch board. They will receive access immediately.
            </DialogDescription>
          </DialogHeader>
        </div>
        
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-5">
          <div className="space-y-2">
            <label htmlFor="staff-name" className="text-[13px] font-semibold text-dark-gray leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Full Name <span className="text-red-500">*</span></label>
            <Input 
              id="staff-name" 
              placeholder="e.g. John Doe" 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="h-10 border-light-gray focus-visible:ring-primary/30 focus-visible:border-primary transition-all"
            />
          </div>
          
          <div className="space-y-1.5">
            <label htmlFor="staff-email" className="text-[13px] font-semibold text-dark-gray leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Email Address <span className="text-red-500">*</span></label>
            <Input 
              id="staff-email" 
              type="email" 
              placeholder="john@tnsolar.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-10 border-light-gray focus-visible:ring-primary/30 focus-visible:border-primary transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-dark-gray leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Role <span className="text-red-500">*</span></label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger className="h-10 border-light-gray focus:ring-primary/30 focus:border-primary transition-all">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Technician">Technician</SelectItem>
                <SelectItem value="Engineer">Engineer</SelectItem>
                <SelectItem value="Dispatcher">Dispatcher</SelectItem>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="Sales">Sales</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="staff-password" className="text-[13px] font-semibold text-dark-gray leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Initial Password <span className="text-mid-gray font-normal">(Optional)</span></label>
            <Input 
              id="staff-password" 
              type="text" 
              placeholder="Leave blank to auto-generate" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 border-light-gray focus-visible:ring-primary/30 focus-visible:border-primary transition-all"
            />
            <p className="text-[10px] text-mid-gray">
              If left blank, a secure random password will be generated for them.
            </p>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-light-gray/50 mt-6">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => handleOpenChange(false)} 
              disabled={loading}
              className="text-mid-gray hover:text-charcoal hover:bg-off-white"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading} 
              className="bg-primary hover:bg-primary-dark text-white px-6 shadow-md shadow-primary/20 transition-all active:scale-[0.98]"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Staff Member
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
