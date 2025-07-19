'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Video } from '@/types';

interface BulkActionsDropdownProps {
  selectedVideos: Video[];
  onBulkDelete: (videos: Video[]) => void;
  onBulkTagEdit: (videos: Video[]) => void;
  onBulkAddToPlaylist: (videos: Video[]) => void;
  onBulkExport: (videos: Video[]) => void;
  onClearSelection: () => void;
  isOperationInProgress?: boolean;
}

const BulkActionsDropdown: React.FC<BulkActionsDropdownProps> = ({
  selectedVideos,
  onBulkDelete,
  onBulkTagEdit,
  onBulkAddToPlaylist,
  onBulkExport,
  onClearSelection,
  isOperationInProgress = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedCount = selectedVideos.length;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate total duration for selected videos
  const getTotalDuration = (): string => {
    const totalSeconds = selectedVideos.reduce((total, video) => {
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

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium text-blue-900">
              {selectedCount} video{selectedCount !== 1 ? 's' : ''} selected
            </span>
          </div>
          
          {/* Selection Summary */}
          <div className="hidden sm:flex items-center space-x-4 text-xs text-blue-700">
            <span>Total duration: {getTotalDuration()}</span>
            <span>•</span>
            <span>{new Set(selectedVideos.map(v => v.channelName)).size} channel{new Set(selectedVideos.map(v => v.channelName)).size !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Clear Selection */}
          <button
            onClick={onClearSelection}
            disabled={isOperationInProgress}
            className="text-sm text-blue-600 hover:text-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear selection
          </button>

          {/* Bulk Actions Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              disabled={isOperationInProgress}
              className="inline-flex items-center px-4 py-2 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isOperationInProgress ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-700" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  Bulk Actions
                  <svg className="ml-2 -mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </>
              )}
            </button>

            {/* Dropdown Menu */}
            {isOpen && !isOperationInProgress && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                <div className="py-1">
                  {/* Tag Management */}
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b">
                    Tag Management
                  </div>
                  <button
                    onClick={() => handleAction(() => onBulkTagEdit(selectedVideos))}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <div>
                      <div className="font-medium">Edit Tags</div>
                      <div className="text-xs text-gray-500">Add, remove, or replace tags</div>
                    </div>
                  </button>

                  {/* Playlist Management */}
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-t">
                    Playlist Management
                  </div>
                  <button
                    onClick={() => handleAction(() => onBulkAddToPlaylist(selectedVideos))}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    <div>
                      <div className="font-medium">Add to Playlists</div>
                      <div className="text-xs text-gray-500">Add videos to existing or new playlists</div>
                    </div>
                  </button>

                  {/* Export & Analysis */}
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-t">
                    Export & Analysis
                  </div>
                  <button
                    onClick={() => handleAction(() => onBulkExport(selectedVideos))}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div>
                      <div className="font-medium">Export Data</div>
                      <div className="text-xs text-gray-500">Download metadata as CSV or JSON</div>
                    </div>
                  </button>

                  {/* Danger Zone */}
                  <div className="px-4 py-2 text-xs font-semibold text-red-500 uppercase tracking-wider border-b border-t">
                    Danger Zone
                  </div>
                  <button
                    onClick={() => handleAction(() => onBulkDelete(selectedVideos))}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <div>
                      <div className="font-medium">Delete Videos</div>
                      <div className="text-xs text-red-500">Permanently remove selected videos</div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats for Mobile */}
      <div className="sm:hidden mt-3 pt-3 border-t border-blue-200">
        <div className="flex justify-between text-xs text-blue-700">
          <span>Duration: {getTotalDuration()}</span>
          <span>{new Set(selectedVideos.map(v => v.channelName)).size} channels</span>
        </div>
      </div>
    </div>
  );
};

export default BulkActionsDropdown;