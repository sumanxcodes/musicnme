'use client';

import React, { useState, useRef, useEffect } from 'react';

interface ProgressBarProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  buffered?: number;
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  currentTime,
  duration,
  onSeek,
  buffered = 0,
  className = ''
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedProgress = duration > 0 ? (buffered / duration) * 100 : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeFromPosition = (clientX: number) => {
    if (!progressRef.current) return 0;
    
    const rect = progressRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return percent * duration;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const time = getTimeFromPosition(e.clientX);
    onSeek(time);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!progressRef.current) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const time = percent * duration;
    
    setHoverTime(time);
    setHoverPosition(e.clientX - rect.left);
  };

  const handleMouseLeave = () => {
    setHoverTime(null);
    setHoverPosition(null);
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const time = getTimeFromPosition(e.clientX);
      onSeek(time);
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, onSeek, duration]);

  return (
    <div className={`relative ${className}`}>
      {/* Time tooltip */}
      {hoverTime !== null && hoverPosition !== null && (
        <div
          className="absolute bottom-8 transform -translate-x-1/2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded pointer-events-none z-10"
          style={{ left: hoverPosition }}
        >
          {formatTime(hoverTime)}
        </div>
      )}
      
      {/* Progress bar container */}
      <div
        ref={progressRef}
        className="relative h-2 bg-gray-300 rounded-full cursor-pointer group"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Buffered progress */}
        <div
          className="absolute top-0 left-0 h-full bg-gray-400 rounded-full"
          style={{ width: `${bufferedProgress}%` }}
        />
        
        {/* Current progress */}
        <div
          className="absolute top-0 left-0 h-full bg-red-500 rounded-full transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
        
        {/* Scrubber */}
        <div
          className="absolute top-1/2 transform -translate-y-1/2 w-4 h-4 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          style={{ 
            left: `${progress}%`,
            transform: 'translate(-50%, -50%)'
          }}
        />
      </div>
      
      {/* Time display */}
      <div className="flex justify-between text-xs text-gray-300 mt-1">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
};

export default ProgressBar;