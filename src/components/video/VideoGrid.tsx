'use client';

import React, { useState, useEffect } from 'react';
import { Video } from '@/types';
import VideoCard from './VideoCard';
import VideoSearch from './VideoSearch';
import { getUserPlaylists } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';

interface VideoGridProps {
  videos: Video[];
  isLoading?: boolean;
  onVideoSelect?: (video: Video) => void;
  onVideoEdit?: (video: Video) => void;
  onVideoDelete?: (video: Video) => void;
  onAddToPlaylist?: (video: Video) => void;
  selectedVideos?: Video[];
  showSearch?: boolean;
  onSearch?: (query: string, filters: any) => void;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
}

const VideoGrid: React.FC<VideoGridProps> = ({
  videos,
  isLoading = false,
  onVideoSelect,
  onVideoEdit,
  onVideoDelete,
  onAddToPlaylist,
  selectedVideos = [],
  showSearch = true,
  onSearch,
  emptyMessage = "No videos found",
  emptyIcon,
}) => {
  const { user } = useAuth();
  const handleSearch = (query: string, filters: any) => {
    if (onSearch) {
      onSearch(query, filters);
    }
  };

  const isVideoSelected = (video: Video) => {
    return selectedVideos.some(selected => selected.videoId === video.videoId);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {showSearch && (
          <div className="animate-pulse">
            <div className="h-12 bg-gray-200 rounded-lg"></div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="bg-gray-200 h-48 rounded-t-lg"></div>
              <div className="bg-white p-4 rounded-b-lg">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="flex space-x-2">
                  <div className="h-5 bg-gray-200 rounded-full w-12"></div>
                  <div className="h-5 bg-gray-200 rounded-full w-16"></div>
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
      {showSearch && (
        <VideoSearch onSearch={handleSearch} />
      )}
      
      {videos.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-12 h-12 text-gray-400 mb-4">
            {emptyIcon || (
              <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </div>
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            {emptyMessage}
          </h3>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {videos.length} video{videos.length !== 1 ? 's' : ''}
            </p>
            
            {selectedVideos.length > 0 && (
              <div className="flex items-center space-x-2 text-sm text-blue-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {selectedVideos.length} selected
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {videos
              .filter((video, index, self) => 
                index === self.findIndex(v => v.videoId === video.videoId)
              )
              .map((video, index) => (
                <VideoCard
                  key={`${video.videoId}-${index}`}
                  video={video}
                  onSelect={onVideoSelect}
                onEdit={onVideoEdit}
                onDelete={onVideoDelete}
                onAddToPlaylist={onAddToPlaylist}
                isSelected={isVideoSelected(video)}
                showActions={true}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default VideoGrid;