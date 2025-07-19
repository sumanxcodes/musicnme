'use client';

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';
import { useVideoPlayer } from '@/contexts/VideoPlayerContext';
import { Video, Playlist } from '@/types';
import PlayerControls from './PlayerControls';
import ProgressBar from './ProgressBar';

interface VideoPlayerProps {
  videoId: string;
  playlist?: Playlist;
  videos?: Video[];
  currentIndex?: number;
  onVideoChange?: (index: number) => void;
  onPlaylistEnd?: () => void;
  className?: string;
  autoplay?: boolean;
  controls?: boolean;
  onReady?: () => void;
  onError?: (error: any) => void;
}

const VideoPlayer = memo<VideoPlayerProps>(({
  videoId,
  playlist,
  videos = [],
  currentIndex = 0,
  onVideoChange,
  onPlaylistEnd,
  className = '',
  autoplay = false,
  controls = true,
  onReady,
  onError,
}) => {
  const { 
    state, 
    dispatch, 
    togglePlayPause, 
    seekTo, 
    skipForward, 
    skipBackward, 
    nextVideo, 
    previousVideo,
    setVolume,
    toggleMute,
    setPlaybackSpeed,
    toggleFullscreen,
    playerRef 
  } = useVideoPlayer();

  const [showControls, setShowControls] = useState(true);
  const [isHoveringControls, setIsHoveringControls] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);


  // Update video player context when props change
  useEffect(() => {
    if (videoId && videos.length > 0) {
      const video = videos.find(v => v.videoId === videoId) || videos[currentIndex];
      if (video) {
        dispatch({
          type: 'SET_CURRENT_VIDEO',
          payload: { video, playlist, videos, index: currentIndex }
        });
      }
    }
  }, [videoId, videos, currentIndex, playlist, dispatch]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (e.key) {
      case ' ':
        e.preventDefault();
        togglePlayPause();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        skipBackward(e.shiftKey ? 20 : 10);
        break;
      case 'ArrowRight':
        e.preventDefault();
        skipForward(e.shiftKey ? 20 : 10);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setVolume(Math.min(1, state.volume + 0.1));
        break;
      case 'ArrowDown':
        e.preventDefault();
        setVolume(Math.max(0, state.volume - 0.1));
        break;
      case 'm':
      case 'M':
        e.preventDefault();
        toggleMute();
        break;
      case 'f':
      case 'F':
        e.preventDefault();
        handleToggleFullscreen();
        break;
      case 'Escape':
        e.preventDefault();
        if (state.isFullscreen) {
          handleToggleFullscreen();
        }
        break;
      default:
        if (e.key >= '0' && e.key <= '9') {
          e.preventDefault();
          const percentage = parseInt(e.key) / 10;
          seekTo(state.duration * percentage);
        }
        break;
    }
  }, [
    togglePlayPause,
    skipForward,
    skipBackward,
    setVolume,
    toggleMute,
    seekTo,
    state.volume,
    state.duration,
    state.isFullscreen,
  ]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Auto-hide controls
  useEffect(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    if (!isHoveringControls && state.isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        if (state.isPlaying && !isHoveringControls) {
          setShowControls(false);
        }
      }, 3000);
    } else if (!state.isPlaying && !showControls) {
      setShowControls(true);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [state.isPlaying, isHoveringControls, showControls]);

  // Update time and duration
  useEffect(() => {
    if (!playerRef.current || !state.isPlaying) return;

    const updateTime = () => {
      if (playerRef.current) {
        try {
          const currentTime = playerRef.current.getCurrentTime();
          const duration = playerRef.current.getDuration();
          
          if (currentTime >= 0 && duration > 0) {
            dispatch({ type: 'SET_CURRENT_TIME', payload: currentTime });
            dispatch({ type: 'SET_DURATION', payload: duration });
          }
        } catch (error) {
          console.warn('Error updating time:', error);
        }
      }
    };

    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [state.isPlaying, dispatch]);

  // Handle fullscreen toggle - Industry standard approach (YouTube/Netflix pattern)
  const handleToggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    try {
      // Check actual DOM state instead of React state for reliability
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      
      if (!isCurrentlyFullscreen) {
        // Enter fullscreen
        containerRef.current.requestFullscreen?.();
      } else {
        // Exit fullscreen - only if document is actually in fullscreen
        if (document.fullscreenElement) {
          document.exitFullscreen?.();
        }
      }
    } catch (error) {
      console.warn('Fullscreen operation failed:', error);
      // Fallback: just update the state if API fails
      dispatch({ type: 'SET_FULLSCREEN', payload: !state.isFullscreen });
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreen = !!document.fullscreenElement;
      dispatch({ type: 'SET_FULLSCREEN', payload: isFullscreen });
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [dispatch]);


  // Handle video navigation
  const handlePreviousVideo = useCallback(() => {
    if (onVideoChange && currentIndex > 0) {
      onVideoChange(currentIndex - 1);
    } else {
      previousVideo();
    }
  }, [onVideoChange, currentIndex, previousVideo]);

  const handleNextVideo = useCallback(() => {
    if (onVideoChange && currentIndex < videos.length - 1) {
      onVideoChange(currentIndex + 1);
    } else {
      nextVideo();
    }
  }, [onVideoChange, currentIndex, videos.length, nextVideo]);

  // YouTube player event handlers
  const onPlayerReady: YouTubeProps['onReady'] = (event) => {
    playerRef.current = event.target;
    
    try {
      event.target.setVolume(state.volume * 100);
      if (state.playbackSpeed !== 1) {
        event.target.setPlaybackRate(state.playbackSpeed);
      }
      
      if (autoplay || state.isPlaying) {
        event.target.playVideo();
      }
    } catch (error) {
      console.warn('Error setting up player:', error);
    }
    
    if (onReady) {
      onReady();
    }
  };

  const onPlayerStateChange: YouTubeProps['onStateChange'] = (event) => {
    const playerState = event.data;
    
    // Update playing state
    const isPlaying = playerState === 1;
    dispatch({ type: 'SET_PLAYING', payload: isPlaying });
    
    // Handle video end
    if (playerState === 0) {
      if (onVideoChange && currentIndex < videos.length - 1) {
        onVideoChange(currentIndex + 1);
      } else if (onPlaylistEnd) {
        onPlaylistEnd();
      } else {
        nextVideo();
      }
    }
  };

  const onPlayerError: YouTubeProps['onError'] = (event) => {
    console.warn('YouTube player error:', event.data);
    
    if (onError) {
      onError(event.data);
    }
    
    // Try to skip to next video
    if (onVideoChange && currentIndex < videos.length - 1) {
      onVideoChange(currentIndex + 1);
    } else {
      nextVideo();
    }
  };

  const youtubeOpts: YouTubeProps['opts'] = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: autoplay ? 1 : 0,
      controls: 0,
      disablekb: 1,
      fs: 0,
      modestbranding: 1,
      rel: 0,
      showinfo: 0,
      iv_load_policy: 3,
      playsinline: 1,
      enablejsapi: 1,
      origin: typeof window !== 'undefined' ? window.location.origin : '',
      html5: 1,
      color: 'red',
      theme: 'dark',
    },
  };

  return (
    <div
      ref={containerRef}
      className={`relative bg-black ${className}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* YouTube Player */}
      <div className="relative w-full h-full">
        <YouTube
          videoId={videoId}
          opts={youtubeOpts}
          onReady={onPlayerReady}
          onStateChange={onPlayerStateChange}
          onError={onPlayerError}
          className="w-full h-full"
        />
      </div>


      {/* Custom Controls Overlay - Enhanced with modern backdrop effects */}
      {controls && (
        <div
          className={`absolute inset-0 transition-all duration-500 ease-in-out ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onMouseEnter={() => setIsHoveringControls(true)}
          onMouseLeave={() => setIsHoveringControls(false)}
        >
          {/* Enhanced gradient overlays with better contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 backdrop-blur-[1px]" />
          {/* Top Bar with enhanced backdrop */}
          <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/60 to-transparent backdrop-blur-sm">
            <div className="flex items-center justify-between text-white">
              <div className="flex-1 min-w-0">
                {playlist && (
                  <h2 className="text-xl font-bold truncate mb-2 drop-shadow-lg">{playlist.title}</h2>
                )}
                {state.currentVideo && (
                  <p className="text-base text-gray-100 truncate drop-shadow-md">{state.currentVideo.title}</p>
                )}
              </div>
              <div className="flex items-center space-x-3 ml-6">
                {videos.length > 1 && (
                  <span className="text-sm text-gray-200 font-medium bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm">
                    {currentIndex + 1} / {videos.length}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Center Play/Pause Button - Enhanced design */}
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={togglePlayPause}
              className="p-6 bg-black/60 hover:bg-black/80 rounded-full text-white transition-all duration-300 hover:scale-110 backdrop-blur-sm shadow-2xl border border-white/20"
              aria-label={state.isPlaying ? 'Pause' : 'Play'}
            >
              {state.isPlaying ? (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
                </svg>
              ) : (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>
          </div>

          {/* Bottom Controls - Enhanced with backdrop effects */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent backdrop-blur-sm">
            <div className="space-y-4">
              <ProgressBar
                currentTime={state.currentTime}
                duration={state.duration}
                onSeek={seekTo}
                buffered={state.buffered}
              />

              <div className="flex items-center justify-between">
              <PlayerControls
                isPlaying={state.isPlaying}
                volume={state.volume}
                isMuted={state.isMuted}
                isFullscreen={state.isFullscreen}
                playbackSpeed={state.playbackSpeed}
                onPlayPause={togglePlayPause}
                onPreviousVideo={handlePreviousVideo}
                onNextVideo={handleNextVideo}
                onSkipBackward={skipBackward}
                onSkipForward={skipForward}
                onVolumeChange={setVolume}
                onToggleMute={toggleMute}
                onToggleFullscreen={handleToggleFullscreen}
                onTogglePictureInPicture={undefined}
                onSpeedChange={setPlaybackSpeed}
              />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer;