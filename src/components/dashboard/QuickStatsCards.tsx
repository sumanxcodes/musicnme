'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserPlaylists, getUserVideos } from '@/lib/firestore';

interface StatsData {
  totalPlaylists: number;
  totalVideos: number;
  totalHours: number;
  recentSessions: number;
}

const QuickStatsCards: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<StatsData>({
    totalPlaylists: 0,
    totalVideos: 0,
    totalHours: 0,
    recentSessions: 0
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

      // Calculate total hours (estimate 3 minutes per video)
      const totalMinutes = videos.length * 3;
      const totalHours = Math.round(totalMinutes / 60 * 10) / 10;

      // For now, use playlist count as session count (placeholder)
      const recentSessions = playlists.length;

      setStats({
        totalPlaylists: playlists.length,
        totalVideos: videos.length,
        totalHours,
        recentSessions
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    isLoading?: boolean;
  }> = ({ title, value, icon, color, isLoading }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center">
        <div className={`flex-shrink-0 ${color}`}>
          {icon}
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          {isLoading ? (
            <div className="w-16 h-8 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatCard
        title="Total Playlists"
        value={stats.totalPlaylists}
        color="text-blue-600"
        isLoading={isLoading}
        icon={
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        }
      />
      
      <StatCard
        title="Videos in Library"
        value={stats.totalVideos}
        color="text-green-600"
        isLoading={isLoading}
        icon={
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        }
      />
      
      <StatCard
        title="Hours of Content"
        value={`${stats.totalHours}h`}
        color="text-purple-600"
        isLoading={isLoading}
        icon={
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />
      
      <StatCard
        title="Recent Sessions"
        value={stats.recentSessions}
        color="text-orange-600"
        isLoading={isLoading}
        icon={
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        }
      />
    </div>
  );
};

export default QuickStatsCards;