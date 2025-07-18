'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getPlaylist, getVideo } from '@/lib/firestore';
import { Playlist, Video, SessionSettings } from '@/types';
import { SessionTracker } from '@/lib/analytics';
import { useAuth } from '@/contexts/AuthContext';
import { useVideoPlayer } from '@/contexts/VideoPlayerContext';
import EnhancedVideoPlayer from '@/components/video/EnhancedVideoPlayer';

const SessionPlayerPage: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { state, playVideo, dispatch } = useVideoPlayer();
  
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionTracker, setSessionTracker] = useState<SessionTracker | null>(null);
  
  // Session settings from URL params
  const [settings] = useState({
    playlistId: searchParams.get('playlistId') || '',
    autoplay: searchParams.get('autoplay') !== 'false',
    shuffle: searchParams.get('shuffle') === 'true',
    loop: searchParams.get('loop') === 'true',
    fullscreen: searchParams.get('fullscreen') !== 'false',
    volume: parseFloat(searchParams.get('volume') || '0.8'),
  });

  // Create session settings object for analytics
  const sessionSettings: SessionSettings = {
    autoplay: settings.autoplay,
    fullscreen: settings.fullscreen,
    volume: settings.volume,
  };

  useEffect(() => {
    if (settings.playlistId) {
      loadPlaylistData();
    } else {
      setError('No playlist specified');
      setIsLoading(false);
    }

    // Cleanup on unmount
    return () => {
      if (sessionTracker) {
        sessionTracker.endSession('manual').catch(console.error);
      }
    };
  }, [settings.playlistId]);

  // Apply initial settings to video player
  useEffect(() => {
    if (!isLoading && videos.length > 0) {
      dispatch({ type: 'SET_VOLUME', payload: settings.volume });
      dispatch({ type: 'SET_AUTOPLAY', payload: settings.autoplay });
      dispatch({ type: 'SET_LOOP', payload: settings.loop });
      dispatch({ type: 'SET_SHUFFLE', payload: settings.shuffle });

      // Auto-enter fullscreen if enabled
      if (settings.fullscreen) {
        setTimeout(() => {
          dispatch({ type: 'SET_FULLSCREEN', payload: true });
        }, 1000);
      }
    }
  }, [isLoading, videos.length, settings, dispatch]);

  const loadPlaylistData = async () => {
    setIsLoading(true);
    try {
      const playlistData = await getPlaylist(settings.playlistId);
      if (!playlistData) {
        setError('Playlist not found');
        return;
      }

      setPlaylist(playlistData);

      // Load all videos
      const videoData: Video[] = [];
      for (const videoId of playlistData.videoRefs) {
        try {
          const video = await getVideo(videoId);
          if (video) {
            videoData.push(video);
          }
        } catch (videoError) {
          console.error(`Error loading video ${videoId}:`, videoError);
        }
      }

      if (videoData.length === 0) {
        setError('No videos found in playlist');
        return;
      }

      // Shuffle if enabled
      let orderedVideos = [...videoData];
      if (settings.shuffle) {
        orderedVideos = shuffleArray(orderedVideos);
      }

      setVideos(orderedVideos);
      setCurrentVideoIndex(0);

      // Initialize the first video in the player
      if (orderedVideos.length > 0) {
        playVideo(orderedVideos[0], playlistData, orderedVideos, 0);
      }

      // Initialize session tracking
      if (user && user.uid) {
        const tracker = new SessionTracker(
          user.uid,
          settings.playlistId,
          sessionSettings
        );
        setSessionTracker(tracker);
        console.log('Session tracking initialized');
      }
    } catch (err) {
      console.error('Error loading playlist:', err);
      setError('Failed to load playlist');
    } finally {
      setIsLoading(false);
    }
  };

  const shuffleArray = (array: Video[]): Video[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const handleVideoChange = (newIndex: number) => {
    if (newIndex >= 0 && newIndex < videos.length) {
      setCurrentVideoIndex(newIndex);
      
      // End current video tracking
      if (sessionTracker) {
        sessionTracker.endVideo();
      }
      
      // Update video player
      playVideo(videos[newIndex], playlist || undefined, videos, newIndex);
      
      // Start tracking new video
      if (sessionTracker) {
        sessionTracker.startVideo(videos[newIndex].videoId);
      }
    }
  };

  const handlePlaylistEnd = () => {
    if (settings.loop) {
      handleVideoChange(0);
    } else {
      handleExitSession('completed');
    }
  };

  const handleExitSession = async (exitReason: 'completed' | 'manual' | 'error' = 'manual') => {
    // End session tracking
    if (sessionTracker) {
      try {
        await sessionTracker.endSession(exitReason);
        console.log('Session analytics saved');
      } catch (error) {
        console.error('Error saving session analytics:', error);
      }
    }

    // Exit fullscreen if active
    if (state.isFullscreen) {
      dispatch({ type: 'SET_FULLSCREEN', payload: false });
    }

    // Navigate back to playlists
    router.push('/playlists');
  };

  const handlePlayerReady = () => {
    // Start tracking the first video
    if (sessionTracker && videos[currentVideoIndex]) {
      sessionTracker.startVideo(videos[currentVideoIndex].videoId);
    }
  };

  const handlePlayerError = (error: any) => {
    console.error('Video player error:', error);
    
    // Track the error and skip
    if (sessionTracker) {
      sessionTracker.recordSkip();
    }
    
    // Try next video
    if (currentVideoIndex < videos.length - 1) {
      handleVideoChange(currentVideoIndex + 1);
    } else {
      handleExitSession('error');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Loading session...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white max-w-md">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Session Error</h1>
          <p className="text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => handleExitSession('manual')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Return to Playlists
          </button>
        </div>
      </div>
    );
  }

  // No video available
  if (!videos[currentVideoIndex]) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-lg">No video available</p>
          <button
            onClick={() => handleExitSession('manual')}
            className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Return to Playlists
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Enhanced Video Player */}
      <EnhancedVideoPlayer
        videoId={videos[currentVideoIndex].videoId}
        playlist={playlist || undefined}
        videos={videos}
        currentIndex={currentVideoIndex}
        onVideoChange={handleVideoChange}
        onPlaylistEnd={handlePlaylistEnd}
        autoplay={settings.autoplay}
        onReady={handlePlayerReady}
        onError={handlePlayerError}
        className="w-full h-screen"
      />

      {/* Exit Session Button (always visible) */}
      <button
        onClick={() => handleExitSession('manual')}
        className="fixed top-4 right-4 z-50 p-3 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full transition-all duration-200"
        aria-label="Exit session"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Session Info (overlay) */}
      {playlist && (
        <div className="fixed top-4 left-4 z-40 bg-black bg-opacity-50 text-white rounded-lg p-3 max-w-xs">
          <h3 className="font-semibold text-sm truncate">{playlist.title}</h3>
          <p className="text-xs text-gray-300 mt-1">
            {currentVideoIndex + 1} of {videos.length} videos
          </p>
          {settings.shuffle && (
            <span className="inline-block mt-2 px-2 py-1 bg-blue-600 text-xs rounded">
              SHUFFLE
            </span>
          )}
          {settings.loop && (
            <span className="inline-block mt-2 ml-2 px-2 py-1 bg-green-600 text-xs rounded">
              LOOP
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default SessionPlayerPage;