'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';
import { useVideoPlayer } from '@/contexts/VideoPlayerContext';
import { useCustomFullscreen } from '@/lib/fullscreen';
import { Video, Playlist } from '@/types';
import ProgressBar from './ProgressBar';
import PlayerControls from './PlayerControls';

interface EnhancedVideoPlayerProps {
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

const EnhancedVideoPlayer: React.FC<EnhancedVideoPlayerProps> = ({
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
    togglePictureInPicture,
    playerRef 
  } = useVideoPlayer();

  const { isFullscreen, toggleFullscreen: toggleCustomFullscreen } = useCustomFullscreen();
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
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
          if (e.shiftKey) {
            skipBackward(20);
          } else {
            skipBackward(10);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (e.shiftKey) {
            skipForward(20);
          } else {
            skipForward(10);
          }
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
        case 'p':
        case 'P':
          e.preventDefault();
          togglePictureInPicture();
          break;
        case 'Escape':
          e.preventDefault();
          if (state.isFullscreen) {
            handleToggleFullscreen();
          }
          break;
        default:
          // Number keys for seeking to percentage
          if (e.key >= '0' && e.key <= '9') {
            e.preventDefault();
            const percentage = parseInt(e.key) / 10;
            seekTo(state.duration * percentage);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    togglePlayPause,
    skipForward,
    skipBackward,
    setVolume,
    toggleMute,
    togglePictureInPicture,
    seekTo,
    state.volume,
    state.duration,
    state.isFullscreen,
  ]);

  // Auto-hide controls
  useEffect(() => {
    const resetControlsTimeout = () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      
      if (!isHoveringControls) {
        setShowControls(true);
        controlsTimeoutRef.current = setTimeout(() => {
          if (state.isPlaying && !isHoveringControls) {
            setShowControls(false);
          }
        }, 3000);
      }
    };

    resetControlsTimeout();

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [state.isPlaying, isHoveringControls]);

  // Handle mouse movement to show controls
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
  }, []);

  // YouTube player event handlers
  const onPlayerReady: YouTubeProps['onReady'] = (event) => {
    playerRef.current = event.target;
    event.target.setVolume(state.volume * 100);
    if (state.playbackSpeed !== 1) {
      event.target.setPlaybackRate(state.playbackSpeed);
    }
    
    // Sync with current time when returning from PiP or starting
    if (state.currentTime > 0) {
      event.target.seekTo(state.currentTime);
    }
    
    if (autoplay || state.isPlaying) {
      event.target.playVideo();
    }
    if (onReady) {
      onReady();
    }
  };

  const onPlayerStateChange: YouTubeProps['onStateChange'] = (event) => {
    const playerState = event.data;
    dispatch({ type: 'SET_PLAYING', payload: playerState === 1 });
    
    if (playerState === 0) { // ended
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
    console.error('YouTube player error:', event.data);
    if (onError) {
      onError(event.data);
    }
    if (onVideoChange && currentIndex < videos.length - 1) {
      onVideoChange(currentIndex + 1);
    } else {
      nextVideo();
    }
  };

  // Update time and duration
  useEffect(() => {
    if (!playerRef.current || !state.isPlaying) return;

    const updateTime = () => {
      if (playerRef.current) {
        const currentTime = playerRef.current.getCurrentTime();
        const duration = playerRef.current.getDuration();
        
        dispatch({ type: 'SET_CURRENT_TIME', payload: currentTime });
        if (duration !== state.duration) {
          dispatch({ type: 'SET_DURATION', payload: duration });
        }
      }
    };

    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [state.isPlaying, dispatch, state.duration]);

  // Handle fullscreen toggle
  const handleToggleFullscreen = useCallback(() => {
    if (containerRef.current) {
      toggleCustomFullscreen(containerRef.current, {
        hideUI: true,
        backgroundColor: '#000',
        zIndex: 9999,
      });
    }
    toggleFullscreen();
    
    // Force a re-render of the YouTube player after fullscreen change
    setTimeout(() => {
      if (playerRef.current) {
        // Trigger a resize event to make YouTube player adjust
        window.dispatchEvent(new Event('resize'));
      }
    }, 100);
  }, [toggleCustomFullscreen, toggleFullscreen]);

  // Handle Picture-in-Picture toggle
  const handleTogglePictureInPicture = useCallback(() => {
    // Update current time before switching to PiP
    if (playerRef.current) {
      const currentTime = playerRef.current.getCurrentTime();
      dispatch({ type: 'SET_CURRENT_TIME', payload: currentTime });
    }
    togglePictureInPicture();
  }, [togglePictureInPicture, dispatch]);

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

  const youtubeOpts: YouTubeProps['opts'] = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: autoplay ? 1 : 0,
      controls: 0, // Always hide YouTube controls, we use custom ones
      disablekb: 1,
      fs: 0,
      modestbranding: 1,
      rel: 0,
      showinfo: 0,
      iv_load_policy: 3,
    },
  };

  return (
    <div
      ref={containerRef}
      className={`relative bg-black ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* YouTube Player - Hide when Picture-in-Picture is active */}
      <div className={`relative w-full h-full ${state.isPictureInPicture ? 'opacity-0 pointer-events-none' : ''}`}>
        <YouTube
          videoId={videoId}
          opts={youtubeOpts}
          onReady={onPlayerReady}
          onStateChange={onPlayerStateChange}
          onError={onPlayerError}
          className="w-full h-full"
        />
      </div>

      {/* Picture-in-Picture Placeholder */}
      {state.isPictureInPicture && (
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          <div className="text-center text-white">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2M7 4h10M7 4l-4 4v12a1 1 0 001 1h16a1 1 0 001-1V8l-4-4M11 16h2v2h-2v-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Picture-in-Picture Mode</h3>
            <p className="text-gray-300 mb-4">Video is playing in a floating window</p>
            <button
              onClick={handleTogglePictureInPicture}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Return to Main Player
            </button>
          </div>
        </div>
      )}

      {/* Custom Controls Overlay - Hide when Picture-in-Picture is active */}
      {controls && !state.isPictureInPicture && (
        <div
          className={`absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/70 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onMouseEnter={() => setIsHoveringControls(true)}
          onMouseLeave={() => setIsHoveringControls(false)}
        >
          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 p-4">
            <div className="flex items-center justify-between text-white">
              <div className="flex-1 min-w-0">
                {playlist && (
                  <h2 className="text-lg font-semibold truncate mb-1">{playlist.title}</h2>
                )}
                {state.currentVideo && (
                  <p className="text-sm text-gray-300 truncate">{state.currentVideo.title}</p>
                )}
              </div>
              <div className="flex items-center space-x-2 ml-4">
                {videos.length > 1 && (
                  <span className="text-sm text-gray-300">
                    {currentIndex + 1} / {videos.length}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Center Play/Pause Button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={togglePlayPause}
              className="p-4 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
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

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3">
            {/* Progress Bar */}
            <ProgressBar
              currentTime={state.currentTime}
              duration={state.duration}
              onSeek={seekTo}
              buffered={state.buffered}
            />

            {/* Player Controls */}
            <div className="flex items-center justify-between">
              <PlayerControls
                isPlaying={state.isPlaying}
                volume={state.volume}
                isMuted={state.isMuted}
                isFullscreen={state.isFullscreen}
                isPictureInPicture={state.isPictureInPicture}
                playbackSpeed={state.playbackSpeed}
                onPlayPause={togglePlayPause}
                onPreviousVideo={handlePreviousVideo}
                onNextVideo={handleNextVideo}
                onSkipBackward={skipBackward}
                onSkipForward={skipForward}
                onVolumeChange={setVolume}
                onToggleMute={toggleMute}
                onToggleFullscreen={handleToggleFullscreen}
                onTogglePictureInPicture={handleTogglePictureInPicture}
                onSpeedChange={setPlaybackSpeed}
              />
            </div>
          </div>

          {/* Keyboard Shortcuts Hint */}
          <div className="absolute bottom-16 right-4 text-white text-xs opacity-60">
            <div className="bg-black/50 rounded-lg p-3 space-y-1">
              <div>Space: Play/Pause</div>
              <div>← →: Skip 10s</div>
              <div>Shift + ← →: Skip 20s</div>
              <div>↑ ↓: Volume</div>
              <div>M: Mute</div>
              <div>F: Fullscreen</div>
              <div>P: Picture-in-Picture</div>
              <div>0-9: Seek to %</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedVideoPlayer;