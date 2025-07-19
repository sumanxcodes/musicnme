'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { Video, Playlist } from '@/types';

interface VideoPlayerState {
  // Current video and playlist
  currentVideo: Video | null;
  currentPlaylist: Playlist | null;
  currentIndex: number;
  videos: Video[];
  
  // Player state
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackSpeed: number;
  buffered: number;
  
  // UI state
  isFullscreen: boolean;
  showControls: boolean;
  
  // Settings
  autoplay: boolean;
  loop: boolean;
  shuffle: boolean;
}

type VideoPlayerAction = 
  | { type: 'SET_CURRENT_VIDEO'; payload: { video: Video; playlist?: Playlist; videos?: Video[]; index?: number } }
  | { type: 'SET_PLAYING'; payload: boolean }
  | { type: 'SET_CURRENT_TIME'; payload: number }
  | { type: 'SET_DURATION'; payload: number }
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'SET_MUTED'; payload: boolean }
  | { type: 'SET_PLAYBACK_SPEED'; payload: number }
  | { type: 'SET_BUFFERED'; payload: number }
  | { type: 'SET_FULLSCREEN'; payload: boolean }
  | { type: 'SET_SHOW_CONTROLS'; payload: boolean }
  | { type: 'SET_AUTOPLAY'; payload: boolean }
  | { type: 'SET_LOOP'; payload: boolean }
  | { type: 'SET_SHUFFLE'; payload: boolean }
  | { type: 'NEXT_VIDEO' }
  | { type: 'PREVIOUS_VIDEO' }
  | { type: 'SEEK_TO'; payload: number }
  | { type: 'SKIP_FORWARD'; payload: number }
  | { type: 'SKIP_BACKWARD'; payload: number }
  | { type: 'RESET_PLAYER' };

const initialState: VideoPlayerState = {
  currentVideo: null,
  currentPlaylist: null,
  currentIndex: 0,
  videos: [],
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  isMuted: false,
  playbackSpeed: 1,
  buffered: 0,
  isFullscreen: false,
  showControls: true,
  autoplay: false,
  loop: false,
  shuffle: false,
};

function videoPlayerReducer(state: VideoPlayerState, action: VideoPlayerAction): VideoPlayerState {
  switch (action.type) {
    case 'SET_CURRENT_VIDEO':
      return {
        ...state,
        currentVideo: action.payload.video,
        currentPlaylist: action.payload.playlist || state.currentPlaylist,
        videos: action.payload.videos || state.videos,
        currentIndex: action.payload.index !== undefined ? action.payload.index : state.currentIndex,
      };
    
    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload };
    
    case 'SET_CURRENT_TIME':
      return { ...state, currentTime: action.payload };
    
    case 'SET_DURATION':
      return { ...state, duration: action.payload };
    
    case 'SET_VOLUME':
      return { ...state, volume: action.payload };
    
    case 'SET_MUTED':
      return { ...state, isMuted: action.payload };
    
    case 'SET_PLAYBACK_SPEED':
      return { ...state, playbackSpeed: action.payload };
    
    case 'SET_BUFFERED':
      return { ...state, buffered: action.payload };
    
    case 'SET_FULLSCREEN':
      return { ...state, isFullscreen: action.payload };
    
    case 'SET_SHOW_CONTROLS':
      return { ...state, showControls: action.payload };
    
    case 'SET_AUTOPLAY':
      return { ...state, autoplay: action.payload };
    
    case 'SET_LOOP':
      return { ...state, loop: action.payload };
    
    case 'SET_SHUFFLE':
      return { ...state, shuffle: action.payload };
    
    case 'NEXT_VIDEO':
      if (state.videos.length === 0) return state;
      let nextIndex = state.currentIndex + 1;
      if (nextIndex >= state.videos.length) {
        nextIndex = state.loop ? 0 : state.videos.length - 1;
      }
      return {
        ...state,
        currentIndex: nextIndex,
        currentVideo: state.videos[nextIndex],
        currentTime: 0,
      };
    
    case 'PREVIOUS_VIDEO':
      if (state.videos.length === 0) return state;
      let prevIndex = state.currentIndex - 1;
      if (prevIndex < 0) {
        prevIndex = state.loop ? state.videos.length - 1 : 0;
      }
      return {
        ...state,
        currentIndex: prevIndex,
        currentVideo: state.videos[prevIndex],
        currentTime: 0,
      };
    
    case 'SEEK_TO':
      return { ...state, currentTime: action.payload };
    
    case 'SKIP_FORWARD':
      return { 
        ...state, 
        currentTime: Math.min(state.currentTime + action.payload, state.duration)
      };
    
    case 'SKIP_BACKWARD':
      return { 
        ...state, 
        currentTime: Math.max(state.currentTime - action.payload, 0)
      };
    
    case 'RESET_PLAYER':
      return initialState;
    
    default:
      return state;
  }
}

