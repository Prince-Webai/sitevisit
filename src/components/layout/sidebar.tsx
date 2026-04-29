'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MapPin,
  Clock,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/components/providers/auth-provider';

const ALL_NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['Admin', 'Dispatcher', 'Sales', 'Engineer'] },
  { label: 'Dispatch Board', href: '/dispatch', icon: MapPin, roles: ['Admin', 'Dispatcher', 'Sales', 'Engineer'] },
  { label: 'Settings', href: '/settings', icon: Settings, roles: ['Admin', 'Dispatcher'] },
  { label: 'History', href: '/history', icon: Clock, roles: ['Admin', 'Dispatcher', 'Sales', 'Engineer'] },
];

export function Sidebar({ className, onItemClick }: { className?: string; onItemClick?: () => void }) {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = ALL_NAV_ITEMS.filter(item => 
    !profile || item.roles.includes(profile.role)
  );

  return (
    <aside
      className={`
        relative flex flex-col h-full bg-white
        transition-all duration-300 ease-in-out shrink-0
        ${collapsed ? 'md:w-[68px]' : 'md:w-[240px] w-full'}
        ${className || ''}
      `}
    >
      {/* Logo */}
      <div className="flex items-center justify-center h-20 shrink-0 px-4">
        {collapsed ? (
          <div className="flex items-center justify-center w-full transition-transform duration-300 hover:scale-110">
            <Image
              src="/logo.png"
              alt="TN Solar"
              width={36}
              height={36}
              className="shrink-0 object-contain"
              priority
            />
          </div>
        ) : (
          <div className="flex items-center justify-center w-full h-full px-2">
            <Image
              src="/logo.png"
              alt="TN Solar"
              width={180}
              height={50}
              className="shrink-0 animate-fade-in object-contain w-auto h-12 max-h-full"
              priority
            />
          </div>
        )}
      </div>

      <Separator className="bg-light-gray" />

      {/* Nav Items */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          const linkContent = (
            <Link
              href={item.href}
              onClick={() => onItemClick?.()}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-200 group relative
                ${isActive
                  ? 'bg-accent text-primary-dark'
                  : 'text-dark-gray hover:bg-off-white hover:text-charcoal'
                }
              `}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
              )}
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-primary' : 'text-mid-gray group-hover:text-dark-gray'}`} />
              {!collapsed && (
                <span className="whitespace-nowrap overflow-hidden">{item.label}</span>
              )}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger render={linkContent} />
                <TooltipContent side="right" className="font-medium">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return <div key={item.href}>{linkContent}</div>;
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="px-3 pb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full justify-center text-mid-gray hover:text-charcoal hover:bg-off-white h-8"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      <Separator className="bg-light-gray" />

      {/* User Section */}
      <div className={`p-3 shrink-0 ${collapsed ? 'flex flex-col items-center gap-2' : ''}`}>
        <div className={`flex items-center ${collapsed ? 'flex-col gap-2' : 'gap-3'}`}>
          <Avatar className="w-9 h-9 shrink-0 border-2 border-green-light/30">
            <AvatarFallback className="bg-primary text-white text-xs font-semibold">
              {profile?.full_name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-charcoal truncate">{profile?.full_name || 'User'}</p>
              <p className="text-xs text-mid-gray truncate">{profile?.role || 'Guest'}</p>
            </div>
          )}
          <Tooltip>
            <TooltipTrigger
              onClick={signOut}
              className="inline-flex items-center justify-center w-8 h-8 rounded-md text-mid-gray hover:text-destructive hover:bg-red-50 shrink-0 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </TooltipTrigger>
            <TooltipContent side={collapsed ? 'right' : 'top'}>Sign out</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </aside>
  );
}
