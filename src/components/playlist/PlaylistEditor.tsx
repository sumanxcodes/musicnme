'use client';

import React, { useState, useEffect } from 'react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { 
  useSortable,
  CSS,
} from '@dnd-kit/sortable';
import { useAuth } from '@/contexts/AuthContext';
import { getPlaylistWithVideos, updatePlaylist } from '@/lib/firestore';
import { Playlist, PlaylistWithVideos, Video } from '@/types';
import VideoUploader from '@/components/video/VideoUploader';
import VideoGrid from '@/components/video/VideoGrid';
import { formatDuration } from '@/lib/youtube';

interface PlaylistEditorProps {
  playlistId: string;
  onClose?: () => void;
}

interface SortableVideoItemProps {
  video: Video;
  index: number;
  onRemove: (videoId: string) => void;
}

const SortableVideoItem: React.FC<SortableVideoItemProps> = ({ video, index, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: video.videoId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getFormattedDuration = () => {
    try {
      return formatDuration(video.duration);
    } catch {
      return video.duration;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center space-x-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </div>

      {/* Order Number */}
      <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
        {index + 1}
      </div>

      {/* Video Thumbnail */}
      <div className="flex-shrink-0">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-16 h-12 object-cover rounded"
          onError={(e) => {
            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(video.title)}&background=gray&color=fff&size=128`;
          }}
        />
      </div>

      {/* Video Info */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-gray-900 truncate" title={video.title}>
          {video.title}
        </h4>
        <p className="text-xs text-gray-500 truncate" title={video.channelName}>
          {video.channelName}
        </p>
        <div className="flex items-center space-x-2 text-xs text-gray-400 mt-1">
          <span>{getFormattedDuration()}</span>
          {video.tags.length > 0 && (
            <>
              <span>•</span>
              <span>{video.tags.slice(0, 2).join(', ')}</span>
              {video.tags.length > 2 && <span>+{video.tags.length - 2} more</span>}
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => window.open(`https://www.youtube.com/watch?v=${video.videoId}`, '_blank')}
          className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none"
          title="View on YouTube"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </button>
        <button
          onClick={() => onRemove(video.videoId)}
          className="p-1 text-red-400 hover:text-red-600 focus:outline-none"
          title="Remove from playlist"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
};

const PlaylistEditor: React.FC<PlaylistEditorProps> = ({ playlistId, onClose }) => {
  const { user } = useAuth();
  const [playlist, setPlaylist] = useState<PlaylistWithVideos | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'videos' | 'add'>('videos');
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadPlaylist();
  }, [playlistId]);

  const loadPlaylist = async () => {
    setIsLoading(true);
    try {
      const playlistData = await getPlaylistWithVideos(playlistId);
      setPlaylist(playlistData);
    } catch (error) {
      console.error('Error loading playlist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!playlist || !over || active.id === over.id) return;

    const oldIndex = playlist.videos.findIndex((video) => video.videoId === active.id);
    const newIndex = playlist.videos.findIndex((video) => video.videoId === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newVideos = arrayMove(playlist.videos, oldIndex, newIndex);
      const newVideoRefs = newVideos.map(video => video.videoId);
      
      setPlaylist({
        ...playlist,
        videos: newVideos,
        videoRefs: newVideoRefs,
      });

      // Save to database
      try {
        await updatePlaylist(playlistId, { videoRefs: newVideoRefs });
      } catch (error) {
        console.error('Error updating playlist order:', error);
        // Revert on error
        loadPlaylist();
      }
    }
  };

  const handleRemoveVideo = async (videoId: string) => {
    if (!playlist) return;

    const newVideos = playlist.videos.filter(video => video.videoId !== videoId);
    const newVideoRefs = newVideos.map(video => video.videoId);

    setPlaylist({
      ...playlist,
      videos: newVideos,
      videoRefs: newVideoRefs,
    });

    // Save to database
    try {
      await updatePlaylist(playlistId, { videoRefs: newVideoRefs });
    } catch (error) {
      console.error('Error removing video from playlist:', error);
      // Revert on error
      loadPlaylist();
    }
  };

  const handleAddVideo = async (video: Video) => {
    if (!playlist) return;

    // Check if video already exists
    if (playlist.videos.some(v => v.videoId === video.videoId)) {
      return; // Video already in playlist
    }

    const newVideos = [...playlist.videos, video];
    const newVideoRefs = newVideos.map(v => v.videoId);

    setPlaylist({
      ...playlist,
      videos: newVideos,
      videoRefs: newVideoRefs,
    });

    // Save to database
    try {
      await updatePlaylist(playlistId, { videoRefs: newVideoRefs });
    } catch (error) {
      console.error('Error adding video to playlist:', error);
      // Revert on error
      loadPlaylist();
    }
  };

  const getTotalDuration = () => {
    if (!playlist) return 0;
    
    return playlist.videos.reduce((total, video) => {
      try {
        const duration = video.duration;
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (match) {
          const hours = parseInt(match[1] || '0');
          const minutes = parseInt(match[2] || '0');
          const seconds = parseInt(match[3] || '0');
          return total + (hours * 3600) + (minutes * 60) + seconds;
        }
      } catch (error) {
        console.error('Error parsing duration:', error);
      }
      return total;
    }, 0);
  };

  const formatTotalDuration = () => {
    const totalSeconds = getTotalDuration();
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Playlist not found</h3>
          <p className="mt-1 text-sm text-gray-500">The playlist you're looking for doesn't exist or has been deleted.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{playlist.title}</h1>
          <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
            <span>{playlist.videos.length} videos</span>
            <span>•</span>
            <span>Total duration: {formatTotalDuration()}</span>
            <span>•</span>
            <span>Created {new Date(playlist.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex space-x-8 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('videos')}
          className={`py-2 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'videos'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Videos ({playlist.videos.length})
        </button>
        <button
          onClick={() => setActiveTab('add')}
          className={`py-2 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'add'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Add Videos
        </button>
      </div>

      {/* Content */}
      {activeTab === 'videos' ? (
        <div className="space-y-4">
          {playlist.videos.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No videos in playlist</h3>
              <p className="mt-1 text-sm text-gray-500">Add some videos to get started with your playlist.</p>
              <button
                onClick={() => setActiveTab('add')}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Add Videos
              </button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={playlist.videos.map((v, i) => `${v.videoId}-${i}`)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {playlist.videos
                    .filter((video, index, self) => 
                      index === self.findIndex(v => v.videoId === video.videoId)
                    )
                    .map((video, index) => (
                      <SortableVideoItem
                        key={`${video.videoId}-${index}`}
                        video={video}
                        index={index}
                        onRemove={handleRemoveVideo}
                      />
                    ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <VideoUploader
            onVideoAdded={handleAddVideo}
          />
        </div>
      )}
    </div>
  );
};

export default PlaylistEditor;