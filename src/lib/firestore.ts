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
    const videoRef = doc(db, 'videos', video.videoId);
    await setDoc(videoRef, {
      ...video,
      createdAt: serverTimestamp(),
    });
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
    return null;
  }
};

export const getVideosByTags = async (tags: string[]): Promise<Video[]> => {
  try {
    const videosRef = collection(db, 'videos');
    const q = query(videosRef, where('tags', 'array-contains-any', tags));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    })) as Video[];
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
    const q = query(
      playlistsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    })) as Playlist[];
  } catch (error) {
    console.error('Error getting user playlists:', error);
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