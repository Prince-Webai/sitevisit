'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Search, X, Clock, FileText, User, MapPin, Menu } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar } from './sidebar';
import { jobService } from '@/lib/supabase/service';

interface SearchResult {
  id: string;
  type: 'job' | 'client' | 'address';
  title: string;
  subtitle?: string;
  href: string;
}

const RECENT_SEARCHES_KEY = 'tnsolar_recent_searches';
const MAX_RECENT = 5;

export function Header() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const { jobs, clients, profiles } = await jobService.search(query);
        
        const jobResults: SearchResult[] = jobs.map(j => ({
          id: j.id,
          type: 'job',
          title: `${j.job_number} — ${j.client?.first_name} ${j.client?.last_name}`,
          subtitle: j.address,
          href: `/dispatch?job=${j.id}`,
        }));

        const clientResults: SearchResult[] = clients.map(c => ({
          id: c.id,
          type: 'client',
          title: `${c.first_name} ${c.last_name}`,
          subtitle: c.email,
          href: `/dispatch?client=${c.id}`,
        }));

        const staffResults: SearchResult[] = (profiles || []).map(p => ({
          id: p.id,
          type: 'client', // Reusing client type/icon for simplicity or could add 'staff'
          title: p.full_name,
          subtitle: `${p.role} — ${p.email}`,
          href: `/settings?user=${p.id}`,
        }));

        setResults([...jobResults, ...clientResults, ...staffResults]);
      } catch (error) {
        console.error('Search failed:', error);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const saveSearch = (term: string) => {
    const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, MAX_RECENT);
    setRecentSearches(updated);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  };

  const handleSelect = (result: SearchResult) => {
    saveSearch(result.title);
    setQuery('');
    setShowDropdown(false);
    router.push(result.href);
  };

  const iconForType = (type: string) => {
    switch (type) {
      case 'job': return <FileText className="w-4 h-4 text-primary" />;
      case 'client': return <User className="w-4 h-4 text-secondary" />;
      case 'address': return <MapPin className="w-4 h-4 text-mid-gray" />;
      default: return null;
    }
  };

  return (
    <header className="h-16 bg-white border-b border-light-gray flex items-center justify-between px-4 md:px-6 shrink-0 z-40 relative">
      
      {/* Mobile Logo & Brand (Hidden on Desktop) */}
      <div className="flex items-center gap-3 md:hidden">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/5 border border-primary/10 shadow-inner">
          <Image
            src="/logo.png"
            alt="TN Solar"
            width={32}
            height={32}
            className="shrink-0 object-contain"
          />
        </div>
        <span className="sm:block font-bold text-charcoal tracking-tight">TN Solar</span>
      </div>

      {/* Center Area: Responsive Search */}
      <div className="relative flex-1 max-w-2xl mx-3 md:mx-8">
        <div className="relative w-full group">
          <div className="absolute inset-y-0 left-0 pl-3 md:pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-mid-gray group-focus-within:text-primary transition-colors" />
          </div>
          <Input
            ref={inputRef}
            id="global-search"
            type="text"
            placeholder="Search..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            className="block w-full pl-10 pr-10 h-10 bg-off-white border border-light-gray/60 rounded-xl text-sm transition-all focus:bg-white focus:border-primary/50 focus:ring-4 focus:ring-primary/10 focus:shadow-sm hover:border-gray-300"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setResults([]); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-mid-gray hover:text-charcoal transition-colors bg-light-gray/20 hover:bg-light-gray/50 rounded-md p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown (optimized for mobile) */}
        {showDropdown && (query || recentSearches.length > 0) && (
          <div
            ref={dropdownRef}
            className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white border border-light-gray rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in w-[calc(100vw-2rem)] md:w-full -ml-[calc((100vw-100%-2rem)/2)] md:ml-0"
          >
            {/* Results */}
            {results.length > 0 && (
              <div className="py-2 max-h-[60vh] overflow-auto">
                <div className="px-4 pb-2 pt-1 border-b border-light-gray/50 mb-1">
                  <p className="text-[10px] font-bold text-mid-gray tracking-widest uppercase">Matching Results</p>
                </div>
                {results.map((r, i) => (
                  <button
                    key={r.id}
                    onClick={() => handleSelect(r)}
                    className="w-full flex items-center gap-3 px-4 py-3 md:py-2 hover:bg-off-white transition-colors text-left border-b border-light-gray/30 last:border-0"
                  >
                    <div className="w-8 h-8 md:w-7 md:h-7 rounded-lg border border-light-gray/50 bg-white flex items-center justify-center shrink-0">
                      {iconForType(r.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-charcoal truncate">{r.title}</p>
                      <p className="text-xs text-mid-gray truncate leading-tight">{r.subtitle}</p>
                    </div>
                    <span className="hidden sm:inline-block text-[10px] uppercase tracking-wider text-mid-gray font-medium bg-off-white px-2 py-0.5 rounded border border-light-gray/50">
                      {r.type}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* No results */}
            {query && results.length === 0 && (
              <div className="py-8 text-center">
                <Search className="w-6 h-6 text-light-gray mx-auto mb-2" />
                <p className="text-sm text-dark-gray font-medium">No results found</p>
              </div>
            )}

            {/* Recent searches */}
            {!query && recentSearches.length > 0 && (
              <div className="py-2">
                <div className="px-4 pb-2 pt-1 border-b border-light-gray/50 mb-1">
                  <p className="text-[10px] font-bold text-mid-gray tracking-widest uppercase">Recent Searches</p>
                </div>
                {recentSearches.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { setQuery(s); setShowDropdown(true); }}
                    className="w-full flex items-center gap-3 px-4 py-3 md:py-2 hover:bg-off-white transition-colors text-left group"
                  >
                    <Clock className="w-3.5 h-3.5 text-mid-gray/50 group-hover:text-primary transition-colors" />
                    <span className="text-sm text-dark-gray font-medium group-hover:text-charcoal transition-colors">{s}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Area: Tools */}
      <div className="flex items-center gap-2 md:gap-4 min-w-fit justify-end">
        
        {/* Date Display (Desktop Only) */}
        <div className="hidden md:flex flex-col items-end mr-2">
          <p className="text-[10px] font-bold text-mid-gray tracking-widest uppercase">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long' })}
          </p>
          <p className="text-sm font-semibold text-charcoal">
            {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>

        <div className="hidden md:block w-px h-8 bg-light-gray/70"></div>

        {/* Notifications */}
        <button className="relative w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-lg text-mid-gray hover:bg-off-white hover:text-charcoal transition-all group border border-transparent hover:border-light-gray/50">
          <svg className="w-5 h-5 group-hover:animate-wiggle" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-secondary rounded-full border border-white"></span>
        </button>

      </div>
    </header>
  );
}