interface VideoPlayerContextType {
  state: VideoPlayerState;
  dispatch: React.Dispatch<VideoPlayerAction>;
  
  // Convenience methods
  playVideo: (video: Video, playlist?: Playlist, videos?: Video[], index?: number) => void;
  togglePlayPause: () => void;
  seekTo: (time: number) => void;
  skipForward: (seconds: number) => void;
  skipBackward: (seconds: number) => void;
  nextVideo: () => void;
  previousVideo: () => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setPlaybackSpeed: (speed: number) => void;
  toggleFullscreen: () => void;
  playerRef: React.RefObject<any>;
}

const VideoPlayerContext = createContext<VideoPlayerContextType | undefined>(undefined);

export const useVideoPlayer = () => {
  const context = useContext(VideoPlayerContext);
  if (!context) {
    throw new Error('useVideoPlayer must be used within a VideoPlayerProvider');
  }
  return context;
};

export const VideoPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(videoPlayerReducer, initialState);
  const playerRef = useRef<any>(null);
  const cleanupRef = useRef<(() => void)[]>([]);
  

  // Load saved state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('videoPlayerState');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        // Restore only non-volatile state
        dispatch({ type: 'SET_VOLUME', payload: parsed.volume || 0.8 });
        dispatch({ type: 'SET_MUTED', payload: parsed.isMuted || false });
        dispatch({ type: 'SET_PLAYBACK_SPEED', payload: parsed.playbackSpeed || 1 });
        dispatch({ type: 'SET_AUTOPLAY', payload: parsed.autoplay || false });
        dispatch({ type: 'SET_LOOP', payload: parsed.loop || false });
        dispatch({ type: 'SET_SHUFFLE', payload: parsed.shuffle || false });
      } catch (error) {
        console.error('Error loading video player state:', error);
      }
    }
    
  }, []);

  // Save state to localStorage
  useEffect(() => {
    const stateToSave = {
      volume: state.volume,
      isMuted: state.isMuted,
      playbackSpeed: state.playbackSpeed,
      autoplay: state.autoplay,
      loop: state.loop,
      shuffle: state.shuffle,
    };
    localStorage.setItem('videoPlayerState', JSON.stringify(stateToSave));
  }, [state.volume, state.isMuted, state.playbackSpeed, state.autoplay, state.loop, state.shuffle]);


  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up player references
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (error) {
          console.warn('Error destroying main player:', error);
        }
        playerRef.current = null;
      }
      
      // Run any registered cleanup functions
      cleanupRef.current.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.warn('Error in cleanup function:', error);
        }
      });
      cleanupRef.current = [];
    };
  }, []);

  // Convenience methods
  const playVideo = useCallback((video: Video, playlist?: Playlist, videos?: Video[], index?: number) => {
    dispatch({ 
      type: 'SET_CURRENT_VIDEO', 
      payload: { video, playlist, videos, index } 
    });
  }, []);

  const togglePlayPause = useCallback(() => {
    if (playerRef.current) {
      try {
        // Check if player methods exist
        if (typeof playerRef.current.getPlayerState !== 'function' || 
            typeof playerRef.current.playVideo !== 'function' || 
            typeof playerRef.current.pauseVideo !== 'function') {
          console.warn('Player methods not available, skipping toggle');
          return;
        }
        
        const currentPlayerState = playerRef.current.getPlayerState();
        
        // Validate player state before proceeding
        if (currentPlayerState === undefined || currentPlayerState === null) {
          console.warn('Player state is undefined, skipping toggle');
          return;
        }
        
        // Determine the action based on current state
        const shouldPlay = currentPlayerState !== 1; // Not playing
        
        if (shouldPlay) {
          playerRef.current.playVideo();
          dispatch({ type: 'SET_PLAYING', payload: true });
        } else {
          playerRef.current.pauseVideo();
          dispatch({ type: 'SET_PLAYING', payload: false });
        }
      } catch (error) {
        console.warn('Error toggling play/pause:', error);
        // Fallback: toggle based on current state
        dispatch({ type: 'SET_PLAYING', payload: !state.isPlaying });
      }
    }
  }, [state.isPlaying]);

  const seekTo = useCallback((time: number) => {
    if (playerRef.current) {
      try {
        // Check if player is ready and has the seekTo method
        if (typeof playerRef.current.seekTo === 'function') {
          // Additional safety check - make sure the player is in a valid state
          const playerState = playerRef.current.getPlayerState();
          if (playerState !== undefined && playerState !== null) {
            playerRef.current.seekTo(time);
          }
        }
      } catch (error) {
        console.error('Error seeking:', error);
      }
    }
    dispatch({ type: 'SEEK_TO', payload: time });
  }, []);

  const skipForward = useCallback((seconds: number) => {
    const newTime = Math.min(state.currentTime + seconds, state.duration);
    seekTo(newTime);
  }, [state.currentTime, state.duration, seekTo]);

  const skipBackward = useCallback((seconds: number) => {
    const newTime = Math.max(state.currentTime - seconds, 0);
    seekTo(newTime);
  }, [state.currentTime, seekTo]);

  const nextVideo = useCallback(() => {
    dispatch({ type: 'NEXT_VIDEO' });
  }, []);

  const previousVideo = useCallback(() => {
    dispatch({ type: 'PREVIOUS_VIDEO' });
  }, []);

  const setVolume = useCallback((volume: number) => {
    if (playerRef.current) {
      try {
        if (typeof playerRef.current.setVolume === 'function') {
          playerRef.current.setVolume(volume * 100);
        }
      } catch (error) {
        console.warn('Error setting volume:', error);
      }
    }
    dispatch({ type: 'SET_VOLUME', payload: volume });
  }, []);

  const toggleMute = useCallback(() => {
    if (playerRef.current) {
      try {
        if (state.isMuted && typeof playerRef.current.unMute === 'function') {
          playerRef.current.unMute();
        } else if (!state.isMuted && typeof playerRef.current.mute === 'function') {
          playerRef.current.mute();
        }
      } catch (error) {
        console.warn('Error toggling mute:', error);
      }
    }
    dispatch({ type: 'SET_MUTED', payload: !state.isMuted });
  }, [state.isMuted]);

  const setPlaybackSpeed = useCallback((speed: number) => {
    if (playerRef.current) {
      try {
        if (typeof playerRef.current.setPlaybackRate === 'function') {
          playerRef.current.setPlaybackRate(speed);
        }
      } catch (error) {
        console.warn('Error setting playback speed:', error);
      }
    }
    dispatch({ type: 'SET_PLAYBACK_SPEED', payload: speed });
  }, []);

  const toggleFullscreen = useCallback(() => {
    dispatch({ type: 'SET_FULLSCREEN', payload: !state.isFullscreen });
  }, [state.isFullscreen]);


  const value: VideoPlayerContextType = {
    state,
    dispatch,
    playVideo,
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
    playerRef,
  };

  return (
    <VideoPlayerContext.Provider value={value}>
      {children}
    </VideoPlayerContext.Provider>
  );
};

export default VideoPlayerContext;