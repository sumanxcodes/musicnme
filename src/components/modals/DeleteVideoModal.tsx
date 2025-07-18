'use client';

import React, { useState } from 'react';
import { Video, VideoUsageInfo } from '@/types';

interface DeleteVideoModalProps {
  video: Video;
  usageInfo: VideoUsageInfo;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (removeFromPlaylists: boolean) => void;
}

const DeleteVideoModal: React.FC<DeleteVideoModalProps> = ({
  video,
  usageInfo,
  isOpen,
  onClose,
  onConfirm
}) => {
  const [removeFromPlaylists, setRemoveFromPlaylists] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(removeFromPlaylists);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Delete Video</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Video Info */}
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-3">
              <img 
                src={video.thumbnail} 
                alt={video.title}
                className="w-16 h-10 object-cover rounded"
                onError={(e) => {
                  e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDMyMCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMTgwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjE2MCIgY3k9IjkwIiByPSIzMCIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJtMTQ1IDc1IDIwIDEwdjEwbC0yMCAxMHoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=';
                }}
              />
              <div>
                <h3 className="font-medium text-gray-900 text-sm">{video.title}</h3>
                <p className="text-xs text-gray-500">{video.duration}</p>
              </div>
            </div>
          </div>

          {/* Usage Warning */}
          {usageInfo.isUsed && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    This video is used in {usageInfo.playlistCount} playlist{usageInfo.playlistCount > 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    Deleting this video will affect the following playlists:
                  </p>
                </div>
              </div>
              
              {/* Playlist List */}
              <div className="mt-3 max-h-32 overflow-y-auto">
                {usageInfo.playlists.map((playlist) => (
                  <div key={playlist.id} className="flex items-center gap-2 py-1">
                    <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    <span className="text-sm text-amber-800">{playlist.title}</span>
                  </div>
                ))}
              </div>

              {/* Option to remove from playlists */}
              <div className="mt-3 pt-3 border-t border-amber-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={removeFromPlaylists}
                    onChange={(e) => setRemoveFromPlaylists(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-amber-800">
                    Remove this video from all playlists before deleting
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Simple confirmation for unused videos */}
          {!usageInfo.isUsed && (
            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-600">
                Are you sure you want to delete &quot;{video.title}&quot;? This action cannot be undone.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
            >
              Delete Video
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteVideoModal;