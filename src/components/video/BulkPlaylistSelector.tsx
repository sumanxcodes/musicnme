'use client';

import React, { useState, useEffect } from 'react';
import { Video, Playlist } from '@/types';
import { getUserPlaylists, createPlaylist } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';

interface BulkPlaylistSelectorProps {
  videos: Video[];
  isOpen: boolean;
  onClose: () => void;
  onApply: (videos: Video[], playlists: string[], createNew?: { title: string; description: string }) => Promise<void>;
}

const BulkPlaylistSelector: React.FC<BulkPlaylistSelectorProps> = ({
  videos,
  isOpen,
  onClose,
  onApply,
}) => {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      loadPlaylists();
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setSelectedPlaylistIds([]);
      setShowCreateNew(false);
      setNewPlaylistTitle('');
      setNewPlaylistDescription('');
      setSearchQuery('');
    }
  }, [isOpen]);

  const loadPlaylists = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const userPlaylists = await getUserPlaylists(user.uid);
      setPlaylists(userPlaylists);
    } catch (error) {
      console.error('Error loading playlists:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlaylistToggle = (playlistId: string) => {
    setSelectedPlaylistIds(prev => 
      prev.includes(playlistId)
        ? prev.filter(id => id !== playlistId)
        : [...prev, playlistId]
    );
  };

  const handleSelectAll = () => {
    const filteredPlaylists = getFilteredPlaylists();
    const allSelected = filteredPlaylists.every(playlist => 
      selectedPlaylistIds.includes(playlist.id)
    );
    
    if (allSelected) {
      // Deselect all filtered playlists
      setSelectedPlaylistIds(prev => 
        prev.filter(id => !filteredPlaylists.some(playlist => playlist.id === id))
      );
    } else {
      // Select all filtered playlists
      const filteredIds = filteredPlaylists.map(playlist => playlist.id);
      setSelectedPlaylistIds(prev => [...new Set([...prev, ...filteredIds])]);
    }
  };

  const getFilteredPlaylists = () => {
    if (!searchQuery.trim()) return playlists;
    
    const query = searchQuery.toLowerCase();
    return playlists.filter(playlist =>
      playlist.title.toLowerCase().includes(query) ||
      playlist.description?.toLowerCase().includes(query)
    );
  };

  const handleApply = async () => {
    if (selectedPlaylistIds.length === 0 && !showCreateNew) return;
    
    setIsApplying(true);
    try {
      const createNewPlaylist = showCreateNew && newPlaylistTitle.trim() 
        ? { title: newPlaylistTitle.trim(), description: newPlaylistDescription.trim() }
        : undefined;

      await onApply(videos, selectedPlaylistIds, createNewPlaylist);
      onClose();
    } catch (error) {
      console.error('Error applying bulk playlist operation:', error);
    } finally {
      setIsApplying(false);
    }
  };

  const getPlaylistVideoCount = (playlist: Playlist) => {
    return playlist.videoRefs?.length || 0;
  };

  const getVideosAlreadyInPlaylist = (playlist: Playlist) => {
    return videos.filter(video => playlist.videoRefs?.includes(video.videoId) || []).length;
  };

  const filteredPlaylists = getFilteredPlaylists();
  const allFilteredSelected = filteredPlaylists.length > 0 && 
    filteredPlaylists.every(playlist => selectedPlaylistIds.includes(playlist.id));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Add to Playlists</h3>
              <p className="text-sm text-gray-500">
                Add {videos.length} selected video{videos.length !== 1 ? 's' : ''} to playlists
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isApplying}
            className="text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Search and Controls */}
          <div className="space-y-4">
            <div className="flex space-x-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search playlists..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              {filteredPlaylists.length > 0 && (
                <button
                  onClick={handleSelectAll}
                  className="px-4 py-2 text-sm font-medium text-green-700 bg-green-100 border border-green-300 rounded-md hover:bg-green-200"
                >
                  {allFilteredSelected ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                {selectedPlaylistIds.length} playlist{selectedPlaylistIds.length !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={() => setShowCreateNew(!showCreateNew)}
                className="text-green-600 hover:text-green-500 font-medium"
              >
                {showCreateNew ? 'Cancel new playlist' : '+ Create new playlist'}
              </button>
            </div>
          </div>

          {/* Create New Playlist */}
          {showCreateNew && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-green-900">Create New Playlist</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-green-700 mb-1">
                    Playlist Title *
                  </label>
                  <input
                    type="text"
                    value={newPlaylistTitle}
                    onChange={(e) => setNewPlaylistTitle(e.target.value)}
                    placeholder="Enter playlist title"
                    className="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    maxLength={100}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-green-700 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    value={newPlaylistDescription}
                    onChange={(e) => setNewPlaylistDescription(e.target.value)}
                    placeholder="Enter playlist description"
                    rows={3}
                    className="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    maxLength={500}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mr-3"></div>
              <span className="text-gray-600">Loading playlists...</span>
            </div>
          )}

          {/* Playlists List */}
          {!isLoading && (
            <div className="space-y-3">
              {filteredPlaylists.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  <p className="text-gray-500">
                    {searchQuery ? 'No playlists match your search' : 'No playlists found'}
                  </p>
                  {!searchQuery && (
                    <p className="text-sm text-gray-400 mt-1">
                      Create your first playlist to get started
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid gap-3">
                  {filteredPlaylists.map((playlist) => {
                    const isSelected = selectedPlaylistIds.includes(playlist.id);
                    const videosInPlaylist = getVideosAlreadyInPlaylist(playlist);
                    const totalVideos = getPlaylistVideoCount(playlist);
                    
                    return (
                      <div
                        key={playlist.id}
                        className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                          isSelected
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                        onClick={() => handlePlaylistToggle(playlist.id)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-1">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              isSelected
                                ? 'border-green-500 bg-green-500'
                                : 'border-gray-300 bg-white'
                            }`}>
                              {isSelected && (
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {playlist.title}
                            </h4>
                            {playlist.description && (
                              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                {playlist.description}
                              </p>
                            )}
                            
                            <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                              <span>{totalVideos} video{totalVideos !== 1 ? 's' : ''}</span>
                              {videosInPlaylist > 0 && (
                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                  {videosInPlaylist} already in playlist
                                </span>
                              )}
                            </div>
                            
                            <div className="text-xs text-gray-400 mt-1">
                              Created {new Date(playlist.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={isApplying}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={
              isApplying || 
              (selectedPlaylistIds.length === 0 && (!showCreateNew || !newPlaylistTitle.trim()))
            }
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isApplying ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Adding...
              </>
            ) : (
              <>
                Add to {selectedPlaylistIds.length + (showCreateNew && newPlaylistTitle.trim() ? 1 : 0)} Playlist{(selectedPlaylistIds.length + (showCreateNew && newPlaylistTitle.trim() ? 1 : 0)) !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkPlaylistSelector;