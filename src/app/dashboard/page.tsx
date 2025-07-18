'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardStats from '@/components/dashboard/DashboardStats';
import RecentPlaylists from '@/components/dashboard/RecentPlaylists';
import WelcomeSection from '@/components/dashboard/WelcomeSection';
import RecommendationCarousel from '@/components/recommendations/RecommendationCarousel';
import QuickStatsCards from '@/components/dashboard/QuickStatsCards';
import ActivityFeed from '@/components/dashboard/ActivityFeed';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <WelcomeSection />
      
      {/* Quick Stats Cards */}
      <QuickStatsCards />
      
      {/* Stats Overview */}
      <DashboardStats />
      
      {/* Smart Recommendations */}
      <RecommendationCarousel 
        maxRecommendations={6}
        showFeedback={true}
        onItemSelect={(item, data) => {
          console.log('Recommendation selected:', item, data);
          // Handle item selection (navigate to video/playlist/template)
        }}
      />
      
      {/* Two column layout for activity and playlists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <ActivityFeed />
        
        {/* Recent Playlists */}
        <RecentPlaylists />
      </div>
    </div>
  );
};

export default Dashboard;