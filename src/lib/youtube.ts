interface YouTubeVideoDetails {
  id: string;
  title: string;
  channelTitle: string;
  thumbnails: {
    high: { url: string };
    medium: { url: string };
    default: { url: string };
  };
  duration: string;
  description: string;
}

interface YouTubeApiResponse {
  items: YouTubeVideoDetails[];
}

// Extract video ID from various YouTube URL formats
export const extractVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/,
    /^[a-zA-Z0-9_-]{11}$/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
};

// Validate YouTube URL
export const isValidYouTubeUrl = (url: string): boolean => {
  return extractVideoId(url) !== null;
};

// Convert ISO 8601 duration to readable format
export const formatDuration = (duration: string): string => {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '0:00';
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
};

// Fetch video metadata from YouTube API
export const fetchVideoMetadata = async (videoId: string): Promise<YouTubeVideoDetails | null> => {
  try {
    const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
    if (!apiKey) {
      console.error('YouTube API key not found');
      return null;
    }
    
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?` +
      `id=${videoId}&` +
      `part=snippet,contentDetails&` +
      `key=${apiKey}`
    );
    
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }
    
    const data: YouTubeApiResponse = await response.json();
    
    if (data.items.length === 0) {
      return null; // Video not found
    }
    
    const video = data.items[0];
    return {
      id: video.id,
      title: video.title,
      channelTitle: video.channelTitle,
      thumbnails: video.thumbnails,
      duration: video.duration,
      description: video.description
    };
  } catch (error) {
    console.error('Error fetching video metadata:', error);
    return null;
  }
};

// Fetch video metadata by URL
export const fetchVideoMetadataByUrl = async (url: string): Promise<YouTubeVideoDetails | null> => {
  const videoId = extractVideoId(url);
  if (!videoId) return null;
  
  return fetchVideoMetadata(videoId);
};

// Generate auto-tags based on video metadata
export const generateAutoTags = (video: YouTubeVideoDetails): string[] => {
  const tags: string[] = [];
  const title = video.title.toLowerCase();
  const description = video.description.toLowerCase();
  
  // Duration-based tags
  const duration = video.duration;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (match) {
    const totalMinutes = (parseInt(match[1] || '0') * 60) + parseInt(match[2] || '0');
    if (totalMinutes <= 3) tags.push('short');
    else if (totalMinutes <= 10) tags.push('medium');
    else tags.push('long');
  }
  
  // Content-based tags
  const contentKeywords = {
    'boomwhacker': ['boomwhacker', 'boomwhackers'],
    'music': ['music', 'song', 'melody', 'rhythm'],
    'kids': ['kids', 'children', 'child'],
    'educational': ['learn', 'education', 'teach', 'lesson'],
    'activity': ['activity', 'game', 'play', 'exercise'],
    'beginner': ['beginner', 'easy', 'simple', 'basic'],
    'advanced': ['advanced', 'complex', 'difficult', 'intermediate']
  };
  
  Object.entries(contentKeywords).forEach(([tag, keywords]) => {
    if (keywords.some(keyword => title.includes(keyword) || description.includes(keyword))) {
      tags.push(tag);
    }
  });
  
  return tags;
};

// Error handling for YouTube API
export class YouTubeApiError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'YouTubeApiError';
  }
}

// Rate limiting helper
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 100; // 100ms between requests

export const rateLimitedFetch = async (url: string): Promise<Response> => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  
  lastRequestTime = Date.now();
  return fetch(url);
};