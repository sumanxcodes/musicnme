'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardStats from '@/components/dashboard/DashboardStats';
import RecentPlaylists from '@/components/dashboard/RecentPlaylists';
import QuickActions from '@/components/dashboard/QuickActions';
import WelcomeSection from '@/components/dashboard/WelcomeSection';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <WelcomeSection />
      
      {/* Stats Overview */}
      <DashboardStats />
      
      {/* Quick Actions */}
      <QuickActions />
      
      {/* Recent Playlists */}
      <RecentPlaylists />
    </div>
  );
};

export default Dashboard;