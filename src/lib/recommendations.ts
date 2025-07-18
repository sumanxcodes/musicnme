import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  setDoc,
  updateDoc,
  serverTimestamp,
  QueryConstraint
} from 'firebase/firestore';
import { db } from './firebase';
import {
  SessionAnalytics,
  VideoAnalytics,
  PlaylistAnalytics,
  UsageMetrics,
  RecommendationData,
  TemplatePlaylist,
  Video,
  Playlist,
  Tag
} from '@/types';
import {
  getSessionAnalytics,
  getVideoAnalytics,
  getPlaylistAnalytics,
  getUserUsageMetrics
} from './analytics';

// Recommendation algorithms and types
export interface RecommendationScore {
  itemId: string;
  itemType: 'video' | 'playlist' | 'template';
  score: number;
  reasons: string[];
  basedOn: 'usage' | 'time' | 'tags' | 'collaborative' | 'content';
  confidence: number; // 0-1
}

export interface RecommendationContext {
  userId: string;
  currentHour?: number;
  dayOfWeek?: number;
  sessionDuration?: number;
  tags?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

export interface UserPreferences {
  id: string;
  userId: string;
  preferredTags: string[];
  preferredDuration: number; // in seconds
  favoriteVideos: string[];
  favoritePlaylists: string[];
  mostUsedTimeSlots: number[]; // hours 0-23
  averageSessionLength: number;
  completionRateThreshold: number; // preferred minimum completion rate
  lastUpdated: string;
}

// Core Recommendation Engine
export class RecommendationEngine {
  private userId: string;
  private userPreferences: UserPreferences | null = null;
  private sessionHistory: SessionAnalytics[] = [];
  private usageMetrics: UsageMetrics[] = [];

  constructor(userId: string) {
    this.userId = userId;
  }

  // Initialize with user data
  async initialize(): Promise<void> {
    try {
      const [preferences, sessions, usage] = await Promise.all([
        this.loadUserPreferences(),
        getSessionAnalytics(this.userId, 50), // Last 50 sessions
        getUserUsageMetrics(this.userId, 90) // Last 90 days
      ]);

      this.userPreferences = preferences;
      this.sessionHistory = sessions;
      this.usageMetrics = usage;

      // Update preferences if needed
      if (!this.userPreferences) {
        await this.generateUserPreferences();
      }
    } catch (error) {
      console.error('Error initializing recommendation engine:', error);
    }
  }

  // Main recommendation function
  async getRecommendations(
    context: RecommendationContext,
    maxRecommendations: number = 10
  ): Promise<RecommendationScore[]> {
    await this.initialize();

    const recommendations: RecommendationScore[] = [];

    try {
      // Get recommendations from different strategies
      const [
        usageBasedRecs,
        tagBasedRecs,
        timeBasedRecs,
        collaborativeRecs,
        contentBasedRecs
      ] = await Promise.all([
        this.getUsageBasedRecommendations(context),
        this.getTagBasedRecommendations(context),
        this.getTimeBasedRecommendations(context),
        this.getCollaborativeRecommendations(context),
        this.getContentBasedRecommendations(context)
      ]);

      // Combine and weight recommendations
      const allRecommendations = [
        ...usageBasedRecs.map(r => ({ ...r, weight: 0.3 })),
        ...tagBasedRecs.map(r => ({ ...r, weight: 0.25 })),
        ...timeBasedRecs.map(r => ({ ...r, weight: 0.2 })),
        ...collaborativeRecs.map(r => ({ ...r, weight: 0.15 })),
        ...contentBasedRecs.map(r => ({ ...r, weight: 0.1 }))
      ];

      // Score aggregation with deduplication
      const scoreMap = new Map<string, RecommendationScore>();
      
      for (const rec of allRecommendations) {
        const key = `${rec.itemType}-${rec.itemId}`;
        const weightedScore = rec.score * (rec as any).weight;
        
        if (scoreMap.has(key)) {
          const existing = scoreMap.get(key)!;
          existing.score = Math.max(existing.score, weightedScore);
          existing.reasons = [...existing.reasons, ...rec.reasons];
          existing.confidence = Math.min(1, existing.confidence + rec.confidence * 0.1);
        } else {
          scoreMap.set(key, {
            ...rec,
            score: weightedScore,
            confidence: Math.min(1, rec.confidence)
          });
        }
      }

      // Sort by score and return top recommendations
      const finalRecommendations = Array.from(scoreMap.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, maxRecommendations);

      // Store recommendations for learning
      await this.storeRecommendations(finalRecommendations, context);

      return finalRecommendations;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return [];
    }
  }

  // Usage-based recommendations
  private async getUsageBasedRecommendations(
    context: RecommendationContext
  ): Promise<RecommendationScore[]> {
    const recommendations: RecommendationScore[] = [];

    if (!this.userPreferences) return recommendations;

    try {
      // Recommend based on most watched videos
      for (const videoId of this.userPreferences.favoriteVideos.slice(0, 5)) {
        const videoAnalytics = await getVideoAnalytics(videoId);
        if (videoAnalytics && videoAnalytics.averageCompletionRate >= 70) {
          recommendations.push({
            itemId: videoId,
            itemType: 'video',
            score: 0.8 + (videoAnalytics.averageCompletionRate / 100) * 0.2,
            reasons: ['Based on your watch history', 'High completion rate'],
            basedOn: 'usage',
            confidence: 0.9
          });
        }
      }

      // Recommend similar playlists
      for (const playlistId of this.userPreferences.favoritePlaylists.slice(0, 3)) {
        const playlistAnalytics = await getPlaylistAnalytics(playlistId);
        if (playlistAnalytics && playlistAnalytics.completionRate >= 60) {
          recommendations.push({
            itemId: playlistId,
            itemType: 'playlist',
            score: 0.7 + (playlistAnalytics.completionRate / 100) * 0.3,
            reasons: ['Similar to your favorite playlists', 'Good completion rate'],
            basedOn: 'usage',
            confidence: 0.85
          });
        }
      }
    } catch (error) {
      console.error('Error in usage-based recommendations:', error);
    }

    return recommendations;
  }

  // Tag-based similarity recommendations
  private async getTagBasedRecommendations(
    context: RecommendationContext
  ): Promise<RecommendationScore[]> {
    const recommendations: RecommendationScore[] = [];

    if (!this.userPreferences) return recommendations;

    try {
      const preferredTags = context.tags || this.userPreferences.preferredTags;
      if (preferredTags.length === 0) return recommendations;

      // Find videos with similar tags
      const videosQuery = query(
        collection(db, 'videos'),
        where('tags', 'array-contains-any', preferredTags.slice(0, 10)),
        orderBy('createdAt', 'desc'),
        limit(20)
      );

      const videosSnapshot = await getDocs(videosQuery);
      const videos = videosSnapshot.docs.map(doc => ({ videoId: doc.id, ...doc.data() } as Video));

      for (const video of videos) {
        const tagSimilarity = this.calculateTagSimilarity(
          preferredTags,
          video.tags || []
        );

        if (tagSimilarity > 0.3) {
          recommendations.push({
            itemId: video.videoId,
            itemType: 'video',
            score: tagSimilarity,
            reasons: [
              `Matches your interests: ${this.getCommonTags(preferredTags, video.tags || []).join(', ')}`
            ],
            basedOn: 'tags',
            confidence: tagSimilarity
          });
        }
      }

      // Find playlists with similar tags
      const playlistsSnapshot = await getDocs(collection(db, 'playlists'));
      for (const playlistDoc of playlistsSnapshot.docs) {
        const playlist = playlistDoc.data();
        
        // Get playlist's aggregated tags from its videos
        const playlistTags = await this.getPlaylistTags(playlist.videoRefs || []);
        const tagSimilarity = this.calculateTagSimilarity(preferredTags, playlistTags);

        if (tagSimilarity > 0.4) {
          recommendations.push({
            itemId: playlistDoc.id,
            itemType: 'playlist',
            score: tagSimilarity * 0.9, // Slightly lower weight for playlists
            reasons: [
              `Contains videos matching: ${this.getCommonTags(preferredTags, playlistTags).join(', ')}`
            ],
            basedOn: 'tags',
            confidence: tagSimilarity * 0.9
          });
        }
      }
    } catch (error) {
      console.error('Error in tag-based recommendations:', error);
    }

    return recommendations;
  }

  // Time-based recommendations
  private async getTimeBasedRecommendations(
    context: RecommendationContext
  ): Promise<RecommendationScore[]> {
    const recommendations: RecommendationScore[] = [];

    if (!this.userPreferences) return recommendations;

    try {
      const currentHour = context.currentHour || new Date().getHours();
      const dayOfWeek = context.dayOfWeek || new Date().getDay();

      // Check if current time matches user's preferred usage patterns
      const isPreferredTime = this.userPreferences.mostUsedTimeSlots.includes(currentHour);
      
      if (isPreferredTime) {
        // Find content commonly used at this time
        const timeBasedSessions = this.sessionHistory.filter(session => {
          const sessionHour = new Date(session.startTime).getHours();
          const sessionDay = new Date(session.startTime).getDay();
          return Math.abs(sessionHour - currentHour) <= 1 && sessionDay === dayOfWeek;
        });

        const commonVideos = this.getCommonVideosFromSessions(timeBasedSessions);
        
        for (const [videoId, frequency] of Object.entries(commonVideos)) {
          if (frequency >= 2) { // Used at least twice at this time
            recommendations.push({
              itemId: videoId,
              itemType: 'video',
              score: Math.min(0.8, frequency * 0.2),
              reasons: [`Popular choice at ${this.formatHour(currentHour)}`],
              basedOn: 'time',
              confidence: Math.min(0.9, frequency * 0.15)
            });
          }
        }
      }

      // Session duration recommendations
      if (context.sessionDuration) {
        const targetDuration = context.sessionDuration;
        const durationTolerance = targetDuration * 0.2; // 20% tolerance

        // Find playlists with appropriate duration
        const playlistsSnapshot = await getDocs(collection(db, 'playlists'));
        for (const playlistDoc of playlistsSnapshot.docs) {
          const playlistAnalytics = await getPlaylistAnalytics(playlistDoc.id);
          if (playlistAnalytics) {
            const durationDiff = Math.abs(playlistAnalytics.averageSessionDuration - targetDuration);
            
            if (durationDiff <= durationTolerance) {
              const score = 1 - (durationDiff / durationTolerance) * 0.5;
              recommendations.push({
                itemId: playlistDoc.id,
                itemType: 'playlist',
                score,
                reasons: [`Perfect for ${Math.round(targetDuration / 60)} minute sessions`],
                basedOn: 'time',
                confidence: score
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in time-based recommendations:', error);
    }

    return recommendations;
  }

  // Collaborative filtering recommendations
  private async getCollaborativeRecommendations(
    context: RecommendationContext
  ): Promise<RecommendationScore[]> {
    const recommendations: RecommendationScore[] = [];

    try {
      // Find users with similar preferences
      const allUsersSnapshot = await getDocs(collection(db, 'user_preferences'));
      const similarUsers: string[] = [];

      for (const userDoc of allUsersSnapshot.docs) {
        if (userDoc.id === this.userId) continue;
        
        const otherPrefs = userDoc.data() as UserPreferences;
        const similarity = this.calculateUserSimilarity(this.userPreferences!, otherPrefs);
        
        if (similarity > 0.6) {
          similarUsers.push(otherPrefs.userId);
        }
      }

      // Get popular content among similar users
      if (similarUsers.length > 0) {
        const similarUsersSessions = await Promise.all(
          similarUsers.slice(0, 5).map(userId => getSessionAnalytics(userId, 20))
        );

        const popularContent = this.getPopularContentFromSessions(
          similarUsersSessions.flat()
        );

        for (const [contentId, data] of Object.entries(popularContent)) {
          if (data.frequency >= 2) {
            recommendations.push({
              itemId: contentId,
              itemType: 'video',
              score: Math.min(0.7, data.frequency * 0.15),
              reasons: ['Popular among users with similar preferences'],
              basedOn: 'collaborative',
              confidence: Math.min(0.8, data.frequency * 0.1)
            });
          }
        }
      }
    } catch (error) {
      console.error('Error in collaborative recommendations:', error);
    }

    return recommendations;
  }

  // Content-based recommendations
  private async getContentBasedRecommendations(
    context: RecommendationContext
  ): Promise<RecommendationScore[]> {
    const recommendations: RecommendationScore[] = [];

    try {
      // Recommend templates based on difficulty and tags
      const templatesSnapshot = await getDocs(collection(db, 'templates'));
      
      for (const templateDoc of templatesSnapshot.docs) {
        const template = templateDoc.data() as TemplatePlaylist;
        
        let score = 0.5; // Base score
        const reasons: string[] = [];

        // Difficulty matching
        if (context.difficulty && template.difficulty === context.difficulty) {
          score += 0.2;
          reasons.push(`Matches ${context.difficulty} difficulty level`);
        }

        // Tag matching
        if (context.tags && template.tags) {
          const tagSimilarity = this.calculateTagSimilarity(context.tags, template.tags);
          score += tagSimilarity * 0.3;
          
          if (tagSimilarity > 0.5) {
            reasons.push(`Great match for your selected themes`);
          }
        }

        // High rating boost
        if (template.rating >= 4.0) {
          score += 0.1;
          reasons.push(`Highly rated template (${template.rating}/5)`);
        }

        if (score > 0.6 && reasons.length > 0) {
          recommendations.push({
            itemId: template.id,
            itemType: 'template',
            score,
            reasons,
            basedOn: 'content',
            confidence: score
          });
        }
      }
    } catch (error) {
      console.error('Error in content-based recommendations:', error);
    }

    return recommendations;
  }

  // Utility methods
  private calculateTagSimilarity(tags1: string[], tags2: string[]): number {
    if (tags1.length === 0 || tags2.length === 0) return 0;
    
    const set1 = new Set(tags1.map(t => t.toLowerCase()));
    const set2 = new Set(tags2.map(t => t.toLowerCase()));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size; // Jaccard similarity
  }

  private getCommonTags(tags1: string[], tags2: string[]): string[] {
    const set1 = new Set(tags1.map(t => t.toLowerCase()));
    const set2 = new Set(tags2.map(t => t.toLowerCase()));
    return [...set1].filter(x => set2.has(x));
  }

  private async getPlaylistTags(videoRefs: string[]): Promise<string[]> {
    const allTags: string[] = [];
    
    for (const videoId of videoRefs.slice(0, 10)) { // Limit to avoid too many queries
      try {
        const videoDoc = await getDoc(doc(db, 'videos', videoId));
        if (videoDoc.exists()) {
          const video = videoDoc.data();
          allTags.push(...(video.tags || []));
        }
      } catch (error) {
        console.error(`Error fetching video ${videoId}:`, error);
      }
    }
    
    return [...new Set(allTags)]; // Remove duplicates
  }

  private calculateUserSimilarity(user1: UserPreferences, user2: UserPreferences): number {
    let similarity = 0;
    let factors = 0;

    // Tag similarity
    const tagSimilarity = this.calculateTagSimilarity(user1.preferredTags, user2.preferredTags);
    similarity += tagSimilarity * 0.4;
    factors += 0.4;

    // Duration similarity
    const durationDiff = Math.abs(user1.averageSessionLength - user2.averageSessionLength);
    const maxDuration = Math.max(user1.averageSessionLength, user2.averageSessionLength);
    const durationSimilarity = 1 - (durationDiff / maxDuration);
    similarity += durationSimilarity * 0.3;
    factors += 0.3;

    // Time slot similarity
    const timeSlotSimilarity = this.calculateArraySimilarity(
      user1.mostUsedTimeSlots,
      user2.mostUsedTimeSlots
    );
    similarity += timeSlotSimilarity * 0.3;
    factors += 0.3;

    return factors > 0 ? similarity / factors : 0;
  }

  private calculateArraySimilarity(arr1: number[], arr2: number[]): number {
    if (arr1.length === 0 || arr2.length === 0) return 0;
    
    const set1 = new Set(arr1);
    const set2 = new Set(arr2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  private getCommonVideosFromSessions(sessions: SessionAnalytics[]): Record<string, number> {
    const videoCounts: Record<string, number> = {};
    
    for (const session of sessions) {
      for (const video of session.videosPlayed) {
        videoCounts[video.videoId] = (videoCounts[video.videoId] || 0) + 1;
      }
    }
    
    return videoCounts;
  }

  private getPopularContentFromSessions(
    sessions: SessionAnalytics[]
  ): Record<string, { frequency: number; avgCompletion: number }> {
    const contentStats: Record<string, { frequency: number; totalCompletion: number; count: number }> = {};
    
    for (const session of sessions) {
      for (const video of session.videosPlayed) {
        if (!contentStats[video.videoId]) {
          contentStats[video.videoId] = { frequency: 0, totalCompletion: 0, count: 0 };
        }
        
        contentStats[video.videoId].frequency += 1;
        contentStats[video.videoId].totalCompletion += video.completionRate;
        contentStats[video.videoId].count += 1;
      }
    }
    
    const result: Record<string, { frequency: number; avgCompletion: number }> = {};
    for (const [videoId, stats] of Object.entries(contentStats)) {
      result[videoId] = {
        frequency: stats.frequency,
        avgCompletion: stats.totalCompletion / stats.count
      };
    }
    
    return result;
  }

  private formatHour(hour: number): string {
    if (hour === 0) return 'midnight';
    if (hour === 12) return 'noon';
    if (hour < 12) return `${hour}:00 AM`;
    return `${hour - 12}:00 PM`;
  }

  // User preferences management
  private async loadUserPreferences(): Promise<UserPreferences | null> {
    try {
      const prefsDoc = await getDoc(doc(db, 'user_preferences', this.userId));
      return prefsDoc.exists() ? prefsDoc.data() as UserPreferences : null;
    } catch (error) {
      console.error('Error loading user preferences:', error);
      return null;
    }
  }

  private async generateUserPreferences(): Promise<void> {
    try {
      const preferences: UserPreferences = {
        id: this.userId,
        userId: this.userId,
        preferredTags: this.extractPreferredTags(),
        preferredDuration: this.calculatePreferredDuration(),
        favoriteVideos: this.extractFavoriteVideos(),
        favoritePlaylists: this.extractFavoritePlaylists(),
        mostUsedTimeSlots: this.extractMostUsedTimeSlots(),
        averageSessionLength: this.calculateAverageSessionLength(),
        completionRateThreshold: this.calculateCompletionRateThreshold(),
        lastUpdated: new Date().toISOString()
      };

      await setDoc(doc(db, 'user_preferences', this.userId), preferences);
      this.userPreferences = preferences;
    } catch (error) {
      console.error('Error generating user preferences:', error);
    }
  }

  private extractPreferredTags(): string[] {
    const tagCounts: Record<string, number> = {};
    
    for (const session of this.sessionHistory) {
      for (const video of session.videosPlayed) {
        // We'd need to fetch video data to get tags, simplified for now
        // In practice, you'd cache this data or use a different approach
      }
    }
    
    return Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([tag]) => tag);
  }

  private calculatePreferredDuration(): number {
    if (this.sessionHistory.length === 0) return 1800; // 30 minutes default
    
    const durations = this.sessionHistory.map(s => s.duration || 0);
    return durations.reduce((sum, d) => sum + d, 0) / durations.length;
  }

  private extractFavoriteVideos(): string[] {
    const videoCounts = this.getCommonVideosFromSessions(this.sessionHistory);
    return Object.entries(videoCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([videoId]) => videoId);
  }

  private extractFavoritePlaylists(): string[] {
    const playlistCounts: Record<string, number> = {};
    
    for (const session of this.sessionHistory) {
      playlistCounts[session.playlistId] = (playlistCounts[session.playlistId] || 0) + 1;
    }
    
    return Object.entries(playlistCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([playlistId]) => playlistId);
  }

  private extractMostUsedTimeSlots(): number[] {
    const hourCounts: Record<number, number> = {};
    
    for (const session of this.sessionHistory) {
      const hour = new Date(session.startTime).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }
    
    return Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8) // Top 8 hours
      .map(([hour]) => parseInt(hour));
  }

  private calculateAverageSessionLength(): number {
    if (this.sessionHistory.length === 0) return 1800;
    
    const totalDuration = this.sessionHistory.reduce((sum, session) => sum + (session.duration || 0), 0);
    return totalDuration / this.sessionHistory.length;
  }

  private calculateCompletionRateThreshold(): number {
    if (this.sessionHistory.length === 0) return 70;
    
    const totalCompletionRate = this.sessionHistory.reduce((sum, session) => sum + session.completionRate, 0);
    return totalCompletionRate / this.sessionHistory.length;
  }

  // Store recommendations for learning
  private async storeRecommendations(
    recommendations: RecommendationScore[],
    context: RecommendationContext
  ): Promise<void> {
    try {
      const batch: RecommendationData[] = recommendations.map(rec => ({
        userId: this.userId,
        type: rec.itemType,
        itemId: rec.itemId,
        score: rec.score,
        reasons: rec.reasons,
        basedOn: rec.basedOn,
        createdAt: new Date().toISOString()
      }));

      // Store in batches to avoid overwhelming Firestore
      for (const recommendation of batch.slice(0, 5)) { // Store top 5
        await setDoc(
          doc(collection(db, 'recommendations')),
          recommendation
        );
      }
    } catch (error) {
      console.error('Error storing recommendations:', error);
    }
  }
}

// Convenience functions for easy use
export const getRecommendationsForUser = async (
  userId: string,
  context: Partial<RecommendationContext> = {},
  maxRecommendations: number = 10
): Promise<RecommendationScore[]> => {
  const engine = new RecommendationEngine(userId);
  const fullContext: RecommendationContext = {
    userId,
    currentHour: new Date().getHours(),
    dayOfWeek: new Date().getDay(),
    ...context
  };
  
  return engine.getRecommendations(fullContext, maxRecommendations);
};

export const updateUserPreferences = async (userId: string): Promise<void> => {
  const engine = new RecommendationEngine(userId);
  await engine.initialize();
};

export const recordRecommendationFeedback = async (
  userId: string,
  recommendationId: string,
  feedback: 'positive' | 'negative',
  itemId: string,
  itemType: 'video' | 'playlist' | 'template'
): Promise<void> => {
  try {
    await setDoc(doc(collection(db, 'recommendation_feedback')), {
      userId,
      recommendationId,
      feedback,
      itemId,
      itemType,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error recording recommendation feedback:', error);
  }
};