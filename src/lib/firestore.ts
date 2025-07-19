import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Video, Playlist, PlaylistWithVideos, VideoUsageInfo } from '@/types';

// Video operations
export const addVideo = async (video: Omit<Video, 'createdAt'>): Promise<string> => {
  try {
    if (!video.videoId) {
      throw new Error('Video ID is required');
    }
    
    // Check if video already exists
    const existingVideo = await getVideo(video.videoId);
    if (existingVideo) {
      console.log(`Video ${video.videoId} already exists, skipping duplicate upload`);
      return video.videoId;
    }
    
    // Validate and sanitize video data
    const sanitizedVideo = {
      videoId: video.videoId,
      title: video.title || 'Untitled Video',
      duration: video.duration || '0:00',
      thumbnail: video.thumbnail || '',
      tags: video.tags || [],
      channelName: video.channelName || 'Unknown Channel',
      createdBy: video.createdBy || '',
      createdAt: serverTimestamp(),
    };
    
    const videoRef = doc(db, 'videos', video.videoId);
    await setDoc(videoRef, sanitizedVideo);
    return video.videoId;
  } catch (error) {
    console.error('Error adding video:', error);
    throw error;
  }
};

export const getVideo = async (videoId: string): Promise<Video | null> => {
  try {
    const videoRef = doc(db, 'videos', videoId);
    const videoDoc = await getDoc(videoRef);
    
    if (videoDoc.exists()) {
      const data = videoDoc.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      } as Video;
    }
    return null;
  } catch (error) {
    console.error('Error getting video:', error);
    // Return null if offline or error, don't throw
    if (error instanceof Error && error.message.includes('offline')) {
      console.warn('Firestore is offline, returning null for video:', videoId);
    }
    return null;
  }
};

export const getAllVideos = async (): Promise<Video[]> => {
  try {
    const videosRef = collection(db, 'videos');
    const querySnapshot = await getDocs(videosRef);
    
    const videos = querySnapshot.docs.map(doc => ({
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    })) as Video[];
    
    // Remove duplicates based on videoId
    const uniqueVideos = videos.filter((video, index, self) => 
      index === self.findIndex(v => v.videoId === video.videoId)
    );
    
    return uniqueVideos;
  } catch (error) {
    console.error('Error getting all videos:', error);
    return [];
  }
};

export const getVideosByTags = async (tags: string[]): Promise<Video[]> => {
  try {
    const videosRef = collection(db, 'videos');
    const q = query(videosRef, where('tags', 'array-contains-any', tags));
    const querySnapshot = await getDocs(q);
    
    const videos = querySnapshot.docs.map(doc => ({
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    })) as Video[];
    
    // Remove duplicates based on videoId
    const uniqueVideos = videos.filter((video, index, self) => 
      index === self.findIndex(v => v.videoId === video.videoId)
    );
    
    return uniqueVideos;
  } catch (error) {
    console.error('Error getting videos by tags:', error);
    return [];
  }
};

// Playlist operations
export const createPlaylist = async (playlist: Omit<Playlist, 'id' | 'createdAt'>): Promise<string> => {
  try {
    const playlistRef = await addDoc(collection(db, 'playlists'), {
      ...playlist,
      createdAt: serverTimestamp(),
    });
    return playlistRef.id;
  } catch (error) {
    console.error('Error creating playlist:', error);
    throw error;
  }
};

export const getPlaylist = async (playlistId: string): Promise<Playlist | null> => {
  try {
    const playlistRef = doc(db, 'playlists', playlistId);
    const playlistDoc = await getDoc(playlistRef);
    
    if (playlistDoc.exists()) {
      const data = playlistDoc.data();
      return {
        id: playlistDoc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      } as Playlist;
    }
    return null;
  } catch (error) {
    console.error('Error getting playlist:', error);
    return null;
  }
};

export const getPlaylistWithVideos = async (playlistId: string): Promise<PlaylistWithVideos | null> => {
  try {
    const playlist = await getPlaylist(playlistId);
    if (!playlist) return null;
    
    const videos = await Promise.all(
      playlist.videoRefs.map(videoId => getVideo(videoId))
    );
    
    return {
      ...playlist,
      videos: videos.filter(video => video !== null) as Video[],
    };
  } catch (error) {
    console.error('Error getting playlist with videos:', error);
    return null;
  }
};

export const getUserPlaylists = async (userId: string): Promise<Playlist[]> => {
  try {
    const playlistsRef = collection(db, 'playlists');
    // Temporarily remove orderBy until index is created
    const q = query(
      playlistsRef,
      where('userId', '==', userId)
    );
    
    // Add retry logic for network errors
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        const querySnapshot = await getDocs(q);
        
        const playlists = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        })) as Playlist[];
        
        // Sort by createdAt in JavaScript since we can't use orderBy without index
        return playlists.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } catch (networkError) {
        retryCount++;
        if (retryCount >= maxRetries) {
          throw networkError;
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }
    
    return [];
  } catch (error) {
    console.error('Error getting user playlists:', error);
    // Return empty array on error to prevent app crashes
    return [];
  }
};

export const getUserVideos = async (userId: string): Promise<Video[]> => {
  try {
    const videosRef = collection(db, 'videos');
    const q = query(
      videosRef,
      where('createdBy', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const videos: Video[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      videos.push({
        videoId: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      } as Video);
    });
    
    return videos;
  } catch (error) {
    console.error('Error getting user videos:', error);
    return [];
  }
};

export const updatePlaylist = async (playlistId: string, updates: Partial<Playlist>): Promise<void> => {
  try {
    const playlistRef = doc(db, 'playlists', playlistId);
    await updateDoc(playlistRef, updates);
  } catch (error) {
    console.error('Error updating playlist:', error);
    throw error;
  }
};

export const deletePlaylist = async (playlistId: string): Promise<void> => {
  try {
    const playlistRef = doc(db, 'playlists', playlistId);
    await deleteDoc(playlistRef);
  } catch (error) {
    console.error('Error deleting playlist:', error);
    throw error;
  }
};

export const deleteVideo = async (videoId: string): Promise<void> => {
  try {
    const videoRef = doc(db, 'videos', videoId);
    await deleteDoc(videoRef);
  } catch (error) {
    console.error('Error deleting video:', error);
    throw error;
  }
};

export const getPlaylistsUsingVideo = async (videoId: string): Promise<Playlist[]> => {
  try {
    const playlistsRef = collection(db, 'playlists');
    const q = query(
      playlistsRef,
      where('videoRefs', 'array-contains', videoId)
    );
    
    const querySnapshot = await getDocs(q);
    const playlists: Playlist[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      playlists.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      } as Playlist);
    });
    
    return playlists;
  } catch (error) {
    console.error('Error getting playlists using video:', error);
    return [];
  }
};

export const checkVideoUsage = async (videoId: string): Promise<{
  isUsed: boolean;
  playlistCount: number;
  playlists: Playlist[];
}> => {
  try {
    const playlists = await getPlaylistsUsingVideo(videoId);
    
    return {
      isUsed: playlists.length > 0,
      playlistCount: playlists.length,
      playlists
    };
  } catch (error) {
    console.error('Error checking video usage:', error);
    return {
      isUsed: false,
      playlistCount: 0,
      playlists: []
    };
  }
};

export const updateVideoTags = async (videoId: string, tags: string[]): Promise<void> => {
  try {
    const videoRef = doc(db, 'videos', videoId);
    await updateDoc(videoRef, {
      tags: tags
    });
  } catch (error) {
    console.error('Error updating video tags:', error);
    throw error;
  }
};

// Bulk operations
export const bulkUpdateVideoTags = async (
  videos: Video[],
  operation: { type: 'add' | 'remove' | 'replace'; tags: string[] },
  onProgress?: (progress: number) => void
): Promise<void> => {
  const batch = videos.map(async (video, index) => {
    try {
      let newTags: string[] = [];
      
      switch (operation.type) {
        case 'add':
          newTags = [...new Set([...video.tags, ...operation.tags])];
          break;
        case 'remove':
          newTags = video.tags.filter(tag => !operation.tags.includes(tag));
          break;
        case 'replace':
          newTags = [...operation.tags];
          break;
      }
      
      await updateVideoTags(video.videoId, newTags);
      
      if (onProgress) {
        const progress = ((index + 1) / videos.length) * 100;
        onProgress(progress);
      }
    } catch (error) {
      console.error(`Error updating tags for video ${video.videoId}:`, error);
      throw error;
    }
  });
  
  await Promise.all(batch);
};

