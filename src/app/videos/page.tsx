'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAllVideos, checkVideoUsage, deleteVideo, updatePlaylist, updateVideoTags, bulkUpdateVideoTags, bulkDeleteVideos, bulkAddToPlaylists, bulkCheckVideoUsage, exportVideosData } from '@/lib/firestore';
import { Video, VideoUsageInfo } from '@/types';
import VideoGrid from '@/components/video/VideoGrid';
import VideoUploadWizard from '@/components/video/VideoUploadWizard';
import TagManager from '@/components/tags/TagManager';
import DeleteVideoModal from '@/components/modals/DeleteVideoModal';
import VideoTagEditor from '@/components/video/VideoTagEditor';
import BulkActionsDropdown from '@/components/video/BulkActionsDropdown';
import BulkDeleteModal from '@/components/video/BulkDeleteModal';
import BulkTagEditor from '@/components/video/BulkTagEditor';
import BulkPlaylistSelector from '@/components/video/BulkPlaylistSelector';

const VideosPage: React.FC = () => {
  const { user } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploader, setShowUploader] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState<Video | null>(null);
  const [videoUsageInfo, setVideoUsageInfo] = useState<VideoUsageInfo | null>(null);
  const [selectedVideos, setSelectedVideos] = useState<Video[]>([]);
  const [videoToEdit, setVideoToEdit] = useState<Video | null>(null);
  const [showVideoTagEditor, setShowVideoTagEditor] = useState(false);
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([]);
  // Bulk operations state
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showBulkTagEditor, setShowBulkTagEditor] = useState(false);
  const [showBulkPlaylistSelector, setShowBulkPlaylistSelector] = useState(false);
  const [bulkOperationInProgress, setBulkOperationInProgress] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState({
    tags: [],
    duration: 'all',
    sortBy: 'recent',
    sortOrder: 'desc'
  });

  useEffect(() => {
    if (user) {
      loadVideos();
    }
  }, [user]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [videos, searchQuery, searchFilters]);

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
    setVideoToEdit(video);
    setShowVideoTagEditor(true);
  };

  const handleVideoDelete = async (video: Video) => {
    try {
      // Check if video is used in any playlists
      const usageInfo = await checkVideoUsage(video.videoId);
      
      // Set the video to be deleted and show the modal
      setVideoToDelete(video);
      setVideoUsageInfo(usageInfo);
      setShowDeleteModal(true);
    } catch (error) {
      console.error('Error checking video usage:', error);
      alert('Error checking video usage. Please try again.');
    }
  };

  const handleConfirmDelete = async (removeFromPlaylists: boolean) => {
    if (!videoToDelete) return;
    
    try {
      // If video is used in playlists and user chose to remove it
      if (removeFromPlaylists && videoUsageInfo?.isUsed) {
        // Remove video from all playlists first
        for (const playlist of videoUsageInfo.playlists) {
          const updatedVideoRefs = playlist.videoRefs.filter(ref => ref !== videoToDelete.videoId);
          await updatePlaylist(playlist.id, { videoRefs: updatedVideoRefs });
        }
      }
      
      // Delete the video from Firestore
      await deleteVideo(videoToDelete.videoId);
      
      // Remove from local state
      setVideos(prev => prev.filter(v => v.videoId !== videoToDelete.videoId));
      
      // Reset modal state
      setVideoToDelete(null);
      setVideoUsageInfo(null);
      setShowDeleteModal(false);
      
      alert('Video deleted successfully!');
    } catch (error) {
      console.error('Error deleting video:', error);
      alert('Error deleting video. Please try again.');
    }
  };

  const handleAddToPlaylist = (video: Video) => {
    // Navigate to playlist selection or creation
    // For now, just show a message
    alert(`Add "${video.title}" to playlist - This feature will be implemented in Phase 3`);
  };

  const applyFiltersAndSort = () => {
    let filtered = [...videos];

    // Apply text search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(video => 
        video.title.toLowerCase().includes(query) ||
        video.channelName.toLowerCase().includes(query) ||
        video.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply tag filters
    if (searchFilters.tags && searchFilters.tags.length > 0) {
      filtered = filtered.filter(video => 
        searchFilters.tags.some((tag: string) => video.tags.includes(tag))
      );
    }

    // Apply duration filter
    if (searchFilters.duration !== 'all') {
      filtered = filtered.filter(video => {
        const duration = video.duration;
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (match) {
          const totalMinutes = (parseInt(match[1] || '0') * 60) + parseInt(match[2] || '0');
          switch (searchFilters.duration) {
            case 'short': return totalMinutes <= 3;
            case 'medium': return totalMinutes > 3 && totalMinutes <= 10;
            case 'long': return totalMinutes > 10;
            default: return true;
          }
        }
        return true;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (searchFilters.sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'channel':
          comparison = a.channelName.localeCompare(b.channelName);
          break;
        case 'duration':
          const getDurationInSeconds = (duration: string) => {
            const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
            if (match) {
              const hours = parseInt(match[1] || '0');
              const minutes = parseInt(match[2] || '0');
              const seconds = parseInt(match[3] || '0');
              return (hours * 3600) + (minutes * 60) + seconds;
            }
            return 0;
          };
          comparison = getDurationInSeconds(a.duration) - getDurationInSeconds(b.duration);
          break;
        case 'recent':
        default:
          comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          break;
      }

      return searchFilters.sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredVideos(filtered);
  };

  const handleSearch = (query: string, filters: any) => {
    setSearchQuery(query);
    setSearchFilters(filters);
  };

  const handleTagsUpdated = () => {
    // Refresh any tag-related data
    loadVideos();
  };

  const handleVideoTagsUpdate = async (videoId: string, tags: string[]) => {
    try {
      await updateVideoTags(videoId, tags);
      
      // Update local state
      setVideos(prev => prev.map(video => 
        video.videoId === videoId 
          ? { ...video, tags }
          : video
      ));
      
      setShowVideoTagEditor(false);
      setVideoToEdit(null);
    } catch (error) {
      console.error('Error updating video tags:', error);
      throw error;
    }
  };

  // Bulk operations handlers
  const handleBulkDelete = (videos: Video[]) => {
    setShowBulkDeleteModal(true);
  };

  const handleBulkTagEdit = (videos: Video[]) => {
    setShowBulkTagEditor(true);
  };

  const handleBulkAddToPlaylist = (videos: Video[]) => {
    setShowBulkPlaylistSelector(true);
  };

  const handleBulkExport = async (videos: Video[]) => {
    try {
      setBulkOperationInProgress(true);
      
      // Ask user for format preference
      const format = confirm('Export as CSV? (Cancel for JSON)') ? 'csv' : 'json';
      const data = await exportVideosData(videos, format);
      
      // Create and download file
      const blob = new Blob([data], { 
        type: format === 'csv' ? 'text/csv' : 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `videos-export-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert(`Successfully exported ${videos.length} videos as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting videos:', error);
      alert('Error exporting videos. Please try again.');
    } finally {
      setBulkOperationInProgress(false);
    }
  };

  const handleClearSelection = () => {
    setSelectedVideos([]);
  };

  const handleBulkDeleteConfirm = async (videos: Video[], removeFromPlaylists: boolean) => {
    try {
      setBulkOperationInProgress(true);
      
      await bulkDeleteVideos(videos, removeFromPlaylists, (progress) => {
        // Progress is handled by the modal component
      });
      
      // Remove deleted videos from local state
      const deletedVideoIds = new Set(videos.map(v => v.videoId));
      setVideos(prev => prev.filter(v => !deletedVideoIds.has(v.videoId)));
      setSelectedVideos([]);
      setShowBulkDeleteModal(false);
      
      alert(`Successfully deleted ${videos.length} video${videos.length !== 1 ? 's' : ''}`);
    } catch (error) {
      console.error('Error in bulk delete:', error);
      alert('Error deleting videos. Some videos may not have been deleted.');
    } finally {
      setBulkOperationInProgress(false);
    }
  };

  const handleBulkTagEditApply = async (videos: Video[], operation: any) => {
    try {
      setBulkOperationInProgress(true);
      
      await bulkUpdateVideoTags(videos, operation, (progress) => {
        // Progress tracking could be added here
      });
      
      // Refresh videos to get updated tags
      await loadVideos();
      setSelectedVideos([]);
      setShowBulkTagEditor(false);
      
      alert(`Successfully updated tags for ${videos.length} video${videos.length !== 1 ? 's' : ''}`);
    } catch (error) {
      console.error('Error in bulk tag edit:', error);
      alert('Error updating tags. Some videos may not have been updated.');
    } finally {
      setBulkOperationInProgress(false);
    }
  };

  const handleBulkPlaylistAdd = async (videos: Video[], playlistIds: string[], createNew?: any) => {
    try {
      setBulkOperationInProgress(true);
      
      const resultPlaylistIds = await bulkAddToPlaylists(
        videos,
        playlistIds,
        createNew,
        user?.uid,
        (progress) => {
          // Progress tracking could be added here
        }
      );
      
      setSelectedVideos([]);
      setShowBulkPlaylistSelector(false);
      
      const totalPlaylists = resultPlaylistIds.length;
      alert(`Successfully added ${videos.length} video${videos.length !== 1 ? 's' : ''} to ${totalPlaylists} playlist${totalPlaylists !== 1 ? 's' : ''}`);
    } catch (error) {
      console.error('Error in bulk playlist add:', error);
      alert('Error adding videos to playlists. Some videos may not have been added.');
    } finally {
      setBulkOperationInProgress(false);
    }
  };

  const handleBulkCheckUsage = async (videos: Video[]) => {
    try {
      return await bulkCheckVideoUsage(videos);
    } catch (error) {
      console.error('Error checking video usage:', error);
      return new Map();
    }
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

      {/* Search Results Info */}
      {!isLoading && (searchQuery || searchFilters.tags.length > 0 || searchFilters.duration !== 'all') && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="text-sm font-medium text-blue-900">
                Showing {filteredVideos.length} of {videos.length} videos
              </span>
            </div>
            <button
              onClick={() => {
                setSearchQuery('');
                setSearchFilters({
                  tags: [],
                  duration: 'all',
                  sortBy: 'recent',
                  sortOrder: 'desc'
                });
              }}
              className="text-sm text-blue-600 hover:text-blue-500 font-medium"
            >
              Clear filters
            </button>
          </div>
          {searchQuery && (
            <p className="text-sm text-blue-700 mt-1">
              Search: &quot;{searchQuery}&quot;
            </p>
          )}
          {searchFilters.tags.length > 0 && (
            <div className="flex items-center mt-2">
              <span className="text-sm text-blue-700 mr-2">Tags:</span>
              <div className="flex flex-wrap gap-1">
                {searchFilters.tags.map((tag: string) => (
                  <span key={tag} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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

      {/* Bulk Actions Bar */}
      <BulkActionsDropdown
        selectedVideos={selectedVideos}
        onBulkDelete={handleBulkDelete}
        onBulkTagEdit={handleBulkTagEdit}
        onBulkAddToPlaylist={handleBulkAddToPlaylist}
        onBulkExport={handleBulkExport}
        onClearSelection={handleClearSelection}
        isOperationInProgress={bulkOperationInProgress}
      />

      {/* Video Upload Wizard Modal */}
      {showUploader && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-start justify-center min-h-screen pt-8 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowUploader(false)}></div>
            <div className="inline-block align-top bg-white rounded-lg text-left shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
              <VideoUploadWizard
                onVideoAdded={handleVideoAdded}
                onClose={() => setShowUploader(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Videos Grid */}
      <VideoGrid
        videos={filteredVideos}
        isLoading={isLoading}
        onVideoSelect={handleVideoSelect}
        onVideoEdit={handleVideoEdit}
        onVideoDelete={handleVideoDelete}
        onAddToPlaylist={handleAddToPlaylist}
        selectedVideos={selectedVideos}
        showSearch={true}
        onSearch={handleSearch}
        emptyMessage={searchQuery || searchFilters.tags.length > 0 || searchFilters.duration !== 'all' ? "No videos match your search criteria" : "No videos in your library yet"}
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

      {/* Delete Video Modal */}
      {videoToDelete && videoUsageInfo && (
        <DeleteVideoModal
          video={videoToDelete}
          usageInfo={videoUsageInfo}
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setVideoToDelete(null);
            setVideoUsageInfo(null);
          }}
          onConfirm={handleConfirmDelete}
        />
      )}

      {/* Video Tag Editor Modal */}
      {videoToEdit && (
        <VideoTagEditor
          video={videoToEdit}
          isOpen={showVideoTagEditor}
          onClose={() => {
            setShowVideoTagEditor(false);
            setVideoToEdit(null);
          }}
          onTagsUpdated={handleVideoTagsUpdate}
        />
      )}

      {/* Bulk Operations Modals */}
      <BulkDeleteModal
        videos={selectedVideos}
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={handleBulkDeleteConfirm}
        onCheckUsage={handleBulkCheckUsage}
      />

      <BulkTagEditor
        videos={selectedVideos}
        isOpen={showBulkTagEditor}
        onClose={() => setShowBulkTagEditor(false)}
        onApply={handleBulkTagEditApply}
      />

      <BulkPlaylistSelector
        videos={selectedVideos}
        isOpen={showBulkPlaylistSelector}
        onClose={() => setShowBulkPlaylistSelector(false)}
        onApply={handleBulkPlaylistAdd}
      />
    </div>
  );
};

export default VideosPage;