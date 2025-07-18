import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  QueryConstraint
} from 'firebase/firestore';
import { db } from './firebase';
import { TemplatePlaylist, Video, Playlist } from '@/types';
import { getPlaylistAnalytics } from './analytics';
import { getVideo } from './firestore';

// Template categories and their default configurations
export const TEMPLATE_CATEGORIES = {
  warmup: {
    name: 'Warm-up',
    description: 'Gentle, energizing activities to start sessions',
    color: 'bg-yellow-100 text-yellow-800',
    icon: '🌅',
    recommendedDuration: 300, // 5 minutes
    recommendedVideoCount: 2-3
  },
  activity: {
    name: 'Main Activity',
    description: 'Core session activities and exercises',
    color: 'bg-blue-100 text-blue-800',
    icon: '🎵',
    recommendedDuration: 900, // 15 minutes
    recommendedVideoCount: 4-6
  },
  cooldown: {
    name: 'Cool-down',
    description: 'Calming activities to end sessions peacefully',
    color: 'bg-green-100 text-green-800',
    icon: '🌙',
    recommendedDuration: 300, // 5 minutes
    recommendedVideoCount: 2-3
  },
  seasonal: {
    name: 'Seasonal',
    description: 'Holiday and seasonal themed content',
    color: 'bg-purple-100 text-purple-800',
    icon: '🎃',
    recommendedDuration: 600, // 10 minutes
    recommendedVideoCount: 3-4
  },
  custom: {
    name: 'Custom',
    description: 'User-created templates',
    color: 'bg-gray-100 text-gray-800',
    icon: '⭐',
    recommendedDuration: 0, // Variable
    recommendedVideoCount: '1+'
  }
} as const;

export const DIFFICULTY_LEVELS = {
  beginner: {
    name: 'Beginner',
    description: 'Simple activities for new participants',
    color: 'bg-green-100 text-green-700',
    maxComplexity: 3,
    recommendedTags: ['simple', 'basic', 'introduction']
  },
  intermediate: {
    name: 'Intermediate',
    description: 'Moderate complexity for regular participants',
    color: 'bg-yellow-100 text-yellow-700',
    maxComplexity: 6,
    recommendedTags: ['moderate', 'standard', 'regular']
  },
  advanced: {
    name: 'Advanced',
    description: 'Complex activities for experienced participants',
    color: 'bg-red-100 text-red-700',
    maxComplexity: 10,
    recommendedTags: ['complex', 'advanced', 'challenging']
  }
} as const;

