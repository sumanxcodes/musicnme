import { z } from 'zod';
import { isValidYouTubeUrl } from './youtube';

// Playlist validation schema
export const playlistSchema = z.object({
  title: z.string()
    .min(1, 'Playlist title is required')
    .max(100, 'Playlist title must be less than 100 characters')
    .trim(),
  notes: z.string()
    .max(500, 'Notes must be less than 500 characters')
    .optional(),
  videoRefs: z.array(z.string()).optional(),
});

// Video validation schema
export const videoSchema = z.object({
  videoId: z.string()
    .min(11, 'Invalid video ID')
    .max(11, 'Invalid video ID'),
  title: z.string()
    .min(1, 'Video title is required')
    .max(200, 'Video title must be less than 200 characters'),
  duration: z.string()
    .min(1, 'Duration is required'),
  thumbnail: z.string()
    .url('Invalid thumbnail URL'),
  tags: z.array(z.string())
    .max(10, 'Maximum 10 tags allowed'),
  channelName: z.string()
    .min(1, 'Channel name is required')
    .max(100, 'Channel name must be less than 100 characters'),
  createdBy: z.string()
    .min(1, 'Creator ID is required'),
});

// YouTube URL validation
export const youtubeUrlSchema = z.string()
  .refine(isValidYouTubeUrl, {
    message: 'Please enter a valid YouTube URL',
  });

// Tag validation schema
export const tagSchema = z.object({
  name: z.string()
    .min(1, 'Tag name is required')
    .max(30, 'Tag name must be less than 30 characters')
    .regex(/^[a-zA-Z0-9\s-_]+$/, 'Tag name can only contain letters, numbers, spaces, hyphens, and underscores')
    .trim(),
  category: z.enum(['key', 'tempo', 'activity', 'difficulty', 'custom']),
  createdBy: z.string()
    .min(1, 'Creator ID is required'),
});

// Search/Filter validation
export const searchSchema = z.object({
  query: z.string()
    .max(100, 'Search query must be less than 100 characters')
    .optional(),
  tags: z.array(z.string())
    .max(5, 'Maximum 5 tags for filtering')
    .optional(),
  duration: z.enum(['short', 'medium', 'long', 'all'])
    .optional(),
  sortBy: z.enum(['recent', 'title', 'duration', 'channel'])
    .optional(),
  sortOrder: z.enum(['asc', 'desc'])
    .optional(),
});

// Validation helper functions
export const validatePlaylist = (data: unknown) => {
  try {
    return playlistSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors };
    }
    return { error: 'Invalid playlist data' };
  }
};

export const validateVideo = (data: unknown) => {
  try {
    return videoSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors };
    }
    return { error: 'Invalid video data' };
  }
};

export const validateYouTubeUrl = (url: string) => {
  try {
    return youtubeUrlSchema.parse(url);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0]?.message || 'Invalid YouTube URL' };
    }
    return { error: 'Invalid YouTube URL' };
  }
};

export const validateTag = (data: unknown) => {
  try {
    return tagSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors };
    }
    return { error: 'Invalid tag data' };
  }
};

export const validateSearch = (data: unknown) => {
  try {
    return searchSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors };
    }
    return { error: 'Invalid search parameters' };
  }
};

// Form validation helpers for React Hook Form
export const getFieldError = (errors: any, fieldName: string): string | undefined => {
  const error = errors[fieldName];
  return error?.message;
};

export const hasFieldError = (errors: any, fieldName: string): boolean => {
  return !!errors[fieldName];
};

// Clean and sanitize input data
export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/\s+/g, ' ');
};

export const sanitizePlaylistData = (data: any) => {
  return {
    ...data,
    title: sanitizeInput(data.title),
    notes: data.notes ? sanitizeInput(data.notes) : undefined,
  };
};

export const sanitizeVideoData = (data: any) => {
  return {
    ...data,
    title: sanitizeInput(data.title),
    channelName: sanitizeInput(data.channelName),
    tags: data.tags.map((tag: string) => sanitizeInput(tag)),
  };
};

// Validation error formatting
export const formatValidationError = (error: z.ZodError): Record<string, string> => {
  const formatted: Record<string, string> = {};
  
  error.errors.forEach((err) => {
    if (err.path.length > 0) {
      formatted[err.path[0]] = err.message;
    }
  });
  
  return formatted;
};