import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { Playlist, Video } from '@/types';

export interface SharedPlaylist {
  id: string;
  playlistId: string;
  sharedBy: string;
  sharedByName: string;
  sharedByEmail: string;
  shareId: string;
  createdAt: string;
  expiresAt: string;
  isActive: boolean;
  accessCount: number;
  lastAccessedAt?: string;
}

export interface SharedPlaylistView {
  playlist: Playlist;
  videos: Video[];
  sharedBy: string;
  sharedByName: string;
  sharedAt: string;
  accessCount: number;
}

// Generate a unique share ID
const generateShareId = (): string => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

// Create a shareable link for a playlist
export const sharePlaylist = async (
  playlistId: string, 
  userId: string,
  userDisplayName?: string,
  userEmail?: string
): Promise<string> => {
  try {
    const shareId = generateShareId();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiration
    
    const sharedPlaylistData: Omit<SharedPlaylist, 'id' | 'createdAt'> = {
      playlistId,
      sharedBy: userId,
      sharedByName: userDisplayName || 'Unknown User',
      sharedByEmail: userEmail || '',
      shareId,
      expiresAt: expiresAt.toISOString(),
      isActive: true,
      accessCount: 0,
    };
    
    const shareRef = doc(db, 'sharedPlaylists', shareId);
    await setDoc(shareRef, {
      ...sharedPlaylistData,
      createdAt: serverTimestamp(),
    });
    
    return shareId;
  } catch (error) {
    console.error('Error creating shared playlist:', error);
    throw error;
  }
};

// Get shared playlist data
export const getSharedPlaylist = async (shareId: string): Promise<SharedPlaylistView | null> => {
  try {
    const shareRef = doc(db, 'sharedPlaylists', shareId);
    const shareDoc = await getDoc(shareRef);
    
    if (!shareDoc.exists()) {
      return null;
    }
    
    const shareData = shareDoc.data() as SharedPlaylist;
    
    // Check if share is expired or inactive
    const now = new Date();
    const expiresAt = new Date(shareData.expiresAt);
    
    if (!shareData.isActive || now > expiresAt) {
      return null;
    }
    
    // Get the actual playlist
    const playlistRef = doc(db, 'playlists', shareData.playlistId);
    const playlistDoc = await getDoc(playlistRef);
    
    if (!playlistDoc.exists()) {
      return null;
    }
    
    const playlist = {
      id: playlistDoc.id,
      ...playlistDoc.data(),
      createdAt: playlistDoc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    } as Playlist;
    
    // Get videos in the playlist
    const videos: Video[] = [];
    for (const videoId of playlist.videoRefs) {
      const videoRef = doc(db, 'videos', videoId);
      const videoDoc = await getDoc(videoRef);
      
      if (videoDoc.exists()) {
        videos.push({
          ...videoDoc.data(),
          createdAt: videoDoc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        } as Video);
      }
    }
    
    // Update access count
    await updateShareAccess(shareId);
    
    return {
      playlist,
      videos,
      sharedBy: shareData.sharedBy,
      sharedByName: shareData.sharedByName,
      sharedAt: shareData.createdAt,
      accessCount: shareData.accessCount + 1,
    };
    
  } catch (error) {
    console.error('Error getting shared playlist:', error);
    return null;
  }
};

// Update access count and last accessed time
const updateShareAccess = async (shareId: string): Promise<void> => {
  try {
    const shareRef = doc(db, 'sharedPlaylists', shareId);
    const shareDoc = await getDoc(shareRef);
    
    if (shareDoc.exists()) {
      const currentData = shareDoc.data();
      await setDoc(shareRef, {
        ...currentData,
        accessCount: (currentData.accessCount || 0) + 1,
        lastAccessedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error updating share access:', error);
  }
};

// Get shared playlists created by user
export const getUserSharedPlaylists = async (userId: string): Promise<SharedPlaylist[]> => {
  try {
    const sharesRef = collection(db, 'sharedPlaylists');
    const q = query(sharesRef, where('sharedBy', '==', userId));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    })) as SharedPlaylist[];
  } catch (error) {
    console.error('Error getting user shared playlists:', error);
    return [];
  }
};

// Revoke shared playlist access
export const revokeSharedPlaylist = async (shareId: string): Promise<void> => {
  try {
    const shareRef = doc(db, 'sharedPlaylists', shareId);
    const shareDoc = await getDoc(shareRef);
    
    if (shareDoc.exists()) {
      await setDoc(shareRef, {
        ...shareDoc.data(),
        isActive: false,
      });
    }
  } catch (error) {
    console.error('Error revoking shared playlist:', error);
    throw error;
  }
};

// Generate full share URL
export const getSharedPlaylistUrl = (shareId: string): string => {
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  return `${baseUrl}/shared/${shareId}`;
};

// Validate share ID format
export const isValidShareId = (shareId: string): boolean => {
  return /^[a-z0-9]{20,30}$/.test(shareId);
};

// Clean up expired shares (admin function)
export const cleanupExpiredShares = async (): Promise<number> => {
  try {
    const sharesRef = collection(db, 'sharedPlaylists');
    const querySnapshot = await getDocs(sharesRef);
    
    const now = new Date();
    let cleanedCount = 0;
    
    for (const doc of querySnapshot.docs) {
      const data = doc.data();
      const expiresAt = new Date(data.expiresAt);
      
      if (now > expiresAt) {
        await setDoc(doc.ref, {
          ...data,
          isActive: false,
        });
        cleanedCount++;
      }
    }
    
    return cleanedCount;
  } catch (error) {
    console.error('Error cleaning up expired shares:', error);
    return 0;
  }
};