// Template Management Service
export class TemplateManager {
  // Create a new template
  static async createTemplate(template: Omit<TemplatePlaylist, 'id' | 'usageCount' | 'rating' | 'createdAt'>): Promise<string> {
    try {
      // Validate template data
      const validatedTemplate = await TemplateManager.validateTemplate(template);
      
      const templateData: Omit<TemplatePlaylist, 'id'> = {
        ...validatedTemplate,
        usageCount: 0,
        rating: 0,
        createdAt: new Date().toISOString()
      };

      const templateRef = await addDoc(collection(db, 'templates'), templateData);
      return templateRef.id;
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  }

  // Get template by ID
  static async getTemplate(templateId: string): Promise<TemplatePlaylist | null> {
    try {
      const templateDoc = await getDoc(doc(db, 'templates', templateId));
      if (!templateDoc.exists()) return null;
      
      return {
        id: templateDoc.id,
        ...templateDoc.data()
      } as TemplatePlaylist;
    } catch (error) {
      console.error('Error fetching template:', error);
      return null;
    }
  }

  // Get templates with filtering
  static async getTemplates(options: {
    category?: keyof typeof TEMPLATE_CATEGORIES;
    difficulty?: keyof typeof DIFFICULTY_LEVELS;
    createdBy?: string;
    tags?: string[];
    limit?: number;
    orderBy?: 'rating' | 'usageCount' | 'createdAt';
  } = {}): Promise<TemplatePlaylist[]> {
    try {
      const constraints: QueryConstraint[] = [];

      // Add filters
      if (options.category) {
        constraints.push(where('category', '==', options.category));
      }
      
      if (options.difficulty) {
        constraints.push(where('difficulty', '==', options.difficulty));
      }
      
      if (options.createdBy) {
        constraints.push(where('createdBy', '==', options.createdBy));
      }
      
      if (options.tags && options.tags.length > 0) {
        constraints.push(where('tags', 'array-contains-any', options.tags));
      }

      // Add ordering
      const orderField = options.orderBy || 'rating';
      constraints.push(orderBy(orderField, 'desc'));

      // Add limit
      if (options.limit) {
        constraints.push(limit(options.limit));
      }

      const q = query(collection(db, 'templates'), ...constraints);
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as TemplatePlaylist));
    } catch (error) {
      console.error('Error fetching templates:', error);
      return [];
    }
  }

  // Update template
  static async updateTemplate(templateId: string, updates: Partial<TemplatePlaylist>): Promise<void> {
    try {
      const templateRef = doc(db, 'templates', templateId);
      await updateDoc(templateRef, {
        ...updates,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating template:', error);
      throw error;
    }
  }

  // Delete template
  static async deleteTemplate(templateId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'templates', templateId));
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  }

  // Create template from existing playlist
  static async createTemplateFromPlaylist(
    playlistId: string,
    templateData: {
      title: string;
      description: string;
      category: keyof typeof TEMPLATE_CATEGORIES;
      difficulty: keyof typeof DIFFICULTY_LEVELS;
      createdBy: string;
    }
  ): Promise<string> {
    try {
      // Get playlist data
      const playlistRef = doc(db, 'playlists', playlistId);
      const playlistDoc = await getDoc(playlistRef);
      
      if (!playlistDoc.exists()) {
        throw new Error('Playlist not found');
      }

      const playlist = playlistDoc.data() as Playlist;
      
      // Get playlist analytics to assess quality
      const analytics = await getPlaylistAnalytics(playlistId);
      
      // Calculate estimated duration from videos
      const estimatedDuration = await TemplateManager.calculatePlaylistDuration(playlist.videoRefs);
      
      // Extract tags from videos
      const tags = await TemplateManager.extractTagsFromVideos(playlist.videoRefs);

      const template: Omit<TemplatePlaylist, 'id' | 'usageCount' | 'rating' | 'createdAt'> = {
        title: templateData.title,
        description: templateData.description,
        category: templateData.category,
        videoRefs: playlist.videoRefs,
        tags,
        difficulty: templateData.difficulty,
        duration: estimatedDuration,
        createdBy: templateData.createdBy
      };

      const templateId = await TemplateManager.createTemplate(template);

      // If playlist has good analytics, start with higher rating
      if (analytics && analytics.completionRate >= 80) {
        await TemplateManager.updateTemplate(templateId, { rating: 4.0 });
      }

      return templateId;
    } catch (error) {
      console.error('Error creating template from playlist:', error);
      throw error;
    }
  }

  // Create playlist from template
  static async createPlaylistFromTemplate(
    templateId: string,
    userId: string,
    customTitle?: string
  ): Promise<string> {
    try {
      const template = await TemplateManager.getTemplate(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Create new playlist
      const playlistData = {
        userId,
        title: customTitle || `${template.title} (from template)`,
        createdAt: new Date().toISOString(),
        videoRefs: [...template.videoRefs], // Copy video references
        notes: `Created from template: ${template.title}`
      };

      const playlistRef = await addDoc(collection(db, 'playlists'), playlistData);

      // Increment template usage count
      await TemplateManager.incrementTemplateUsage(templateId);

      return playlistRef.id;
    } catch (error) {
      console.error('Error creating playlist from template:', error);
      throw error;
    }
  }

  // Rate a template
  static async rateTemplate(
    templateId: string,
    rating: number,
    userId: string
  ): Promise<void> {
    try {
      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      // Store individual rating
      await setDoc(doc(db, 'template_ratings', `${templateId}_${userId}`), {
        templateId,
        userId,
        rating,
        createdAt: serverTimestamp()
      });

      // Update template average rating
      await TemplateManager.updateTemplateRating(templateId);
    } catch (error) {
      console.error('Error rating template:', error);
      throw error;
    }
  }

  // Get featured templates for homepage
  static async getFeaturedTemplates(limit: number = 6): Promise<TemplatePlaylist[]> {
    try {
      const templates = await TemplateManager.getTemplates({
        orderBy: 'rating',
        limit
      });

      // Filter for high-quality templates
      return templates.filter(template => 
        template.rating >= 4.0 && template.usageCount >= 5
      );
    } catch (error) {
      console.error('Error fetching featured templates:', error);
      return [];
    }
  }

  // Get recommended templates for user
  static async getRecommendedTemplates(
    userId: string,
    userTags: string[] = [],
    difficulty?: keyof typeof DIFFICULTY_LEVELS,
    limit: number = 10
  ): Promise<TemplatePlaylist[]> {
    try {
      const allTemplates = await TemplateManager.getTemplates({
        difficulty,
        orderBy: 'rating'
      });

      // Score templates based on user preferences
      const scoredTemplates = allTemplates
        .map(template => ({
          ...template,
          score: TemplateManager.calculateTemplateScore(template, userTags)
        }))
        .filter(template => template.score > 0.3)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return scoredTemplates;
    } catch (error) {
      console.error('Error fetching recommended templates:', error);
      return [];
    }
  }

  // Private helper methods
  private static async validateTemplate(template: Omit<TemplatePlaylist, 'id' | 'usageCount' | 'rating' | 'createdAt'>): Promise<typeof template> {
    // Validate video references exist
    for (const videoId of template.videoRefs) {
      const video = await getVideo(videoId);
      if (!video) {
        throw new Error(`Video ${videoId} not found`);
      }
    }

    // Validate category
    if (!TEMPLATE_CATEGORIES[template.category]) {
      throw new Error(`Invalid category: ${template.category}`);
    }

    // Validate difficulty
    if (!DIFFICULTY_LEVELS[template.difficulty]) {
      throw new Error(`Invalid difficulty: ${template.difficulty}`);
    }

    // Validate required fields
    if (!template.title || template.title.length < 3) {
      throw new Error('Title must be at least 3 characters long');
    }

    if (!template.description || template.description.length < 10) {
      throw new Error('Description must be at least 10 characters long');
    }

    if (template.videoRefs.length === 0) {
      throw new Error('Template must contain at least one video');
    }

    return template;
  }

  private static async calculatePlaylistDuration(videoRefs: string[]): Promise<number> {
    let totalDuration = 0;
    
    for (const videoId of videoRefs) {
      try {
        const video = await getVideo(videoId);
        if (video) {
          // Parse duration string (format: "MM:SS" or "H:MM:SS")
          const parts = video.duration.split(':');
          let seconds = 0;
          
          if (parts.length === 2) {
            seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
          } else if (parts.length === 3) {
            seconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
          }
          
          totalDuration += seconds;
        }
      } catch (error) {
        console.error(`Error calculating duration for video ${videoId}:`, error);
      }
    }
    
    return totalDuration;
  }

  private static async extractTagsFromVideos(videoRefs: string[]): Promise<string[]> {
    const allTags: string[] = [];
    
    for (const videoId of videoRefs) {
      try {
        const video = await getVideo(videoId);
        if (video && video.tags) {
          allTags.push(...video.tags);
        }
      } catch (error) {
        console.error(`Error extracting tags from video ${videoId}:`, error);
      }
    }
    
    // Remove duplicates and return most common tags
    const tagCounts: Record<string, number> = {};
    for (const tag of allTags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
    
    return Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10) // Top 10 most common tags
      .map(([tag]) => tag);
  }

  private static async incrementTemplateUsage(templateId: string): Promise<void> {
    try {
      const templateRef = doc(db, 'templates', templateId);
      await updateDoc(templateRef, {
        usageCount: increment(1),
        lastUsed: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error incrementing template usage:', error);
    }
  }

  private static async updateTemplateRating(templateId: string): Promise<void> {
    try {
      // Get all ratings for this template
      const ratingsQuery = query(
        collection(db, 'template_ratings'),
        where('templateId', '==', templateId)
      );
      
      const ratingsSnapshot = await getDocs(ratingsQuery);
      const ratings = ratingsSnapshot.docs.map(doc => doc.data().rating);
      
      if (ratings.length > 0) {
        const averageRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
        
        await updateDoc(doc(db, 'templates', templateId), {
          rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
          ratingCount: ratings.length
        });
      }
    } catch (error) {
      console.error('Error updating template rating:', error);
    }
  }

  private static calculateTemplateScore(template: TemplatePlaylist, userTags: string[]): number {
    let score = 0.5; // Base score

    // Tag matching (40% of score)
    if (userTags.length > 0 && template.tags.length > 0) {
      const commonTags = template.tags.filter(tag => 
        userTags.some(userTag => userTag.toLowerCase() === tag.toLowerCase())
      );
      const tagScore = commonTags.length / Math.max(userTags.length, template.tags.length);
      score += tagScore * 0.4;
    }

    // Rating boost (30% of score)
    if (template.rating > 0) {
      score += (template.rating / 5) * 0.3;
    }

    // Usage popularity (20% of score)
    if (template.usageCount > 0) {
      const usageScore = Math.min(1, template.usageCount / 20); // Cap at 20 uses for max score
      score += usageScore * 0.2;
    }

    // Recency bonus (10% of score)
    const daysSinceCreated = (Date.now() - new Date(template.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreated < 30) { // Bonus for templates created in last 30 days
      score += (30 - daysSinceCreated) / 30 * 0.1;
    }

    return Math.min(1, score);
  }
}

// Convenience functions for common operations
export const createTemplateFromPlaylist = TemplateManager.createTemplateFromPlaylist;
export const createPlaylistFromTemplate = TemplateManager.createPlaylistFromTemplate;
export const getTemplates = TemplateManager.getTemplates;
export const getTemplate = TemplateManager.getTemplate;
export const getFeaturedTemplates = TemplateManager.getFeaturedTemplates;
export const getRecommendedTemplates = TemplateManager.getRecommendedTemplates;
export const rateTemplate = TemplateManager.rateTemplate;

// Template validation utility
export const validateTemplateData = (data: Partial<TemplatePlaylist>): string[] => {
  const errors: string[] = [];

  if (!data.title || data.title.length < 3) {
    errors.push('Title must be at least 3 characters long');
  }

  if (!data.description || data.description.length < 10) {
    errors.push('Description must be at least 10 characters long');
  }

  if (!data.videoRefs || data.videoRefs.length === 0) {
    errors.push('Template must contain at least one video');
  }

  if (!data.category || !TEMPLATE_CATEGORIES[data.category]) {
    errors.push('Valid category is required');
  }

  if (!data.difficulty || !DIFFICULTY_LEVELS[data.difficulty]) {
    errors.push('Valid difficulty level is required');
  }

  return errors;
};