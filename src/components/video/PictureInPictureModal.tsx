'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import YouTube, { YouTubeProps } from 'react-youtube';
import { useVideoPlayer } from '@/contexts/VideoPlayerContext';
import PlayerControls from './PlayerControls';
import ProgressBar from './ProgressBar';

interface PictureInPictureModalProps {
  onClose: () => void;
  onRestore: () => void;
}

const PictureInPictureModal: React.FC<PictureInPictureModalProps> = ({
  onClose,
  onRestore,
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

  const [isDragging, setIsDragging] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showControls, setShowControls] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);

  // YouTube player event handlers
  const onPlayerReady: YouTubeProps['onReady'] = (event) => {
    playerRef.current = event.target;
    event.target.setVolume(state.volume * 100);
    if (state.playbackSpeed !== 1) {
      event.target.setPlaybackRate(state.playbackSpeed);
    }
  };

  const onPlayerStateChange: YouTubeProps['onStateChange'] = (event) => {
    const playerState = event.data;
    dispatch({ type: 'SET_PLAYING', payload: playerState === 1 });
    
    if (playerState === 0) { // ended
      setTimeout(() => {
        nextVideo();
      }, 300);
    }
  };

  const onPlayerError: YouTubeProps['onError'] = (event) => {
    console.error('YouTube player error:', event.data);
    nextVideo();
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

  // Dragging functionality
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target !== dragHandleRef.current) return;
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  }, [position]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    // Keep within viewport bounds
    const maxX = window.innerWidth - 320;
    const maxY = window.innerHeight - 240;
    
    setPosition({
      x: Math.max(0, Math.min(maxX, newX)),
      y: Math.max(0, Math.min(maxY, newY)),
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Auto-hide controls
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    if (showControls) {
      timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
    
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [showControls]);

  if (!state.currentVideo) return null;

  const youtubeOpts: YouTubeProps['opts'] = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      fs: 0,
      modestbranding: 1,
      rel: 0,
      showinfo: 0,
      iv_load_policy: 3,
    },
  };

  const modalContent = (
    <div
      ref={modalRef}
      className={`fixed bg-black rounded-lg shadow-2xl z-50 transition-all duration-300 ${
        isMinimized ? 'w-16 h-16' : 'w-80 h-60'
      }`}
      style={{
        left: position.x,
        top: position.y,
        cursor: isDragging ? 'grabbing' : 'default',
      }}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Drag Handle */}
      <div
        ref={dragHandleRef}
        className="absolute top-0 left-0 w-full h-6 cursor-grab active:cursor-grabbing z-10"
        onMouseDown={handleMouseDown}
      />

      {/* Video Player */}
      <div className="relative w-full h-full">
        <YouTube
          videoId={state.currentVideo.videoId}
          opts={youtubeOpts}
          onReady={onPlayerReady}
          onStateChange={onPlayerStateChange}
          onError={onPlayerError}
          className="w-full h-full"
        />

        {/* Controls Overlay */}
        {!isMinimized && (
          <div
            className={`absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/70 transition-opacity duration-300 ${
              showControls ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {/* Top Controls */}
            <div className="absolute top-2 left-2 right-2 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <span className="text-white text-sm font-medium truncate">
                  {state.currentVideo.title}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1 text-white hover:bg-white/20 rounded transition-colors"
                  aria-label="Minimize"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <button
                  onClick={onRestore}
                  className="p-1 text-white hover:bg-white/20 rounded transition-colors"
                  aria-label="Restore"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
                <button
                  onClick={onClose}
                  className="p-1 text-white hover:bg-white/20 rounded transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Center Play/Pause Button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={togglePlayPause}
                className="p-3 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                aria-label={state.isPlaying ? 'Pause' : 'Play'}
              >
                {state.isPlaying ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-2 left-2 right-2 space-y-2">
              {/* Progress Bar */}
              <ProgressBar
                currentTime={state.currentTime}
                duration={state.duration}
                onSeek={seekTo}
                buffered={state.buffered}
                className="px-2"
              />

              {/* Player Controls */}
              <div className="flex items-center justify-center">
                <PlayerControls
                  isPlaying={state.isPlaying}
                  volume={state.volume}
                  isMuted={state.isMuted}
                  isFullscreen={state.isFullscreen}
                  isPictureInPicture={state.isPictureInPicture}
                  playbackSpeed={state.playbackSpeed}
                  onPlayPause={togglePlayPause}
                  onPreviousVideo={previousVideo}
                  onNextVideo={nextVideo}
                  onSkipBackward={skipBackward}
                  onSkipForward={skipForward}
                  onVolumeChange={setVolume}
                  onToggleMute={toggleMute}
                  onToggleFullscreen={toggleFullscreen}
                  onTogglePictureInPicture={togglePictureInPicture}
                  onSpeedChange={setPlaybackSpeed}
                  className="scale-75"
                />
              </div>
            </div>
          </div>
        )}

        {/* Minimized State */}
        {isMinimized && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <button
              onClick={() => setIsMinimized(false)}
              className="p-2 text-white hover:bg-white/20 rounded transition-colors"
              aria-label="Expand"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default PictureInPictureModal;