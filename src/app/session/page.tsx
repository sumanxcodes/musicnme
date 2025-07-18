'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import YouTube, { YouTubeProps } from 'react-youtube';
import { getPlaylist, getVideo } from '@/lib/firestore';
import { Playlist, Video } from '@/types';

const SessionPlayerPage: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const playerRef = useRef<any>(null);
  
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Session settings from URL params
  const [settings] = useState({
    playlistId: searchParams.get('playlistId') || '',
    autoplay: searchParams.get('autoplay') !== 'false', // Default to true unless explicitly disabled
    shuffle: searchParams.get('shuffle') === 'true',
    loop: searchParams.get('loop') === 'true',
    fullscreen: searchParams.get('fullscreen') !== 'false', // Default to true unless explicitly disabled
    volume: parseFloat(searchParams.get('volume') || '0.8'),
  });

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (settings.playlistId) {
      loadPlaylistData();
    } else {
      setError('No playlist specified');
      setIsLoading(false);
    }
  }, [settings.playlistId]);

  // Auto-enter fullscreen if enabled
  useEffect(() => {
    if (settings.fullscreen && !isLoading && !error && videos.length > 0) {
      const timer = setTimeout(() => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(console.error);
        }
      }, 1000); // Delay to allow page to load

      return () => clearTimeout(timer);
    }
  }, [settings.fullscreen, isLoading, error, videos.length]);

  useEffect(() => {
    // Auto-hide controls after 3 seconds of inactivity
    const resetControlsTimeout = () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      setShowControls(true);
      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }, 3000);
    };

    const handleMouseMove = () => resetControlsTimeout();
    const handleKeyPress = (e: KeyboardEvent) => {
      resetControlsTimeout();
      handleKeyboardControls(e);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keydown', handleKeyPress);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleKeyPress);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying]);

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

  const handleKeyboardControls = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'Space':
        e.preventDefault();
        togglePlayPause();
        break;
      case 'ArrowRight':
        e.preventDefault();
        nextVideo();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        previousVideo();
        break;
      case 'Escape':
        e.preventDefault();
        handleExitSession();
        break;
      case 'KeyF':
        e.preventDefault();
        toggleFullscreen();
        break;
    }
  };

  const togglePlayPause = () => {
    if (playerRef.current) {
      const playerState = playerRef.current.getPlayerState();
      if (playerState === 1) { // Playing
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    }
  };

  const nextVideo = () => {
    if (videos.length === 0) return;
    
    let nextIndex = currentVideoIndex + 1;
    if (nextIndex >= videos.length) {
      if (settings.loop) {
        nextIndex = 0;
      } else {
        // End of playlist
        handleExitSession();
        return;
      }
    }
    setCurrentVideoIndex(nextIndex);
    
    // Auto-start next video if autoplay is enabled
    if (settings.autoplay && playerRef.current) {
      setTimeout(() => {
        playerRef.current?.playVideo();
      }, 1000); // Wait for video to load
    }
  };

  const previousVideo = () => {
    if (videos.length === 0) return;
    
    let prevIndex = currentVideoIndex - 1;
    if (prevIndex < 0) {
      if (settings.loop) {
        prevIndex = videos.length - 1;
      } else {
        prevIndex = 0;
      }
    }
    setCurrentVideoIndex(prevIndex);
    
    // Auto-start previous video if autoplay is enabled
    if (settings.autoplay && playerRef.current) {
      setTimeout(() => {
        playerRef.current?.playVideo();
      }, 1000); // Wait for video to load
    }
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  };

  const handleExitSession = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    router.push('/playlists');
  };

  const onPlayerReady: YouTubeProps['onReady'] = (event) => {
    playerRef.current = event.target;
    event.target.setVolume(settings.volume * 100);
    
    // Auto-start playback with a slight delay to ensure player is ready
    if (settings.autoplay) {
      setTimeout(() => {
        event.target.playVideo();
      }, 500);
    }
  };

  const onPlayerStateChange: YouTubeProps['onStateChange'] = (event) => {
    const playerState = event.data;
    setIsPlaying(playerState === 1); // 1 = playing
    
    if (playerState === 0) { // ended
      // Auto-advance to next video with seamless transition
      setTimeout(() => {
        nextVideo();
      }, 300); // Small delay for smooth transition
    }
  };

  const onPlayerError: YouTubeProps['onError'] = (event) => {
    console.error('YouTube player error:', event.data);
    nextVideo(); // Skip to next video on error
  };

  const currentVideo = videos[currentVideoIndex];

  const youtubeOpts: YouTubeProps['opts'] = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: settings.autoplay ? 1 : 0,
      controls: 0, // Hide YouTube controls, we'll use custom ones
      disablekb: 1, // Disable keyboard controls (we handle them)
      fs: 0, // Disable fullscreen button
      modestbranding: 1,
      rel: 0,
      showinfo: 0,
      iv_load_policy: 3,
    },
  };

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
            onClick={handleExitSession}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Return to Playlists
          </button>
        </div>
      </div>
    );
  }

  if (!currentVideo) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-lg">No video available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* YouTube Player */}
      <div className="absolute inset-0">
        <YouTube
          videoId={currentVideo.videoId}
          opts={youtubeOpts}
          onReady={onPlayerReady}
          onStateChange={onPlayerStateChange}
          onError={onPlayerError}
          className="w-full h-full"
        />
      </div>

      {/* Custom Controls Overlay */}
      <div 
        className={`absolute inset-0 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-6">
          <div className="flex items-center justify-between text-white">
            <div className="flex-1">
              <h1 className="text-xl font-semibold truncate">{playlist?.title}</h1>
              <p className="text-sm text-gray-300 truncate">{currentVideo.title}</p>
            </div>
            <button
              onClick={handleExitSession}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Exit session"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Center Controls */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center space-x-8">
            <button
              onClick={previousVideo}
              className="p-4 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
              aria-label="Previous video"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              onClick={togglePlayPause}
              className="p-6 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
                </svg>
              ) : (
                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>

            <button
              onClick={nextVideo}
              className="p-4 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
              aria-label="Next video"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-4">
              <span className="text-sm">
                {currentVideoIndex + 1} of {videos.length}
              </span>
              <div className="flex items-center space-x-2">
                {settings.shuffle && (
                  <span className="px-2 py-1 bg-blue-600 rounded text-xs">SHUFFLE</span>
                )}
                {settings.loop && (
                  <span className="px-2 py-1 bg-green-600 rounded text-xs">LOOP</span>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleFullscreen}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Toggle fullscreen"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts Hint */}
        <div className="absolute bottom-20 right-6 text-white text-xs opacity-60">
          <div className="bg-black/50 rounded-lg p-3 space-y-1">
            <div>Space: Play/Pause</div>
            <div>← →: Previous/Next</div>
            <div>F: Fullscreen</div>
            <div>Esc: Exit Session</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionPlayerPage;