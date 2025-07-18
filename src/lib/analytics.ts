import { 
  SessionAnalytics, 
  VideoPlaybackData, 
  UsageMetrics, 
  VideoAnalytics, 
  PlaylistAnalytics, 
  DeviceInfo,
  RecommendationData,
  TemplatePlaylist,
  SessionSettings 
} from '@/types';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  increment,
  Timestamp,
  QueryConstraint
} from 'firebase/firestore';
import { db } from './firebase';

// Collections
const ANALYTICS_SESSIONS = 'analytics_sessions';
const ANALYTICS_VIDEOS = 'analytics_videos';
const ANALYTICS_PLAYLISTS = 'analytics_playlists';
const USAGE_METRICS = 'usage_metrics';
const RECOMMENDATIONS = 'recommendations';
const TEMPLATES = 'templates';

// Device Info Detection
export const getDeviceInfo = (): DeviceInfo => {
  const userAgent = navigator.userAgent;
  const screen = {
    width: window.screen.width,
    height: window.screen.height,
  };

  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isTablet = /iPad|Android(?=.*Mobile)/i.test(userAgent) && window.screen.width >= 768;
  
  let browser = 'Unknown';
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';

  let os = 'Unknown';
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iOS')) os = 'iOS';

  return {
    userAgent,
    screen,
    isMobile,
    isTablet,
    browser,
    os,
  };
};

// Session Analytics
export class SessionTracker {
  private sessionId: string;
  private userId: string;
  private playlistId: string;
  private startTime: Date;
  private videosPlayed: VideoPlaybackData[] = [];
  private settings: SessionSettings;
  private deviceInfo: DeviceInfo;
  private currentVideoData: Partial<VideoPlaybackData> | null = null;
  private saveInterval: NodeJS.Timeout | null = null;

  constructor(
    userId: string, 
    playlistId: string, 
    settings: SessionSettings
  ) {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.userId = userId;
    this.playlistId = playlistId;
    this.startTime = new Date();
    this.settings = settings;
    this.deviceInfo = getDeviceInfo();
    
    this.startAutoSave();
  }

  // Start tracking a video
  startVideo(videoId: string): void {
    // End previous video if exists
    if (this.currentVideoData) {
      this.endVideo();
    }

    this.currentVideoData = {
      videoId,
      startTime: new Date().toISOString(),
      duration: 0,
      completionRate: 0,
      skipped: false,
      rewound: false,
      pauseCount: 0,
    };
  }

  // Update video progress
  updateVideoProgress(completionRate: number): void {
    if (this.currentVideoData) {
      this.currentVideoData.completionRate = Math.max(
        this.currentVideoData.completionRate || 0,
        completionRate
      );
      this.currentVideoData.duration = Math.round(
        (new Date().getTime() - new Date(this.currentVideoData.startTime!).getTime()) / 1000
      );
    }
  }

  // Record video pause
  recordPause(): void {
    if (this.currentVideoData) {
      this.currentVideoData.pauseCount = (this.currentVideoData.pauseCount || 0) + 1;
    }
  }

  // Record video rewind
  recordRewind(): void {
    if (this.currentVideoData) {
      this.currentVideoData.rewound = true;
    }
  }

  // Record video skip
  recordSkip(): void {
    if (this.currentVideoData) {
      this.currentVideoData.skipped = true;
    }
  }

  // End current video tracking
  endVideo(): void {
    if (this.currentVideoData && this.currentVideoData.videoId) {
      const videoData: VideoPlaybackData = {
        videoId: this.currentVideoData.videoId,
        startTime: this.currentVideoData.startTime!,
        endTime: new Date().toISOString(),
        duration: this.currentVideoData.duration || 0,
        completionRate: this.currentVideoData.completionRate || 0,
        skipped: this.currentVideoData.skipped || false,
        rewound: this.currentVideoData.rewound || false,
        pauseCount: this.currentVideoData.pauseCount || 0,
      };

      this.videosPlayed.push(videoData);
      this.currentVideoData = null;

      // Update video analytics
      this.updateVideoAnalytics(videoData);
    }
  }

  // Calculate session completion rate
  private calculateCompletionRate(): number {
    if (this.videosPlayed.length === 0) return 0;
    
    const totalCompletionRate = this.videosPlayed.reduce(
      (sum, video) => sum + video.completionRate,
      0
    );
    
    return Math.round(totalCompletionRate / this.videosPlayed.length);
  }

  // End session and save to database
  async endSession(exitReason: 'completed' | 'manual' | 'error' = 'manual'): Promise<void> {
    // End current video if exists
    if (this.currentVideoData) {
      this.endVideo();
    }

    // Stop auto-save
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
    }

    const endTime = new Date();
    const duration = Math.round((endTime.getTime() - this.startTime.getTime()) / 1000);
    const completionRate = this.calculateCompletionRate();

    const sessionData: SessionAnalytics = {
      id: this.sessionId,
      userId: this.userId,
      playlistId: this.playlistId,
      startTime: this.startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration,
      videosPlayed: this.videosPlayed,
      settings: this.settings,
      deviceInfo: this.deviceInfo,
      completionRate,
      exitReason,
    };

