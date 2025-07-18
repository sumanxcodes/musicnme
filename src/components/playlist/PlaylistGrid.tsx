'use client';

import React, { useState, useEffect } from 'react';
import { Playlist } from '@/types';
import PlaylistCard from './PlaylistCard';
import { getUserPlaylists } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';

interface PlaylistGridProps {
  playlists: Playlist[];
  isLoading?: boolean;
  onPlaylistEdit?: (playlist: Playlist) => void;
  onPlaylistDelete?: (playlist: Playlist) => void;
  onPlaylistDuplicate?: (playlist: Playlist) => void;
  onPlaylistPlay?: (playlist: Playlist) => void;
  onPlaylistView?: (playlist: Playlist) => void;
  onPlaylistShare?: (playlist: Playlist) => void;
  showActions?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
}

const PlaylistGrid: React.FC<PlaylistGridProps> = ({
  playlists,
  isLoading = false,
  onPlaylistEdit,
  onPlaylistDelete,
  onPlaylistDuplicate,
  onPlaylistPlay,
  onPlaylistView,
  onPlaylistShare,
  showActions = true,
  emptyMessage = "No playlists found",
  emptyIcon,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'title' | 'videos'>('recent');
  const [filteredPlaylists, setFilteredPlaylists] = useState<Playlist[]>(playlists);

  useEffect(() => {
    let filtered = [...playlists];
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(playlist => 
        playlist.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (playlist.notes && playlist.notes.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'videos':
          return b.videoRefs.length - a.videoRefs.length;
        case 'recent':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
    
    setFilteredPlaylists(filtered);
  }, [playlists, searchQuery, sortBy]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Search Bar Skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex-1 max-w-lg">
            <div className="animate-pulse bg-gray-200 h-10 rounded-lg"></div>
          </div>
          <div className="animate-pulse bg-gray-200 h-10 w-32 rounded-lg"></div>
        </div>
        
        {/* Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="bg-gray-200 h-48 rounded-t-lg"></div>
              <div className="bg-white p-4 rounded-b-lg">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="flex justify-between items-center">
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                  <div className="h-3 bg-gray-200 rounded w-12"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Sort Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
        {/* Search Input */}
        <div className="flex-1 max-w-lg">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search playlists..."
            />
          </div>
        </div>
        
        {/* Sort Dropdown */}
        <div className="flex items-center space-x-2">
          <label htmlFor="sort" className="text-sm font-medium text-gray-700">
            Sort by:
          </label>
          <select
            id="sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'recent' | 'title' | 'videos')}
            className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="recent">Most Recent</option>
            <option value="title">Title</option>
            <option value="videos">Video Count</option>
          </select>
        </div>
      </div>

      {/* Results Info */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {filteredPlaylists.length} playlist{filteredPlaylists.length !== 1 ? 's' : ''}
          {searchQuery && ` matching "${searchQuery}"`}
        </p>
        
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            Clear search
          </button>
        )}
      </div>

      {/* Playlist Grid */}
      {filteredPlaylists.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-12 h-12 text-gray-400 mb-4">
            {emptyIcon || (
              <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            )}
          </div>
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            {emptyMessage}
          </h3>
          {searchQuery ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-500">
                No playlists found matching &ldquo;{searchQuery}&rdquo;
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Clear search to see all playlists
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              Create your first playlist to get started
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPlaylists.map((playlist) => (
            <PlaylistCard
              key={playlist.id}
              playlist={playlist}
              onEdit={onPlaylistEdit}
              onDelete={onPlaylistDelete}
              onDuplicate={onPlaylistDuplicate}
              onPlay={onPlaylistPlay}
              onView={onPlaylistView}
              onShare={onPlaylistShare}
              showActions={showActions}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PlaylistGrid;