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

// Analytics Types
export interface SessionAnalytics {
  id: string;
  userId: string;
  playlistId: string;
  startTime: string;
  endTime?: string;
  duration?: number; // in seconds
  videosPlayed: VideoPlaybackData[];
  settings: SessionSettings;
  deviceInfo: DeviceInfo;
  completionRate: number; // 0-100%
  exitReason?: 'completed' | 'manual' | 'error';
}

export interface VideoPlaybackData {
  videoId: string;
  startTime: string;
  endTime?: string;
  duration: number; // in seconds
  completionRate: number; // 0-100%
  skipped: boolean;
  rewound: boolean;
  pauseCount: number;
}

export interface UsageMetrics {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD format
  sessionsCount: number;
  totalWatchTime: number; // in seconds
  playlistsCreated: number;
  videosAdded: number;
  tagsUsed: string[];
  mostUsedPlaylist?: string;
  mostWatchedVideo?: string;
  peakUsageHour: number; // 0-23
}

export interface VideoAnalytics {
  videoId: string;
  totalPlays: number;
  totalWatchTime: number; // in seconds
  averageCompletionRate: number; // 0-100%
  uniqueUsers: number;
  skipRate: number; // 0-100%
  lastPlayed: string;
  popularTags: string[];
  usageByHour: Record<number, number>; // hour -> play count
}

export interface PlaylistAnalytics {
  playlistId: string;
  totalSessions: number;
  totalWatchTime: number; // in seconds
  averageSessionDuration: number; // in seconds
  uniqueUsers: number;
  completionRate: number; // 0-100%
  lastUsed: string;
  popularVideos: string[]; // video IDs sorted by play count
  usageByDayOfWeek: Record<number, number>; // 0-6 -> session count
}

export interface DeviceInfo {
  userAgent: string;
  screen: {
    width: number;
    height: number;
  };
  isMobile: boolean;
  isTablet: boolean;
  browser: string;
  os: string;
}

export interface RecommendationData {
  userId: string;
  type: 'video' | 'playlist' | 'template';
  itemId: string;
  score: number; // 0-1
  reasons: string[];
  basedOn: 'usage' | 'time' | 'tags' | 'collaborative' | 'content';
  createdAt: string;
}

export interface TemplatePlaylist {
  id: string;
  title: string;
  description: string;
  category: 'warmup' | 'activity' | 'cooldown' | 'seasonal' | 'custom';
  videoRefs: string[];
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // estimated duration in seconds
  createdBy: string;
  usageCount: number;
  rating: number; // 1-5
  createdAt: string;
}