    try {
      // Save session analytics
      await setDoc(doc(db, ANALYTICS_SESSIONS, this.sessionId), sessionData);

      // Update playlist analytics
      await this.updatePlaylistAnalytics(duration, completionRate);

      // Update daily usage metrics
      await this.updateUsageMetrics(duration);

      console.log('Session analytics saved successfully');
    } catch (error) {
      console.error('Error saving session analytics:', error);
    }
  }

  // Auto-save session data every 30 seconds
  private startAutoSave(): void {
    this.saveInterval = setInterval(() => {
      this.savePartialSession();
    }, 30000); // 30 seconds
  }

  // Save partial session data (for recovery purposes)
  private async savePartialSession(): Promise<void> {
    const currentTime = new Date();
    const duration = Math.round((currentTime.getTime() - this.startTime.getTime()) / 1000);

    const partialData = {
      id: this.sessionId,
      userId: this.userId,
      playlistId: this.playlistId,
      startTime: this.startTime.toISOString(),
      duration,
      videosPlayed: this.videosPlayed,
      settings: this.settings,
      deviceInfo: this.deviceInfo,
      completionRate: this.calculateCompletionRate(),
      lastUpdated: currentTime.toISOString(),
    };

    try {
      await setDoc(doc(db, `${ANALYTICS_SESSIONS}_partial`, this.sessionId), partialData);
    } catch (error) {
      console.error('Error saving partial session:', error);
    }
  }

  // Update video analytics
  private async updateVideoAnalytics(videoData: VideoPlaybackData): Promise<void> {
    try {
      const videoAnalyticsRef = doc(db, ANALYTICS_VIDEOS, videoData.videoId);
      const videoDoc = await getDoc(videoAnalyticsRef);

      if (videoDoc.exists()) {
        const currentData = videoDoc.data() as VideoAnalytics;
        const newTotalPlays = currentData.totalPlays + 1;
        const newTotalWatchTime = currentData.totalWatchTime + videoData.duration;
        const newAverageCompletionRate = Math.round(
          ((currentData.averageCompletionRate * currentData.totalPlays) + videoData.completionRate) / newTotalPlays
        );

        const hour = new Date(videoData.startTime).getHours();
        const usageByHour = {
          ...currentData.usageByHour,
          [hour]: (currentData.usageByHour[hour] || 0) + 1,
        };

        await updateDoc(videoAnalyticsRef, {
          totalPlays: newTotalPlays,
          totalWatchTime: newTotalWatchTime,
          averageCompletionRate: newAverageCompletionRate,
          lastPlayed: videoData.startTime,
          usageByHour,
          skipRate: videoData.skipped 
            ? Math.round(((currentData.skipRate * (currentData.totalPlays - 1)) + 100) / newTotalPlays)
            : Math.round((currentData.skipRate * (currentData.totalPlays - 1)) / newTotalPlays),
        });
      } else {
        // Create new video analytics
        const hour = new Date(videoData.startTime).getHours();
        const newVideoAnalytics: VideoAnalytics = {
          videoId: videoData.videoId,
          totalPlays: 1,
          totalWatchTime: videoData.duration,
          averageCompletionRate: videoData.completionRate,
          uniqueUsers: 1,
          skipRate: videoData.skipped ? 100 : 0,
          lastPlayed: videoData.startTime,
          popularTags: [],
          usageByHour: { [hour]: 1 },
        };

        await setDoc(videoAnalyticsRef, newVideoAnalytics);
      }
    } catch (error) {
      console.error('Error updating video analytics:', error);
    }
  }

  // Update playlist analytics
  private async updatePlaylistAnalytics(duration: number, completionRate: number): Promise<void> {
    try {
      const playlistAnalyticsRef = doc(db, ANALYTICS_PLAYLISTS, this.playlistId);
      const playlistDoc = await getDoc(playlistAnalyticsRef);

      const dayOfWeek = new Date().getDay();

      if (playlistDoc.exists()) {
        const currentData = playlistDoc.data() as PlaylistAnalytics;
        const newTotalSessions = currentData.totalSessions + 1;
        const newTotalWatchTime = currentData.totalWatchTime + duration;
        const newAverageSessionDuration = Math.round(newTotalWatchTime / newTotalSessions);
        const newAverageCompletionRate = Math.round(
          ((currentData.completionRate * currentData.totalSessions) + completionRate) / newTotalSessions
        );

        const usageByDayOfWeek = {
          ...currentData.usageByDayOfWeek,
          [dayOfWeek]: (currentData.usageByDayOfWeek[dayOfWeek] || 0) + 1,
        };

        await updateDoc(playlistAnalyticsRef, {
          totalSessions: newTotalSessions,
          totalWatchTime: newTotalWatchTime,
          averageSessionDuration: newAverageSessionDuration,
          completionRate: newAverageCompletionRate,
          lastUsed: new Date().toISOString(),
          usageByDayOfWeek,
        });
      } else {
        // Create new playlist analytics
        const newPlaylistAnalytics: PlaylistAnalytics = {
          playlistId: this.playlistId,
          totalSessions: 1,
          totalWatchTime: duration,
          averageSessionDuration: duration,
          uniqueUsers: 1,
          completionRate,
          lastUsed: new Date().toISOString(),
          popularVideos: this.videosPlayed.map(v => v.videoId),
          usageByDayOfWeek: { [dayOfWeek]: 1 },
        };

        await setDoc(playlistAnalyticsRef, newPlaylistAnalytics);
      }
    } catch (error) {
      console.error('Error updating playlist analytics:', error);
    }
  }

  // Update daily usage metrics
  private async updateUsageMetrics(sessionDuration: number): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const metricsId = `${this.userId}_${today}`;
      const metricsRef = doc(db, USAGE_METRICS, metricsId);
      const metricsDoc = await getDoc(metricsRef);

      const hour = new Date().getHours();
      const tagsUsed = this.videosPlayed.flatMap(v => []); // Will be populated when we have video tag data

      if (metricsDoc.exists()) {
        const currentData = metricsDoc.data() as UsageMetrics;
        
        await updateDoc(metricsRef, {
          sessionsCount: currentData.sessionsCount + 1,
          totalWatchTime: currentData.totalWatchTime + sessionDuration,
          peakUsageHour: currentData.totalWatchTime > sessionDuration ? currentData.peakUsageHour : hour,
        });
      } else {
        // Create new daily metrics
        const newMetrics: UsageMetrics = {
          id: metricsId,
          userId: this.userId,
          date: today,
          sessionsCount: 1,
          totalWatchTime: sessionDuration,
          playlistsCreated: 0,
          videosAdded: 0,
          tagsUsed,
          mostUsedPlaylist: this.playlistId,
          peakUsageHour: hour,
        };

        await setDoc(metricsRef, newMetrics);
      }
    } catch (error) {
      console.error('Error updating usage metrics:', error);
    }
  }
}

// Analytics Query Functions
export const getSessionAnalytics = async (userId: string, limitCount?: number): Promise<SessionAnalytics[]> => {
  try {
    const constraints: QueryConstraint[] = [
      where('userId', '==', userId),
      orderBy('startTime', 'desc')
    ];
    
    if (limitCount) {
      constraints.push(limit(limitCount));
    }

    const q = query(collection(db, ANALYTICS_SESSIONS), ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as SessionAnalytics);
  } catch (error) {
    console.error('Error fetching session analytics:', error);
    return [];
  }
};

export const getVideoAnalytics = async (videoId: string): Promise<VideoAnalytics | null> => {
  try {
    const videoDoc = await getDoc(doc(db, ANALYTICS_VIDEOS, videoId));
    return videoDoc.exists() ? videoDoc.data() as VideoAnalytics : null;
  } catch (error) {
    console.error('Error fetching video analytics:', error);
    return null;
  }
};

export const getPlaylistAnalytics = async (playlistId: string): Promise<PlaylistAnalytics | null> => {
  try {
    const playlistDoc = await getDoc(doc(db, ANALYTICS_PLAYLISTS, playlistId));
    return playlistDoc.exists() ? playlistDoc.data() as PlaylistAnalytics : null;
  } catch (error) {
    console.error('Error fetching playlist analytics:', error);
    return null;
  }
};

export const getUserUsageMetrics = async (userId: string, days: number = 30): Promise<UsageMetrics[]> => {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const q = query(
      collection(db, USAGE_METRICS),
      where('userId', '==', userId),
      where('date', '>=', startDate.toISOString().split('T')[0]),
      where('date', '<=', endDate.toISOString().split('T')[0]),
      orderBy('date', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as UsageMetrics);
  } catch (error) {
    console.error('Error fetching usage metrics:', error);
    return [];
  }
};

// Global Analytics (for admin dashboard)
export const getGlobalAnalytics = async () => {
  try {
    const [sessionsSnapshot, videosSnapshot, playlistsSnapshot] = await Promise.all([
      getDocs(collection(db, ANALYTICS_SESSIONS)),
      getDocs(collection(db, ANALYTICS_VIDEOS)),
      getDocs(collection(db, ANALYTICS_PLAYLISTS)),
    ]);

    const totalSessions = sessionsSnapshot.size;
    const totalVideos = videosSnapshot.size;
    const totalPlaylists = playlistsSnapshot.size;

    const allSessions = sessionsSnapshot.docs.map(doc => doc.data() as SessionAnalytics);
    const totalWatchTime = allSessions.reduce((sum, session) => sum + (session.duration || 0), 0);
    const averageSessionDuration = totalSessions > 0 ? Math.round(totalWatchTime / totalSessions) : 0;

    return {
      totalSessions,
      totalVideos,
      totalPlaylists,
      totalWatchTime,
      averageSessionDuration,
      uniqueUsers: new Set(allSessions.map(s => s.userId)).size,
    };
  } catch (error) {
    console.error('Error fetching global analytics:', error);
    return null;
  }
};