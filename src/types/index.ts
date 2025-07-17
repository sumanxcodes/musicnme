export interface User {
  uid: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Video {
  videoId: string;
  title: string;
  duration: string;
  thumbnail: string;
  tags: string[];
  channelName: string;
  createdBy: string;
  createdAt: string;
}

export interface Playlist {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  videoRefs: string[];
  notes?: string;
}

export interface PlaylistWithVideos extends Playlist {
  videos: Video[];
}

export interface SessionSettings {
  autoplay: boolean;
  fullscreen: boolean;
  volume: number;
}

export interface Tag {
  id: string;
  name: string;
  category: 'key' | 'tempo' | 'activity' | 'difficulty' | 'custom';
  createdBy: string;
}