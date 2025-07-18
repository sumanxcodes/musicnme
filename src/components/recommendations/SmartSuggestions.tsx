'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getRecommendationsForUser, 
  RecommendationScore,
  RecommendationContext 
} from '@/lib/recommendations';
import { getVideo, getPlaylist } from '@/lib/firestore';
import { getTemplate } from '@/lib/templates';
import { Video, Playlist, TemplatePlaylist } from '@/types';

interface SmartSuggestionsProps {
  context?: Partial<RecommendationContext>;
  onVideoSelect?: (video: Video) => void;
  onPlaylistSelect?: (playlist: Playlist) => void;
  onTemplateSelect?: (template: TemplatePlaylist) => void;
  maxSuggestions?: number;
  type?: 'video' | 'playlist' | 'template' | 'all';
  className?: string;
}

interface SuggestionItem extends RecommendationScore {
  data: Video | Playlist | TemplatePlaylist | null;
  loading: boolean;
}

const SmartSuggestions: React.FC<SmartSuggestionsProps> = ({
  context = {},
  onVideoSelect,
  onPlaylistSelect,
  onTemplateSelect,
  maxSuggestions = 5,
  type = 'all',
  className = ''
}) => {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (user) {
      loadSuggestions();
    }
  }, [user, context, type]);

  const loadSuggestions = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const recs = await getRecommendationsForUser(user.uid, context, maxSuggestions * 2);
      
      // Filter by type if specified
      const filteredRecs = type === 'all' 
        ? recs 
        : recs.filter(rec => rec.itemType === type);

      // Load data for each recommendation
      const recsWithData: SuggestionItem[] = await Promise.all(
        filteredRecs.slice(0, maxSuggestions).map(async (rec): Promise<SuggestionItem> => {
          try {
            let data: Video | Playlist | TemplatePlaylist | null = null;
            switch (rec.itemType) {
              case 'video':
                data = await getVideo(rec.itemId);
                break;
              case 'playlist':
                data = await getPlaylist(rec.itemId);
                break;
              case 'template':
                data = await getTemplate(rec.itemId);
                break;
            }
            return { ...rec, data, loading: false };
          } catch (error) {
            console.error(`Error loading ${rec.itemType} ${rec.itemId}:`, error);
            return { ...rec, data: null, loading: false };
          }
        })
      );

      setSuggestions(recsWithData.filter((rec): rec is SuggestionItem => rec.data !== null));
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemSelect = (suggestion: SuggestionItem) => {
    if (!suggestion.data) return;

    switch (suggestion.itemType) {
      case 'video':
        if (onVideoSelect) {
          onVideoSelect(suggestion.data as Video);
        }
        break;
      case 'playlist':
        if (onPlaylistSelect) {
          onPlaylistSelect(suggestion.data as Playlist);
        }
        break;
      case 'template':
        if (onTemplateSelect) {
          onTemplateSelect(suggestion.data as TemplatePlaylist);
        }
        break;
    }
  };

  const getItemIcon = (itemType: string) => {
    switch (itemType) {
      case 'video': return '🎥';
      case 'playlist': return '📋';
      case 'template': return '⭐';
      default: return '📄';
    }
  };

  const getItemTypeLabel = (itemType: string) => {
    switch (itemType) {
      case 'video': return 'Video';
      case 'playlist': return 'Playlist';
      case 'template': return 'Template';
      default: return 'Item';
    }
  };

  const formatScore = (score: number) => {
    return Math.round(score * 100);
  };

  const displayedSuggestions = showAll ? suggestions : suggestions.slice(0, 3);

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-blue-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <h3 className="font-medium text-gray-900">Smart Suggestions</h3>
        </div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center gap-3 p-2">
              <div className="w-8 h-8 bg-gray-200 rounded"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <h3 className="font-medium text-gray-900">Smart Suggestions</h3>
        </div>
        <p className="text-sm text-gray-600">No suggestions available yet. Use the app more to get personalized recommendations!</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <h3 className="font-medium text-gray-900">Smart Suggestions</h3>
          <span className="text-sm text-gray-500">({suggestions.length})</span>
        </div>
        
        {suggestions.length > 3 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {showAll ? 'Show Less' : 'Show All'}
          </button>
        )}
      </div>

      <div className="space-y-2">
        {displayedSuggestions.map((suggestion) => (
          <div
            key={`${suggestion.itemType}-${suggestion.itemId}`}
            className="group flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            onClick={() => handleItemSelect(suggestion)}
          >
            {/* Icon */}
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 group-hover:bg-blue-200 transition-colors">
              <span className="text-sm">{getItemIcon(suggestion.itemType)}</span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                  {suggestion.data?.title || 'Loading...'}
                </h4>
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full flex-shrink-0">
                  {getItemTypeLabel(suggestion.itemType)}
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>
                  {suggestion.reasons[0] || 'Recommended for you'}
                </span>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <div className="w-12 bg-gray-200 rounded-full h-1">
                    <div 
                      className="bg-blue-600 h-1 rounded-full"
                      style={{ width: `${formatScore(suggestion.score)}%` }}
                    ></div>
                  </div>
                  <span>{formatScore(suggestion.score)}%</span>
                </div>
              </div>
            </div>

            {/* Action indicator */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {suggestions.length > maxSuggestions && !showAll && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <button
            onClick={() => setShowAll(true)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View {suggestions.length - 3} more suggestions
          </button>
        </div>
      )}
    </div>
  );
};

export default SmartSuggestions;