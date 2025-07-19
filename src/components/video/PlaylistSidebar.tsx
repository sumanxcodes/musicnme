'use client';

import React, { useState, useEffect, useRef, memo } from 'react';
import { Video, Playlist } from '@/types';

interface PlaylistSidebarProps {
  playlist?: Playlist;
  videos: Video[];
  currentIndex: number;
  onVideoSelect: (index: number) => void;
  className?: string;
  isVisible?: boolean;
  onToggle?: () => void;
}

const PlaylistSidebar = memo<PlaylistSidebarProps>(({
  playlist,
  videos,
  currentIndex,
  onVideoSelect,
  className = '',
  isVisible = true,
  onToggle
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const currentVideoRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current video when it changes
  useEffect(() => {
    if (currentVideoRef.current && sidebarRef.current) {
      currentVideoRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }, [currentIndex]);

  // Format duration from seconds to MM:SS
  const formatDuration = (duration: number): string => {
    if (!duration || duration === 0) return '0:00';
    
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Parse duration string to seconds for formatting
  const parseDuration = (durationStr: string): number => {
    if (!durationStr) return 0;
    
    const parts = durationStr.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    } else if (parts.length === 3) {
      return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
    }
    return 0;
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div 
      ref={sidebarRef}
      className={`bg-black/90 backdrop-blur-md text-white border-l border-white/10 flex flex-col ${className}`}
    >
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-black/50">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold truncate mb-1">
              {playlist?.title || 'Current Playlist'}
            </h3>
            <p className="text-sm text-gray-300">
              {videos.length} video{videos.length !== 1 ? 's' : ''}
            </p>
          </div>
          
          {/* Minimize/Expand Button */}
          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label={isMinimized ? 'Expand playlist' : 'Minimize playlist'}
            >
              <svg 
                className={`w-4 h-4 transition-transform ${isMinimized ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {onToggle && (
              <button
                onClick={onToggle}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Close playlist"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Video List */}
      {!isMinimized && (
        <div className="flex-1 overflow-y-auto">
          <div className="p-2 space-y-1">
            {videos.map((video, index) => {
              const isCurrentVideo = index === currentIndex;
              const duration = typeof video.duration === 'string' ? 
                parseDuration(video.duration) : 
                (video.duration || 0);

              return (
                <div
                  key={video.videoId}
                  ref={isCurrentVideo ? currentVideoRef : null}
                  onClick={() => onVideoSelect(index)}
                  className={`
                    flex items-start space-x-3 p-3 rounded-lg cursor-pointer transition-all duration-200
                    ${isCurrentVideo 
                      ? 'bg-blue-600/80 border border-blue-400/50 shadow-lg' 
                      : 'hover:bg-white/10 border border-transparent'
                    }
                  `}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onVideoSelect(index);
                    }
                  }}
                  aria-label={`Play ${video.title}`}
                >
                  {/* Thumbnail */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-20 h-15 object-cover rounded-md"
                      loading="lazy"
                    />
                    
                    {/* Duration Overlay */}
                    {duration > 0 && (
                      <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 py-0.5 rounded">
                        {formatDuration(duration)}
                      </div>
                    )}
                    
                    {/* Current Playing Indicator */}
                    {isCurrentVideo && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-md">
                        <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Video Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-sm font-medium leading-tight mb-1 ${
                          isCurrentVideo ? 'text-white' : 'text-gray-100'
                        }`}>
                          <span className="line-clamp-2">
                            {video.title}
                          </span>
                        </h4>
                        
                        {video.channelName && (
                          <p className={`text-xs mb-1 ${
                            isCurrentVideo ? 'text-blue-100' : 'text-gray-400'
                          }`}>
                            {video.channelName}
                          </p>
                        )}
                        
                        {/* Video Tags */}
                        {video.tags && video.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {video.tags.slice(0, 2).map((tag, tagIndex) => (
                              <span
                                key={tagIndex}
                                className={`inline-block text-xs px-1.5 py-0.5 rounded-full ${
                                  isCurrentVideo 
                                    ? 'bg-blue-200/20 text-blue-100' 
                                    : 'bg-gray-700 text-gray-300'
                                }`}
                              >
                                {tag}
                              </span>
                            ))}
                            {video.tags.length > 2 && (
                              <span className={`text-xs ${
                                isCurrentVideo ? 'text-blue-200' : 'text-gray-400'
                              }`}>
                                +{video.tags.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Video Number */}
                      <div className={`text-xs font-medium ml-2 ${
                        isCurrentVideo ? 'text-blue-100' : 'text-gray-400'
                      }`}>
                        {index + 1}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Minimized State */}
      {isMinimized && (
        <div className="p-4 text-center">
          <div className="text-sm text-gray-300 mb-2">
            Playing {currentIndex + 1} of {videos.length}
          </div>
          <div className="w-full bg-gray-700 rounded-full h-1">
            <div 
              className="bg-blue-500 h-1 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / videos.length) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
});

PlaylistSidebar.displayName = 'PlaylistSidebar';

export default PlaylistSidebar;