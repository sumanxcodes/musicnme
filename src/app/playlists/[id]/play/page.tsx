'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPlaylist, getVideo } from '@/lib/firestore';
import { Playlist, Video } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useVideoPlayer } from '@/contexts/VideoPlayerContext';
import VideoPlayer from '@/components/video/VideoPlayer';
import VideoPlayerErrorBoundary from '@/components/video/VideoPlayerErrorBoundary';
import PlaylistSidebar from '@/components/video/PlaylistSidebar';

const PlaylistPlayerPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { state, playVideo, dispatch } = useVideoPlayer();
  
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPlaylistSidebar, setShowPlaylistSidebar] = useState(true);
  const [showControls, setShowControls] = useState(true);
  
  const playlistId = params.id as string;

  useEffect(() => {
    if (playlistId) {
      loadPlaylistData();
    } else {
      setError('No playlist specified');
      setIsLoading(false);
    }
  }, [playlistId]);

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

  // Auto-hide controls functionality
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const hideControls = () => {
      timeoutId = setTimeout(() => {
        setShowControls(false);
      }, 4000);
    };

    const showControlsAndReset = () => {
      setShowControls(true);
      clearTimeout(timeoutId);
      hideControls();
    };

    const handleMouseMove = () => {
      showControlsAndReset();
    };

    const handleKeyPress = (e: KeyboardEvent) => {
      showControlsAndReset();
      
      if (e.key === 'Escape') {
        router.push(`/playlists/${playlistId}`);
      }
      
      // Toggle playlist sidebar with 'p' key
      if (e.key === 'p' || e.key === 'P') {
        if (!state.isFullscreen) {
          setShowPlaylistSidebar(prev => !prev);
        }
      }
    };

    // Initial timer
    hideControls();

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
  }, [router, playlistId, state.isFullscreen]);

  const loadPlaylistData = async () => {
    setIsLoading(true);
    try {
      const playlistData = await getPlaylist(playlistId);
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

      console.log(`Loading summary: ${videoData.length} videos loaded, ${failedVideos.length} failed`);

      if (videoData.length === 0) {
        setError('No videos could be loaded from this playlist. Please check that the videos still exist and are accessible.');
        return;
      }

      setVideos(videoData);
      setCurrentVideoIndex(0);

      // Initialize the first video in the player
      if (videoData.length > 0) {
        const firstVideo = videoData[0];
        if (validateVideo(firstVideo)) {
          console.log(`▶ Starting playlist: ${firstVideo.title} (${firstVideo.videoId})`);
          playVideo(firstVideo, playlistData, videoData, 0);
        } else {
          const validVideoIndex = videoData.findIndex(video => validateVideo(video));
          if (validVideoIndex !== -1) {
            setCurrentVideoIndex(validVideoIndex);
            playVideo(videoData[validVideoIndex], playlistData, videoData, validVideoIndex);
          } else {
            setError('No valid videos found in playlist');
            return;
          }
        }
      }
    } catch (err) {
      console.error('Error loading playlist:', err);
      setError('Failed to load playlist');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVideoChange = (newIndex: number) => {
    if (newIndex >= 0 && newIndex < videos.length) {
      const newVideo = videos[newIndex];
      
      if (!validateVideo(newVideo)) {
        console.error(`❌ Video at index ${newIndex} failed validation, skipping`);
        for (let i = newIndex + 1; i < videos.length; i++) {
          if (validateVideo(videos[i])) {
            handleVideoChange(i);
            return;
          }
        }
        handleExitPlayer();
        return;
      }
      
      setCurrentVideoIndex(newIndex);
      console.log(`▶ Changing to video: ${newVideo.title} (${newVideo.videoId})`);
      playVideo(newVideo, playlist || undefined, videos, newIndex);
    }
  };

  const handlePlaylistEnd = () => {
    // For now, just loop back to first video
    handleVideoChange(0);
  };

  const handleExitPlayer = () => {
    // Exit fullscreen if active
    if (state.isFullscreen) {
      dispatch({ type: 'SET_FULLSCREEN', payload: false });
    }

    // Navigate back to playlist detail page
    router.push(`/playlists/${playlistId}`);
  };

  const handlePlayerReady = () => {
    console.log('Player ready');
  };

  const handlePlayerError = (error: any) => {
    console.error(`⚠ Video player error:`, error);
    
    // Try to find next valid video
    let nextValidIndex = -1;
    for (let i = currentVideoIndex + 1; i < videos.length; i++) {
      if (validateVideo(videos[i])) {
        nextValidIndex = i;
        break;
      }
    }
    
    if (nextValidIndex !== -1) {
      setTimeout(() => {
        handleVideoChange(nextValidIndex);
      }, 1000);
    } else {
      setError('All videos in this playlist are currently unavailable');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Loading playlist...</p>
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
          <h1 className="text-2xl font-bold mb-2">Playback Error</h1>
          <p className="text-gray-300 mb-6">{error}</p>
          <button
            onClick={handleExitPlayer}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Back to Playlist
          </button>
        </div>
      </div>
    );
  }

  // No video available
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
          <button
            onClick={handleExitPlayer}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Back to Playlist
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
              autoplay={true}
              onReady={handlePlayerReady}
              onError={handlePlayerError}
              className="w-full h-full"
            />
          </VideoPlayerErrorBoundary>
        </div>

        {/* Playlist Sidebar - YouTube Style */}
        {showPlaylistSidebar && (
          <PlaylistSidebar
            playlist={playlist || undefined}
            videos={videos}
            currentIndex={currentVideoIndex}
            onVideoSelect={handleVideoChange}
            onToggle={() => setShowPlaylistSidebar(false)}
            className={`w-full lg:w-[30%] h-full hidden lg:flex flex-col ${
              state.isFullscreen ? 'z-[90]' : ''
            }`}
          />
        )}
      </div>

      {/* Playlist Toggle Button - YouTube Style */}
      <button
          onClick={() => setShowPlaylistSidebar(!showPlaylistSidebar)}
          className={`fixed top-4 right-4 z-[100] w-10 h-10 text-white rounded-lg transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/30 shadow-lg flex items-center justify-center ${
            showPlaylistSidebar 
              ? 'bg-white/20 hover:bg-white/30 backdrop-blur-sm' 
              : 'bg-black/60 hover:bg-black/80 backdrop-blur-sm'
          }`}
          aria-label={showPlaylistSidebar ? 'Hide playlist' : 'Show playlist'}
          title={showPlaylistSidebar ? 'Hide playlist (Press P)' : 'Show playlist (Press P)'}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            {showPlaylistSidebar ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

      {/* Back to Playlist Button */}
      <button
        onClick={handleExitPlayer}
        className={`fixed top-4 left-4 z-50 flex items-center space-x-2 px-4 py-2 bg-black/70 backdrop-blur-sm hover:bg-black/90 text-white rounded-lg transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/30 shadow-lg ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
        aria-label="Back to playlist (Press Escape)"
        title="Back to playlist"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        <span className="text-sm font-medium hidden sm:block">Back to Playlist</span>
      </button>

      {/* Mobile Playlist Overlay */}
      {showPlaylistSidebar && (
        <div className={`fixed inset-0 lg:hidden ${state.isFullscreen ? 'z-[80]' : 'z-40'}`}>
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

      {/* Playlist Info Overlay - Shows when sidebar is hidden */}
      {playlist && !showPlaylistSidebar && (
        <div 
          className={`fixed top-20 left-4 z-40 bg-black/70 backdrop-blur-md text-white rounded-xl p-4 max-w-sm shadow-2xl transition-all duration-500 ease-in-out ${
            showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
          }`}
        >
          <div className="space-y-3">
            <h3 className="font-semibold text-lg leading-tight truncate text-white">
              {playlist.title}
            </h3>
            
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-200">
                Video {currentVideoIndex + 1} of {videos.length}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlaylistPlayerPage;