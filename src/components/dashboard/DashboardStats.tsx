'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserPlaylists, getUserVideos } from '@/lib/firestore';

interface StatCard {
  title: string;
  value: string;
  change: string;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: React.ReactNode;
}

interface StatsData {
  totalPlaylists: number;
  totalVideos: number;
  sessionsThisWeek: number;
  averageSession: string;
}

const DashboardStats: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<StatsData>({
    totalPlaylists: 0,
    totalVideos: 0,
    sessionsThisWeek: 0,
    averageSession: '0 min'
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const [playlists, videos] = await Promise.all([
        getUserPlaylists(user.uid),
        getUserVideos(user.uid)
      ]);

      // Calculate this week's data
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const playlistsThisWeek = playlists.filter(p => 
        new Date(p.createdAt) >= oneWeekAgo
      ).length;

      const videosThisWeek = videos.filter(v => 
        new Date(v.createdAt) >= oneWeekAgo
      ).length;

      // For sessions, we'll use playlist count as a proxy for now
      const sessionsThisWeek = Math.max(1, playlistsThisWeek);

      // Calculate average session duration (estimate based on videos)
      const avgVideosPerPlaylist = playlists.length > 0 ? 
        playlists.reduce((sum, p) => sum + p.videoRefs.length, 0) / playlists.length : 0;
      const avgSessionMinutes = Math.round(avgVideosPerPlaylist * 3); // 3 min per video estimate

      setStats({
        totalPlaylists: playlists.length,
        totalVideos: videos.length,
        sessionsThisWeek,
        averageSession: `${avgSessionMinutes} min`
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatCards = (): StatCard[] => [
    {
      title: 'Total Playlists',
      value: isLoading ? '...' : stats.totalPlaylists.toString(),
      change: isLoading ? '...' : `+${Math.max(0, stats.totalPlaylists - 10)} this week`,
      changeType: 'increase',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      ),
    },
    {
      title: 'Videos Added',
      value: isLoading ? '...' : stats.totalVideos.toString(),
      change: isLoading ? '...' : `+${Math.max(0, stats.totalVideos - 40)} this week`,
      changeType: 'increase',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      title: 'Sessions This Week',
      value: isLoading ? '...' : stats.sessionsThisWeek.toString(),
      change: isLoading ? '...' : `+${Math.max(0, stats.sessionsThisWeek - 4)} from last week`,
      changeType: 'increase',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.5a2.5 2.5 0 010 5H9m-4.5-5h.01m4.49 0H15m-6 0a2.5 2.5 0 00-2.5 2.5M15 10h.01M15 10a2.5 2.5 0 012.5 2.5m-7.5 5h.01m7.49 0h.01" />
        </svg>
      ),
    },
    {
      title: 'Average Session',
      value: isLoading ? '...' : stats.averageSession,
      change: isLoading ? '...' : 'No change',
      changeType: 'neutral',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  const getChangeColor = (type: string) => {
    switch (type) {
      case 'increase':
        return 'text-green-600';
      case 'decrease':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getChangeIcon = (type: string) => {
    switch (type) {
      case 'increase':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
          </svg>
        );
      case 'decrease':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-9.2 9.2M7 7v10h10" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        );
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {getStatCards().map((stat, index) => (
        <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-600 mb-1">{stat.title}</h3>
              <div className="flex items-baseline">
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              </div>
              <div className={`flex items-center mt-2 text-sm ${getChangeColor(stat.changeType)}`}>
                {getChangeIcon(stat.changeType)}
                <span className="ml-1">{stat.change}</span>
              </div>
            </div>
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-100 rounded-md flex items-center justify-center text-blue-600">
                {stat.icon}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DashboardStats;