'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getPlaylist, getVideo } from '@/lib/firestore';
import { Playlist, Video, SessionSettings } from '@/types';
import { SessionTracker } from '@/lib/analytics';
import { useAuth } from '@/contexts/AuthContext';
import { useVideoPlayer } from '@/contexts/VideoPlayerContext';
import VideoPlayer from '@/components/video/VideoPlayer';
import VideoPlayerErrorBoundary from '@/components/video/VideoPlayerErrorBoundary';
import PlaylistSidebar from '@/components/video/PlaylistSidebar';

const SessionPlayerPage: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { state, playVideo, dispatch, startSession, endSession } = useVideoPlayer();
  
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionTracker, setSessionTracker] = useState<SessionTracker | null>(null);
  const [skippedVideos, setSkippedVideos] = useState<string[]>([]);
  const [showSkipNotification, setShowSkipNotification] = useState(false);
  const [skipMessage, setSkipMessage] = useState('');
  const [showControls, setShowControls] = useState(true);
  const [showPlaylistSidebar, setShowPlaylistSidebar] = useState(true);
  
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

  // Validate video data before use
  const validateVideo = (video: Video): boolean => {
    if (!video) {
      console.error('❌ Video is null or undefined');
      return false;
    }
    
    if (!video.videoId || typeof video.videoId !== 'string' || video.videoId.length !== 11) {
      console.error('❌ Invalid video ID:', video.videoId);
      return false;
    }
    
    if (!video.title || typeof video.title !== 'string') {
      console.error('❌ Invalid video title:', video.title);
      return false;
    }

    // Check for characters that might indicate an invalid video ID
    if (!/^[a-zA-Z0-9_-]{11}$/.test(video.videoId)) {
      console.error('❌ Video ID contains invalid characters:', video.videoId);
      return false;
    }
    
    return true;
  };

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

  // Auto-hide controls functionality (Netflix/YouTube pattern)
  useEffect(() => {
    // Only run if we have videos loaded
    if (isLoading || error || !videos.length) return;

    let timeoutId: NodeJS.Timeout;
    
    const hideControls = () => {
      timeoutId = setTimeout(() => {
        setShowControls(false);
      }, 4000); // 4 seconds like Netflix
    };

    const showControlsAndReset = () => {
      setShowControls(true);
      clearTimeout(timeoutId);
      hideControls();
    };

    // Show controls on mouse movement
    const handleMouseMove = () => {
      showControlsAndReset();
    };

    // Show controls on key press and handle accessibility shortcuts
    const handleKeyPress = (e: KeyboardEvent) => {
      showControlsAndReset();
      
      // Additional accessibility shortcuts
      if (e.key === 'Escape') {
        // We'll call router.push directly to avoid the dependency issue
        router.push('/playlists');
      }
    };

    // Initial timer
    hideControls();

    // Add event listeners for desktop and mobile
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keydown', handleKeyPress);
    document.addEventListener('click', showControlsAndReset);
    document.addEventListener('touchstart', showControlsAndReset);
    document.addEventListener('touchmove', showControlsAndReset);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleKeyPress);
      document.removeEventListener('click', showControlsAndReset);
      document.removeEventListener('touchstart', showControlsAndReset);
      document.removeEventListener('touchmove', showControlsAndReset);
    };
  }, [isLoading, error, videos.length]);

  const loadPlaylistData = async () => {
    setIsLoading(true);
    try {
      const playlistData = await getPlaylist(settings.playlistId);
      if (!playlistData) {
        setError('Playlist not found');
        return;
      }

      setPlaylist(playlistData);

      // Load all videos with better error handling
      const videoData: Video[] = [];
      const failedVideos: string[] = [];
      
      for (const videoId of playlistData.videoRefs) {
        try {
          const video = await getVideo(videoId);
          if (video && video.videoId && video.title) {
            // Validate video has required fields
            videoData.push(video);
            console.log(`✓ Loaded video: ${video.title} (${video.videoId})`);
          } else {
            console.warn(`⚠ Video ${videoId} is missing required data, skipping`);
            failedVideos.push(videoId);
          }
        } catch (videoError) {
          console.error(`✗ Error loading video ${videoId}:`, videoError);
          failedVideos.push(videoId);
        }
      }

      // Log summary of loaded vs failed videos
      console.log(`Session loading summary: ${videoData.length} videos loaded, ${failedVideos.length} failed`);
      if (failedVideos.length > 0) {
        console.warn('Failed video IDs:', failedVideos);
      }

      if (videoData.length === 0) {
        setError('No videos could be loaded from this playlist. Please check that the videos still exist and are accessible.');
        return;
      }

      // Show warning if some videos failed to load
      if (failedVideos.length > 0) {
        console.warn(`⚠ Session will start with ${videoData.length} videos. ${failedVideos.length} videos could not be loaded and will be skipped.`);
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
        const firstVideo = orderedVideos[0];
        if (validateVideo(firstVideo)) {
          console.log(`▶ Initializing first video: ${firstVideo.title} (${firstVideo.videoId})`);
          playVideo(firstVideo, playlistData, orderedVideos, 0);
        } else {
          console.error('❌ First video failed validation, trying next video');
          // Try to find a valid video
          const validVideoIndex = orderedVideos.findIndex(video => validateVideo(video));
          if (validVideoIndex !== -1) {
            setCurrentVideoIndex(validVideoIndex);
            playVideo(orderedVideos[validVideoIndex], playlistData, orderedVideos, validVideoIndex);
          } else {
            setError('No valid videos found in playlist');
            return;
          }
        }
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

      // Start session in video player context
      startSession(settings.playlistId);
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
      const newVideo = videos[newIndex];
      
      // Validate video before changing
      if (!validateVideo(newVideo)) {
        console.error(`❌ Video at index ${newIndex} failed validation, skipping`);
        
        // Try to find next valid video
        for (let i = newIndex + 1; i < videos.length; i++) {
          if (validateVideo(videos[i])) {
            console.log(`⏭ Found valid video at index ${i}, skipping to it`);
            handleVideoChange(i);
            return;
          }
        }
        
        // No valid videos found, end session
        console.error('❌ No more valid videos found, ending session');
        handleExitSession('error');
        return;
      }
      
      setCurrentVideoIndex(newIndex);
      
      // End current video tracking
      if (sessionTracker) {
        sessionTracker.endVideo();
      }
      
      console.log(`▶ Changing to video: ${newVideo.title} (${newVideo.videoId})`);
      
      // Update video player
      playVideo(newVideo, playlist || undefined, videos, newIndex);
      
      // Start tracking new video
      if (sessionTracker) {
        sessionTracker.startVideo(newVideo.videoId);
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

    // End session in video player context
    endSession();

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
    const currentVideo = videos[currentVideoIndex];
    console.error(`⚠ Video player error for "${currentVideo?.title}" (${currentVideo?.videoId}):`, error);
    
    // Add to skipped videos list
    if (currentVideo?.videoId && !skippedVideos.includes(currentVideo.videoId)) {
      setSkippedVideos(prev => [...prev, currentVideo.videoId]);
    }
    
    // Map YouTube error codes to user-friendly messages
    const errorMessages: Record<number, string> = {
      2: 'Invalid video ID',
      5: 'Video cannot be played in embedded players',
      100: 'Video not found or private',
      101: 'Video is not available in your region',
      150: 'Video is not available in your region',
    };
    
    const errorMessage = errorMessages[error] || `Video unavailable (Error: ${error})`;
    console.warn(`⚠ ${errorMessage} - Skipping to next video`);
    
    // Show skip notification
    setSkipMessage(`${errorMessage} - Skipping to next video...`);
    setShowSkipNotification(true);
    
    // Track the error and skip
    if (sessionTracker) {
      sessionTracker.recordSkip();
    }
    
    // Find next available video
    let nextValidIndex = -1;
    for (let i = currentVideoIndex + 1; i < videos.length; i++) {
      if (validateVideo(videos[i]) && !skippedVideos.includes(videos[i].videoId)) {
        nextValidIndex = i;
        break;
      }
    }
    
    // If no more valid videos, try from the beginning (for loop mode)
    if (nextValidIndex === -1 && settings.loop) {
      for (let i = 0; i < currentVideoIndex; i++) {
        if (validateVideo(videos[i]) && !skippedVideos.includes(videos[i].videoId)) {
          nextValidIndex = i;
          break;
        }
      }
    }
    
    // Skip to next video or end session
    setTimeout(() => {
      setShowSkipNotification(false);
      if (nextValidIndex !== -1) {
        console.log(`⏭ Auto-skipping to next valid video (${nextValidIndex + 1}/${videos.length})`);
        handleVideoChange(nextValidIndex);
      } else {
        console.warn('⚠ No more playable videos available');
        setError(`All videos in this playlist are currently unavailable. This may be due to regional restrictions or the videos being private/deleted.`);
      }
    }, 2000); // Longer delay to show error briefly
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

  // No video available or current video is invalid
  if (!videos[currentVideoIndex] || !validateVideo(videos[currentVideoIndex])) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">Video Not Available</h2>
          <p className="text-gray-300 mb-4">
            The current video cannot be played. This might be due to:
          </p>
          <ul className="text-sm text-gray-400 mb-6 text-left max-w-md mx-auto">
            <li>• Video is private or deleted</li>
            <li>• Video is not available in your region</li>
            <li>• Video cannot be embedded</li>
            <li>• Network connectivity issues</li>
          </ul>
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

  return (
    <div className="min-h-screen bg-black">
      {/* Main Layout - Side by Side */}
      <div className={`flex h-screen transition-all duration-300 ${
        state.isFullscreen ? 'fullscreen-layout' : ''
      }`}>
        
        {/* Video Player Section */}
        <div className={`relative transition-all duration-300 ${
          state.isFullscreen 
            ? 'w-full' 
            : showPlaylistSidebar 
              ? 'w-full lg:w-[70%]' 
              : 'w-full'
        }`}>
          <VideoPlayerErrorBoundary
            onError={(error, errorInfo) => {
              console.error('Video Player crashed:', error, errorInfo);
              setError('Video player encountered an error. Please try again.');
            }}
          >
            <VideoPlayer
              videoId={videos[currentVideoIndex].videoId}
              playlist={playlist || undefined}
              videos={videos}
              currentIndex={currentVideoIndex}
              onVideoChange={handleVideoChange}
              onPlaylistEnd={handlePlaylistEnd}
              autoplay={settings.autoplay}
              onReady={handlePlayerReady}
              onError={handlePlayerError}
              className="w-full h-full"
            />
          </VideoPlayerErrorBoundary>
        </div>

        {/* Playlist Sidebar - YouTube Style */}
        {showPlaylistSidebar && !state.isFullscreen && (
          <PlaylistSidebar
            playlist={playlist || undefined}
            videos={videos}
            currentIndex={currentVideoIndex}
            onVideoSelect={handleVideoChange}
            onToggle={() => setShowPlaylistSidebar(false)}
            className="w-full lg:w-[30%] h-full hidden lg:flex"
          />
        )}
      </div>

      {/* Mobile Playlist Toggle Button */}
      {!state.isFullscreen && (
        <button
          onClick={() => setShowPlaylistSidebar(!showPlaylistSidebar)}
          className={`fixed bottom-4 right-4 z-50 lg:hidden w-14 h-14 bg-black/70 backdrop-blur-sm hover:bg-black/90 text-white rounded-full transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-lg ${
            showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
          }`}
          aria-label="Toggle playlist"
        >
          <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* Exit Session Button */}
      <button
        onClick={() => handleExitSession('manual')}
        className={`fixed top-4 right-4 z-50 w-12 h-12 bg-black/70 backdrop-blur-sm hover:bg-black/90 active:bg-black text-white rounded-full transition-all duration-300 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-lg ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
        aria-label="Exit session (Press Escape)"
        title="Exit session"
      >
        <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Skip Notification */}
      {showSkipNotification && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-red-600 text-white rounded-lg p-4 max-w-md text-center shadow-lg">
          <div className="flex items-center justify-center mb-2">
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="font-semibold">Video Unavailable</span>
          </div>
          <p className="text-sm">{skipMessage}</p>
        </div>
      )}

      {/* Mobile Playlist Overlay */}
      {showPlaylistSidebar && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowPlaylistSidebar(false)} />
          <div className="absolute bottom-0 left-0 right-0 h-3/4 bg-black border-t border-white/10">
            <PlaylistSidebar
              playlist={playlist || undefined}
              videos={videos}
              currentIndex={currentVideoIndex}
              onVideoSelect={(index) => {
                handleVideoChange(index);
                setShowPlaylistSidebar(false);
              }}
              onToggle={() => setShowPlaylistSidebar(false)}
              className="w-full h-full"
            />
          </div>
        </div>
      )}

      {/* Session Info Overlay - Minimized when sidebar is visible */}
      {playlist && (!showPlaylistSidebar || state.isFullscreen) && (
        <div 
          className={`fixed top-4 left-4 z-40 bg-black/70 backdrop-blur-md text-white rounded-xl p-4 max-w-sm shadow-2xl transition-all duration-500 ease-in-out ${
            showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
          }`}
        >
          <div className="space-y-3">
            {/* Playlist Title */}
            <h3 className="font-semibold text-lg leading-tight truncate text-white">
              {playlist.title}
            </h3>
            
            {/* Video Progress */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-200">
                Video {currentVideoIndex + 1} of {videos.length}
              </p>
              {skippedVideos.length > 0 && (
                <span className="text-xs px-2 py-1 bg-yellow-600/80 text-yellow-100 rounded-full">
                  {skippedVideos.length} skipped
                </span>
              )}
            </div>
            
            {/* Session Mode Indicators */}
            {(settings.shuffle || settings.loop) && (
              <div className="flex items-center space-x-2">
                {settings.shuffle && (
                  <span className="inline-flex items-center px-2 py-1 bg-blue-600/80 text-blue-100 text-xs rounded-full font-medium">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4l5 7 4-7m6 0v5l-2-2m2 2l2-2m-2 2v5" />
                    </svg>
                    SHUFFLE
                  </span>
                )}
                {settings.loop && (
                  <span className="inline-flex items-center px-2 py-1 bg-green-600/80 text-green-100 text-xs rounded-full font-medium">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4l16 0 0 16-16 0z" />
                    </svg>
                    LOOP
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionPlayerPage;