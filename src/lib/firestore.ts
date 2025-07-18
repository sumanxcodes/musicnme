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
import { Video, Playlist, PlaylistWithVideos } from '@/types';

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