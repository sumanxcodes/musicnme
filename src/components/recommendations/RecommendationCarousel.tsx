'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getRecommendationsForUser, 
  recordRecommendationFeedback,
  RecommendationScore,
  RecommendationContext 
} from '@/lib/recommendations';
import { getVideo, getPlaylist } from '@/lib/firestore';
import { getTemplate } from '@/lib/templates';
import { Video, Playlist, TemplatePlaylist } from '@/types';

interface RecommendationCarouselProps {
  context?: Partial<RecommendationContext>;
  maxRecommendations?: number;
  showFeedback?: boolean;
  onItemSelect?: (item: RecommendationScore, data: Video | Playlist | TemplatePlaylist) => void;
}

interface RecommendationItem extends RecommendationScore {
  data?: Video | Playlist | TemplatePlaylist | null;
  loading?: boolean;
}

const RecommendationCarousel: React.FC<RecommendationCarouselProps> = ({
  context = {},
  maxRecommendations = 6,
  showFeedback = true,
  onItemSelect
}) => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (user) {
      loadRecommendations();
    }
  }, [user, context]);

  const loadRecommendations = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const recs = await getRecommendationsForUser(user.uid, context, maxRecommendations);
      
      // Filter out template recommendations 
      const filteredRecs = recs.filter(rec => rec.itemType !== 'template');
      
      // Load data for each recommendation
      const recsWithData: RecommendationItem[] = await Promise.all(
        filteredRecs.map(async (rec): Promise<RecommendationItem> => {
          try {
            let data: Video | Playlist | TemplatePlaylist | null = null;
            switch (rec.itemType) {
              case 'video':
                data = await getVideo(rec.itemId);
                break;
              case 'playlist':
                data = await getPlaylist(rec.itemId);
                break;
            }
            return { ...rec, data, loading: false };
          } catch (error) {
            console.error(`Error loading ${rec.itemType} ${rec.itemId}:`, error);
            return { ...rec, data: null, loading: false };
          }
        })
      );

      setRecommendations(recsWithData.filter((rec): rec is RecommendationItem => rec.data !== null));
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = async (recommendation: RecommendationItem, feedback: 'positive' | 'negative') => {
    if (!user) return;

    try {
      await recordRecommendationFeedback(
        user.uid,
        `${recommendation.itemType}-${recommendation.itemId}`,
        feedback,
        recommendation.itemId,
        recommendation.itemType
      );

      // Remove from recommendations if negative feedback
      if (feedback === 'negative') {
        setRecommendations(recs => recs.filter(rec => rec.itemId !== recommendation.itemId));
      }
    } catch (error) {
      console.error('Error recording feedback:', error);
    }
  };

  const handleItemClick = (recommendation: RecommendationItem) => {
    if (onItemSelect && recommendation.data) {
      onItemSelect(recommendation, recommendation.data);
    }
  };

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex + 1 >= recommendations.length ? 0 : prevIndex + 1
    );
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex - 1 < 0 ? recommendations.length - 1 : prevIndex - 1
    );
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

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Smart Recommendations</h2>
          <div className="animate-pulse w-8 h-8 bg-gray-200 rounded"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-gray-200 rounded-lg mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Smart Recommendations</h2>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No recommendations yet</h3>
          <p className="text-gray-600">Use the session player more to get personalized recommendations!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Smart Recommendations
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({recommendations.length} suggestions)
          </span>
        </h2>
        
        {recommendations.length > 3 && (
          <div className="flex items-center gap-2">
            <button
              onClick={prevSlide}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Previous recommendations"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={nextSlide}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Next recommendations"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recommendations.slice(currentIndex, currentIndex + 3).map((recommendation) => (
          <div
            key={`${recommendation.itemType}-${recommendation.itemId}`}
            className="group border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer"
            onClick={() => handleItemClick(recommendation)}
          >
            {/* Header */}
            <div className="p-4 pb-2">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getItemIcon(recommendation.itemType)}</span>
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {getItemTypeLabel(recommendation.itemType)}
                    </span>
                    <div className="flex items-center gap-1 mt-1">
                      <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-blue-600 h-1.5 rounded-full"
                          style={{ width: `${formatScore(recommendation.score)}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-600">{formatScore(recommendation.score)}%</span>
                    </div>
                  </div>
                </div>
                
                {showFeedback && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFeedback(recommendation, 'positive');
                      }}
                      className="p-1 rounded hover:bg-green-100 text-gray-400 hover:text-green-600 transition-colors"
                      title="Good suggestion"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFeedback(recommendation, 'negative');
                      }}
                      className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors"
                      title="Not interested"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="mb-3">
                <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                  {recommendation.data?.title || 'Loading...'}
                </h3>
                
                {recommendation.itemType === 'video' && recommendation.data && 'duration' in recommendation.data && (
                  <p className="text-sm text-gray-500 mt-1">
                    Duration: {(recommendation.data as Video).duration}
                  </p>
                )}
                
                {recommendation.itemType === 'playlist' && recommendation.data && 'videoRefs' in recommendation.data && (
                  <p className="text-sm text-gray-500 mt-1">
                    {(recommendation.data as Playlist).videoRefs.length} videos
                  </p>
                )}
                
                {recommendation.itemType === 'template' && recommendation.data && 'rating' in recommendation.data && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className={`w-3 h-3 ${
                            i < Math.floor((recommendation.data as TemplatePlaylist).rating) 
                              ? 'text-yellow-400' 
                              : 'text-gray-300'
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-xs text-gray-500">
                      ({(recommendation.data as TemplatePlaylist).rating.toFixed(1)})
                    </span>
                  </div>
                )}
              </div>

              {/* Reasons */}
              <div className="space-y-1">
                {recommendation.reasons.slice(0, 2).map((reason, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0"></div>
                    <span className="text-xs text-gray-600">{reason}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 capitalize">
                  Based on {recommendation.basedOn}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">Confidence:</span>
                  <span className="text-xs font-medium text-gray-700">
                    {Math.round(recommendation.confidence * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination dots */}
      {recommendations.length > 3 && (
        <div className="flex justify-center mt-4 gap-2">
          {Array.from({ length: Math.ceil(recommendations.length / 3) }).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index * 3)}
              className={`w-2 h-2 rounded-full transition-colors ${
                Math.floor(currentIndex / 3) === index
                  ? 'bg-blue-600'
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to recommendation set ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default RecommendationCarousel;