export const bulkDeleteVideos = async (
  videos: Video[],
  removeFromPlaylists: boolean = false,
  onProgress?: (progress: number) => void
): Promise<void> => {
  for (let i = 0; i < videos.length; i++) {
    const video = videos[i];
    
    try {
      // Remove from playlists if requested
      if (removeFromPlaylists) {
        const usage = await checkVideoUsage(video.videoId);
        if (usage.isUsed) {
          for (const playlist of usage.playlists) {
            const updatedVideoRefs = playlist.videoRefs.filter(ref => ref !== video.videoId);
            await updatePlaylist(playlist.id, { videoRefs: updatedVideoRefs });
          }
        }
      }
      
      // Delete the video
      await deleteVideo(video.videoId);
      
      if (onProgress) {
        const progress = ((i + 1) / videos.length) * 100;
        onProgress(progress);
      }
    } catch (error) {
      console.error(`Error deleting video ${video.videoId}:`, error);
      throw error;
    }
  }
};

export const bulkAddToPlaylists = async (
  videos: Video[],
  playlistIds: string[],
  createNew?: { title: string; description: string },
  userId?: string,
  onProgress?: (progress: number) => void
): Promise<string[]> => {
  let targetPlaylistIds = [...playlistIds];
  
  // Create new playlist if requested
  if (createNew && userId) {
    try {
      const newPlaylistId = await createPlaylist({
        title: createNew.title,
        description: createNew.description,
        userId,
        videoRefs: [],
        tags: []
      });
      targetPlaylistIds.push(newPlaylistId);
    } catch (error) {
      console.error('Error creating new playlist:', error);
      throw error;
    }
  }
  
  // Add videos to each playlist
  for (let i = 0; i < targetPlaylistIds.length; i++) {
    const playlistId = targetPlaylistIds[i];
    
    try {
      const playlist = await getPlaylist(playlistId);
      if (!playlist) continue;
      
      // Get video IDs that aren't already in the playlist
      const newVideoIds = videos
        .map(v => v.videoId)
        .filter(videoId => !playlist.videoRefs.includes(videoId));
      
      if (newVideoIds.length > 0) {
        const updatedVideoRefs = [...playlist.videoRefs, ...newVideoIds];
        await updatePlaylist(playlistId, { videoRefs: updatedVideoRefs });
      }
      
      if (onProgress) {
        const progress = ((i + 1) / targetPlaylistIds.length) * 100;
        onProgress(progress);
      }
    } catch (error) {
      console.error(`Error adding videos to playlist ${playlistId}:`, error);
      throw error;
    }
  }
  
  return targetPlaylistIds;
};

export const bulkCheckVideoUsage = async (
  videos: Video[]
): Promise<Map<string, VideoUsageInfo>> => {
  const usageMap = new Map<string, VideoUsageInfo>();
  
  // Get all playlists first
  const playlistsRef = collection(db, 'playlists');
  const playlistsSnapshot = await getDocs(playlistsRef);
  const allPlaylists = playlistsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  })) as Playlist[];
  
  // Check usage for each video
  videos.forEach(video => {
    const playlistsUsingVideo = allPlaylists.filter(playlist => 
      playlist.videoRefs.includes(video.videoId)
    );
    
    usageMap.set(video.videoId, {
      isUsed: playlistsUsingVideo.length > 0,
      playlists: playlistsUsingVideo
    });
  });
  
  return usageMap;
};

export const exportVideosData = async (
  videos: Video[],
  format: 'csv' | 'json' = 'json'
): Promise<string> => {
  const exportData = videos.map(video => ({
    videoId: video.videoId,
    title: video.title,
    duration: video.duration,
    channelName: video.channelName,
    tags: video.tags.join(', '),
    createdAt: video.createdAt,
    thumbnail: video.thumbnail
  }));
  
  if (format === 'csv') {
    const headers = ['Video ID', 'Title', 'Duration', 'Channel', 'Tags', 'Created At', 'Thumbnail URL'];
    const csvRows = [
      headers.join(','),
      ...exportData.map(row => [
        `"${row.videoId}"`,
        `"${row.title.replace(/"/g, '""')}"`,
        `"${row.duration}"`,
        `"${row.channelName.replace(/"/g, '""')}"`,
        `"${row.tags.replace(/"/g, '""')}"`,
        `"${row.createdAt}"`,
        `"${row.thumbnail}"`
      ].join(','))
    ];
    return csvRows.join('\n');
  } else {
    return JSON.stringify(exportData, null, 2);
  }
};