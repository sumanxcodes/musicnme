'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardStats from '@/components/dashboard/DashboardStats';
import RecentPlaylists from '@/components/dashboard/RecentPlaylists';
import QuickActions from '@/components/dashboard/QuickActions';
import WelcomeSection from '@/components/dashboard/WelcomeSection';
import RecommendationCarousel from '@/components/recommendations/RecommendationCarousel';
import TemplateGallery from '@/components/recommendations/TemplateGallery';

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
      
      {/* Smart Recommendations */}
      <RecommendationCarousel 
        maxRecommendations={6}
        showFeedback={true}
        onItemSelect={(item, data) => {
          console.log('Recommendation selected:', item, data);
          // Handle item selection (navigate to video/playlist/template)
        }}
      />
      
      {/* Featured Templates */}
      <TemplateGallery 
        showFeaturedOnly={true}
        maxTemplates={4}
        onTemplateSelect={(templateId, playlistId) => {
          console.log('Template used:', templateId, 'New playlist:', playlistId);
          // Handle template selection (navigate to new playlist)
        }}
      />
      
      {/* Recent Playlists */}
      <RecentPlaylists />
    </div>
  );
};

export default Dashboard;