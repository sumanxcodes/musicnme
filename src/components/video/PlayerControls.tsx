'use client';

import React, { useState, memo } from 'react';

interface PlayerControlsProps {
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  playbackSpeed: number;
  onPlayPause: () => void;
  onPreviousVideo: () => void;
  onNextVideo: () => void;
  onSkipBackward: (seconds: number) => void;
  onSkipForward: (seconds: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onSpeedChange: (speed: number) => void;
  className?: string;
}

const PlayerControls = memo<PlayerControlsProps>(({
  isPlaying,
  volume,
  isMuted,
  isFullscreen,
  playbackSpeed,
  onPlayPause,
  onPreviousVideo,
  onNextVideo,
  onSkipBackward,
  onSkipForward,
  onVolumeChange,
  onToggleMute,
  onToggleFullscreen,
  onSpeedChange,
  className = ''
}) => {
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const speedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    onVolumeChange(newVolume);
  };

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
        </svg>
      );
    } else if (volume < 0.5) {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        </svg>
      );
    } else {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        </svg>
      );
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Previous Video */}
      <button
        onClick={onPreviousVideo}
        className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
        aria-label="Previous video"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Skip Backward 10s */}
      <button
        onClick={() => onSkipBackward(10)}
        className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
        aria-label="Skip backward 10 seconds"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
        </svg>
        <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 text-xs">10</span>
      </button>

      {/* Play/Pause */}
      <button
        onClick={onPlayPause}
        className="p-3 text-white hover:bg-white/20 rounded-lg transition-colors"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
          </svg>
        ) : (
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        )}
      </button>

      {/* Skip Forward 10s */}
      <button
        onClick={() => onSkipForward(10)}
        className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors relative"
        aria-label="Skip forward 10 seconds"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
        </svg>
        <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 text-xs">10</span>
      </button>

      {/* Skip Forward 20s */}
      <button
        onClick={() => onSkipForward(20)}
        className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors relative"
        aria-label="Skip forward 20 seconds"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
        </svg>
        <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 text-xs">20</span>
      </button>

      {/* Next Video */}
      <button
        onClick={onNextVideo}
        className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
        aria-label="Next video"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Volume Control */}
      <div className="relative flex items-center">
        <button
          onClick={onToggleMute}
          onMouseEnter={() => setShowVolumeSlider(true)}
          className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {getVolumeIcon()}
        </button>
        
        {showVolumeSlider && (
          <div 
            className="absolute bottom-12 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 p-2 rounded-lg"
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => setShowVolumeSlider(false)}
          >
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-20 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* Playback Speed */}
      <div className="relative">
        <button
          onClick={() => setShowSpeedMenu(!showSpeedMenu)}
          className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors text-sm font-medium"
          aria-label="Playback speed"
        >
          {playbackSpeed}x
        </button>
        
        {showSpeedMenu && (
          <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 rounded-lg py-2 min-w-16">
            {speedOptions.map((speed) => (
              <button
                key={speed}
                onClick={() => {
                  onSpeedChange(speed);
                  setShowSpeedMenu(false);
                }}
                className={`block w-full px-3 py-1 text-sm text-white hover:bg-white/20 ${
                  playbackSpeed === speed ? 'bg-white/20' : ''
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        )}
      </div>


      {/* Fullscreen */}
      <button
        onClick={onToggleFullscreen}
        className={`p-2 text-white hover:bg-white/20 rounded-lg transition-colors ${
          isFullscreen ? 'bg-white/20' : ''
        }`}
        aria-label="Fullscreen"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      </button>
    </div>
  );
});

PlayerControls.displayName = 'PlayerControls';

export default PlayerControls;