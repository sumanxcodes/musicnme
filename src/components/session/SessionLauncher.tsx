'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Playlist, Video } from '@/types';
import { getPlaylist, getVideo } from '@/lib/firestore';
import { durationToSeconds } from '@/lib/youtube';

interface SessionLauncherProps {
  playlist: Playlist;
  onClose: () => void;
}

const SessionLauncher: React.FC<SessionLauncherProps> = ({ playlist, onClose }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [videos, setVideos] = useState<Video[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sessionSettings, setSessionSettings] = useState({
    autoplay: true,
    shuffle: false,
    loop: false,
    fullscreen: true,
    volume: 0.8,
  });

  useEffect(() => {
    loadPlaylistVideos();
  }, [playlist]);

  const loadPlaylistVideos = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const videoData: Video[] = [];
      
      for (const videoId of playlist.videoRefs) {
        try {
          const video = await getVideo(videoId);
          if (video) {
            videoData.push(video);
          }
        } catch (videoError) {
          console.error(`Error loading video ${videoId}:`, videoError);
        }
      }
      
      setVideos(videoData);
      
      if (videoData.length === 0) {
        setError('No videos could be loaded from this playlist');
      }
    } catch (err) {
      console.error('Error loading playlist videos:', err);
      setError('Failed to load playlist videos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLaunchSession = () => {
    if (videos.length === 0) {
      setError('Cannot start session with empty playlist');
      return;
    }

    // Create session URL with settings
    const sessionParams = new URLSearchParams({
      playlistId: playlist.id,
      autoplay: sessionSettings.autoplay.toString(),
      shuffle: sessionSettings.shuffle.toString(),
      loop: sessionSettings.loop.toString(),
      fullscreen: sessionSettings.fullscreen.toString(),
      volume: sessionSettings.volume.toString(),
    });

    // Navigate to session player
    router.push(`/session?${sessionParams.toString()}`);
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const calculateTotalDuration = (): number => {
    return videos.reduce((total, video) => {
      try {
        return total + durationToSeconds(video.duration);
      } catch (error) {
        console.error('Error parsing duration for video:', video.videoId, video.duration);
        return total;
      }
    }, 0);
  };

  const totalDuration = calculateTotalDuration();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Launch Session</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-1"
            aria-label="Close session launcher"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Playlist Info */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">{playlist.title}</h3>
            {playlist.notes && (
              <p className="text-sm text-blue-700 mb-3">{playlist.notes}</p>
            )}
            
            <div className="flex items-center space-x-6 text-sm text-blue-600">
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {videos.length} videos
              </div>
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formatDuration(totalDuration)}
              </div>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading playlist videos...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <svg className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-red-800">Session Error</h4>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Session Settings */}
          {!isLoading && !error && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900">Session Settings</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Autoplay */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Autoplay</label>
                    <p className="text-xs text-gray-500">Start playing immediately</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sessionSettings.autoplay}
                      onChange={(e) => setSessionSettings(prev => ({ ...prev, autoplay: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Shuffle */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Shuffle</label>
                    <p className="text-xs text-gray-500">Randomize video order</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sessionSettings.shuffle}
                      onChange={(e) => setSessionSettings(prev => ({ ...prev, shuffle: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Loop */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Loop Playlist</label>
                    <p className="text-xs text-gray-500">Repeat when finished</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sessionSettings.loop}
                      onChange={(e) => setSessionSettings(prev => ({ ...prev, loop: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Fullscreen */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Fullscreen Mode</label>
                    <p className="text-xs text-gray-500">Hide distractions</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sessionSettings.fullscreen}
                      onChange={(e) => setSessionSettings(prev => ({ ...prev, fullscreen: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              {/* Volume */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Volume</label>
                  <span className="text-sm text-gray-500">{Math.round(sessionSettings.volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={sessionSettings.volume}
                  onChange={(e) => setSessionSettings(prev => ({ ...prev, volume: parseFloat(e.target.value) }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
            </div>
          )}

          {/* Video Preview */}
          {!isLoading && !error && videos.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-lg font-semibold text-gray-900">Video Preview</h4>
              <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                <div className="space-y-2">
                  {videos.slice(0, 5).map((video, index) => (
                    <div key={video.videoId} className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-blue-600">{index + 1}</span>
                      </div>
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-16 h-12 object-cover rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{video.title}</p>
                        <p className="text-xs text-gray-500">{video.duration}</p>
                      </div>
                    </div>
                  ))}
                  {videos.length > 5 && (
                    <div className="text-center text-sm text-gray-500 pt-2">
                      And {videos.length - 5} more videos...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handleLaunchSession}
            disabled={isLoading || !!error || videos.length === 0}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Loading...' : 'Start Session'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionLauncher;