'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { jobService } from '@/lib/supabase/service';
import { useAuth } from '@/components/providers/auth-provider';
import type { Job, StaffLocation } from '@/lib/types';

interface DispatchContextType {
  jobs: Job[];
  staffLocations: StaffLocation[];
  staffProfiles: any[];
  loading: boolean;
  refresh: () => void;
  error: string | null;
}

const DispatchContext = createContext<DispatchContextType | undefined>(undefined);

export function DispatchProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, loading: authLoading } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [staffLocations, setStaffLocations] = useState<StaffLocation[]>([]);
  const [staffProfiles, setStaffProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchData = useCallback(async () => {
    if (!user || !profile) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching dispatch data for user:', user.id);
      const [jobsData, staffLocData, profilesData] = await Promise.all([
        jobService.fetchJobs({ role: profile.role, userId: user.id }),
        jobService.fetchStaffLocations(),
        jobService.fetchStaffProfiles()
      ]);

      console.log('Dispatch data received:', { jobs: jobsData?.length, locations: staffLocData?.length, profiles: profilesData?.length });

      setJobs(jobsData || []);
      setStaffProfiles(profilesData || []);
      
      setStaffLocations(staffLocData || []);
    } catch (err) {
      console.error('Failed to load dispatch data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [authLoading, refreshKey, fetchData]);

  const refresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  return (
    <DispatchContext.Provider value={{ jobs, staffLocations, staffProfiles, loading, refresh, error }}>
      {children}
    </DispatchContext.Provider>
  );

}

export function useDispatchData() {
  const context = useContext(DispatchContext);
  if (context === undefined) {
    throw new Error('useDispatchData must be used within a DispatchProvider');
  }
  return context;
}
