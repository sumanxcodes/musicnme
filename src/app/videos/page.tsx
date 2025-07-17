'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAllVideos } from '@/lib/firestore';
import { Video } from '@/types';
import VideoGrid from '@/components/video/VideoGrid';
import VideoUploader from '@/components/video/VideoUploader';
import TagManager from '@/components/tags/TagManager';

const VideosPage: React.FC = () => {
  const { user } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploader, setShowUploader] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [selectedVideos, setSelectedVideos] = useState<Video[]>([]);

  useEffect(() => {
    if (user) {
      loadVideos();
    }
  }, [user]);

  const loadVideos = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const allVideos = await getAllVideos();
      const userVideos = allVideos.filter(video => video.createdBy === user.uid);
      
      setVideos(userVideos);
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVideoAdded = (video: Video) => {
    setVideos(prev => {
      // Check if video already exists to prevent duplicates
      const existingIndex = prev.findIndex(v => v.videoId === video.videoId);
      if (existingIndex !== -1) {
        // Update existing video
        const updated = [...prev];
        updated[existingIndex] = video;
        return updated;
      } else {
        // Add new video
        return [video, ...prev];
      }
    });
    setShowUploader(false);
  };

  const handleVideoSelect = (video: Video) => {
    setSelectedVideos(prev => {
      const isSelected = prev.some(v => v.videoId === video.videoId);
      if (isSelected) {
        return prev.filter(v => v.videoId !== video.videoId);
      } else {
        return [...prev, video];
      }
    });
  };

  const handleVideoEdit = (video: Video) => {
    // For now, just show tag manager
    setShowTagManager(true);
  };

  const handleVideoDelete = async (video: Video) => {
    if (!confirm(`Are you sure you want to delete "${video.title}"?`)) return;
    
    try {
      // Note: In a real app, you'd want to check if video is used in playlists
      // For now, we'll just remove it from the local state
      setVideos(prev => prev.filter(v => v.videoId !== video.videoId));
    } catch (error) {
      console.error('Error deleting video:', error);
    }
  };

  const handleAddToPlaylist = (video: Video) => {
    // Navigate to playlist selection or creation
    // For now, just show a message
    alert(`Add "${video.title}" to playlist - This feature will be implemented in Phase 3`);
  };

  const handleSearch = (query: string, filters: any) => {
    // This would typically filter the videos based on the query and filters
    // For now, the VideoGrid handles basic client-side filtering
    console.log('Search:', query, filters);
  };

  const handleTagsUpdated = () => {
    // Refresh any tag-related data
    loadVideos();
  };

  const getTotalDuration = () => {
    return videos.reduce((total, video) => {
      try {
        const duration = video.duration;
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (match) {
          const hours = parseInt(match[1] || '0');
          const minutes = parseInt(match[2] || '0');
          const seconds = parseInt(match[3] || '0');
          return total + (hours * 3600) + (minutes * 60) + seconds;
        }
      } catch (error) {
        console.error('Error parsing duration:', error);
      }
      return total;
    }, 0);
  };

  const formatTotalDuration = () => {
    const totalSeconds = getTotalDuration();
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const getUniqueChannels = () => {
    const channels = new Set(videos.map(video => video.channelName));
    return channels.size;
  };

  const getTaggedVideos = () => {
    return videos.filter(video => video.tags.length > 0).length;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Video Library</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage your Boomwhacker video collection with search, tagging, and organization features
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowTagManager(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            Manage Tags
          </button>
          
          <button
            onClick={() => setShowUploader(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New Video
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      {!isLoading && videos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-3">
                <div className="text-sm font-medium text-gray-500">Total Videos</div>
                <div className="text-2xl font-bold text-gray-900">{videos.length}</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <div className="text-sm font-medium text-gray-500">Total Duration</div>
                <div className="text-2xl font-bold text-gray-900">{formatTotalDuration()}</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-3">
                <div className="text-sm font-medium text-gray-500">Channels</div>
                <div className="text-2xl font-bold text-gray-900">{getUniqueChannels()}</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div className="ml-3">
                <div className="text-sm font-medium text-gray-500">Tagged Videos</div>
                <div className="text-2xl font-bold text-gray-900">{getTaggedVideos()}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selection Actions */}
      {selectedVideos.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium text-blue-900">
                {selectedVideos.length} video{selectedVideos.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSelectedVideos([])}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Clear selection
              </button>
              <button
                onClick={() => alert('Bulk operations coming in Phase 3')}
                className="inline-flex items-center px-3 py-1 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
              >
                Bulk Actions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Uploader Modal */}
      {showUploader && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowUploader(false)}></div>
            <div className="inline-block align-middle bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <VideoUploader
                onVideoAdded={handleVideoAdded}
                onClose={() => setShowUploader(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Videos Grid */}
      <VideoGrid
        videos={videos}
        isLoading={isLoading}
        onVideoSelect={handleVideoSelect}
        onVideoEdit={handleVideoEdit}
        onVideoDelete={handleVideoDelete}
        onAddToPlaylist={handleAddToPlaylist}
        selectedVideos={selectedVideos}
        showSearch={true}
        onSearch={handleSearch}
        emptyMessage="No videos in your library yet"
        emptyIcon={
          <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        }
      />

      {/* Tag Manager Modal */}
      <TagManager
        isOpen={showTagManager}
        onClose={() => setShowTagManager(false)}
        onTagsUpdated={handleTagsUpdated}
      />
    </div>
  );
};

export default VideosPage;