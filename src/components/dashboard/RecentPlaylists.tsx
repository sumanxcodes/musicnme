'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getUserPlaylists, getVideo } from '@/lib/firestore';
import { Playlist, Video } from '@/types';

interface PlaylistWithMetadata extends Playlist {
  videoCount: number;
  totalDuration: string;
  lastUsed: string;
  thumbnail: string;
  tags: string[];
}

const RecentPlaylists: React.FC = () => {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState<PlaylistWithMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadRecentPlaylists();
    }
  }, [user]);

  const loadRecentPlaylists = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const userPlaylists = await getUserPlaylists(user.uid);
      
      // Sort by creation date (most recent first) and take top 3
      const sortedPlaylists = userPlaylists
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 3);
      
      // Enrich playlists with metadata
      const enrichedPlaylists = await Promise.all(
        sortedPlaylists.map(async (playlist) => {
          const videoCount = playlist.videoRefs.length;
          let totalDuration = '0 min';
          let thumbnail = '';
          let tags: string[] = [];
          
          if (videoCount > 0) {
            // Get first video for thumbnail and sample some videos for tags
            const firstVideo = await getVideo(playlist.videoRefs[0]);
            if (firstVideo) {
              thumbnail = firstVideo.thumbnail;
              tags = firstVideo.tags.slice(0, 3); // Take first 3 tags
            }
            
            // Calculate total duration (simplified - just estimate)
            const estimatedMinutes = videoCount * 3; // Assume 3 min per video
            totalDuration = `${estimatedMinutes} min`;
          }
          
          // Calculate "last used" (for now, use created date)
          const lastUsed = getTimeAgo(playlist.createdAt);
          
          return {
            ...playlist,
            videoCount,
            totalDuration,
            lastUsed,
            thumbnail,
            tags
          };
        })
      );
      
      setPlaylists(enrichedPlaylists);
    } catch (err) {
      console.error('Error loading recent playlists:', err);
      setError('Failed to load playlists');
    } finally {
      setIsLoading(false);
    }
  };

  const getTimeAgo = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Recent Playlists</h2>
          <div className="w-24 h-4 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-50 rounded-lg overflow-hidden animate-pulse">
              <div className="aspect-video bg-gray-200"></div>
              <div className="p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-3"></div>
                <div className="flex justify-between mb-3">
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                  <div className="h-3 bg-gray-200 rounded w-12"></div>
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                </div>
                <div className="flex gap-1">
                  <div className="h-5 bg-gray-200 rounded w-12"></div>
                  <div className="h-5 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Recent Playlists</h2>
          <Link
            href="/playlists"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View all playlists →
          </Link>
        </div>
        <div className="text-center py-8">
          <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading playlists</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadRecentPlaylists}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Recent Playlists</h2>
        <Link
          href="/playlists"
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          View all playlists →
        </Link>
      </div>

      {playlists.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No playlists yet</h3>
          <p className="text-gray-600 mb-4">Create your first playlist to get started!</p>
          <Link
            href="/playlists/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Playlist
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {playlists.map((playlist) => (
            <Link
              key={playlist.id}
              href={`/playlists/${playlist.id}`}
              className="group block"
            >
              <div className="bg-gray-50 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                <div className="aspect-video bg-gray-200 relative">
                  <img
                    src={playlist.thumbnail}
                    alt={playlist.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDMyMCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMTgwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjE2MCIgY3k9IjkwIiByPSIzMCIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJtMTQ1IDc1IDIwIDEwdjEwbC0yMCAxMHoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=';
                    }}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity flex items-center justify-center">
                    <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.5a2.5 2.5 0 010 5H9m-4.5-5h.01m4.49 0H15m-6 0a2.5 2.5 0 00-2.5 2.5M15 10h.01M15 10a2.5 2.5 0 012.5 2.5m-7.5 5h.01m7.49 0h.01" />
                    </svg>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                    {playlist.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {playlist.notes || 'No description provided'}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span>{playlist.videoCount} videos</span>
                    <span>{playlist.totalDuration}</span>
                    <span>Used {playlist.lastUsed}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {playlist.tags.slice(0, 3).map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {tag}
                      </span>
                    ))}
                    {playlist.tags.length > 3 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                        +{playlist.tags.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentPlaylists;