'use client';

import React, { useState, useEffect } from 'react';
import { Video, VideoUsageInfo } from '@/types';

interface BulkDeleteModalProps {
  videos: Video[];
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (videos: Video[], removeFromPlaylists: boolean) => Promise<void>;
  onCheckUsage: (videos: Video[]) => Promise<Map<string, VideoUsageInfo>>;
}

const BulkDeleteModal: React.FC<BulkDeleteModalProps> = ({
  videos,
  isOpen,
  onClose,
  onConfirm,
  onCheckUsage,
}) => {
  const [usageMap, setUsageMap] = useState<Map<string, VideoUsageInfo>>(new Map());
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [removeFromPlaylists, setRemoveFromPlaylists] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);

  useEffect(() => {
    if (isOpen && videos.length > 0) {
      checkVideoUsage();
    }
  }, [isOpen, videos]);

  const checkVideoUsage = async () => {
    setIsLoadingUsage(true);
    try {
      const usage = await onCheckUsage(videos);
      setUsageMap(usage);
      
      // Auto-expand advanced section if videos are used in playlists
      const hasUsedVideos = Array.from(usage.values()).some(info => info.isUsed);
      setShowAdvanced(hasUsedVideos);
    } catch (error) {
      console.error('Error checking video usage:', error);
    } finally {
      setIsLoadingUsage(false);
    }
  };

  const handleConfirm = async () => {
    setIsDeleting(true);
    setDeleteProgress(0);
    
    try {
      await onConfirm(videos, removeFromPlaylists);
    } catch (error) {
      console.error('Error deleting videos:', error);
    } finally {
      setIsDeleting(false);
      setDeleteProgress(0);
    }
  };

  const getUsageStats = () => {
    const usedVideos = Array.from(usageMap.values()).filter(info => info.isUsed);
    const totalPlaylists = new Set(
      usedVideos.flatMap(info => info.playlists.map(p => p.id))
    ).size;
    
    return {
      usedCount: usedVideos.length,
      unusedCount: videos.length - usedVideos.length,
      totalPlaylists,
      totalUsages: usedVideos.reduce((sum, info) => sum + info.playlists.length, 0)
    };
  };

  const stats = getUsageStats();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Multiple Videos</h3>
              <p className="text-sm text-gray-500">
                Delete {videos.length} selected video{videos.length !== 1 ? 's' : ''} permanently
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Loading State */}
          {isLoadingUsage && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-gray-600">Checking playlist usage...</span>
            </div>
          )}

          {/* Usage Summary */}
          {!isLoadingUsage && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Impact Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Videos to delete:</span>
                  <span className="font-medium">{videos.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Used in playlists:</span>
                  <span className={`font-medium ${stats.usedCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {stats.usedCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Affected playlists:</span>
                  <span className={`font-medium ${stats.totalPlaylists > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {stats.totalPlaylists}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total usages:</span>
                  <span className={`font-medium ${stats.totalUsages > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {stats.totalUsages}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Warning Message */}
          {!isLoadingUsage && stats.usedCount > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <svg className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-red-800">Playlist Impact Warning</h4>
                  <p className="text-sm text-red-700 mt-1">
                    {stats.usedCount} of the selected videos are currently used in {stats.totalPlaylists} playlist{stats.totalPlaylists !== 1 ? 's' : ''}. 
                    Deleting these videos will affect the playlists they're in.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Playlist Options */}
          {!isLoadingUsage && stats.usedCount > 0 && (
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  id="remove-from-playlists"
                  type="checkbox"
                  checked={removeFromPlaylists}
                  onChange={(e) => setRemoveFromPlaylists(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="remove-from-playlists" className="ml-2 text-sm text-gray-700">
                  Also remove these videos from all playlists before deleting
                </label>
              </div>
              
              {!removeFromPlaylists && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> If you don't remove videos from playlists first, 
                    those playlists will have broken video references.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Advanced Details */}
          {!isLoadingUsage && stats.usedCount > 0 && (
            <div className="border border-gray-200 rounded-lg">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50"
              >
                <span className="text-sm font-medium text-gray-900">
                  View detailed playlist usage
                </span>
                <svg 
                  className={`w-4 h-4 text-gray-500 transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showAdvanced && (
                <div className="border-t border-gray-200 p-4 max-h-64 overflow-y-auto">
                  <div className="space-y-3">
                    {videos.map(video => {
                      const usage = usageMap.get(video.videoId);
                      if (!usage?.isUsed) return null;
                      
                      return (
                        <div key={video.videoId} className="border border-gray-200 rounded p-3">
                          <div className="flex items-start space-x-3">
                            <img
                              src={video.thumbnail}
                              alt={video.title}
                              className="w-16 h-12 object-cover rounded"
                            />
                            <div className="flex-1 min-w-0">
                              <h5 className="text-sm font-medium text-gray-900 truncate">
                                {video.title}
                              </h5>
                              <p className="text-xs text-gray-500 mt-1">
                                Used in {usage.playlists.length} playlist{usage.playlists.length !== 1 ? 's' : ''}:
                              </p>
                              <div className="mt-1 space-y-1">
                                {usage.playlists.map(playlist => (
                                  <div key={playlist.id} className="text-xs text-blue-600">
                                    • {playlist.title}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Progress Bar */}
          {isDeleting && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Deleting videos...</span>
                <span className="text-gray-600">{Math.round(deleteProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-red-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${deleteProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting || isLoadingUsage}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isDeleting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Deleting...
              </>
            ) : (
              `Delete ${videos.length} Video${videos.length !== 1 ? 's' : ''}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkDeleteModal;