'use client';

import React from 'react';
import Link from 'next/link';

interface PlaylistItem {
  id: string;
  title: string;
  description: string;
  videoCount: number;
  totalDuration: string;
  lastUsed: string;
  thumbnail: string;
  tags: string[];
}

const RecentPlaylists: React.FC = () => {
  // Mock data - will be replaced with real data from Firestore
  const recentPlaylists: PlaylistItem[] = [
    {
      id: '1',
      title: 'Morning Warmup',
      description: 'Perfect for starting the day with energy',
      videoCount: 8,
      totalDuration: '24 min',
      lastUsed: '2 hours ago',
      thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
      tags: ['warmup', 'energy', 'C major'],
    },
    {
      id: '2',
      title: 'Color Learning',
      description: 'Learn colors through music and movement',
      videoCount: 6,
      totalDuration: '18 min',
      lastUsed: '1 day ago',
      thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
      tags: ['colors', 'learning', 'slow'],
    },
    {
      id: '3',
      title: 'Rhythm Practice',
      description: 'Build rhythm skills with fun activities',
      videoCount: 10,
      totalDuration: '32 min',
      lastUsed: '3 days ago',
      thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
      tags: ['rhythm', 'practice', 'medium'],
    },
  ];

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

      {recentPlaylists.length === 0 ? (
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
          {recentPlaylists.map((playlist) => (
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
                    {playlist.description}
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